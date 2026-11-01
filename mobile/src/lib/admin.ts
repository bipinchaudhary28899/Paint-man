import { File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";

import type { LeadStatus } from "~/shared";
import { apiRequest, ApiError, BAD_RESPONSE_MESSAGE } from "./api";
import { apiBase } from "./config";
import { downloadError, pdfFileName, type ProjectDetail, type ProjectSummary, type Quotation, type QuotationStatus, type TimelineEvent } from "./projects";

// The admin area in the app: staff sign in with the website's admin username and password (POST
// /api/admin/session, the same check and lockout as the website's form) and get the signed admin
// session as a token, kept only in the secure store under its own key (apart from a customer's
// session) and sent as `Authorization: Bearer` to the /api/admin endpoints. It lasts 8 hours; signing
// out forgets it. The shapes below are those endpoints' (the website's src/lib/projects/repo.ts and
// src/lib/leads/admin-view.ts).

/** The one secure-store key holding the admin session. */
export const ADMIN_SESSION_KEY = "paintsaathi.admin";

export type AdminSession = { username: string; token: string; expiresAt: string };

/** A lead as GET /api/admin/leads lists it. */
export type AdminLead = {
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

export type LeadStats = { total: number; bookings: number; messages: number; new: number };
export type LeadsMeta = { total: number; page: number; pages: number; perPage: number; stats: LeadStats; options: { cities: string[]; statuses: string[] } };

export type AdminProjectSummary = ProjectSummary & { name: string; phone: string; userId: string | null; leadId: string | null };
export type ProjectsMeta = { total: number; page: number; pages: number; perPage: number; cities: { slug: string; name: string }[] };

export type AdminQuotationStatus = "draft" | QuotationStatus;
export type AdminQuotation = Omit<Quotation, "status"> & { status: AdminQuotationStatus; createdAt: string; updatedAt: string };

export type AdminProject = Omit<ProjectDetail, "quotations" | "timeline"> & {
  name: string;
  phone: string;
  userId: string | null;
  lead: {
    id: string;
    source: "web" | "app";
    propertyType: string | null;
    floors: string | null;
    homeSize: string | null;
    carpetArea: number | null;
    estPaintArea: number | null;
    preferredDate: string | null;
    message: string | null;
    location: { lat: number; lng: number } | null;
    createdAt: string;
  } | null;
  timeline: (TimelineEvent & { id: string })[];
  quotations: AdminQuotation[];
};

/** The lead types the list filters by, in the website's words. */
export const LEAD_TYPES = [
  { value: "booking", label: "Bookings" },
  { value: "visit", label: "Quick site visits" },
  { value: "waitlist", label: "Waitlist (new cities)" },
  { value: "contact", label: "Messages" },
] as const;

/** A quotation status in words, drafts included. */
export const ADMIN_QUOTATION_STATUS: Record<AdminQuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  declined: "Declined",
  superseded: "Superseded",
};

// ---------- The session (secure store only) ----------

const isSession = (v: unknown): v is AdminSession =>
  typeof v === "object" && v !== null && typeof (v as AdminSession).token === "string" && typeof (v as AdminSession).username === "string" && typeof (v as AdminSession).expiresAt === "string";

/** True once the session's 8 hours are up (or its end cannot be read). */
export const sessionExpired = (s: AdminSession, now = Date.now()) => !(Date.parse(s.expiresAt) > now);

/** The saved admin session, or null (none, expired, unreadable). */
export async function readAdminSession(now = Date.now()): Promise<AdminSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(ADMIN_SESSION_KEY);
    const saved: unknown = raw ? JSON.parse(raw) : null;
    return isSession(saved) && !sessionExpired(saved, now) ? saved : null;
  } catch {
    return null;
  }
}

/** Saves the session; when the secure store refuses, it lasts until the app closes. */
export async function saveAdminSession(session: AdminSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(ADMIN_SESSION_KEY, JSON.stringify(session));
  } catch {
    // kept in memory only (AdminProvider), never anywhere less safe
  }
}

export async function clearAdminSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ADMIN_SESSION_KEY);
  } catch {
    // nothing saved, or nothing that could be read back
  }
}

/** Signs in with the admin username and password: the session to keep. Throws the API's ApiError (invalid_credentials, rate_limited…). */
export async function adminSignIn(username: string, password: string): Promise<AdminSession> {
  const res = await apiRequest<Partial<AdminSession>>("/api/admin/session", { method: "POST", body: { username: username.trim(), password } });
  if (!isSession(res.data)) throw new ApiError("bad_response", BAD_RESPONSE_MESSAGE, 200);
  return res.data;
}

// ---------- Helpers for the screens ----------

/** "/api/admin/leads?type=booking&page=2": empty values left out. */
export function adminPath(path: string, params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") query.set(key, String(value));
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

/** A calendar day moved by `days`: shiftDay("2026-11-01", 30) → "2026-12-01". */
export function shiftDay(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A time typed as 24-hour HH:MM ("09:30", "17:05"). */
export const isTime = (text: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(text);

/** The phone number to dial for a stored mobile: +91 and its last 10 digits. */
export const telUrl = (phone: string) => `tel:+91${phone.replace(/\D/g, "").slice(-10)}`;

/** A Google Maps link to a map pin. */
export const mapUrl = (location: { lat: number; lng: number }) => `https://maps.google.com/?q=${location.lat},${location.lng}`;

/**
 * Downloads a version's PDF as staff see it (drafts marked as such) with the admin token, then opens
 * the share sheet for it. Throws an ApiError on failure: status 401 when the session has expired.
 */
export async function openAdminPdf(token: string, projectId: string, quotation: Pick<AdminQuotation, "id" | "version">): Promise<void> {
  let saved: File;
  try {
    saved = await File.downloadFileAsync(
      `${apiBase()}/api/admin/projects/${encodeURIComponent(projectId)}/quotations/${encodeURIComponent(quotation.id)}/pdf`,
      new File(Paths.cache, pdfFileName(quotation.version)),
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/pdf" }, idempotent: true },
    );
  } catch (err) {
    throw downloadError(err);
  }
  if (!(await Sharing.isAvailableAsync())) throw new ApiError("sharing_unavailable", "Sharing files is not available on this phone, so the PDF cannot be opened from the app.");
  await Sharing.shareAsync(saved.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: `Quotation version ${quotation.version}` });
}
