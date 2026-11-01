import type { NextRequest } from "next/server";
import { requireAdminRequest } from "@/lib/admin/guard";
import { failure, personalError, personalOk } from "@/lib/api-personal";
import { cities } from "@/config/site";
import { listProjects } from "@/lib/projects/repo";
import { isProjectStage, PROJECT_STAGES, STAGE_LABELS } from "@/lib/projects/stages";

export const runtime = "nodejs";

/**
 * GET /api/admin/projects?q=asha&stage=quotation_sent&city=agra&page=1&perPage=50
 * Admin only (signed admin session: the cookie, or the app's bearer token). The projects, most
 * recently updated first, as the website's /admin/projects lists them: search `q` (name, or 3+
 * digits of the phone; up to 80 characters), `stage` (a project stage), `city` (a city slug),
 * `page` (from 1) and `perPage` (1 to 100, default 50). Items: { id, name, phone, userId, leadId,
 * service, city, citySlug, locality, stage, stageLabel, createdAt, updatedAt, finalPricePaise?,
 * currency }. Errors: 400 invalid_stage / invalid_city / invalid_page / invalid_per_page (details
 * lists the valid choices), 401 unauthenticated, 503, 500. Never cached.
 * Example: GET /api/admin/projects?stage=quotation_sent
 *   → 200 { "kind": "project", "label": "2 projects (Quotation sent), page 1 of 1", "data": [{ "name": "Asha", … }] }
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminRequest(req, { mutating: false });
    if (!auth.ok) return auth.response;

    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") ?? "").trim().slice(0, 80);
    const stage = sp.get("stage") || undefined;
    const city = sp.get("city") || undefined;
    const page = sp.get("page") === null ? 1 : Number(sp.get("page"));
    const perPage = sp.get("perPage") === null ? 50 : Number(sp.get("perPage"));
    if (stage !== undefined && !isProjectStage(stage)) return personalError(400, "invalid_stage", `Unknown stage "${stage.slice(0, 40)}".`, [...PROJECT_STAGES]);
    if (city !== undefined && !cities.some((c) => c.slug === city)) return personalError(400, "invalid_city", `Unknown city "${city.slice(0, 40)}".`, cities.map((c) => c.slug));
    if (!Number.isInteger(page) || page < 1 || page > 10_000) return personalError(400, "invalid_page", "page must be an integer from 1 to 10000.");
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) return personalError(400, "invalid_per_page", "perPage must be an integer from 1 to 100.");

    const { items, total } = await listProjects({ stage, city, q: q || undefined, limit: perPage, offset: (page - 1) * perPage });
    const pages = Math.max(1, Math.ceil(total / perPage));
    const filters = [stage && STAGE_LABELS[stage], city && cities.find((c) => c.slug === city)?.name, q && `matching "${q}"`].filter(Boolean).join(", ");

    return personalOk({
      kind: "project",
      label: `${total} project${total === 1 ? "" : "s"}${filters ? ` (${filters})` : ""}, page ${page} of ${pages}`,
      data: items,
      meta: { total, page, pages, perPage, query: { q, stage: stage ?? null, city: city ?? null }, cities: cities.map((c) => ({ slug: c.slug, name: c.name })) },
      links: { self: req.nextUrl.pathname + req.nextUrl.search, html: "/admin/projects" },
    });
  } catch (err) {
    return failure(err, "Reading projects");
  }
}
