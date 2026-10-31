import type { NextRequest } from "next/server";
import { adminFailure, readAdminInput, requireAdminRequest } from "@/lib/admin/guard";
import { personalOk } from "@/lib/api-personal";
import { inspectionVisitSchema } from "@/lib/projects/inputs";
import { markInspectionVisited } from "@/lib/projects/repo";

export const runtime = "nodejs";

/**
 * POST /api/admin/projects/{id}/inspection/visit
 * Admin only (signed admin session; same-origin). Records the inspection visit and its findings,
 * which the customer sees; a project earlier on the main line moves to "Inspection done".
 * Body: { visitedAt? (ISO date-time with offset; default now), findings?, inspectorName? }.
 * 200 { kind: "inspection", data: { projectId, visited: true } }. Errors: 400 invalid_request,
 * 401 unauthenticated, 403 forbidden, 404 not_found, 413, 415, 503, 500.
 * Example: POST /api/admin/projects/3f0c…/inspection/visit { "findings": "Damp patch on the north wall; needs waterproofing." }
 *   → 200 { "kind": "inspection", "data": { "visited": true } }
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminRequest(req);
    if (!auth.ok) return auth.response;
    const input = await readAdminInput(req, inspectionVisitSchema);
    if (!input.ok) return input.response;
    const { id } = await ctx.params;
    await markInspectionVisited(id, input.data);
    return personalOk({
      kind: "inspection",
      label: "Inspection marked visited.",
      data: { projectId: id, visited: true },
      links: { self: `/api/admin/projects/${id}/inspection/visit`, html: `/admin/projects/${id}` },
    });
  } catch (err) {
    return adminFailure(err, "Recording an inspection visit");
  }
}
