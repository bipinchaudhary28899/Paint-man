import { apiOk, publicCache } from "@/lib/api";
import { brandList, paintdb, shadeCount, shadeFamilies } from "@/lib/colours/brands";

export const runtime = "nodejs";

/**
 * GET /api/v1/colours/brands
 * The 25 paint brands in the brand-shade catalogue with their shade counts (Indian brands
 * first), plus the colour families to filter by. Data: PaintDB (paintdb.com), CC BY 4.0.
 * Example item: { "slug": "asian-paints", "name": "Asian Paints", "count": 2221 }
 */
export function GET() {
  const brands = brandList();
  return apiOk({
    kind: "paint-brand",
    label: `${brands.length} paint brands, ${shadeCount().toLocaleString("en-IN")} shades in all`,
    data: brands,
    meta: { total: brands.length, shades: shadeCount(), families: shadeFamilies(), source: paintdb.source, license: paintdb.license, licenseUrl: paintdb.licenseUrl, attribution: paintdb.attribution, note: paintdb.note },
    links: { self: "/api/v1/colours/brands", search: "/api/v1/colours/paint", html: "/colours" },
    headers: publicCache,
  });
}
