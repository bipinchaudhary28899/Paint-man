import "server-only";
import { getCity } from "@/config/site";
import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { JWT } from "google-auth-library";
import type { Timer } from "@/lib/timing";
import { estimatePaintArea } from "./estimate";
import type { LeadInput } from "./schema";

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
  // job size (added later, so kept at the end: existing rows stay aligned)
  "Floors",
  "Home Size",
  "Carpet Area per Floor (sq ft)",
  "Est. Paint Area (sq ft)",
  // full address (added later, kept at the end for the same reason)
  "Address",
  "PIN Code",
  "City",
] as const;

/** Sheet column letter for a 1-based index (1 → A, 27 → AA). */
export function columnLetter(n: number): string {
  let s = "";
  for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}
const LAST_COLUMN = columnLetter(LEAD_COLUMNS.length);

/** A quick site-visit request's locality column and note: the city (and locality), and whether it is a waitlist entry. */
function visitDetails(lead: Extract<LeadInput, { type: "visit" }>) {
  const city = getCity(lead.city);
  const name = city?.name ?? lead.city;
  const live = city?.status === "live";
  return {
    locality: lead.locality ? `${lead.locality}, ${name}` : name,
    note: live ? "Quick site-visit request: take the job details on the call." : `Waitlist: not painting in ${name} yet. Call when bookings open there.`,
    type: live ? "visit" : "waitlist",
  };
}

export function toRow(lead: LeadInput, id: string, submittedAt: Date): string[] {
  const t = lead.tracking ?? {};
  const isBooking = lead.type === "booking";
  const visit = lead.type === "visit" ? visitDetails(lead) : undefined;
  return [
    submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    id,
    visit?.type ?? lead.type,
    lead.name,
    lead.phone,
    isBooking ? lead.locality : (visit?.locality ?? ""),
    isBooking ? (lead.propertyType ?? "") : "",
    isBooking ? (lead.service ?? "") : "",
    isBooking ? (lead.preferredDate ?? "") : "",
    lead.type === "visit" ? visit!.note : (lead.message ?? ""),
    lead.page ?? "",
    t.utmSource ?? "",
    t.utmMedium ?? "",
    t.utmCampaign ?? "",
    t.landingPage ?? "",
    t.referrer ?? "",
    "New",
    isBooking ? (lead.floors ?? "") : "",
    isBooking ? (lead.homeSize ?? "") : "",
    isBooking && lead.carpetArea ? String(lead.carpetArea) : "",
    isBooking ? String(estimatePaintArea(lead.carpetArea, lead.floors ?? "1", lead.service ?? "") ?? "") : "",
    isBooking ? lead.address : "",
    isBooking ? lead.pincode : "",
    isBooking ? (getCity(lead.city)?.name ?? lead.city) : "",
  ];
}

// ---------- Errors ----------

/** Google Sheets isn't set up and a local file can't be used (e.g. on Vercel). */
export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Google Sheets is not configured. Set GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.");
    this.name = "StorageNotConfiguredError";
  }
}

/** Google Sheets is set up but the request failed (wrong ID, not shared, bad key...). */
export class SheetsRequestError extends Error {
  constructor(public status: number) {
    super(`Google Sheets request failed with status ${status}`);
    this.name = "SheetsRequestError";
  }
}

// Vercel (and other serverless hosts) have a read-only disk, so a local CSV
// would silently lose leads there. Everywhere else the CSV is a safe fallback.
const canUseLocalFile = () => !process.env.VERCEL;

// ---------- Google Sheets ----------

const sheetsConfig = () => {
  const id = process.env.GOOGLE_SHEETS_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!id || !email || !key) return null;
  return { id, email, key, tab: process.env.GOOGLE_SHEETS_TAB || "Leads" };
};

let jwt: JWT | null = null;
let token: { value: Promise<string>; expires: number } | null = null;

/**
 * One Google access token per server instance, shared by concurrent callers and refreshed a
 * little before Google's one-hour expiry. Started early by `warmLeadStorage` so the token
 * request overlaps the rate-limit check instead of following it.
 */
