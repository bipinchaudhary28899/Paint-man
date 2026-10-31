import type { NextRequest } from "next/server";
import { adminFailure, readAdminInput, requireAdminRequest } from "@/lib/admin/guard";
import { personalOk } from "@/lib/api-personal";
import { quotationStatusSchema } from "@/lib/projects/inputs";
import { approveQuotation, declineQuotation, sendQuotation } from "@/lib/projects/repo";

export const runtime = "nodejs";

const ACTIONS = {
  sent: { run: sendQuotation, label: "sent to the customer" },
  approved: { run: approveQuotation, label: "approved: the price is final" },
  declined: { run: declineQuotation, label: "marked declined" },
} as const;

/**
 * POST /api/admin/projects/{id}/quotations/{qid}/status
 * Admin only (signed admin session; same-origin). Moves a quotation on:
 * - "sent": sends a draft (it needs at least one line) to the customer, who then sees it and its
 *   PDF; the project moves to "Quotation shared" (a revision posts "Revised quotation (version n).").
 * - "approved": the customer accepted a sent (or earlier declined) version: the price is final,
 *   other sent versions become superseded and the project moves to "Price finalised".
 * - "declined": the customer turned a sent version down.
 * Body: { status: "sent" | "approved" | "declined" }. 200 { kind: "quotation", data: { id, status } }.
 * Errors: 400 invalid_request, 401 unauthenticated, 403 forbidden, 404 not_found (also a quotation of
 * another project), 409 invalid_state (e.g. sending one already sent), 413, 415, 503, 500.
 * Example: POST /api/admin/projects/3f0c…/quotations/9a1b…/status { "status": "sent" } → 200 { "kind": "quotation", "data": { "status": "sent" } }
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; qid: string }> }) {
  try {
    const auth = await requireAdminRequest(req);
    if (!auth.ok) return auth.response;
    const input = await readAdminInput(req, quotationStatusSchema);
    if (!input.ok) return input.response;
    const { id, qid } = await ctx.params;
    const { status } = input.data;
    const action = ACTIONS[status];
    await action.run(qid, { projectId: id });
    return personalOk({
      kind: "quotation",
      label: `Quotation ${action.label}.`,
      data: { id: qid, status },
      links: { self: `/api/admin/projects/${id}/quotations/${qid}`, html: `/admin/projects/${id}` },
    });
  } catch (err) {
    return adminFailure(err, "Changing a quotation's status");
  }
}
