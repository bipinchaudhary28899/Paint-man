import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookPrefill, bookPrefill } from "@/components/BookPrefill";
import { brandShadeUrl, parseShadeId, pickShade, useBrandShade, type BrandShadeSummary } from "@/components/useBrandShade";
import { VisualizerFromParams, visualizerModel } from "@/components/visualizer/VisualizerFromParams";

const nav = vi.hoisted(() => ({ params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.params,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

const mecca: BrandShadeSummary = { id: "asian-paints:7982", brand: "asian-paints", brandName: "Asian Paints", code: "7982", name: "Mecca Gold", hex: "#e7975b" };

/** The catalogue API answering with these shades. */
function api(items: BrandShadeSummary[]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ apiVersion: "v1", kind: "paint-colour", data: items }), { status: 200 }));
}

const message = () => screen.getByLabelText(/Anything we should know/) as HTMLTextAreaElement;
const service = () => screen.getByLabelText("Service needed") as HTMLSelectElement;

beforeEach(() => {
  nav.params = new URLSearchParams();
});

describe("brand shade lookup", () => {
  it("accepts only brand-slug:code ids", () => {
    expect(parseShadeId("asian-paints:7982")).toEqual({ brand: "asian-paints", code: "7982" });
    expect(parseShadeId("sherwin-williams: SW 7005 ")).toEqual({ brand: "sherwin-williams", code: "SW 7005" });
    for (const bad of ["7982", ":7982", "asian-paints:", "asian-paints:--", "Asian Paints:7982", `asian-paints:${"9".repeat(80)}`]) {
      expect(parseShadeId(bad)).toBeNull();
    }
  });

  it("searches the brand by code, and keeps hex-looking codes from being read as colours", () => {
    const url = new URL(brandShadeUrl("asian-paints:7982")!, "https://x.test");
    expect(url.pathname).toBe("/api/v1/colours/paint");
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: "7982", brand: "asian-paints", perPage: "5" });
    const hexLike = new URL(brandShadeUrl("dunn-edwards:DE5460")!, "https://x.test");
    expect(hexLike.searchParams.get("q")).toBe("DE5460.");
    expect(brandShadeUrl("not a shade")).toBeNull();
  });

  it("picks the exact id, then the same code ignoring spaces and case, never another brand", () => {
    const dash = { ...mecca, id: "behr:7-1", brand: "behr", brandName: "Behr", code: "7-1" };
    const plain = { ...dash, id: "behr:71", code: "71" };
    expect(pickShade("behr:7-1", [plain, dash])).toBe(dash);
    expect(pickShade("behr:71", [dash, plain])).toBe(plain);
    expect(pickShade("sherwin-williams:sw7005", [{ ...mecca, id: "sherwin-williams:SW 7005", brand: "sherwin-williams", code: "SW 7005" }])?.code).toBe("SW 7005");
    expect(pickShade("berger:7982", [mecca])).toBeUndefined();
    expect(pickShade("nonsense", [mecca])).toBeUndefined();
  });

  it("forgets a shade when the id changes and ignores bad replies", async () => {
    const fetchSpy = api([mecca]);
    const { result, rerender } = renderHook(({ id }: { id: string | null }) => useBrandShade(id), { initialProps: { id: "asian-paints:7982" as string | null } });
    await waitFor(() => expect(result.current).toEqual(mecca));
    rerender({ id: null });
    expect(result.current).toBeUndefined();
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: "nope" }), { status: 200 }));
    rerender({ id: "asian-paints:1234" });
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    expect(result.current).toBeUndefined();
  });
});

describe("BookPrefill", () => {
  it("renders the plain booking form when the link carries no choice", () => {
    const fetchSpy = api([]);
    render(<BookPrefill />);
    expect(message().value).toBe("");
    expect(service().value).toBe("");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("pre-selects the service from a service page link and ignores unknown slugs", () => {
    nav.params = new URLSearchParams("service=exterior-painting");
    const { unmount } = render(<BookPrefill />);
    expect(service().value).toBe("Exterior Painting");
    unmount();
    nav.params = new URLSearchParams("service=constructor");
    render(<BookPrefill />);
    expect(service().value).toBe("");
  });

  it("asks for a palette's shade cards, and a palette wins over a brand shade", () => {
    const fetchSpy = api([mecca]);
    nav.params = new URLSearchParams("palette=calm-bedroom&shade=asian-paints:7982&service=interior-painting");
    render(<BookPrefill />);
    expect(message().value).toBe('Interested in the "Calm bedroom" palette (PM-502, PM-101, PM-204). Please bring the shade cards.');
    expect(service().value).toBe("Interior Painting");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("names a Paint Man shade from its code without any network call", () => {
    const fetchSpy = api([mecca]);
    nav.params = new URLSearchParams("colour=502");
    render(<BookPrefill />);
    expect(message().value).toBe("Interested in the shade Sage Mist (PM-502). Please bring the shade card.");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("looks a brand shade up through the catalogue API and then fills the message", async () => {
    const fetchSpy = api([mecca]);
    nav.params = new URLSearchParams("shade=asian-paints:7982");
    render(<BookPrefill />);
    expect(message().value).toBe("");
    await waitFor(() => expect(message().value).toBe("Interested in Asian Paints 7982 Mecca Gold (#E7975B). Please bring the shade card."));
    expect(String(fetchSpy.mock.calls[0][0])).toBe("/api/v1/colours/paint?q=7982&brand=asian-paints&perPage=5");
  });

  it("keeps the plain form when the shade is unknown, the API refuses or the network fails", async () => {
    nav.params = new URLSearchParams("shade=nowhere");
    const fetchSpy = api([mecca]);
    const { unmount } = render(<BookPrefill />);
    expect(fetchSpy).not.toHaveBeenCalled();
    unmount();

    // an unknown brand: the API answers 400
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ apiVersion: "v1", kind: "error" }), { status: 400 }));
    nav.params = new URLSearchParams("shade=made-up-brand:1");
    const second = render(<BookPrefill />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(message().value).toBe("");
    second.unmount();

    fetchSpy.mockRejectedValueOnce(new TypeError("offline"));
    nav.params = new URLSearchParams("shade=asian-paints:7982");
    render(<BookPrefill />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    expect(message().value).toBe("");
  });

  it("leaves the message empty for a palette or colour that does not exist", () => {
    expect(bookPrefill({ palette: "nope", colour: "PM-000" })).toEqual({ defaultService: undefined, defaultMessage: undefined });
  });
});

describe("VisualizerFromParams", () => {
  it("starts on a Paint Man shade from ?colour= and books with that code", () => {
    nav.params = new URLSearchParams("colour=PM-502");
    render(<VisualizerFromParams />);
    expect(screen.getByRole("link", { name: "Book an inspection with Sage Mist" })).toHaveAttribute("href", "/book?colour=PM-502");
  });

  it("switches to a brand shade from ?shade= once the API answers, and books with the shade id", async () => {
    api([mecca]);
    nav.params = new URLSearchParams("shade=asian-paints:7982");
    render(<VisualizerFromParams />);
    const link = await screen.findByRole("link", { name: "Book an inspection with Mecca Gold" });
    expect(link).toHaveAttribute("href", "/book?shade=asian-paints%3A7982");
    expect(screen.getByText("#E7975B · Asian Paints 7982")).toBeInTheDocument();
  });

  it("only allows the evaluation models it knows", () => {
    expect(visualizerModel("b1")).toBe("b1");
    expect(visualizerModel("b2")).toBe("b2");
    expect(visualizerModel("b9")).toBe("b0");
    expect(visualizerModel(null)).toBe("b0");
  });
});
