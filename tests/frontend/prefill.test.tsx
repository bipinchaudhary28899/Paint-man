import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BookPrefill, bookPrefill } from "@/components/BookPrefill";
import { brandShadeUrl, parseShadeId, pickShade, useBrandShade, type BrandShadeSummary } from "@/components/useBrandShade";
import { services } from "@/config/site";
import { apiShade, sampleShades, serveColourApis } from "../support/catalogue-api";

/** The map /book builds on the server from the service data. */
const serviceBySlug = Object.fromEntries(services.map((s) => [s.slug, s.leadService]));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

const mecca: BrandShadeSummary = { id: "asian-paints:7982", brand: "asian-paints", brandName: "Asian Paints", code: "7982", name: "Mecca Gold", hex: "#e7975b" };

/** The catalogue API answering with these shades. */
function api(items: BrandShadeSummary[]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ apiVersion: "v1", kind: "paint-colour", data: items }), { status: 200 }));
}

/** The visitor arrives on this address. */
const open = (url: string) => window.history.replaceState(null, "", url);

const message = () => screen.getByLabelText(/Anything we should know/) as HTMLTextAreaElement;
const service = () => screen.getByLabelText("What needs painting?") as HTMLSelectElement;

/**
 * Renders `ui` to HTML as the static prerender does, then hydrates that HTML in the browser.
 * Returns the container and the hydration problems React reported.
 */
async function prerenderAndHydrate(ui: ReactElement) {
  const container = document.createElement("div");
  container.innerHTML = renderToString(ui);
  document.body.append(container);
  const serverHtml = container.innerHTML;
  const before = { form: container.querySelector("form"), name: container.querySelector("#name") };
  const recoverable = vi.fn();
  const consoleError = vi.spyOn(console, "error");
  const root = await act(async () => hydrateRoot(container, ui, { onRecoverableError: recoverable }));
  return {
    container,
    serverHtml,
    before,
    problems: [...recoverable.mock.calls, ...consoleError.mock.calls],
    done: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

afterEach(() => open("/"));

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
    open("/book");
    render(<BookPrefill serviceBySlug={serviceBySlug} />);
    expect(message().value).toBe("");
    expect(service().value).toBe("");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("pre-selects each service from its service page link and ignores unknown slugs", () => {
    for (const s of services) {
      open(`/book?service=${s.slug}`);
      const { unmount } = render(<BookPrefill serviceBySlug={serviceBySlug} />);
      expect(service().value).toBe(s.leadService);
      unmount();
    }
    for (const unknown of ["constructor", "painting", ""]) {
      open(`/book?service=${unknown}`);
      const { unmount } = render(<BookPrefill serviceBySlug={serviceBySlug} />);
      expect(service().value).toBe("");
      unmount();
    }
  });

  it("asks for a palette's shade cards by brand, code and name, and a palette wins over a brand shade", () => {
    const fetchSpy = api([mecca]);
    open("/book?palette=calm-bedroom&shade=asian-paints:7982&service=interior-painting");
    render(<BookPrefill serviceBySlug={serviceBySlug} />);
    expect(message().value).toBe('Interested in the "Calm bedroom" palette (Asian Paints 8386 Pepper Leaf, Asian Paints L146 Sonnet, Asian Paints 8504 Wood Fence). Please bring the shade cards.');
    expect(service().value).toBe("Interior Painting");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ignores the retired ?colour= links: no message and no lookup", () => {
    const fetchSpy = api([mecca]);
    open("/book?colour=sage-mist");
    render(<BookPrefill serviceBySlug={serviceBySlug} />);
    expect(message().value).toBe("");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("looks a brand shade up through the catalogue API and then fills the message", async () => {
    const fetchSpy = api([mecca]);
    open("/book?shade=asian-paints:7982");
    render(<BookPrefill serviceBySlug={serviceBySlug} />);
    expect(message().value).toBe("");
    await waitFor(() => expect(message().value).toBe("Interested in Asian Paints 7982 Mecca Gold (#E7975B). Please bring the shade card."));
    expect(String(fetchSpy.mock.calls[0][0])).toBe("/api/v1/colours/paint?q=7982&brand=asian-paints&perPage=5");
  });

  it("keeps the plain form when the shade is unknown, the API refuses or the network fails", async () => {
    open("/book?shade=nowhere");
    const fetchSpy = api([mecca]);
    const { unmount } = render(<BookPrefill serviceBySlug={serviceBySlug} />);
    expect(fetchSpy).not.toHaveBeenCalled();
    unmount();

    // an unknown brand: the API answers 400
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ apiVersion: "v1", kind: "error" }), { status: 400 }));
    open("/book?shade=made-up-brand:1");
    const second = render(<BookPrefill serviceBySlug={serviceBySlug} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(message().value).toBe("");
    second.unmount();

    fetchSpy.mockRejectedValueOnce(new TypeError("offline"));
    open("/book?shade=asian-paints:7982");
    render(<BookPrefill serviceBySlug={serviceBySlug} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
    expect(message().value).toBe("");
  });

  it("leaves the message empty for a palette that does not exist", () => {
    expect(bookPrefill({ palette: "nope" })).toEqual({ defaultService: undefined, defaultMessage: undefined });
  });

  it("follows back and forward to another choice", () => {
    open("/book?service=exterior-painting");
    render(<BookPrefill serviceBySlug={serviceBySlug} />);
    expect(service().value).toBe("Exterior Painting");
    act(() => {
      window.history.pushState(null, "", "/book?service=rental-property-painting");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(service().value).toBe("Rental Property");
  });
});

describe("BookPrefill on the static /book page", () => {
  it("hydrates the prerendered form in place when the link has no choice: no remount, so typing before hydration is kept", async () => {
    open("/book?utm_source=google");
    const page = await prerenderAndHydrate(<BookPrefill serviceBySlug={serviceBySlug} />);
    expect(page.problems).toEqual([]);
    expect(page.before.form).not.toBeNull();
    expect(page.container.querySelector("form")).toBe(page.before.form);
    expect(page.container.querySelector("#name")).toBe(page.before.name);
    page.done();
  });

  it("prerenders the plain form, then remounts it once with the choice from the link", async () => {
    open("/book?service=exterior-painting&palette=agra-stone-exterior");
    const page = await prerenderAndHydrate(<BookPrefill serviceBySlug={serviceBySlug} />);
    // the static HTML never depends on the query
    expect(page.serverHtml).not.toContain("Cambridge");
    expect(page.serverHtml).not.toMatch(/<option selected=""[^>]*>Exterior Painting/);
    expect(page.problems).toEqual([]);
    expect(page.container.querySelector("form")).not.toBe(page.before.form);
    expect(page.container.querySelector<HTMLSelectElement>("#service")!.value).toBe("Exterior Painting");
    expect(page.container.querySelector<HTMLTextAreaElement>("#message")!.value).toBe(
      'Interested in the "Agra stone exterior" palette (Asian Paints 8771 Cambridge, Asian Paints L146 Sonnet, Asian Paints 9937 Red Rust). Please bring the shade cards.',
    );
    page.done();
  });
});

