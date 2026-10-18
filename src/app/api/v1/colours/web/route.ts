import type { NextRequest } from "next/server";
import { apiError, apiOk, publicCache } from "@/lib/api";
import { isColourFamily, loadWebColours, searchWebColours } from "@/lib/colours/web";
import { searchHints } from "@/lib/colours/search";

export const runtime = "nodejs";

/**
 * GET /api/v1/colours/web?q=sage&family=Greens&page=1&perPage=60
 * Searches the public named-colour catalogue (≈32,000 colours from color.pizza, proxied and
 * cached server-side). Same envelope as /api/v1/colours; items carry name, hex, family and LRV
 * but no Paint Man code: they are shades to match at the inspection, not catalogue items.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").slice(0, 80);
  const family = sp.get("family") ?? undefined;
  const page = sp.get("page") === null ? 1 : Number(sp.get("page"));
  const perPage = sp.get("perPage") === null ? 60 : Number(sp.get("perPage"));
  if (family !== undefined && !isColourFamily(family)) return apiError(400, "invalid_family", `Unknown family "${family}".`, searchHints().families);
  if (!Number.isInteger(page) || page < 1) return apiError(400, "invalid_page", "page must be a positive integer.");
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 200) return apiError(400, "invalid_per_page", "perPage must be an integer from 1 to 200.");

  let items;
  try {
    items = await loadWebColours();
  } catch (err) {
    console.error("colour names source unavailable:", err instanceof Error ? err.message : "unknown");
    return apiError(503, "source_unavailable", "The public colour catalogue is unavailable right now. Try again in a minute.");
  }
  const result = searchWebColours(items, { q, family, page, perPage });
  const describe = [q && `matching "${q}"`, family && `in ${family}`].filter(Boolean).join(", ");
  return apiOk({
    kind: "web-colour",
    label: `${result.total} named colour${result.total === 1 ? "" : "s"}${describe ? " " + describe : ""} (page ${result.page} of ${result.pages})`,
    data: result.items,
    meta: { total: result.total, page: result.page, pages: result.pages, perPage: result.perPage, query: { q, family: family ?? null }, source: "color.pizza (Color Names, CC0)", catalogueSize: items.length },
    links: { self: req.nextUrl.pathname + req.nextUrl.search, html: `/colours?catalogue=web${q ? `&q=${encodeURIComponent(q)}` : ""}` },
    headers: publicCache,
  });
}
