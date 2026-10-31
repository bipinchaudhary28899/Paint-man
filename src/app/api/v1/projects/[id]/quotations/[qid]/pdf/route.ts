import type { NextRequest } from "next/server";
import { failure, personalError } from "@/lib/api-personal";
import { requireUser } from "@/lib/auth/user-session";
import { noStore } from "@/lib/http";
import { quotationFilename, renderQuotationPdf } from "@/lib/pdf/quotation";
import { getVisibleQuotationForUser } from "@/lib/projects/repo";

export const runtime = "nodejs";

/**
 * GET /api/v1/projects/{id}/quotations/{qid}/pdf
 * The branded quotation PDF for one of the signed-in customer's projects (bearer token for the app,
 * the `ps_session` cookie for the website). Drafts are never served. The answer is the file itself
 * (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="Paint-Saathi-quotation-v{n}.pdf"`,
 * never cached), not the JSON envelope; errors are envelopes: 401 unauthenticated, 404 not_found
 * (unknown ids, a draft, or another customer's project), 503 database_unavailable.
 * Example: GET /api/v1/projects/3f0c…/quotations/9a8b…/pdf (Authorization: Bearer …) → 200 application/pdf,
 *   Content-Disposition: attachment; filename="Paint-Saathi-quotation-v2.pdf"
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; qid: string }> }) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const { id, qid } = await ctx.params;
    const doc = await getVisibleQuotationForUser(auth.session.user.id, id, qid);
    if (!doc) return personalError(404, "not_found", "No such quotation in your account.");
    const bytes = await renderQuotationPdf(doc);
    return new Response(Buffer.from(bytes), {
      headers: {
        ...noStore,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${quotationFilename(doc.quotation.version)}"`,
        "Content-Length": String(bytes.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return failure(err, "Making a quotation PDF");
  }
}
