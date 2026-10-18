"use client";

import { useMemo, useState } from "react";
import { crewEstimate, formatSqft } from "@/lib/leads/estimate";
import type { LeadRecord } from "@/lib/leads/store";

type Filter = "all" | "booking" | "contact";

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

export function filterLeads(leads: LeadRecord[], query: string, type: Filter): LeadRecord[] {
  const q = query.trim().toLowerCase();
  return leads.filter((l) => {
    if (type !== "all" && l.Type !== type) return false;
    if (!q) return true;
    return [l.Name, l.Phone, l.Locality, l.Service, l.Message, l["Lead ID"]].some((v) => v.toLowerCase().includes(q));
  });
}

export function LeadsTable({ leads }: { leads: LeadRecord[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<Filter>("all");
  const shown = useMemo(() => filterLeads(leads, query, type), [leads, query, type]);

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
          placeholder="Search name, phone, locality…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="field max-w-sm"
        />
        <label htmlFor="lead-type" className="sr-only">Lead type</label>
        <select id="lead-type" value={type} onChange={(e) => setType(e.target.value as Filter)} className="field w-auto">
          <option value="all">All types</option>
          <option value="booking">Bookings</option>
          <option value="contact">Messages</option>
        </select>
        <p className="text-sm text-muted" aria-live="polite">{shown.length} shown</p>
      </div>

      {shown.length === 0 ? (
        <p className="mt-10 rounded-2xl border-2 border-dashed border-ink/30 p-10 text-center text-muted">
          {leads.length === 0 ? "No leads yet." : "No leads match your search."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-ink text-on-ink">
              <tr>
                {["Received", "Name", "Phone", "Type", "Locality", "Property", "Service", "Job size", "Est. area & crew", "Preferred date", "Message", "Source", "Status"].map((h) => (
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
                  <td className="px-4 py-3">{l.Locality}</td>
                  <td className="px-4 py-3">{l["Property Type"]}</td>
                  <td className="px-4 py-3">{l.Service}</td>
                  <td className="whitespace-nowrap px-4 py-3">{jobSize(l)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{crew(l)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{l["Preferred Inspection Date"]}</td>
                  <td className="max-w-xs px-4 py-3 text-muted">{l.Message}</td>
                  <td className="px-4 py-3 text-muted">{[l["UTM Source"], l["UTM Campaign"]].filter(Boolean).join(" / ") || "Direct"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-cream-wash px-2.5 py-1 text-xs font-bold">{l.Status || "New"}</span>
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
