import type { NextRequest } from "next/server";
import { failure, personalError, personalOk } from "@/lib/api-personal";
import { requireUser } from "@/lib/auth/user-session";
import { getProjectForUser } from "@/lib/projects/repo";

export const runtime = "nodejs";

/**
 * GET /api/v1/projects/{id}
 * One of the signed-in customer's projects: the tracker. data: { id, service, city, citySlug,
 * locality, address, pincode, stage, stageLabel, stageExplanation, workStartsOn, createdAt,
 * updatedAt, stages: [{ stage, label, done, current, at? }] (the main line, plus "on_hold" or
 * "cancelled" as the current step when paused), timeline: [{ stage, label, note, at }] (oldest
 * first), inspection: { scheduledAt, visitedAt, inspectorName, findings } | null, quotations:
 * [{ id, version, status, sentAt, approvedAt, validUntil, notes, paymentTerms, lines: [{ position,
 * item, description, areaSqft, coats, ratePaise, amountPaise }], subtotalPaise, totalPaise,
 * currency: "INR", pdf }] (newest version first; drafts are never shown), finalPricePaise? (the
 * approved quotation's total), currency }. Errors: 401 unauthenticated, 404 not_found (also for
 * another customer's project).
 * Example: GET /api/v1/projects/3f0c… (Authorization: Bearer …) → 200 { "kind": "project", "data": { "stage":
 *   "quotation_shared", "stageLabel": "Quotation shared", "quotations": [{ "version": 1, "status": "sent", "totalPaise": 4500000, … }] } }
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const { id } = await ctx.params;
    const project = await getProjectForUser(auth.session.user.id, id);
    if (!project) return personalError(404, "not_found", "No such project in your account.");
    const where = [project.locality, project.city].filter(Boolean).join(", ");
    return personalOk({
      kind: "project",
      label: `${project.service ?? "Painting"} project${where ? ` in ${where}` : ""}: ${project.stageLabel}.`,
      data: project,
      meta: { quotations: project.quotations.length },
      links: { self: `/api/v1/projects/${project.id}`, html: `/account/projects/${project.id}`, projects: "/api/v1/projects" },
    });
  } catch (err) {
    return failure(err, "Reading a project");
  }
}
