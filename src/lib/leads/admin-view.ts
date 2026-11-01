import { crewEstimate, formatSqft } from "./estimate";
import { LEAD_STATUSES, type LeadRecord, type LeadStatus } from "./record";

// How the team reads a lead: the job size, the crew estimate, the address line, the follow-up
// status, and the search and filters over the list. Plain functions with no server imports, shared
// by the website's leads table and the admin leads API (GET /api/admin/leads) the phone app reads.

export type LeadTypeFilter = "all" | "booking" | "visit" | "waitlist" | "contact";

export const LEAD_TYPE_FILTERS: readonly LeadTypeFilter[] = ["all", "booking", "visit", "waitlist", "contact"];

/** "2 floors · 3 BHK · 1,200 sq ft/floor" from the job-size columns (blank for messages). */
export function jobSize(l: LeadRecord): string {
  const floors = l.Floors ? (l.Floors === "1" ? "1 floor" : `${l.Floors} floors`) : "";
  const carpet = Number(l["Carpet Area per Floor (sq ft)"]) ? `${Number(l["Carpet Area per Floor (sq ft)"]).toLocaleString("en-IN")} sq ft/floor` : "";
  return [floors, l["Home Size"], carpet].filter(Boolean).join(" · ");
}

/** "≈ 8,400 sq ft · 84 painter-days (8 × 11 days)" from the estimated paint area. */
export function crew(l: LeadRecord): string {
  const area = Number(l["Est. Paint Area (sq ft)"]);
  if (!area) return l.Type === "booking" && l.Floors ? "Measure on site" : "";
  const c = crewEstimate(area);
  return `≈ ${formatSqft(area)} · ${c.painterDays} painter-days (${c.painters} × ${c.days} days)`;
}

/** "12 Rose Villa, Kamla Nagar, Agra 282005": the address columns, for bookings made after they were added. */
export function address(l: LeadRecord): string {
  const place = [l.Address, l.Locality, l.City].filter(Boolean).join(", ");
  return l["PIN Code"] ? `${place} ${l["PIN Code"]}` : place;
}

/** Where the lead came from: "google / diwali" from its campaign tags, else "Direct". */
export const leadSource = (l: LeadRecord) => [l["UTM Source"], l["UTM Campaign"]].filter(Boolean).join(" / ") || "Direct";

/** A lead's status, "New" until the team sets another. */
export const statusOf = (l: LeadRecord) => l.Status || "New";

/** The stored status for a label the table shows ("Not interested" → "not_interested"), or "" for a label outside the list. */
export function statusKey(label: string): LeadStatus | "" {
  const found = Object.entries(LEAD_STATUSES).find(([, l]) => l === label);
  return found ? (found[0] as LeadStatus) : "";
}

/** The distinct, non-empty values of a column across the leads, sorted: the options of a filter. */
export function optionsOf(leads: LeadRecord[], pick: (l: LeadRecord) => string): string[] {
  return [...new Set(leads.map(pick).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function filterLeads(leads: LeadRecord[], query: string, type: LeadTypeFilter, more: { city?: string; status?: string } = {}): LeadRecord[] {
  const q = query.trim().toLowerCase();
  return leads.filter((l) => {
    if (type !== "all" && l.Type !== type) return false;
    if (more.city && l.City !== more.city) return false;
    if (more.status && statusOf(l) !== more.status) return false;
    if (!q) return true;
    return [l.Name, l.Phone, address(l), l.Service, l.Message, l["Lead ID"]].some((v) => v.toLowerCase().includes(q));
  });
}

/** The four counts over the top of the list. */
export function leadStats(leads: LeadRecord[]) {
  return {
    total: leads.length,
    bookings: leads.filter((l) => l.Type === "booking").length,
    messages: leads.filter((l) => l.Type === "contact").length,
    new: leads.filter((l) => statusOf(l) === "New").length,
  };
}

/** One lead as the admin API sends it: camelCase fields, the time as ISO-8601 and as the team reads it in India. */
export type AdminLeadItem = {
  id: string;
  type: string;
  receivedAt: string;
  received: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  propertyType: string;
  service: string;
  jobSize: string;
  crew: string;
  preferredDate: string;
  message: string;
  source: string;
  channel: string;
  status: LeadStatus | "";
  statusLabel: string;
  projectId: string | null;
};

export function toAdminLeadItem(l: LeadRecord, receivedAt: Date): AdminLeadItem {
  const label = statusOf(l);
  return {
    id: l["Lead ID"],
    type: l.Type,
    receivedAt: receivedAt.toISOString(),
    received: l["Submitted At (IST)"],
    name: l.Name,
    phone: l.Phone,
    city: l.City,
    address: address(l),
    propertyType: l["Property Type"],
    service: l.Service,
    jobSize: jobSize(l),
    crew: crew(l),
    preferredDate: l["Preferred Inspection Date"],
    message: l.Message,
    source: leadSource(l),
    channel: l.Channel,
    status: statusKey(label),
    statusLabel: label,
    projectId: l["Project ID"] || null,
  };
}
