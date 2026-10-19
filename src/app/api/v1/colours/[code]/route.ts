import { retiredShadeApi } from "@/lib/colours/retired";

export const runtime = "nodejs";

/**
 * GET /api/v1/colours/{code} (retired)
 * This returned one Paint Man shade by its own code (PM-xxx); those codes were replaced by the
 * brands' own shade cards. Every code now answers 410 Gone in the error envelope: error.code
 * "gone", and error.details with the successors, /api/v1/colours/paint (look a brand shade up with
 * ?brand=asian-paints&q=8386) and /api/v1/colours/brands. Cached publicly.
 * Example: GET /api/v1/colours/anything → 410 { "kind": "error", "error": { "code": "gone", ... } }
 */
export function GET() {
  return retiredShadeApi();
}