function accessToken(cfg: NonNullable<ReturnType<typeof sheetsConfig>>): Promise<string> {
  if (token && Date.now() < token.expires) return token.value;
  jwt ??= new JWT({ email: cfg.email, key: cfg.key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const value = jwt.getAccessToken().then(({ token: t }) => {
    if (!t) throw new Error("Google did not return an access token.");
    return t;
  });
  token = { value, expires: Date.now() + 50 * 60 * 1000 };
  value.catch(() => { token = null; }); // a failed request is retried on the next call
  return value;
}

/** Starts fetching the Google access token without waiting for it. No-op without Sheets. */
export function warmLeadStorage() {
  const cfg = sheetsConfig();
  if (cfg) accessToken(cfg).catch(() => {});
}

async function sheetsRequest(url: string, init: RequestInit, cfg: NonNullable<ReturnType<typeof sheetsConfig>>, timer?: Timer) {
  const bearer = timer ? await timer.time("sheets-token", accessToken(cfg)) : await accessToken(cfg);
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  // The response body is not included: it can echo request details.
  if (!res.ok) throw new SheetsRequestError(res.status);
  return res.json();
}

async function appendToSheet(row: string[], cfg: NonNullable<ReturnType<typeof sheetsConfig>>, timer?: Timer) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${cfg.id}/values`;
  const tab = encodeURIComponent(cfg.tab);

  // Append straight away: one Google request per lead. (This used to read A1 first on every
  // fresh server instance to check for the header row, an extra round trip on most leads.)
  // RAW stores values as plain text, so user input is never evaluated as a formula.
  const append = sheetsRequest(
    `${base}/${tab}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [row] }) },
    cfg,
    timer,
  );
  const res = await (timer ? timer.time("sheets-append", append) : append);

  // Only for the very first lead: the sheet was empty, so the row landed on row 1. Put the
  // header there and the lead on row 2.
  const updated: string = res?.updates?.updatedRange ?? "";
  if (/!A1(:|$)/.test(updated)) {
    await sheetsRequest(
      `${base}/${tab}!A1?valueInputOption=RAW`,
      { method: "PUT", body: JSON.stringify({ values: [LEAD_COLUMNS, row] }) },
      cfg,
    );
  }
}

let headerOk = false;

/**
 * Makes row 1 of the sheet the current header (once per server instance). Run after the
 * response is sent, so it never slows a submission; it adds new columns to a sheet created
 * before they existed. Never touches any other row.
 */
export async function ensureSheetHeader() {
  const cfg = sheetsConfig();
  if (!cfg || headerOk) return;
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${cfg.id}/values`;
  const tab = encodeURIComponent(cfg.tab);
  const json = await sheetsRequest(`${base}/${tab}!A1:${LAST_COLUMN}1`, { method: "GET" }, cfg);
  const current: string[] = json.values?.[0] ?? [];
  if (LEAD_COLUMNS.some((c, i) => current[i] !== c)) {
    await sheetsRequest(`${base}/${tab}!A1:${LAST_COLUMN}1?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [LEAD_COLUMNS] }) }, cfg);
  }
  headerOk = true;
}

// ---------- Local CSV (development fallback) ----------

const csvPath = path.join(process.cwd(), "data", "leads.csv");

export function csvCell(value: string) {
  // Neutralise spreadsheet formula injection when the CSV is opened in Excel.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

async function appendToCsv(row: string[]) {
  await mkdir(path.dirname(csvPath), { recursive: true });
  const exists = await stat(csvPath).then(() => true, () => false);
  const lines = (exists ? "" : LEAD_COLUMNS.map(csvCell).join(",") + "\n") + row.map(csvCell).join(",") + "\n";
  await appendFile(csvPath, lines, "utf8");
}

// ---------- Reading (admin only) ----------

export type LeadRecord = Record<(typeof LEAD_COLUMNS)[number], string>;

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, newlines in quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function rowsToLeads(rows: string[][]): LeadRecord[] {
  const [header, ...data] = rows;
  if (!header) return [];
  return data
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(LEAD_COLUMNS.map((col) => [col, r[header.indexOf(col)] ?? ""])) as LeadRecord)
    .reverse(); // newest first
}

export async function readLeads(): Promise<LeadRecord[]> {
  const cfg = sheetsConfig();
  if (cfg) {
    const tab = encodeURIComponent(cfg.tab);
    const json = await sheetsRequest(
      `https://sheets.googleapis.com/v4/spreadsheets/${cfg.id}/values/${tab}!A1:${LAST_COLUMN}5000`,
      { method: "GET" },
      cfg,
    );
    return rowsToLeads(json.values ?? []);
  }
  if (!canUseLocalFile()) throw new StorageNotConfiguredError();
  const text = await readFile(csvPath, "utf8").catch(() => "");
  return rowsToLeads(parseCsv(text));
}

/** Saves a lead and returns its ID. `timer` (optional) records the Google steps. */
export async function saveLead(lead: LeadInput, timer?: Timer) {
  const id = `L${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const row = toRow(lead, id, new Date());
  const cfg = sheetsConfig();

  if (cfg) {
    await appendToSheet(row, cfg, timer);
  } else if (!canUseLocalFile()) {
    throw new StorageNotConfiguredError();
  } else {
    await appendToCsv(row);
  }
  return id;
}
