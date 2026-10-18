import type { NextRequest } from "next/server";
import { apiError, apiOk, publicCache } from "@/lib/api";
import { isFamily, isRoom, searchColours, searchHints } from "@/lib/colours/search";

export const runtime = "nodejs";

/**
 * GET /api/v1/colours?q=sage&family=Greens&room=Bedroom&limit=10
 * Searches the Paint Man shade catalogue. All parameters optional.
 */
export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").slice(0, 80);
  const family = sp.get("family") ?? undefined;
  const room = sp.get("room") ?? undefined;
  const limitRaw = sp.get("limit");
  const limit = limitRaw === null ? undefined : Number(limitRaw);

  if (family !== undefined && !isFamily(family)) return apiError(400, "invalid_family", `Unknown family "${family}".`, searchHints().families);
  if (room !== undefined && !isRoom(room)) return apiError(400, "invalid_room", `Unknown room "${room}".`, searchHints().rooms);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) return apiError(400, "invalid_limit", "limit must be an integer from 1 to 100.");

  const items = searchColours({ q, family, room, limit });
  const describe = [q && `matching "${q}"`, family && `in ${family}`, room && `for ${room}`].filter(Boolean).join(", ");
  return apiOk({
    kind: "colour",
    label: `${items.length} Paint Man wall colour${items.length === 1 ? "" : "s"}${describe ? " " + describe : ""}`,
    data: items.map((c) => ({ ...c, links: { self: `/api/v1/colours/${c.code}`, html: `/colours/${c.code}` } })),
    meta: { total: items.length, query: { q, family: family ?? null, room: room ?? null, limit: limit ?? null }, hints: searchHints() },
    links: { self: req.nextUrl.pathname + req.nextUrl.search, html: `/colours${q ? `?q=${encodeURIComponent(q)}` : ""}` },
    headers: publicCache,
  });
}
