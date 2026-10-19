import { retiredShadeApi } from "@/lib/colours/retired";

export const runtime = "nodejs";

/**
 * GET /api/v1/colours (retired)
 * This listed Paint Man's own shade codes (PM-xxx), which were replaced by the brands' own shade
 * cards. It now answers 410 Gone in the error envelope: error.code "gone", and error.details with
 * the successors, /api/v1/colours/paint (search 50,000+ brand shades by brand, code, name or hex)
 * and /api/v1/colours/brands. Parameters: none (any are ignored). Sends publicCache, but src/proxy.ts currently forces
 * "no-store" on every /api response.
 * Example: GET /api/v1/colours?q=sage → 410 { "kind": "error", "error": { "code": "gone", "details": { "search": "/api/v1/colours/paint", ... } } }
 */
export function GET() {
  return retiredShadeApi();
}
