"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { crewEstimate, formatSqft } from "@/lib/leads/estimate";
import { LEAD_STATUSES, type LeadRecord, type LeadStatus } from "@/lib/leads/record";
import { adminSend } from "./useAdminAction";

type Filter = "all" | "booking" | "visit" | "waitlist" | "contact";

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

/** A lead's status, "New" until the team sets another. */
export const statusOf = (l: LeadRecord) => l.Status || "New";

/** The stored status for a label the table shows ("Not interested" → "not_interested"), or "" for a label outside the list. */
export function statusKey(label: string): LeadStatus | "" {
  const found = Object.entries(LEAD_STATUSES).find(([, l]) => l === label);
  return found ? (found[0] as LeadStatus) : "";
}

/**
 * The status control of one lead: choosing another status saves it at once (PATCH
 * /api/admin/leads/{id}); the choice shows straight away and goes back if the save fails.
 */
function StatusSelect({ lead, onSaved }: { lead: LeadRecord; onSaved: (label: string) => void }) {
  const [pending, setPending] = useState<LeadStatus | null>(null);
  const [error, setError] = useState("");
  const current = statusOf(lead);
  const key = statusKey(current);

  async function change(next: LeadStatus) {
    setPending(next);
    setError("");
    const result = await adminSend<{ statusLabel: string }>("PATCH", `/api/admin/leads/${lead["Lead ID"]}`, { status: next });
    if (result.ok) onSaved(result.data.statusLabel);
    else setError(result.status === 401 ? "Session ended: sign in again." : result.message);
    setPending(null);
  }

  return (
    <div>
      <select
        aria-label={`Status of ${lead.Name}`}
        value={pending ?? (key || current)}
        disabled={pending !== null}
        onChange={(e) => change(e.target.value as LeadStatus)}
        className="field w-auto min-w-36 !py-2 !pl-3 !pr-9 text-sm disabled:opacity-60"
      >
        {!key && (
          <option value={current} disabled>
            {current}
          </option>
        )}
        {Object.entries(LEAD_STATUSES).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-1 max-w-48 text-xs font-semibold text-danger">
          Not saved: {error}
        </p>
      )}
    </div>
  );
}

