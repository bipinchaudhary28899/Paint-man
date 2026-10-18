import "server-only";
import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { JWT } from "google-auth-library";
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
] as const;

export function toRow(lead: LeadInput, id: string, submittedAt: Date): string[] {
  const t = lead.tracking ?? {};
  const isBooking = lead.type === "booking";
  return [
    submittedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    id,
    lead.type,
    lead.name,
    lead.phone,
    isBooking ? lead.locality : "",
    isBooking ? lead.propertyType : "",
    isBooking ? lead.service : "",
    isBooking ? (lead.preferredDate ?? "") : "",
    lead.message ?? "",
    lead.page ?? "",
    t.utmSource ?? "",
    t.utmMedium ?? "",
    t.utmCampaign ?? "",
    t.landingPage ?? "",
    t.referrer ?? "",
    "New",
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
let headerChecked = false;

async function sheetsRequest(url: string, init: RequestInit, cfg: NonNullable<ReturnType<typeof sheetsConfig>>) {
  jwt ??= new JWT({ email: cfg.email, key: cfg.key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const { token } = await jwt.getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  // The response body is not included: it can echo request details.
  if (!res.ok) throw new SheetsRequestError(res.status);
  return res.json();
}

async function appendToSheet(row: string[], cfg: NonNullable<ReturnType<typeof sheetsConfig>>) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${cfg.id}/values`;
  const tab = encodeURIComponent(cfg.tab);

  if (!headerChecked) {
    const existing = await sheetsRequest(`${base}/${tab}!A1:A1`, { method: "GET" }, cfg);
    if (!existing.values?.length) {
      await sheetsRequest(
        `${base}/${tab}!A1?valueInputOption=RAW`,
        { method: "PUT", body: JSON.stringify({ values: [LEAD_COLUMNS] }) },
        cfg,
      );
    }
    headerChecked = true;
  }

  // RAW stores values as plain text, so user input is never evaluated as a formula.
  await sheetsRequest(
    `${base}/${tab}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [row] }) },
    cfg,
  );
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
      `https://sheets.googleapis.com/v4/spreadsheets/${cfg.id}/values/${tab}!A1:Q5000`,
      { method: "GET" },
      cfg,
    );
    return rowsToLeads(json.values ?? []);
  }
  if (!canUseLocalFile()) throw new StorageNotConfiguredError();
  const text = await readFile(csvPath, "utf8").catch(() => "");
  return rowsToLeads(parseCsv(text));
}

export async function saveLead(lead: LeadInput) {
  const id = `L${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const row = toRow(lead, id, new Date());
  const cfg = sheetsConfig();

  if (cfg) {
    await appendToSheet(row, cfg);
  } else if (!canUseLocalFile()) {
    throw new StorageNotConfiguredError();
  } else {
    await appendToCsv(row);
  }
  return id;
}
