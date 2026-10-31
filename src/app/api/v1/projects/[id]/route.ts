import type { NextRequest } from "next/server";
import { failure, fieldErrors, personalError, personalOk, readJsonBody } from "@/lib/api-personal";
import { checkLimits, profileUserLimit, rateLimited } from "@/lib/auth/limits";
import { requireUser } from "@/lib/auth/user-session";
import { detailSteps, stepsProgress } from "@/lib/projects/details";
import { projectDetailsSchema } from "@/lib/projects/inputs";
import { getProjectForUser, updateProjectDetailsForUser, type ProjectDetail } from "@/lib/projects/repo";

export const runtime = "nodejs";

/**
 * GET /api/v1/projects/{id}
 * One of the signed-in customer's projects: the tracker. data: { id, service, city, citySlug,
 * locality, address, pincode, propertyType, floors, homeSize, carpetArea, preferredDate, notes,
 * location ({ lat, lng } | null, the address's map pin), detailsEditable (the address and job can be
 * added until the inspection), stage, stageLabel, stageExplanation, workStartsOn, createdAt,
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
    return projectResponse(project);
  } catch (err) {
    return failure(err, "Reading a project");
  }
}

function projectResponse(project: ProjectDetail, status = 200) {
  const where = [project.locality, project.city].filter(Boolean).join(", ");
  const progress = stepsProgress(detailSteps(project));
  return personalOk({
    status,
    kind: "project",
    label: `${project.service ?? "Painting"} project${where ? ` in ${where}` : ""}: ${project.stageLabel}.`,
    data: project,
    meta: { quotations: project.quotations.length, detailSteps: { done: progress.done, total: progress.total } },
    links: { self: `/api/v1/projects/${project.id}`, html: `/account/projects/${project.id}`, projects: "/api/v1/projects" },
  });
}

/**
 * PATCH /api/v1/projects/{id} (website cookie from this origin, or the app's bearer token)
 * The customer adds or corrects their project's address and job until the inspection: any of
 * address, locality, pincode (the address step) and service, propertyType, floors, homeSize,
 * carpetArea, preferredDate (YYYY-MM-DD), notes (the job step), and location { lat, lng } (the
 * address's map pin, from the app; null removes it). Each field sent replaces what was
 * there; "" or null clears an optional one (the locality cannot be cleared). Unknown fields are
 * refused. Answers with the updated project, as GET does. 20 updates per account per 10 minutes.
 * Errors: 400 invalid_request (details: field → message), 401 unauthenticated, 403 forbidden
 * (another origin), 404 not_found, 409 details_locked (the inspector has visited), 413, 415, 429.
 * Example: PATCH /api/v1/projects/3f0c… { "address": "12 Rose Villa, Nehru Road", "pincode": "282005" }
 *   → 200 { "kind": "project", "data": { "address": "12 Rose Villa, Nehru Road", "pincode": "282005", … }, "meta": { "detailSteps": { "done": 1, "total": 2 } } }
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireUser(req, { mutating: true });
    if (!auth.ok) return auth.response;
    const { user } = auth.session;

    const read = await readJsonBody(req);
    if (!read.ok) return read.response;
    if (!read.body || typeof read.body !== "object" || Array.isArray(read.body)) {
      return personalError(400, "invalid_request", "The body must be a JSON object with the fields to change.");
    }
    const parsed = projectDetailsSchema.safeParse(read.body);
    if (!parsed.success) return personalError(400, "invalid_request", "Please check the highlighted fields.", fieldErrors(parsed.error));

    const wait = await checkLimits([[profileUserLimit(), user.id]]);
    if (wait) return rateLimited(wait);

    const { id } = await ctx.params;
    const result = await updateProjectDetailsForUser(user.id, id, parsed.data);
    if (!result.ok && result.reason === "not_found") return personalError(404, "not_found", "No such project in your account.");
    if (!result.ok) return personalError(409, "details_locked", "The inspector has visited, so the address and job are set. Message us to change anything.");
    return projectResponse(result.project);
  } catch (err) {
    return failure(err, "Updating a project");
  }
}