/** The distinct, non-empty values of a column across the leads, sorted: the options of a filter. */
export function optionsOf(leads: LeadRecord[], pick: (l: LeadRecord) => string): string[] {
  return [...new Set(leads.map(pick).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function filterLeads(leads: LeadRecord[], query: string, type: Filter, more: { city?: string; status?: string } = {}): LeadRecord[] {
  const q = query.trim().toLowerCase();
  return leads.filter((l) => {
    if (type !== "all" && l.Type !== type) return false;
    if (more.city && l.City !== more.city) return false;
    if (more.status && statusOf(l) !== more.status) return false;
    if (!q) return true;
    return [l.Name, l.Phone, address(l), l.Service, l.Message, l["Lead ID"]].some((v) => v.toLowerCase().includes(q));
  });
}

/** The columns of the CSV download, in order, with how each is read from a lead. */
const CSV_COLUMNS: [string, (l: LeadRecord) => string][] = [
  ["Received", (l) => l["Submitted At (IST)"]],
  ["Name", (l) => l.Name],
  ["Phone", (l) => l.Phone],
  ["Type", (l) => l.Type],
  ["Address", address],
  ["Property", (l) => l["Property Type"]],
  ["Service", (l) => l.Service],
  ["Job size", jobSize],
  ["Preferred date", (l) => l["Preferred Inspection Date"]],
  ["Message", (l) => l.Message],
  ["Source", (l) => [l["UTM Source"], l["UTM Campaign"]].filter(Boolean).join(" / ") || "Direct"],
  ["Status", statusOf],
  ["Lead ID", (l) => l["Lead ID"]],
];

/**
 * The leads as CSV text: quoted where needed, and with any cell that starts like a formula
 * (=, +, -, @) prefixed with ' so a spreadsheet shows it as text instead of running it.
 */
export function leadsToCsv(leads: LeadRecord[]): string {
  const cell = (v: string) => {
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = [CSV_COLUMNS.map(([h]) => h), ...leads.map((l) => CSV_COLUMNS.map(([, get]) => get(l)))];
  return lines.map((row) => row.map(cell).join(",")).join("\r\n");
}

/** Saves the leads being shown as a CSV file (built in the browser from what is already on screen). */
function downloadCsv(leads: LeadRecord[]) {
  const url = URL.createObjectURL(new Blob([`\ufeff${leadsToCsv(leads)}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `paint-saathi-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LeadsTable({ leads: loaded }: { leads: LeadRecord[] }) {
  // statuses changed on this page since it loaded, by lead id (the table, its counts and filters use them)
  const [saved, setSaved] = useState<Record<string, string>>({});
  const leads = useMemo(() => loaded.map((l) => (saved[l["Lead ID"]] ? { ...l, Status: saved[l["Lead ID"]] } : l)), [loaded, saved]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<Filter>("all");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("");
  const cityOptions = useMemo(() => optionsOf(leads, (l) => l.City), [leads]);
  const statusOptions = useMemo(() => optionsOf(leads, statusOf), [leads]);
  const shown = useMemo(() => filterLeads(leads, query, type, { city, status }), [leads, query, type, city, status]);
  const filtered = query.trim() !== "" || type !== "all" || city !== "" || status !== "";
  const clearFilters = () => {
    setQuery("");
    setType("all");
    setCity("");
    setStatus("");
  };

  const stats = [
    { label: "Total leads", value: leads.length, tint: "bg-cream-wash" },
    { label: "Inspection bookings", value: leads.filter((l) => l.Type === "booking").length, tint: "bg-sky-wash" },
    { label: "Messages", value: leads.filter((l) => l.Type === "contact").length, tint: "bg-rose-wash" },
    { label: "Status: New", value: leads.filter((l) => l.Status === "New").length, tint: "bg-peach-wash" },
  ];

  return (
    <section className="mt-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl border border-line p-4 ${s.tint}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-ink/60">{s.label}</p>
            <p className="mt-1 font-display text-3xl font-normal">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label htmlFor="lead-search" className="sr-only">Search leads</label>
        <input
          id="lead-search"
          type="search"
          placeholder="Search name, phone, address…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="field max-w-sm"
        />
        <label htmlFor="lead-type" className="sr-only">Lead type</label>
        <select id="lead-type" value={type} onChange={(e) => setType(e.target.value as Filter)} className="field w-auto">
          <option value="all">All types</option>
          <option value="booking">Bookings</option>
          <option value="visit">Quick site visits</option>
          <option value="waitlist">Waitlist (new cities)</option>
          <option value="contact">Messages</option>
        </select>
        {cityOptions.length > 1 && (
          <>
            <label htmlFor="lead-city" className="sr-only">City</label>
            <select id="lead-city" value={city} onChange={(e) => setCity(e.target.value)} className="field w-auto">
              <option value="">All cities</option>
              {cityOptions.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </>
        )}
        {statusOptions.length > 1 && (
          <>
            <label htmlFor="lead-status" className="sr-only">Status</label>
            <select id="lead-status" value={status} onChange={(e) => setStatus(e.target.value)} className="field w-auto">
              <option value="">Any status</option>
              {statusOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </>
        )}
        <p className="text-sm text-muted" aria-live="polite">{shown.length} shown</p>
        {filtered && (
          <button type="button" onClick={clearFilters} className="btn-secondary !min-h-11 !px-4 text-sm">
            Clear filters
          </button>
        )}
        {shown.length > 0 && (
          <button type="button" onClick={() => downloadCsv(shown)} className="btn-secondary !min-h-11 !px-4 text-sm sm:ml-auto">
            Download CSV ({shown.length})
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line-strong p-10 text-center text-muted">
          <p>{leads.length === 0 ? "No leads yet. Bookings from the website appear here as they arrive." : "No leads match these filters."}</p>
          {leads.length > 0 && (
            <button type="button" onClick={clearFilters} className="btn-secondary mt-4 !min-h-11 text-sm">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        // tall lists scroll inside the frame, so the column headings stay in view; relative, so the
        // screen-reader text in the rows (absolutely placed) stays inside it and never widens the page
        <div className="relative mt-6 max-h-[70vh] overflow-auto rounded-2xl border border-line bg-paper">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-ink text-on-ink">
              <tr>
                {["Received", "Name", "Phone", "Type", "Address", "Property", "Service", "Job size", "Est. area & crew", "Preferred date", "Message", "Source", "Status", "Project"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((l) => (
                <tr key={l["Lead ID"]} className="border-t border-line align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{l["Submitted At (IST)"]}</td>
                  <td className="px-4 py-3 font-semibold">{l.Name}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <a href={`tel:+91${l.Phone.replace(/\D/g, "").slice(-10)}`} className="text-tangerine-text underline">{l.Phone}</a>
                  </td>
                  <td className="px-4 py-3 capitalize">{l.Type}</td>
                  <td className="px-4 py-3">{address(l)}</td>
                  <td className="px-4 py-3">{l["Property Type"]}</td>
                  <td className="px-4 py-3">{l.Service}</td>
                  <td className="whitespace-nowrap px-4 py-3">{jobSize(l)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{crew(l)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{l["Preferred Inspection Date"]}</td>
                  <td className="max-w-xs px-4 py-3 text-muted">{l.Message}</td>
                  <td className="px-4 py-3 text-muted">{[l["UTM Source"], l["UTM Campaign"]].filter(Boolean).join(" / ") || "Direct"}</td>
                  <td className="px-4 py-3">
                    <StatusSelect lead={l} onSaved={(label) => setSaved((s) => ({ ...s, [l["Lead ID"]]: label }))} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {l["Project ID"] && (
                      <Link href={`/admin/projects/${l["Project ID"]}`} className="font-semibold text-tangerine-text underline">
                        Open project <span className="sr-only">for {l.Name}</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
