import type { NextRequest } from "next/server";
import { adminFailure, readAdminInput, requireAdminRequest } from "@/lib/admin/guard";
import { personalOk } from "@/lib/api-personal";
import { workStartSchema } from "@/lib/projects/inputs";
import { setWorkStartDate } from "@/lib/projects/repo";

export const runtime = "nodejs";

/**
 * PUT /api/admin/projects/{id}/work-start
 * Admin only (signed admin session; same-origin). Sets or clears the crew's start date without
 * changing the stage; the customer's "Work scheduled" step names it.
 * Body: { workStartsOn: "YYYY-MM-DD" | null }. 200 { kind: "project", data: { id, workStartsOn } }.
 * Errors: 400 invalid_request, 401 unauthenticated, 403 forbidden, 404 not_found, 413, 415, 503, 500.
 * Example: PUT /api/admin/projects/3f0c…/work-start { "workStartsOn": "2026-11-10" } → 200 { "data": { "workStartsOn": "2026-11-10" } }
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminRequest(req);
    if (!auth.ok) return auth.response;
    const input = await readAdminInput(req, workStartSchema);
    if (!input.ok) return input.response;
    const { id } = await ctx.params;
    const { workStartsOn } = input.data;
    await setWorkStartDate(id, workStartsOn);
    return personalOk({
      kind: "project",
      label: workStartsOn ? `Work start date set to ${workStartsOn}.` : "Work start date cleared.",
      data: { id, workStartsOn },
      links: { self: `/api/admin/projects/${id}/work-start`, html: `/admin/projects/${id}` },
    });
  } catch (err) {
    return adminFailure(err, "Setting a project's work start date");
  }
}
