import type { NextRequest } from "next/server";
import { apiError, apiOk, publicCache } from "@/lib/api";
import { cardSlugs, cardsMeta, cardWithSamples, echo } from "@/lib/colours/shade-card-api";
import { shadeCard } from "@/lib/colours/shade-cards";

export const runtime = "nodejs";

/**
 * GET /api/v1/colours/shade-cards/{brand}
 * One brand's shade card (the /shade-cards/{brand} page): the card's facts as in
 * /api/v1/colours/shade-cards, with each family's `sample` of swatches in card order, light to
 * dark: meta.sampleSize spread from the lightest to the darkest, or every shade of a family that
 * has no page of its own. A swatch is { id, brand, code, query, name, hex, lrv }: `code` is null
 * when the data has no real shade-card code, and `query` is what the colour finder is searched
 * with (/colours?brand={brand}&q={query}). An unknown brand is a 404 "not_found" listing the
 * brands in error.details. Data: PaintDB (paintdb.com), CC BY 4.0.
 * Example: GET /api/v1/colours/shade-cards/berger → { "kind": "shade-card", "data": { "slug": "berger",
 *   "name": "Berger Paints", "families": [{ "family": "white", "sample": [{ "code": "...", "name": "...", "hex": "#...", "lrv": 90 }, ...] }] } }
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ brand: string }> }) {
  const { brand } = await ctx.params;
  const card = shadeCard(brand);
  if (!card) return apiError(404, "not_found", `No shade card for brand "${echo(brand)}".`, cardSlugs());
  const swatches = card.families.reduce((n, f) => n + f.sample.length, 0);
  return apiOk({
    kind: "shade-card",
    label: `The ${card.name} shade card: ${card.count.toLocaleString("en-IN")} shades in ${card.families.length} colour families, ${swatches} swatches shown`,
    data: cardWithSamples(card),
    meta: { total: card.count, swatches, ...cardsMeta() },
    links: { self: `/api/v1/colours/shade-cards/${card.slug}`, html: `/shade-cards/${card.slug}`, cards: "/api/v1/colours/shade-cards", search: `/api/v1/colours/paint?brand=${card.slug}` },
    headers: publicCache,
  });
}
