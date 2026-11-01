import type { NextRequest } from "next/server";
import { requireAdminRequest } from "@/lib/admin/guard";
import { failure, personalError, personalOk } from "@/lib/api-personal";
import { filterLeads, LEAD_TYPE_FILTERS, leadStats, optionsOf, statusOf, toAdminLeadItem, type LeadTypeFilter } from "@/lib/leads/admin-view";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/leads/record";
import { readLeadEntries } from "@/lib/leads/store";

export const runtime = "nodejs";

/**
 * GET /api/admin/leads?q=asha&type=booking&city=Agra&status=new&page=1&perPage=50
 * Admin only (signed admin session: the cookie, or the app's bearer token). The leads newest first,
 * as the website's leads table shows them, for the phone app: search `q` (name, phone, address,
 * service, message or id; up to 80 characters), `type` (all | booking | visit | waitlist | contact),
 * `city` (a city name from meta.options.cities), `status` (new | called | converted |
 * not_interested | spam), `page` (from 1) and `perPage` (1 to 100, default 50).
 * Items: { id, type, receivedAt, received, name, phone, city, address, propertyType, service,
 * jobSize, crew, preferredDate, message, source, channel, status, statusLabel, projectId }.
 * meta: { total (matching), page, pages, perPage, query, stats: { total, bookings, messages, new },
 * options: { cities, statuses } }. Errors: 400 invalid_type / invalid_city / invalid_status /
 * invalid_page / invalid_per_page (details lists the valid choices), 401 unauthenticated, 503, 500.
 * Never cached. Example: GET /api/admin/leads?type=booking&perPage=20
 *   → 200 { "kind": "lead", "label": "3 leads (bookings), page 1 of 1", "data": [{ "name": "Asha", … }] }
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminRequest(req, { mutating: false });
    if (!auth.ok) return auth.response;

    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") ?? "").trim().slice(0, 80);
    const type = sp.get("type") || "all";
    const city = sp.get("city") || "";
    const status = sp.get("status") || "";
    const page = sp.get("page") === null ? 1 : Number(sp.get("page"));
    const perPage = sp.get("perPage") === null ? 50 : Number(sp.get("perPage"));
    if (!(LEAD_TYPE_FILTERS as readonly string[]).includes(type)) return personalError(400, "invalid_type", `Unknown lead type "${type.slice(0, 40)}".`, [...LEAD_TYPE_FILTERS]);
    if (status && !Object.hasOwn(LEAD_STATUSES, status)) return personalError(400, "invalid_status", `Unknown status "${status.slice(0, 40)}".`, Object.keys(LEAD_STATUSES));
    if (!Number.isInteger(page) || page < 1 || page > 10_000) return personalError(400, "invalid_page", "page must be an integer from 1 to 10000.");
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) return personalError(400, "invalid_per_page", "perPage must be an integer from 1 to 100.");

    const entries = await readLeadEntries();
    const records = entries.map((e) => e.record);
    const cities = optionsOf(records, (l) => l.City);
    if (city && !cities.includes(city)) return personalError(400, "invalid_city", `No leads from "${city.slice(0, 40)}".`, cities);

    const when = new Map(entries.map((e) => [e.record["Lead ID"], e.createdAt]));
    const matching = filterLeads(records, q, type as LeadTypeFilter, { city, status: status ? LEAD_STATUSES[status as LeadStatus] : "" });
    const pages = Math.max(1, Math.ceil(matching.length / perPage));
    const items = matching.slice((page - 1) * perPage, page * perPage).map((l) => toAdminLeadItem(l, when.get(l["Lead ID"])!));
    const filters = [type !== "all" && `${type}s`, city, status && LEAD_STATUSES[status as LeadStatus], q && `matching "${q}"`].filter(Boolean).join(", ");

    return personalOk({
      kind: "lead",
      label: `${matching.length} lead${matching.length === 1 ? "" : "s"}${filters ? ` (${filters})` : ""}, page ${page} of ${pages}`,
      data: items,
      meta: {
        total: matching.length,
        page,
        pages,
        perPage,
        query: { q, type, city: city || null, status: status || null },
        stats: leadStats(records),
        options: { cities, statuses: optionsOf(records, statusOf) },
      },
      links: { self: req.nextUrl.pathname + req.nextUrl.search, html: "/admin" },
    });
  } catch (err) {
    return failure(err, "Reading leads");
  }
}
