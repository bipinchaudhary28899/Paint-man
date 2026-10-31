import type { NextRequest } from "next/server";
import { apiError, apiOk, publicCache } from "@/lib/api";
import { isRoom, palettesForRoom, rooms, type PaletteShade } from "@/config/palettes";
import { getBrandShade, hasShadeCardCode, matchLabel, nearestBrandShades } from "@/lib/colours/brands";

export const runtime = "nodejs";

/**
 * GET /api/v1/palettes?room=Bedroom
 * Ready three-shade wall colour palettes: a feature wall, the other walls and ceiling, and an
 * accent, each a real brand shade-card code (Asian Paints) with the finish we would quote.
 * Parameters: room (optional), one of meta.hints.rooms; an unknown room is a 400 listing them.
 * Each colour: { code, name, hex, finish, id, brand, brandName, lrv, closest, links: { self, html } },
 * where links.self searches the shade in /api/v1/colours/paint and links.html opens it in the finder.
 * `lrv` is the shade's light reflectance value (null if the catalogue lacks it) and `closest` the
 * nearest Berger and Nerolac shade on screen, as the /palettes page names them: { id, brand,
 * brandName, code (null when the data has no real shade-card code), name, hex, lrv, distance (OKLab),
 * match ("Very close match", "Close match" or "Nearest in this range"), links: { html } }.
 * Example: GET /api/v1/palettes?room=Exterior → the exterior palettes, featureWall
 * { "code": "8771", "name": "Cambridge", "brandName": "Asian Paints", "finish": "Exterior weatherproof", ... }
 */
export function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room") ?? undefined;
  if (room !== undefined && !isRoom(room)) return apiError(400, "invalid_room", `Unknown room "${room}".`, [...rooms]);

  const items = palettesForRoom(room);
  return apiOk({
    kind: "palette",
    label: `${items.length} wall colour palette${items.length === 1 ? "" : "s"}${room ? ` for ${room}` : ""}, each three brand paint shades: a feature wall, the other walls and an accent`,
    data: items.map((p) => ({
      slug: p.slug,
      name: p.name,
      mood: p.mood,
      rooms: p.rooms,
      description: p.description,
      tip: p.tip,
      colours: {
        featureWall: pick(p.shades[0]),
        otherWalls: pick(p.shades[1]),
        accent: pick(p.shades[2]),
      },
      links: { html: `/palettes#${p.slug}`, book: `/book?palette=${p.slug}` },
    })),
    meta: { total: items.length, query: { room: room ?? null }, hints: { rooms: [...rooms] } },
    links: { self: req.nextUrl.pathname + req.nextUrl.search, html: "/palettes" },
    headers: publicCache,
  });
}

/** The other brands customers ask for by code, matched to each palette shade (as on the /palettes page). */
const MATCH_BRANDS = ["berger", "nerolac"];

/** The closest shade of each match brand, with how close it looks. */
const closest = (hex: string) =>
  nearestBrandShades(hex, MATCH_BRANDS, 1).flatMap((m) =>
    m.shades.slice(0, 1).map((s) => {
      const code = hasShadeCardCode(s) ? s.code : null;
      const search = new URLSearchParams({ brand: s.brand, q: code ?? s.name });
      return { id: s.id, brand: s.brand, brandName: s.brandName, code, name: s.name, hex: s.hex, lrv: s.lrv, distance: s.distance, match: matchLabel(s.distance), links: { html: `/colours?${search}` } };
    }),
  );

const pick = ({ id, brand, brandName, code, name, hex, finish }: PaletteShade) => {
  const search = new URLSearchParams({ brand, q: code });
  return {
    code,
    name,
    hex,
    finish,
    id,
    brand,
    brandName,
    lrv: getBrandShade(id)?.lrv ?? null,
    closest: closest(hex),
    links: { self: `/api/v1/colours/paint?${search}`, html: `/colours?${search}` },
  };
};
