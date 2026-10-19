import type { NextRequest } from "next/server";
import { retiredShadeApi } from "@/lib/colours/retired";

export const runtime = "nodejs";

/**
 * GET /api/v1/colours/{code} (retired)
 * This returned one Paint Man shade by its own code (PM-xxx); those codes were replaced by the
 * brands' own shade cards. Every code now answers 410 Gone in the error envelope: error.code
 * "gone", and error.details with the successors, /api/v1/colours/paint (look a brand shade up with
 * ?brand=asian-paints&q=8386) and /api/v1/colours/brands. For a retired Paint Man code (any case, or
 * a short form such as pm502), error.details.replacement is its nearest Asian Paints shade:
 * { id, self, html }, the same shade the old /colours/{code} page redirects to.
 * Sends publicCache, but src/proxy.ts currently forces "no-store" on every /api response.
 * Example: GET /api/v1/colours/sage → 410 { "kind": "error", "error": { "code": "gone", "details": { "search": "/api/v1/colours/paint", ... } } }
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  return retiredShadeApi(code);
}
