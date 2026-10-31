// A lead as the admin leads table shows it: one record of named columns, read from the database
// by readLeads (src/lib/leads/store.ts). Plain data with no server imports, so the table (a client
// component) can use the same names. The column names are the ones the Google Sheet used, so the
// table, its filters and its CSV download read leads exactly as before.

export const LEAD_COLUMNS = [
  "Submitted At (IST)",
  "Lead ID",
  "Type",
  "Name",
  "Phone",
  "Locality",
  "Property Type",
  "Service",
  "Preferred Inspection Date",
  "Message",
  "Page",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "Landing Page",
  "Referrer",
  "Status",
  "Floors",
  "Home Size",
  "Carpet Area per Floor (sq ft)",
  "Est. Paint Area (sq ft)",
  "Address",
  "PIN Code",
  "City",
  /** "web" (the website's forms) or "app" (the Paint Saathi app). */
  "Channel",
  /** The project a booking created (blank for messages and quick visits). */
  "Project ID",
] as const;

export type LeadColumn = (typeof LEAD_COLUMNS)[number];
export type LeadRecord = Record<LeadColumn, string>;

/** The team's follow-up statuses: the stored value and the label the table shows. */
export const LEAD_STATUSES = {
  new: "New",
  called: "Called",
  converted: "Converted",
  not_interested: "Not interested",
  spam: "Spam",
} as const;

export type LeadStatus = keyof typeof LEAD_STATUSES;

/** The label of a stored status; a value outside the list is shown as it is. */
export function statusLabel(status: string): string {
  return LEAD_STATUSES[status as LeadStatus] ?? status;
}
