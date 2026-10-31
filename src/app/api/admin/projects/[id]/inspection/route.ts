import type { NextRequest } from "next/server";
import { adminFailure, readAdminInput, requireAdminRequest } from "@/lib/admin/guard";
import { personalOk } from "@/lib/api-personal";
import { inspectionScheduleSchema } from "@/lib/projects/inputs";
import { scheduleInspection } from "@/lib/projects/repo";
import { formatVisit } from "@/lib/projects/stages";

export const runtime = "nodejs";

/**
 * PUT /api/admin/projects/{id}/inspection
 * Admin only (signed admin session; same-origin). Schedules or reschedules the site inspection;
 * a project earlier on the main line moves to "Inspection scheduled".
 * Body: { scheduledAt: ISO date-time with offset, inspectorName? }. 200 { kind: "inspection",
 * data: { projectId, scheduledAt } }. Errors: 400 invalid_request, 401 unauthenticated, 403 forbidden,
 * 404 not_found, 413, 415, 503, 500.
 * Example: PUT /api/admin/projects/3f0c…/inspection { "scheduledAt": "2026-11-04T11:30:00+05:30", "inspectorName": "Ramesh" }
 *   → 200 { "kind": "inspection", "data": { "scheduledAt": "2026-11-04T06:00:00.000Z" } }
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminRequest(req);
    if (!auth.ok) return auth.response;
    const input = await readAdminInput(req, inspectionScheduleSchema);
    if (!input.ok) return input.response;
    const { id } = await ctx.params;
    const { scheduledAt, inspectorName } = input.data;
    await scheduleInspection(id, { scheduledAt, inspectorName });
    return personalOk({
      kind: "inspection",
      label: `Inspection scheduled for ${formatVisit(scheduledAt)}.`,
      data: { projectId: id, scheduledAt: scheduledAt.toISOString() },
      links: { self: `/api/admin/projects/${id}/inspection`, html: `/admin/projects/${id}` },
    });
  } catch (err) {
    return adminFailure(err, "Scheduling an inspection");
  }
}
