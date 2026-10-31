import { renderHook, waitFor } from "@testing-library/react-native";

import { apiBase } from "~/lib/config";
import { bookPrefill, brandShadeQuery, fetchBrandShade, parseShadeId, pickShade, queryPalette, shadeToLookUp, useBrandShade, type BrandShadeSummary } from "~/lib/prefill";
import { palettes, services, shadeDisplayName } from "~/shared";

const pepper: BrandShadeSummary = { id: "asian-paints:8386", brand: "asian-paints", brandName: "Asian Paints", code: "8386", name: "Pepper Leaf", hex: "#bbc8b2" };
const palette = palettes[0];

const envelope = (data: unknown) => ({ ok: true, status: 200, json: async () => ({ apiVersion: "v1", kind: "paint-colour", label: "x", data, meta: { generatedAt: "2026-10-31T00:00:00.000Z" } }) }) as Response;
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

describe("bookPrefill (the website's BookPrefill)", () => {
  it("turns a service page's slug into the form's service choice", () => {
    for (const s of services) expect(bookPrefill({ service: s.slug })).toEqual({ defaultService: s.leadService, defaultMessage: undefined });
    expect(bookPrefill({ service: [" interior-painting ", "x"] }).defaultService).toBe("Interior Painting");
  });

  it("ignores unknown services and an empty query", () => {
    expect(bookPrefill({ service: "Interior Painting" })).toEqual({ defaultService: undefined, defaultMessage: undefined });
    expect(bookPrefill({ service: "constructor" }).defaultService).toBeUndefined();
    expect(bookPrefill({})).toEqual({ defaultService: undefined, defaultMessage: undefined });
  });

  it("notes a palette's shades by brand, code and name", () => {
    const shades = palette.shades.map((s) => `${s.brandName} ${s.code} ${shadeDisplayName(s.name)}`).join(", ");
    expect(bookPrefill({ palette: palette.slug, service: "exterior-painting" })).toEqual({
      defaultService: "Exterior Painting",
      defaultMessage: `Interested in the "${palette.name}" palette (${shades}). Please bring the shade cards.`,
    });
  });

  it("notes a brand shade once it has been looked up, and a palette wins over it", () => {
    expect(bookPrefill({ shade: pepper.id }, pepper).defaultMessage).toBe("Interested in Asian Paints 8386 Pepper Leaf (#BBC8B2). Please bring the shade card.");
    expect(bookPrefill({ shade: pepper.id }).defaultMessage).toBeUndefined();
    expect(bookPrefill({ palette: palette.slug, shade: pepper.id }, pepper).defaultMessage).toContain(palette.name);
    expect(bookPrefill({ palette: "no-such-palette" }, pepper).defaultMessage).toContain("Pepper Leaf");
  });

  it("looks a shade up only when no real palette is chosen", () => {
    expect(queryPalette({ palette: palette.slug })).toBe(palette);
    expect(queryPalette({ palette: "" })).toBeUndefined();
    expect(shadeToLookUp({ shade: pepper.id })).toBe(pepper.id);
    expect(shadeToLookUp({ shade: pepper.id, palette: palette.slug })).toBeNull();
    expect(shadeToLookUp({ shade: pepper.id, palette: "nope" })).toBe(pepper.id);
    expect(shadeToLookUp({ shade: " " })).toBeNull();
  });
});

describe("brand shade ids (the website's useBrandShade)", () => {
  it("parse brand-slug:code and reject anything else", () => {
    expect(parseShadeId("asian-paints:8386")).toEqual({ brand: "asian-paints", code: "8386" });
    expect(parseShadeId("berger: 3P 0050 ")).toEqual({ brand: "berger", code: "3P 0050" });
    for (const bad of [":8386", "8386", "Asian Paints:8386", "asian-paints:--", `asian-paints:${"1".repeat(80)}`]) expect(parseShadeId(bad)).toBeNull();
  });

  it("search by code within the brand, with a full stop after a code that reads as hex", () => {
    expect(brandShadeQuery("asian-paints:8386")).toEqual({ q: "8386", brand: "asian-paints", perPage: 5 });
    expect(brandShadeQuery("dunn-edwards:DE5460")).toEqual({ q: "DE5460.", brand: "dunn-edwards", perPage: 5 });
    expect(brandShadeQuery("nope")).toBeNull();
  });

  it("pick the exact id, else the same brand and code without punctuation", () => {
    const loose = { ...pepper, id: "nippon:7-1", brand: "nippon", code: "7-1" };
    expect(pickShade(pepper.id, [loose, pepper])).toBe(pepper);
    expect(pickShade("nippon:71", [pepper, loose])).toBe(loose);
    expect(pickShade("nippon:72", [loose])).toBeUndefined();
    expect(pickShade("bad", [pepper])).toBeUndefined();
  });

  it("fetch one shade through the public colour API", async () => {
    fetchMock.mockResolvedValue(envelope([pepper]));
    await expect(fetchBrandShade(pepper.id)).resolves.toEqual(pepper);
    expect(fetchMock.mock.calls[0][0]).toBe(`${apiBase()}/api/v1/colours/paint?q=8386&brand=asian-paints&perPage=5`);
    fetchMock.mockResolvedValue(envelope({ not: "a list" }));
    await expect(fetchBrandShade(pepper.id)).resolves.toBeUndefined();
    await expect(fetchBrandShade("bad")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("resolve in a hook once the API answers, and stay empty on errors and bad ids", async () => {
    fetchMock.mockResolvedValue(envelope([pepper]));
    const { result, rerender } = await renderHook(({ id }: { id: string | null }) => useBrandShade(id), { initialProps: { id: pepper.id as string | null } });
    await waitFor(() => expect(result.current).toEqual(pepper));
    await rerender({ id: null });
    expect(result.current).toBeUndefined();
    await rerender({ id: "bad" });
    expect(result.current).toBeUndefined();
    fetchMock.mockRejectedValue(new Error("offline"));
    await rerender({ id: "berger:1234" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(result.current).toBeUndefined();
  });

  it("drops an answer that comes after the screen has gone", async () => {
    let answer: (r: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (answer = resolve)));
    const { result, unmount } = await renderHook(() => useBrandShade(pepper.id));
    await unmount();
    answer(envelope([pepper]));
    await Promise.resolve();
    expect(result.current).toBeUndefined();
  });
});
