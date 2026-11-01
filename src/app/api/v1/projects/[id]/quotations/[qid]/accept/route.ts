import type { NextRequest } from "next/server";
import { failure, personalError } from "@/lib/api-personal";
import { checkLimits, profileUserLimit, rateLimited } from "@/lib/auth/limits";
import { requireUser } from "@/lib/auth/user-session";
import { indiaToday } from "@/lib/leads/dates";
import { projectResponse } from "@/lib/projects/project-response";
import { approveQuotation, getProjectForUser } from "@/lib/projects/repo";

export const runtime = "nodejs";

/** The timeline line the team (and the customer) sees with the move to "Price finalised". */
const ACCEPTED_NOTE = "Accepted by the customer in the app.";

/**
 * POST /api/v1/projects/{id}/quotations/{qid}/accept (signed in: bearer token or the
 * website's cookie, same-origin)
 * The customer accepts a quotation they were sent: the price is final, exactly as when the team
 * approves it in /admin. Other sent versions become superseded, the project moves to "Price
 * finalised" with "Accepted by the customer in the app." on its timeline. Only the latest sent
 * version, still within its validity date (India time), can be accepted. No body.
 * 20 changes per account per 10 minutes. 200: the project, as GET /api/v1/projects/{id} gives it.
 * Errors: 401 unauthenticated, 404 not_found (no such project in the account, or no such quotation
 * in it), 409 not_acceptable (not the current sent version) or quotation_expired, 429 rate_limited.
 * Example: POST /api/v1/projects/3f0c…/quotations/9a1b…/accept
 *   → 200 { "kind": "project", "label": "Quotation accepted: the price is final.", "data": { "stage": "price_finalised", … } }
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; qid: string }> }) {
  try {
    const auth = await requireUser(req, { mutating: true });
    if (!auth.ok) return auth.response;
    const { user } = auth.session;
    const { id, qid: quotationId } = await ctx.params;

    const project = await getProjectForUser(user.id, id);
    const quotation = project?.quotations.find((q) => q.id === quotationId);
    if (!project || !quotation) return personalError(404, "not_found", "No such quotation in your account.");
    const latestSent = project.quotations.filter((q) => q.status === "sent").sort((a, b) => b.version - a.version)[0];
    if (quotation.status !== "sent" || latestSent?.id !== quotation.id) {
      return personalError(409, "not_acceptable", `Version ${quotation.version} is ${quotation.status === "sent" ? "not the latest one we sent" : quotation.status}; only the current quotation can be accepted.`);
    }
    if (quotation.validUntil && quotation.validUntil < indiaToday()) {
      return personalError(409, "quotation_expired", `This price held until ${quotation.validUntil}. Message us and we'll send a fresh quotation.`);
    }

    const wait = await checkLimits([[profileUserLimit(), user.id]]);
    if (wait) return rateLimited(wait);

    await approveQuotation(quotation.id, { projectId: project.id, note: ACCEPTED_NOTE });
    const updated = await getProjectForUser(user.id, id);
    return projectResponse(updated!, { label: "Quotation accepted: the price is final." });
  } catch (err) {
    return failure(err, "Accepting a quotation");
  }
}
