// Shared pieces for the admin tests: a fetch double that answers the /api/admin endpoints in the
// envelope (with `meta`, which the lists need), records every call with its query string, method,
// headers and body; a saved admin session; and leads and projects shaped like the API's.
import type { AdminLead, AdminProject, AdminProjectSummary, AdminQuotation, LeadsMeta, ProjectsMeta } from "~/lib/admin";

export const ADMIN_KEY = "paintsaathi.admin";
export const PID = "3f0c2b1a-1111-4222-8333-444455556666";

export type AdminAnswer = { status?: number; data?: unknown; meta?: Record<string, unknown>; error?: { code: string; message: string; details?: unknown } } | (() => never);
export type AdminCall = { method: string; path: string; search: URLSearchParams; headers: Record<string, string>; body?: unknown };

/** Installs a fetch double: `routes` maps "METHOD /path" to an answer, or a queue of answers (the last repeats). */
export function mockAdminApi(routes: Record<string, AdminAnswer | AdminAnswer[]>) {
  const calls: AdminCall[] = [];
  const queues = new Map(Object.entries(routes).map(([k, v]) => [k, Array.isArray(v) ? [...v] : [v]]));
  globalThis.fetch = jest.fn(async (url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) => {
    const method = init.method ?? "GET";
    const parsed = new URL(url);
    calls.push({ method, path: parsed.pathname, search: parsed.searchParams, headers: init.headers ?? {}, body: init.body ? JSON.parse(init.body) : undefined });
    const queue = queues.get(`${method} ${parsed.pathname}`);
    if (!queue || queue.length === 0) {
      return { ok: false, status: 404, json: async () => ({ apiVersion: "v1", kind: "error", label: "x", error: { code: "not_found", message: "Not found" } }) };
    }
    const answer = queue.length > 1 ? queue.shift()! : queue[0];
    if (typeof answer === "function") answer();
    const { status = 200, data, meta = {}, error } = answer as Exclude<AdminAnswer, () => never>;
    const body = error ? { apiVersion: "v1", kind: "error", label: error.message, error } : { apiVersion: "v1", kind: "x", label: "x", data, meta: { generatedAt: "2026-11-01T06:30:00.000Z", ...meta } };
    return { ok: status < 400, status, json: async () => body };
  }) as never;
  return calls;
}

export const offline = (): never => {
  throw new TypeError("Network request failed");
};

const store = () => (jest.requireMock("expo-secure-store") as { __store: Map<string, string> }).__store;

/** Saves an admin session in the secure store (valid for an hour unless told otherwise). */
export function seedAdmin(over: Partial<{ username: string; token: string; expiresAt: string }> = {}) {
  store().set(ADMIN_KEY, JSON.stringify({ username: "owner", token: "admin-token", expiresAt: new Date(Date.now() + 3_600_000).toISOString(), ...over }));
}

export const savedAdmin = () => store().get(ADMIN_KEY);

export const lead = (over: Partial<AdminLead> = {}): AdminLead => ({
  id: "1b1b1b1b-1111-4222-8333-444455556666",
  type: "booking",
  receivedAt: "2026-10-31T17:30:01.000Z",
  received: "31/10/2026, 11:00:01 pm",
  name: "Asha Verma",
  phone: "9876543210",
  city: "Agra",
  address: "12 Rose Villa, Kamla Nagar, Agra 282005",
  propertyType: "Apartment / Flat",
  service: "Interior Painting",
  jobSize: "1 floor · 2 BHK",
  crew: "≈ 1,800 sq ft · 18 painter-days (3 × 6 days)",
  preferredDate: "2026-11-04",
  message: "",
  source: "Direct",
  channel: "app",
  status: "new",
  statusLabel: "New",
  projectId: PID,
  ...over,
});

