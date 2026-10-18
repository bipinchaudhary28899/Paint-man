import type { NextRequest } from "next/server";
import { apiError, apiOk, publicCache } from "@/lib/api";
import { brandList, isBrand, isShadeFamily, isShadeSort, paintdb, searchBrandShades, shadeCount, shadeFamilies, SORTS } from "@/lib/colours/brands";

export const runtime = "nodejs";

/**
 * GET /api/v1/colours/paint?q=asian+paints+7982&brand=asian-paints&family=yellow&sort=shade&page=1&perPage=48
 * Searches 50,000+ real paint shades from 25 brands (Asian Paints, Berger, Nerolac, Dulux,
 * Sherwin-Williams…) by brand, shade code, name or hex. A brand name at the start of `q` narrows
 * to that brand. Without `q`, `sort` sets the order: "shade" (default: shade-card order, similar
 * colours together, light → dark), "code" (numeric) or "name". Items: { id, brand, brandName, code, name, hex, lrv, family, undertone,
 * interior, exterior }. Data: PaintDB (paintdb.com), CC BY 4.0; colours are approximate.
 * Example: GET /api/v1/colours/paint?q=SW%207005 → Pure White (Sherwin-Williams) first.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").slice(0, 80);
  const brand = sp.get("brand") || undefined;
  const family = sp.get("family") || undefined;
  const sort = sp.get("sort") || "shade";
  const page = sp.get("page") === null ? 1 : Number(sp.get("page"));
  const perPage = sp.get("perPage") === null ? 60 : Number(sp.get("perPage"));
  if (brand !== undefined && !isBrand(brand)) return apiError(400, "invalid_brand", `Unknown brand "${brand}".`, brandList().map((b) => b.slug));
  if (family !== undefined && !isShadeFamily(family)) return apiError(400, "invalid_family", `Unknown family "${family}".`, shadeFamilies());
  if (!isShadeSort(sort)) return apiError(400, "invalid_sort", `Unknown sort "${sort}".`, [...SORTS]);
  if (!Number.isInteger(page) || page < 1) return apiError(400, "invalid_page", "page must be a positive integer.");
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) return apiError(400, "invalid_per_page", "perPage must be an integer from 1 to 100.");

  const r = searchBrandShades({ q, brand, family, sort, page, perPage });
  const brandName = r.brand ? brandList().find((b) => b.slug === r.brand)?.name : undefined;
  const describe = [r.q && `matching "${r.q}"`, brandName && `from ${brandName}`, family && `in ${family}`].filter(Boolean).join(", ");
  const html = new URLSearchParams({ catalogue: "brands" });
  if (q) html.set("q", q);
  if (brand) html.set("brand", brand);
  return apiOk({
    kind: "paint-colour",
    label: `${r.total.toLocaleString("en-IN")} brand paint shade${r.total === 1 ? "" : "s"}${describe ? " " + describe : ""} (page ${r.page} of ${r.pages})`,
    data: r.items,
    meta: {
      total: r.total,
      page: r.page,
      pages: r.pages,
      perPage: r.perPage,
      query: { q, brand: r.brand, family: family ?? null, sort },
      catalogueSize: shadeCount(),
      source: paintdb.source,
      license: paintdb.license,
      licenseUrl: paintdb.licenseUrl,
      attribution: paintdb.attribution,
      note: paintdb.note,
    },
    links: { self: req.nextUrl.pathname + req.nextUrl.search, html: `/colours?${html}`, brands: "/api/v1/colours/brands" },
    headers: publicCache,
  });
}
