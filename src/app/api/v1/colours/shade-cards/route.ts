import { apiOk, publicCache } from "@/lib/api";
import { cardsMeta, cardSummary } from "@/lib/colours/shade-card-api";
import { shadeCards } from "@/lib/colours/shade-cards";

export const runtime = "nodejs";

/**
 * GET /api/v1/colours/shade-cards
 * The shade cards of the 4 major paint brands sold in India (the /shade-cards pages), without
 * swatches: each card's shade count and LRV range, and its colour families in card order (white
 * to black), each with its count, LRV range, lightest and darkest shade, two most common
 * undertones, a representative `swatch` hex and `hasPage` (families under meta.familyPageMin
 * shades have no page of their own). No parameters. Data: PaintDB (paintdb.com), CC BY 4.0.
 * Example item: { "slug": "asian-paints", "name": "Asian Paints", "shortName": "Asian Paints", "count": 2221,
 *   "lrv": { "min": 0, "max": 96 }, "families": [{ "family": "white", "label": "White", "count": 147, "hasPage": true, ... }] }
 */
export function GET() {
  const cards = shadeCards();
  const shades = cards.reduce((n, c) => n + c.count, 0);
  return apiOk({
    kind: "shade-card",
    label: `${cards.length} brand shade cards, ${shades.toLocaleString("en-IN")} shades in all`,
    data: cards.map(cardSummary),
    meta: { total: cards.length, shades, ...cardsMeta() },
    links: { self: "/api/v1/colours/shade-cards", html: "/shade-cards", search: "/api/v1/colours/paint" },
    headers: publicCache,
  });
}
