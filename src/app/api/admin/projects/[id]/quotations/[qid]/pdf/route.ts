import type { NextRequest } from "next/server";
import { adminFailure, requireAdminRequest } from "@/lib/admin/guard";
import { personalError } from "@/lib/api-personal";
import { noStore } from "@/lib/http";
import { quotationFilename, renderQuotationPdf } from "@/lib/pdf/quotation";
import { getQuotationForAdmin } from "@/lib/projects/repo";

export const runtime = "nodejs";

/**
 * GET /api/admin/projects/{id}/quotations/{qid}/pdf
 * Admin only (signed admin session). The same branded PDF the customer downloads, for any version
 * of the project, drafts included (marked "Draft: not sent to the customer"), so staff can check it
 * before sending. Shown in the browser (`Content-Disposition: inline`), never cached; errors are
 * envelopes: 401 unauthenticated, 404 not_found (unknown ids or a quotation of another project),
 * 503 database_unavailable, 500 internal_error.
 * Example: GET /api/admin/projects/3f0c…/quotations/9a8b…/pdf → 200 application/pdf,
 *   Content-Disposition: inline; filename="Paint-Saathi-quotation-v2.pdf"
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; qid: string }> }) {
  try {
    const auth = await requireAdminRequest(req, { mutating: false });
    if (!auth.ok) return auth.response;
    const { id, qid } = await ctx.params;
    const doc = await getQuotationForAdmin(id, qid);
    if (!doc) return personalError(404, "not_found", "No such quotation on this project.");
    const bytes = await renderQuotationPdf(doc);
    return new Response(Buffer.from(bytes), {
      headers: {
        ...noStore,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${quotationFilename(doc.quotation.version)}"`,
        "Content-Length": String(bytes.byteLength),
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (err) {
    return adminFailure(err, "Making a quotation PDF preview");
  }
}
