import type { NextRequest } from "next/server";
import { apiError, apiOk, publicCache } from "@/lib/api";
import { palettesForRoom } from "@/lib/colours/palettes";
import { isRoom, searchHints } from "@/lib/colours/search";

export const runtime = "nodejs";

/** GET /api/v1/palettes?room=Bedroom — curated three-shade palettes with the shades resolved. */
export function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room") ?? undefined;
  if (room !== undefined && !isRoom(room)) return apiError(400, "invalid_room", `Unknown room "${room}".`, searchHints().rooms);

  const items = palettesForRoom(room);
  return apiOk({
    kind: "palette",
    label: `${items.length} Paint Man colour palette${items.length === 1 ? "" : "s"}${room ? ` for ${room}` : ""}`,
    data: items.map((p) => ({
      slug: p.slug,
      name: p.name,
      mood: p.mood,
      rooms: p.rooms,
      description: p.description,
      tip: p.tip,
      colours: {
        featureWall: pick(p.colours[0]),
        otherWalls: pick(p.colours[1]),
        accent: pick(p.colours[2]),
      },
      links: { html: `/palettes#${p.slug}`, book: `/book?palette=${p.slug}` },
    })),
    meta: { total: items.length, query: { room: room ?? null }, hints: { rooms: searchHints().rooms } },
    links: { self: req.nextUrl.pathname + req.nextUrl.search, html: "/palettes" },
    headers: publicCache,
  });
}

const pick = ({ code, name, hex, finish }: { code: string; name: string; hex: string; finish: string }) => ({ code, name, hex, finish, links: { self: `/api/v1/colours/${code}`, html: `/colours/${code}` } });
