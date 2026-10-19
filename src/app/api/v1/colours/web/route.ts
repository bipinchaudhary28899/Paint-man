import { retiredWebColoursApi } from "@/lib/colours/retired";

export const runtime = "nodejs";

/**
 * GET /api/v1/colours/web — retired. It searched public named colours for the photo visualizer,
 * which was removed; shades are now previewed on the colour finder's room photo.
 * Answers 410 with code "gone"; error.details lists the successors.
 * Example: GET /api/v1/colours/web?q=sage → 410 { error: { code: "gone", details: { search: "/api/v1/colours/paint", brands: "/api/v1/colours/brands", html: "/colours" } } }
 */
export function GET() {
  return retiredWebColoursApi();
}
