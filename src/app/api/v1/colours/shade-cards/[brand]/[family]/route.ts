import type { NextRequest } from "next/server";
import { apiError, apiOk, publicCache } from "@/lib/api";
import { cardSlugs, cardsMeta, echo, familySummary } from "@/lib/colours/shade-card-api";
import { familyShades, shadeCard, shadeCardFamily, toSwatch } from "@/lib/colours/shade-cards";

export const runtime = "nodejs";

/**
 * GET /api/v1/colours/shade-cards/{brand}/{family}
 * One colour family of a brand's shade card (the /shade-cards/{brand}/{family} page): the
 * family's facts as in /api/v1/colours/shade-cards, plus every one of its shades as swatches in
 * card order, light to dark ({ id, brand, code, query, name, hex, lrv }; `code` is null when the
 * data has no real shade-card code). A family is a few hundred shades at most (524 today), so it
 * comes whole, as the page shows it. Only families with a page have one here (meta.familyPageMin
 * shades or more; the brand's card lists all of a smaller family). An unknown brand is a 404
 * "not_found" listing the brands; an unknown family, or one without a page, is a 404 "not_found"
 * listing that brand's families with pages. Data: PaintDB (paintdb.com), CC BY 4.0.
 * Example: GET /api/v1/colours/shade-cards/asian-paints/blue → { "kind": "shade-card-family",
 *   "data": { "brand": "asian-paints", "family": "blue", "count": 346, "shades": [{ "code": "...", ... }] } }
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ brand: string; family: string }> }) {
  const { brand, family } = await ctx.params;
  const card = shadeCard(brand);
  if (!card) return apiError(404, "not_found", `No shade card for brand "${echo(brand)}".`, cardSlugs());
  const found = shadeCardFamily(brand, family);
  if (!found) {
    const withPages = card.families.filter((f) => f.hasPage).map((f) => f.family);
    return apiError(404, "not_found", `The ${card.name} card has no "${echo(family)}" family page.`, withPages);
  }
  const f = found.family;
  const shades = familyShades(card.slug, f.family).map(toSwatch);
  return apiOk({
    kind: "shade-card-family",
    label: `${f.count.toLocaleString("en-IN")} ${card.shortName} ${f.family} shades from the ${card.name} card, light to dark`,
    data: { brand: card.slug, brandName: card.name, shortName: card.shortName, ...familySummary(card, f), shades },
    meta: { total: shades.length, ...cardsMeta() },
    links: {
      self: `/api/v1/colours/shade-cards/${card.slug}/${f.family}`,
      html: `/shade-cards/${card.slug}/${f.family}`,
      card: `/api/v1/colours/shade-cards/${card.slug}`,
      search: `/api/v1/colours/paint?brand=${card.slug}&family=${f.family}`,
    },
    headers: publicCache,
  });
}