export const leadsMeta = (over: Partial<LeadsMeta> = {}): LeadsMeta => ({
  total: 2,
  page: 1,
  pages: 1,
  perPage: 20,
  stats: { total: 2, bookings: 1, messages: 1, new: 2 },
  options: { cities: ["Agra", "Mathura"], statuses: ["New"] },
  ...over,
});

export const projectRow = (over: Partial<AdminProjectSummary> = {}): AdminProjectSummary => ({
  id: PID,
  name: "Asha Verma",
  phone: "9876543210",
  userId: null,
  leadId: "1b1b1b1b-1111-4222-8333-444455556666",
  service: "Interior Painting",
  city: "Agra",
  citySlug: "agra",
  locality: "Kamla Nagar",
  stage: "quotation_shared",
  stageLabel: "Quotation shared",
  createdAt: "2026-10-20T06:30:00.000Z",
  updatedAt: "2026-10-30T06:30:00.000Z",
  currency: "INR",
  ...over,
});

export const projectsMeta = (over: Partial<ProjectsMeta> = {}): ProjectsMeta => ({
  total: 1,
  page: 1,
  pages: 1,
  perPage: 20,
  cities: [
    { slug: "agra", name: "Agra" },
    { slug: "mathura", name: "Mathura" },
  ],
  ...over,
});

export const quotation = (over: Partial<AdminQuotation> = {}): AdminQuotation => ({
  id: "9a8b7c6d-1111-4222-8333-444455556666",
  version: 1,
  status: "sent",
  sentAt: "2026-10-30T06:30:00.000Z",
  approvedAt: null,
  validUntil: "2026-11-18",
  notes: "Two coats over primer.",
  paymentTerms: "50% at work start, 50% at handover.",
  lines: [{ position: 1, item: "Living room walls", description: "Royale Matt", areaSqft: 400, coats: 2, ratePaise: 2500, amountPaise: 1_000_000 }],
  subtotalPaise: 1_000_000,
  totalPaise: 1_000_000,
  currency: "INR",
  pdf: `/api/v1/projects/${PID}/quotations/9a8b7c6d-1111-4222-8333-444455556666/pdf`,
  createdAt: "2026-10-29T06:30:00.000Z",
  updatedAt: "2026-10-30T06:30:00.000Z",
  ...over,
});

export const adminProject = (over: Partial<AdminProject> = {}): AdminProject => ({
  id: PID,
  service: "Interior Painting",
  city: "Agra",
  citySlug: "agra",
  locality: "Kamla Nagar",
  stage: "quotation_shared",
  stageLabel: "Quotation shared",
  createdAt: "2026-10-20T06:30:00.000Z",
  updatedAt: "2026-10-30T06:30:00.000Z",
  currency: "INR",
  address: "12 Rose Villa",
  pincode: "282005",
  propertyType: "Apartment / Flat",
  floors: "1",
  homeSize: "2 BHK",
  carpetArea: 900,
  preferredDate: "2026-11-04",
  notes: "Please call before coming.",
  location: { lat: 27.2, lng: 78.0 },
  detailsEditable: false,
  stageExplanation: "Your itemised quotation is ready to review.",
  workStartsOn: null,
  stages: [],
  inspection: null,
  name: "Asha Verma",
  phone: "9876543210",
  userId: "u1",
  lead: {
    id: "1b1b1b1b-1111-4222-8333-444455556666",
    source: "app",
    propertyType: null,
    floors: null,
    homeSize: null,
    carpetArea: null,
    estPaintArea: null,
    preferredDate: null,
    message: null,
    location: null,
    createdAt: "2026-10-20T06:30:00.000Z",
  },
  timeline: [
    { id: "e1", stage: "booked", label: "Booking received", note: null, at: "2026-10-20T06:30:00.000Z" },
    { id: "e2", stage: "quotation_shared", label: "Quotation shared", note: "Revised after the visit.", at: "2026-10-30T06:30:00.000Z" },
  ],
  quotations: [quotation()],
  ...over,
});
