import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { MAIN_STAGES, stageExplanation, type ProjectStage, type StageStep } from "~/shared";
import { ApiError, BAD_RESPONSE_MESSAGE, NETWORK_MESSAGE } from "./api";
import { apiBase } from "./config";
import { formatDate } from "./dates";

// The customer's painting projects, as GET /api/v1/projects and /api/v1/projects/{id} give them (the
// website's src/lib/projects/repo.ts shapes), and what the account screens make of them: money in
// rupees from integer paise with Indian grouping, dates in India time, quotation statuses in words,
// and the quotation PDF, downloaded with the bearer token into the cache and handed to the share
// sheet so the visitor can open or save it. Stage labels and explanations are the website's own.

export type QuotationStatus = "sent" | "approved" | "declined" | "superseded";

export type QuotationLine = {
  position: number;
  item: string;
  description: string | null;
  areaSqft: number | null;
  coats: number | null;
  ratePaise: number | null;
  amountPaise: number;
};

export type Quotation = {
  id: string;
  version: number;
  status: QuotationStatus;
  sentAt: string | null;
  approvedAt: string | null;
  validUntil: string | null;
  notes: string | null;
  paymentTerms: string | null;
  lines: QuotationLine[];
  subtotalPaise: number;
  totalPaise: number;
  currency: "INR";
  /** "/api/v1/projects/{id}/quotations/{qid}/pdf" */
  pdf: string;
};

export type Inspection = { scheduledAt: string | null; visitedAt: string | null; inspectorName: string | null; findings: string | null };

export type TimelineEvent = { stage: ProjectStage; label: string; note: string | null; at: string };

export type ProjectSummary = {
  id: string;
  service: string | null;
  city: string | null;
  locality: string | null;
  stage: ProjectStage;
  stageLabel: string;
  createdAt: string;
  updatedAt: string;
  finalPricePaise?: number;
  currency: "INR";
};

export type ProjectDetail = ProjectSummary & {
  address: string | null;
  pincode: string | null;
  stageExplanation: string;
  workStartsOn: string | null;
  stages: StageStep[];
  timeline: TimelineEvent[];
  inspection: Inspection | null;
  quotations: Quotation[];
};

// ---------- Money ----------

/** 1234567 → "12,34,567" (lakhs and crores, as Indian rupees are written). */
export function indianGrouping(n: number): string {
  const digits = String(Math.trunc(Math.abs(n)));
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${digits.slice(-3)}`;
}

/** Integer paise as rupees: 4500000 → "₹45,000", 12345 → "₹123.45". */
export function formatRupees(paise: number): string {
  const whole = Math.round(Math.abs(paise));
  const rest = whole % 100;
  return `${paise < 0 ? "−" : ""}₹${indianGrouping(Math.floor(whole / 100))}${rest ? `.${String(rest).padStart(2, "0")}` : ""}`;
}

/** What a screen reader says for an amount ("45,000 rupees"), which reads better than the ₹ sign. */
export const spokenRupees = (paise: number) => `${formatRupees(paise).replace("₹", "")} rupees`;

// ---------- Dates (India time, IST = UTC+5:30, no daylight saving) ----------

const IST_MS = 330 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const inIndia = (at: string) => new Date(Date.parse(at) + IST_MS);

/** "Sat 31 Oct 2026": the day of a moment in India. */
export function formatDay(at: string): string {
  const d = inIndia(at);
  if (Number.isNaN(d.getTime())) return "";
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "Tue 4 Nov 2026, 11:30 am": a visit's day and time in India. */
export function formatVisit(at: string): string {
  const d = inIndia(at);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${formatDay(at)}, ${h % 12 || 12}:${m} ${h < 12 ? "am" : "pm"}`;
}

/** A calendar date (YYYY-MM-DD, such as a quotation's valid-until day): "Mon 10 Nov 2026". */
export const formatCalendarDay = (day: string) => (/^\d{4}-\d{2}-\d{2}$/.test(day) ? formatDate(day) : day);

