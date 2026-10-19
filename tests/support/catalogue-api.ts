import { vi } from "vitest";

// A stand-in for the public colour APIs the browser calls (/api/v1/colours/brands and /paint),
// for component tests. It answers like the real routes: the envelope's `data` and `meta`,
// brand shades filtered by brand, family and a code or name search, and paged.

export type ApiShade = { id: string; brand: string; brandName: string; code: string; name: string; hex: string; lrv: number; family: string; undertone: string; interior: boolean; exterior: boolean };

export const apiShade = (brand: string, brandName: string, code: string, name: string, hex: string, family: string): ApiShade => ({
  id: `${brand}:${code}`, brand, brandName, code, name, hex, lrv: 40, family, undertone: "Neutral", interior: true, exterior: true,
});

export const sampleShades: ApiShade[] = [
  apiShade("asian-paints", "Asian Paints", "8386", "Pepper Leaf", "#bbc8b2", "green"),
  apiShade("asian-paints", "Asian Paints", "8093", "Pure Red", "#c73d3c", "red"),
  apiShade("asian-paints", "Asian Paints", "L146", "Sonnet", "#f7f1e7", "white"),
  apiShade("asian-paints", "Asian Paints", "7273", "Scuba Blue", "#a2bfd9", "blue"),
  apiShade("berger", "Berger Paints", "3P0050", "Spring Leaf", "#9fb98a", "green"),
];
export const sampleBrands = [
  { slug: "asian-paints", name: "Asian Paints", count: 2221 },
  { slug: "berger", name: "Berger Paints", count: 1575 },
];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
// Some suites stub URL (for createObjectURL); keep the real class for parsing request URLs.
const RealURL = globalThis.URL;

/**
 * Mocks fetch with the colour APIs. `paint` overrides the brand shades (default sampleShades);
 * `hold` keeps any paint request whose URL contains it pending until the
 * returned `release()` is called (e.g. a ?shade= lookup that lands after a pick).
 */
export function serveColourApis({ paint = sampleShades, hold }: { paint?: ApiShade[]; hold?: string } = {}) {
  const held: (() => void)[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new RealURL(String(input), "http://localhost");
    const sp = url.searchParams;
    if (url.pathname === "/api/v1/colours/brands") return json({ data: sampleBrands, meta: { families: ["white", "red", "blue", "green"] } });
    if (url.pathname !== "/api/v1/colours/paint") return json({ kind: "error" }, 404);
    if (hold && String(input).includes(hold)) await new Promise<void>((resolve) => held.push(resolve));
    const q = (sp.get("q") ?? "").toLowerCase().replace(/\.$/, "");
    const items = paint.filter(
      (s) =>
        (!sp.get("brand") || s.brand === sp.get("brand")) &&
        (!sp.get("family") || s.family === sp.get("family")) &&
        (!q || s.name.toLowerCase().includes(q) || s.code.toLowerCase() === q),
    );
    const perPage = Number(sp.get("perPage") ?? 60);
    const page = Number(sp.get("page") ?? 1);
    const pages = Math.max(1, Math.ceil(items.length / perPage));
    return json({ data: items.slice((page - 1) * perPage, page * perPage), meta: { total: items.length, page, pages } });
  });
  return { spy, release: () => held.splice(0).forEach((r) => r()) };
}
