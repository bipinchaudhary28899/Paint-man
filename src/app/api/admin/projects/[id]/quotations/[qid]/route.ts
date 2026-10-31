import type { NextRequest } from "next/server";
import { adminFailure, readAdminInput, requireAdminRequest } from "@/lib/admin/guard";
import { personalOk } from "@/lib/api-personal";
import { quotationSaveSchema } from "@/lib/projects/inputs";
import { quotationTotal, saveQuotation } from "@/lib/projects/repo";

export const runtime = "nodejs";

/** A long quotation (up to 100 lines with descriptions) needs more than the usual 16 KB. */
const MAX_QUOTATION_BYTES = 128 * 1024;

/**
 * PUT /api/admin/projects/{id}/quotations/{qid}
 * Admin only (signed admin session; same-origin). Saves a draft quotation: replaces its lines (in
 * the order given) and sets notes, payment terms and validity. Money is integer paise.
 * Body: { lines: [{ item, description?, areaSqft?, coats?, ratePaise?, amountPaise }], notes?,
 * paymentTerms?, validUntil? (YYYY-MM-DD) }. 200 { kind: "quotation", data: { id, lines, totalPaise,
 * currency: "INR" } }. Errors: 400 invalid_request (details: "lines.1.item" → message), 401
 * unauthenticated, 403 forbidden, 404 not_found (also a quotation of another project), 409
 * invalid_state (already sent), 413 (over 128 KB), 415, 503, 500.
 * Example: PUT /api/admin/projects/3f0c…/quotations/9a1b… { "lines": [{ "item": "Living room walls",
 *   "areaSqft": 420, "ratePaise": 2500, "amountPaise": 1050000 }], "validUntil": "2026-11-30" }
 *   → 200 { "kind": "quotation", "data": { "lines": 1, "totalPaise": 1050000, "currency": "INR" } }
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string; qid: string }> }) {
  try {
    const auth = await requireAdminRequest(req);
    if (!auth.ok) return auth.response;
    const input = await readAdminInput(req, quotationSaveSchema, { maxBytes: MAX_QUOTATION_BYTES });
    if (!input.ok) return input.response;
    const { id, qid } = await ctx.params;
    await saveQuotation(qid, input.data, { projectId: id });
    const totalPaise = quotationTotal(input.data.lines);
    return personalOk({
      kind: "quotation",
      label: `Draft saved: ${input.data.lines.length} line${input.data.lines.length === 1 ? "" : "s"}.`,
      data: { id: qid, lines: input.data.lines.length, totalPaise, currency: "INR" as const },
      links: { self: `/api/admin/projects/${id}/quotations/${qid}`, html: `/admin/projects/${id}` },
    });
  } catch (err) {
    return adminFailure(err, "Saving a quotation");
  }
}
