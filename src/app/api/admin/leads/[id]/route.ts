import type { NextRequest } from "next/server";
import { z } from "zod";
import { readAdminInput, requireAdminRequest } from "@/lib/admin/guard";
import { failure, personalError, personalOk } from "@/lib/api-personal";
import { LEAD_STATUSES, statusLabel, type LeadStatus } from "@/lib/leads/record";
import { updateLeadStatus } from "@/lib/leads/store";

export const runtime = "nodejs";

const statusSchema = z.object({
  status: z.enum(Object.keys(LEAD_STATUSES) as [LeadStatus, ...LeadStatus[]], { message: "Choose a status" }),
});

/**
 * PATCH /api/admin/leads/{id}
 * Admin only (the signed admin session cookie; same-origin). Sets a lead's follow-up status.
 * Body: { status: "new" | "called" | "converted" | "not_interested" | "spam" }.
 * 200 { kind: "lead", data: { id, status, statusLabel } }. Errors: 400 invalid_request (details.status
 * lists the choices), 401 unauthenticated, 403 forbidden, 404 not_found, 413, 415, 503, 500.
 * Example: PATCH /api/admin/leads/3f0c… { "status": "called" } → 200 { "kind": "lead", "data": { "status": "called", "statusLabel": "Called" } }
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminRequest(req);
    if (!auth.ok) return auth.response;
    const input = await readAdminInput(req, statusSchema);
    if (!input.ok) return input.response;
    const { id } = await ctx.params;
    const { status } = input.data;
    if (!(await updateLeadStatus(id, status))) return personalError(404, "not_found", "No such lead.");
    return personalOk({
      kind: "lead",
      label: `Lead marked ${statusLabel(status)}.`,
      data: { id, status, statusLabel: statusLabel(status) },
      links: { self: `/api/admin/leads/${id}`, html: "/admin" },
    });
  } catch (err) {
    return failure(err, "Updating a lead's status");
  }
}