// ---------- Stages and quotations in words ----------

/** One line on what the stage means: the website's explanation (without the dates a summary lacks). */
export const summaryExplanation = (stage: ProjectStage) => stageExplanation(stage);

/** The step after the current one on the main line, if there is one (nothing after a hold or the handover). */
export function nextStep(stages: readonly StageStep[]): StageStep | undefined {
  const at = stages.findIndex((s) => s.current);
  if (at === -1 || !(MAIN_STAGES as readonly string[]).includes(stages[at].stage)) return undefined;
  return stages.slice(at + 1).find((s) => !s.done && !s.current);
}

export const QUOTATION_STATUS: Record<QuotationStatus, string> = {
  sent: "Ready to review",
  approved: "Approved",
  declined: "Declined",
  superseded: "Replaced by a newer version",
};

/** "120 sq ft · 2 coats · ₹18 per sq ft": a line's measurements, when the quotation gives them. */
export function lineDetails(line: Pick<QuotationLine, "areaSqft" | "coats" | "ratePaise">): string {
  const parts: string[] = [];
  if (line.areaSqft !== null) parts.push(`${indianGrouping(line.areaSqft)} sq ft`);
  if (line.coats !== null) parts.push(line.coats === 1 ? "1 coat" : `${line.coats} coats`);
  if (line.ratePaise !== null) parts.push(`${formatRupees(line.ratePaise)}${line.areaSqft !== null ? " per sq ft" : ""}`);
  return parts.join(" · ");
}

/** "Interior Painting in Kamla Nagar, Agra": what the project is and where. */
export function projectTitle(p: Pick<ProjectSummary, "service" | "locality" | "city">): { what: string; where: string | null } {
  return { what: p.service ?? "Painting project", where: [p.locality, p.city].filter(Boolean).join(", ") || null };
}

// ---------- The quotation PDF ----------

/** The file the PDF is saved as in the cache: "Paint-Saathi-quotation-v2.pdf" (the server's own name). */
export const pdfFileName = (version: number) => `Paint-Saathi-quotation-v${version}.pdf`;

/** The HTTP status in a failed download's message ("…response has status 401", "…HTTP 404"), or 0. */
export function downloadStatus(err: unknown): number {
  const match = /\b(?:status:?|HTTP)\s*(\d{3})\b/i.exec(err instanceof Error ? err.message : "");
  return match ? Number(match[1]) : 0;
}

/** What to say for a failed download (the API's 401/404 envelopes cannot be read from a file download). */
export function downloadError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const status = downloadStatus(err);
  if (status === 401) return new ApiError("unauthenticated", "Sign in to continue: your session is missing or has expired.", 401);
  if (status === 404) return new ApiError("not_found", "This quotation is no longer available. Open the project again to see the latest version.", 404);
  if (status >= 400) return new ApiError("download_failed", BAD_RESPONSE_MESSAGE, status);
  return new ApiError("network", NETWORK_MESSAGE);
}

/**
 * Downloads a quotation's PDF with the bearer token into the cache directory (replacing an earlier
 * copy), then opens the share sheet for it (open in Files or Books, save, send). Throws an ApiError
 * on failure: status 401 when the session has expired.
 */
export async function downloadQuotationPdf(token: string, quotation: Pick<Quotation, "pdf" | "version">): Promise<void> {
  if (!quotation.pdf.startsWith("/api/v1/")) throw new ApiError("bad_response", BAD_RESPONSE_MESSAGE);
  let saved: File;
  try {
    saved = await File.downloadFileAsync(`${apiBase()}${quotation.pdf}`, new File(Paths.cache, pdfFileName(quotation.version)), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/pdf" },
      idempotent: true,
    });
  } catch (err) {
    throw downloadError(err);
  }
  if (!(await Sharing.isAvailableAsync())) throw new ApiError("sharing_unavailable", "Sharing files is not available on this phone, so the PDF cannot be opened from the app.");
  await Sharing.shareAsync(saved.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: `Quotation version ${quotation.version}` });
}
