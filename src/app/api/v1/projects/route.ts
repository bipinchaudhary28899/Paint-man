import type { NextRequest } from "next/server";
import { failure, personalOk } from "@/lib/api-personal";
import { requireUser } from "@/lib/auth/user-session";
import { listProjectsForUser } from "@/lib/projects/repo";

export const runtime = "nodejs";

/**
 * GET /api/v1/projects
 * The signed-in customer's painting projects (bearer token or the `ps_session` cookie), newest
 * first. Each: { id, service, city, citySlug, locality, stage, stageLabel, createdAt, updatedAt,
 * finalPricePaise? (once a quotation is approved), currency: "INR" }. Money is integer paise.
 * Errors: 401 unauthenticated.
 * Example: GET /api/v1/projects (Authorization: Bearer …) → 200 { "kind": "project", "data": [{ "id": "…",
 *   "service": "Interior Painting", "city": "Agra", "stage": "booked", "stageLabel": "Booking received", … }] }
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const projects = await listProjectsForUser(auth.session.user.id);
    return personalOk({
      kind: "project",
      label: projects.length === 1 ? "1 painting project" : `${projects.length} painting projects`,
      data: projects,
      meta: { total: projects.length },
      links: { self: "/api/v1/projects", html: "/account" },
    });
  } catch (err) {
    return failure(err, "Listing projects");
  }
}
