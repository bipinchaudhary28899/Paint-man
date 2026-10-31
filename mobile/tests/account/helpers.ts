// Shared pieces for the account tests: a fetch double that answers the website's /api/v1 account
// endpoints in its envelope, records every call (method, path, headers, body), and can be told how
// to answer each route; plus sample projects shaped like the API's.
import type { ProjectDetail, ProjectSummary } from "~/lib/projects";

export const SESSION_KEY = "paintsaathi.session";

export type Answer = { status?: number; data?: unknown; error?: { code: string; message: string; details?: unknown } } | (() => never);

export type Call = { method: string; path: string; headers: Record<string, string>; body?: unknown };

const envelope = (data: unknown) => ({ apiVersion: "v1", kind: "x", label: "x", data, meta: { generatedAt: "2026-10-31T00:00:00.000Z" } });

/** Installs a fetch double: `routes` maps "METHOD /path" to an answer (or a function that throws, for no connection). */
export function mockApi(routes: Record<string, Answer | Answer[]>) {
  const calls: Call[] = [];
  const queues = new Map(Object.entries(routes).map(([k, v]) => [k, Array.isArray(v) ? [...v] : [v]]));
  globalThis.fetch = jest.fn(async (url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) => {
    const method = init.method ?? "GET";
    const path = new URL(url).pathname;
    calls.push({ method, path, headers: init.headers ?? {}, body: init.body ? JSON.parse(init.body) : undefined });
    const queue = queues.get(`${method} ${path}`);
    if (!queue || queue.length === 0) {
      return { ok: false, status: 404, json: async () => ({ apiVersion: "v1", kind: "error", label: "x", error: { code: "not_found", message: "Not found" } }) };
    }
    const answer = queue.length > 1 ? queue.shift()! : queue[0];
    if (typeof answer === "function") answer();
    const { status = 200, data, error } = answer as Exclude<Answer, () => never>;
    const body = error ? { apiVersion: "v1", kind: "error", label: error.message, error } : envelope(data);
    return { ok: status < 400, status, json: async () => body };
  }) as never;
  return calls;
}

export const offline = (): never => {
  throw new TypeError("Network request failed");
};

export const seedToken = (token = "saved-token") => (jest.requireMock("expo-secure-store") as { __store: Map<string, string> }).__store.set(SESSION_KEY, token);
export const savedToken = () => (jest.requireMock("expo-secure-store") as { __store: Map<string, string> }).__store.get(SESSION_KEY);

export const asha = { id: "u1", phone: "9876543210", name: "Asha Verma", createdAt: "2026-10-01T06:30:00.000Z" };

export const summary = (over: Partial<ProjectSummary> = {}): ProjectSummary => ({
  id: "3f0c2b1a-1111-4222-8333-444455556666",
  service: "Interior Painting",
  city: "Agra",
  locality: "Kamla Nagar",
  stage: "quotation_shared",
  stageLabel: "Quotation shared",
  createdAt: "2026-10-20T06:30:00.000Z",
  updatedAt: "2026-10-30T06:30:00.000Z",
  currency: "INR",
  ...over,
});

const line = (position: number, item: string, amountPaise: number, more: Partial<ProjectDetail["quotations"][number]["lines"][number]> = {}) => ({
  position,
  item,
  description: null,
  areaSqft: null,
  coats: null,
  ratePaise: null,
  amountPaise,
  ...more,
});

export const detail = (over: Partial<ProjectDetail> = {}): ProjectDetail => ({
  ...summary(),
  address: "12, Rose Villa, Nehru Road",
  pincode: "282005",
  stageExplanation: "Your itemised quotation is ready to review.",
  workStartsOn: null,
  stages: [
    { stage: "booked", label: "Booking received", done: true, current: false, at: "2026-10-20T06:30:00.000Z" },
    { stage: "call_confirmed", label: "Visit being arranged", done: true, current: false, at: "2026-10-21T06:30:00.000Z" },
    { stage: "inspection_scheduled", label: "Inspection scheduled", done: true, current: false, at: "2026-10-22T06:30:00.000Z" },
    { stage: "inspected", label: "Inspection done", done: true, current: false, at: "2026-10-25T06:30:00.000Z" },
    { stage: "quotation_shared", label: "Quotation shared", done: false, current: true, at: "2026-10-30T06:30:00.000Z" },
    { stage: "price_finalised", label: "Price finalised", done: false, current: false },
    { stage: "work_scheduled", label: "Work scheduled", done: false, current: false },
    { stage: "in_progress", label: "Painting in progress", done: false, current: false },
    { stage: "completed", label: "Handed over", done: false, current: false },
  ],
  timeline: [
    { stage: "booked", label: "Booking received", note: null, at: "2026-10-20T06:30:00.000Z" },
    { stage: "inspected", label: "Inspection done", note: "Damp patch near the balcony door; treated before painting.", at: "2026-10-25T06:30:00.000Z" },
    { stage: "quotation_shared", label: "Quotation shared", note: "Revised quotation (version 2).", at: "2026-10-30T06:30:00.000Z" },
  ],
  inspection: { scheduledAt: "2026-10-24T05:30:00.000Z", visitedAt: "2026-10-25T06:00:00.000Z", inspectorName: "Ravi Kumar", findings: "Walls sound; one damp patch." },
  quotations: [
    {
      id: "q2",
      version: 2,
      status: "sent",
      sentAt: "2026-10-30T06:30:00.000Z",
      approvedAt: null,
      validUntil: "2026-11-14",
      notes: "Asian Paints Royale, two coats.",
      paymentTerms: "Nothing in advance; 50% at the halfway walkthrough, the rest at handover.",
      lines: [line(1, "Living room walls", 1800000, { description: "Putty touch-up, primer, two coats", areaSqft: 1000, coats: 2, ratePaise: 1800 }), line(2, "Bedroom ceiling", 450000)],
      subtotalPaise: 2250000,
      totalPaise: 2250000,
      currency: "INR",
      pdf: "/api/v1/projects/3f0c2b1a-1111-4222-8333-444455556666/quotations/q2/pdf",
    },
    {
      id: "q1",
      version: 1,
      status: "superseded",
      sentAt: "2026-10-27T06:30:00.000Z",
      approvedAt: null,
      validUntil: "2026-11-10",
      notes: null,
      paymentTerms: null,
      lines: [line(1, "Living room walls", 2000000)],
      subtotalPaise: 2000000,
      totalPaise: 2000000,
      currency: "INR",
      pdf: "/api/v1/projects/3f0c2b1a-1111-4222-8333-444455556666/quotations/q1/pdf",
    },
  ],
  ...over,
});
