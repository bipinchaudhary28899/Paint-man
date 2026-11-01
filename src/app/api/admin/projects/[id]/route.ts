import type { NextRequest } from "next/server";
import { requireAdminRequest } from "@/lib/admin/guard";
import { failure, personalError, personalOk } from "@/lib/api-personal";
import { getProjectForAdmin } from "@/lib/projects/repo";

export const runtime = "nodejs";

/**
 * GET /api/admin/projects/{id}
 * Admin only (signed admin session: the cookie, or the app's bearer token). Everything the website's
 * /admin/projects/{id} shows: the customer and the job (with the booking's lead), the stage and what
 * the customer reads for it, the crew's start date, the inspection, the timeline (oldest first) and
 * every quotation version, drafts included (each with its lines, totals in paise and the admin PDF at
 * /api/admin/projects/{id}/quotations/{qid}/pdf). Errors: 401 unauthenticated, 404 not_found, 503, 500.
 * Never cached. Example: GET /api/admin/projects/3f0c…
 *   → 200 { "kind": "project", "label": "Asha's project: Quotation sent", "data": { "id": "3f0c…", "stage": "quotation_sent", … } }
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminRequest(req, { mutating: false });
    if (!auth.ok) return auth.response;
    const { id } = await ctx.params;
    const project = await getProjectForAdmin(id);
    if (!project) return personalError(404, "not_found", "No such project.");
    return personalOk({
      kind: "project",
      label: `${project.name}'s project: ${project.stageLabel}`,
      data: project,
      links: { self: `/api/admin/projects/${id}`, html: `/admin/projects/${id}`, quotations: `/api/admin/projects/${id}/quotations` },
    });
  } catch (err) {
    return failure(err, "Reading a project");
  }
}
