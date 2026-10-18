import type { NextRequest } from "next/server";
import { apiError, apiOk, publicCache } from "@/lib/api";
import { getColour, pairings, similar } from "@/lib/colours/search";

export const runtime = "nodejs";

/** GET /api/v1/colours/PM-502 — one shade with its pairings and similar shades. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const colour = getColour(code);
  if (!colour) return apiError(404, "not_found", `No colour with code "${code}". Codes look like PM-502.`);
  return apiOk({
    kind: "colour",
    label: `${colour.name} (${colour.code}): ${colour.family.toLowerCase()} wall colour, ${colour.hex}`,
    data: {
      ...colour,
      pairings: pairings(colour).map(({ code, name, hex }) => ({ code, name, hex })),
      similar: similar(colour).map(({ code, name, hex }) => ({ code, name, hex })),
    },
    links: { self: `/api/v1/colours/${colour.code}`, html: `/colours/${colour.code}`, book: `/book?colour=${colour.code}` },
    headers: publicCache,
  });
}
