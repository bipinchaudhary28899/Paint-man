import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH as patchLead } from "@/app/api/admin/leads/[id]/route";
import { PUT as scheduleRoute } from "@/app/api/admin/projects/[id]/inspection/route";
import { POST as visitRoute } from "@/app/api/admin/projects/[id]/inspection/visit/route";
import { PUT as saveRoute } from "@/app/api/admin/projects/[id]/quotations/[qid]/route";
import { GET as pdfRoute } from "@/app/api/admin/projects/[id]/quotations/[qid]/pdf/route";
import { POST as statusRoute } from "@/app/api/admin/projects/[id]/quotations/[qid]/status/route";
import { POST as createRoute } from "@/app/api/admin/projects/[id]/quotations/route";
import { POST as stageRoute } from "@/app/api/admin/projects/[id]/stage/route";
import { PUT as workStartRoute } from "@/app/api/admin/projects/[id]/work-start/route";
import { createSessionToken } from "@/lib/auth/session";
import { setDb } from "@/lib/db/client";
import { leads, projectEvents } from "@/lib/db/schema";
import { saveLead } from "@/lib/leads/store";
import { getProjectForAdmin } from "@/lib/projects/repo";
import { resetTestDb, useTestDb } from "../support/db";

// The /api/admin endpoints behind the project tracker and the leads table, against an in-memory
// Postgres: every one needs the signed admin session and a same-origin request, validates its body,
// and answers in the no-store envelope.

const testDb = useTestDb();
const BASE = "http://localhost:3000";
const SECRET = "s".repeat(48);
const MISSING = "00000000-0000-4000-8000-000000000000";
let cookie = "";

beforeEach(async () => {
  await resetTestDb(testDb.db);
  vi.stubEnv("ADMIN_USERNAME", "owner");
  vi.stubEnv("ADMIN_PASSWORD_HASH", "scrypt:16384:8:1:c2FsdA:aGFzaA");
  vi.stubEnv("SESSION_SECRET", SECRET);
  cookie = `pm_admin=${await createSessionToken("owner", SECRET)}`;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setDb(testDb.db);
});

type Init = { body?: unknown; raw?: string; origin?: string | null; cookie?: string | null; headers?: Record<string, string>; noLength?: boolean };

/** A request to an admin endpoint: signed in and same-origin unless told otherwise. */
function req(method: string, path: string, init: Init = {}) {
  const payload = init.raw ?? (init.body === undefined ? undefined : JSON.stringify(init.body));
  const headers: Record<string, string> = { host: "localhost:3000", ...(payload !== undefined && { "content-type": "application/json" }), ...(payload !== undefined && !init.noLength && { "content-length": String(Buffer.byteLength(payload)) }), ...init.headers };
  const origin = init.origin === undefined ? BASE : init.origin;
  if (origin) headers.origin = origin;
  const c = init.cookie === undefined ? cookie : init.cookie;
  if (c) headers.cookie = c;
  return new NextRequest(`${BASE}${path}`, { method, headers, ...(payload !== undefined && { body: payload }) });
}

const ctx = <P extends Record<string, string>>(params: P) => ({ params: Promise.resolve(params) });

async function expectOk(res: Response, status = 200) {
  expect(res.status).toBe(status);
  expect(res.headers.get("cache-control")).toContain("no-store");
  const body = await res.json();
  expect(body).toMatchObject({ apiVersion: "v1", label: expect.any(String), meta: { generatedAt: expect.any(String) } });
  return body;
}

async function expectError(res: Response, status: number, code: string) {
  expect(res.status).toBe(status);
  expect(res.headers.get("cache-control")).toContain("no-store");
  const body = await res.json();
  expect(body).toMatchObject({ apiVersion: "v1", kind: "error", error: { code, message: expect.any(String) } });
  return body;
}

const booking = { type: "booking" as const, name: "Asha", phone: "9876543210", address: "12 Rose Villa", locality: "Kamla Nagar", pincode: "282005", city: "agra", service: "Interior Painting" as const };

async function project() {
  const saved = await saveLead(booking);
  await testDb.db.update(projectEvents).set({ createdAt: new Date("2026-10-30T00:00:00Z") }).where(eq(projectEvents.projectId, saved.projectId!));
  return { leadId: saved.id, id: saved.projectId! };
}

const lines = [
  { item: "Living room walls", description: "2 coats", areaSqft: 420, coats: 2, ratePaise: 2_500, amountPaise: 1_050_000 },
  { item: "Main door", amountPaise: 250_000 },
];

describe("every admin endpoint", () => {
  const calls = (id: string, qid: string) => [
    () => patchLead(req("PATCH", `/api/admin/leads/${id}`, { body: { status: "called" } }), ctx({ id })),
    () => stageRoute(req("POST", `/api/admin/projects/${id}/stage`, { body: { stage: "call_confirmed" } }), ctx({ id })),
    () => workStartRoute(req("PUT", `/api/admin/projects/${id}/work-start`, { body: { workStartsOn: null } }), ctx({ id })),
    () => scheduleRoute(req("PUT", `/api/admin/projects/${id}/inspection`, { body: { scheduledAt: "2026-11-04T11:30:00+05:30" } }), ctx({ id })),
    () => visitRoute(req("POST", `/api/admin/projects/${id}/inspection/visit`, { body: {} }), ctx({ id })),
    () => createRoute(req("POST", `/api/admin/projects/${id}/quotations`), ctx({ id })),
    () => saveRoute(req("PUT", `/api/admin/projects/${id}/quotations/${qid}`, { body: { lines } }), ctx({ id, qid })),
    () => statusRoute(req("POST", `/api/admin/projects/${id}/quotations/${qid}/status`, { body: { status: "sent" } }), ctx({ id, qid })),
  ];

  it("needs the admin session: none, forged, another username or admin login not set up is a 401", async () => {
    const { id } = await project();
    for (const variant of [null, "pm_admin=forged.token", `pm_admin=${await createSessionToken("someone", SECRET)}`]) {
      const saved = cookie;
      cookie = variant ?? "";
      for (const call of calls(id, MISSING)) await expectError(await call(), 401, "unauthenticated");
      cookie = saved;
    }
    vi.stubEnv("SESSION_SECRET", "short");
    for (const call of calls(id, MISSING)) await expectError(await call(), 401, "unauthenticated");
    // nothing changed
    expect((await getProjectForAdmin(id))?.stage).toBe("booked");
  });

  it("refuses cross-site requests before anything else", async () => {
    const { id } = await project();
    const cross = (init: Init) => ({ ...init, origin: "https://evil.example" });
    await expectError(await patchLead(req("PATCH", `/api/admin/leads/${id}`, cross({ body: { status: "spam" } })), ctx({ id })), 403, "forbidden");
    await expectError(await stageRoute(req("POST", `/api/admin/projects/${id}/stage`, cross({ body: { stage: "cancelled" } })), ctx({ id })), 403, "forbidden");
    await expectError(await createRoute(req("POST", `/api/admin/projects/${id}/quotations`, cross({})), ctx({ id })), 403, "forbidden");
    expect((await getProjectForAdmin(id))?.stage).toBe("booked");
  });

  it("answers 503 when the database is not configured, and 500 on an unexpected failure, logging no data", async () => {
    const { id } = await project();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    setDb(null);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    // in production the admin cookie carries the __Host- prefix
    cookie = `__Host-pm_admin=${await createSessionToken("owner", SECRET)}`;
    await expectError(await stageRoute(req("POST", `/api/admin/projects/${id}/stage`, { body: { stage: "call_confirmed", note: "Secret note" } }), ctx({ id })), 503, "database_unavailable");
    await expectError(await patchLead(req("PATCH", `/api/admin/leads/${id}`, { body: { status: "called" } }), ctx({ id })), 503, "database_unavailable");
    setDb({ transaction: () => Promise.reject(new TypeError("boom")) } as never);
    await expectError(await createRoute(req("POST", `/api/admin/projects/${id}/quotations`), ctx({ id })), 500, "internal_error");
    expect(JSON.stringify(log.mock.calls)).not.toContain("Secret note");
  });
});

describe("PATCH /api/admin/leads/{id}", () => {
  it("sets a lead's follow-up status", async () => {
    const { leadId } = await project();
    const body = await expectOk(await patchLead(req("PATCH", `/api/admin/leads/${leadId}`, { body: { status: "not_interested" } }), ctx({ id: leadId })));
    expect(body).toMatchObject({ kind: "lead", data: { id: leadId, status: "not_interested", statusLabel: "Not interested" }, links: { html: "/admin" } });
    const [row] = await testDb.db.select({ status: leads.status }).from(leads).where(eq(leads.id, leadId));
    expect(row.status).toBe("not_interested");
  });

  it("rejects a status outside the list (naming the choices), an unknown lead and bad bodies", async () => {
    const { leadId } = await project();
    const bad = await expectError(await patchLead(req("PATCH", `/api/admin/leads/${leadId}`, { body: { status: "won" } }), ctx({ id: leadId })), 400, "invalid_request");
    expect(bad.error.details.status).toMatch(/new, called, converted, not_interested, spam/);
    await expectError(await patchLead(req("PATCH", `/api/admin/leads/${MISSING}`, { body: { status: "called" } }), ctx({ id: MISSING })), 404, "not_found");
    await expectError(await patchLead(req("PATCH", "/api/admin/leads/nope", { body: { status: "called" } }), ctx({ id: "nope" })), 404, "not_found");
    await expectError(await patchLead(req("PATCH", `/api/admin/leads/${leadId}`, { raw: "{nope" }), ctx({ id: leadId })), 400, "invalid_request");
    await expectError(await patchLead(req("PATCH", `/api/admin/leads/${leadId}`, { raw: "status=called", headers: { "content-type": "text/plain" } }), ctx({ id: leadId })), 415, "unsupported_media_type");
    await expectError(await patchLead(req("PATCH", `/api/admin/leads/${leadId}`, { body: { status: "called", pad: "x".repeat(17 * 1024) } }), ctx({ id: leadId })), 413, "payload_too_large");
  });
});

describe("POST /api/admin/projects/{id}/stage and PUT …/work-start", () => {
  it("sets any stage with a customer-facing note, and the crew's start date on its own", async () => {
    const { id } = await project();
    const body = await expectOk(await stageRoute(req("POST", `/api/admin/projects/${id}/stage`, { body: { stage: "work_scheduled", note: "Crew of four confirmed", workStartsOn: "2026-11-10" } }), ctx({ id })));
    expect(body).toMatchObject({ kind: "project", data: { id, stage: "work_scheduled", stageLabel: "Work scheduled" }, links: { html: `/admin/projects/${id}` } });
    let p = await getProjectForAdmin(id);
    expect(p).toMatchObject({ stage: "work_scheduled", workStartsOn: "2026-11-10" });
    expect(p!.timeline.at(-1)).toMatchObject({ stage: "work_scheduled", note: "Crew of four confirmed" });

    const moved = await expectOk(await workStartRoute(req("PUT", `/api/admin/projects/${id}/work-start`, { body: { workStartsOn: "2026-11-12" } }), ctx({ id })));
    expect(moved).toMatchObject({ kind: "project", data: { workStartsOn: "2026-11-12" }, label: "Work start date set to 2026-11-12." });
    const cleared = await expectOk(await workStartRoute(req("PUT", `/api/admin/projects/${id}/work-start`, { body: { workStartsOn: "" } }), ctx({ id })));
    expect(cleared).toMatchObject({ data: { workStartsOn: null }, label: "Work start date cleared." });
    p = await getProjectForAdmin(id);
    expect(p).toMatchObject({ stage: "work_scheduled", workStartsOn: null });
  });

  it("validates the stage, note and date, and answers 404 for an unknown project", async () => {
    const { id } = await project();
    const bad = await expectError(await stageRoute(req("POST", `/api/admin/projects/${id}/stage`, { body: { stage: "painting" } }), ctx({ id })), 400, "invalid_request");
    expect(bad.error.details.stage).toMatch(/one of: booked, call_confirmed/);
    await expectError(await stageRoute(req("POST", `/api/admin/projects/${id}/stage`, { body: { stage: "booked", note: "x".repeat(501) } }), ctx({ id })), 400, "invalid_request");
    await expectError(await workStartRoute(req("PUT", `/api/admin/projects/${id}/work-start`, { body: { workStartsOn: "2026-02-30" } }), ctx({ id })), 400, "invalid_request");
    await expectError(await workStartRoute(req("PUT", `/api/admin/projects/${id}/work-start`, { body: {} }), ctx({ id })), 400, "invalid_request");
    await expectError(await stageRoute(req("POST", `/api/admin/projects/${MISSING}/stage`, { body: { stage: "booked" } }), ctx({ id: MISSING })), 404, "not_found");
    await expectError(await workStartRoute(req("PUT", `/api/admin/projects/${MISSING}/work-start`, { body: { workStartsOn: null } }), ctx({ id: MISSING })), 404, "not_found");
  });
});

describe("inspection endpoints", () => {
  it("schedules in India time, then records the visit and findings, moving the stage forward", async () => {
    const { id } = await project();
    const body = await expectOk(await scheduleRoute(req("PUT", `/api/admin/projects/${id}/inspection`, { body: { scheduledAt: "2026-11-04T11:30:00+05:30", inspectorName: "Ramesh" } }), ctx({ id })));
    expect(body).toMatchObject({ kind: "inspection", data: { projectId: id, scheduledAt: "2026-11-04T06:00:00.000Z" }, label: expect.stringContaining("4 Nov") });
    expect(await getProjectForAdmin(id)).toMatchObject({ stage: "inspection_scheduled", inspection: { inspectorName: "Ramesh", visitedAt: null } });

    await expectOk(await visitRoute(req("POST", `/api/admin/projects/${id}/inspection/visit`, { body: { findings: "Damp on the north wall" } }), ctx({ id })));
    let p = await getProjectForAdmin(id);
    expect(p).toMatchObject({ stage: "inspected", inspection: { findings: "Damp on the north wall", visitedAt: expect.any(String), inspectorName: "Ramesh" } });

    // saving the findings again with the recorded visit time keeps that time
    const visitedAt = p!.inspection!.visitedAt!;
    await expectOk(await visitRoute(req("POST", `/api/admin/projects/${id}/inspection/visit`, { body: { findings: "Damp; needs waterproofing", visitedAt } }), ctx({ id })));
    p = await getProjectForAdmin(id);
    expect(p!.inspection).toMatchObject({ visitedAt, findings: "Damp; needs waterproofing" });
  });

  it("validates the time and text, and answers 404 for an unknown project", async () => {
    const { id } = await project();
    await expectError(await scheduleRoute(req("PUT", `/api/admin/projects/${id}/inspection`, { body: { scheduledAt: "tomorrow" } }), ctx({ id })), 400, "invalid_request");
    await expectError(await scheduleRoute(req("PUT", `/api/admin/projects/${id}/inspection`, { body: { scheduledAt: "2026-11-04T11:30:00+05:30", inspectorName: "x".repeat(81) } }), ctx({ id })), 400, "invalid_request");
    await expectError(await visitRoute(req("POST", `/api/admin/projects/${id}/inspection/visit`, { body: { findings: "x".repeat(2001) } }), ctx({ id })), 400, "invalid_request");
    await expectError(await scheduleRoute(req("PUT", `/api/admin/projects/${MISSING}/inspection`, { body: { scheduledAt: "2026-11-04T11:30:00+05:30" } }), ctx({ id: MISSING })), 404, "not_found");
    await expectError(await visitRoute(req("POST", `/api/admin/projects/${MISSING}/inspection/visit`, { body: {} }), ctx({ id: MISSING })), 404, "not_found");
  });
});

describe("quotation endpoints", () => {
  it("starts a draft, saves its lines, sends it, and records the customer's answer", async () => {
    const { id } = await project();
    const created = await expectOk(await createRoute(req("POST", `/api/admin/projects/${id}/quotations`), ctx({ id })), 201);
    expect(created).toMatchObject({ kind: "quotation", data: { version: 1, status: "draft" } });
    const qid = created.data.id as string;

    const saved = await expectOk(await saveRoute(req("PUT", `/api/admin/projects/${id}/quotations/${qid}`, { body: { lines, notes: "Furniture moved by us", paymentTerms: "", validUntil: "2026-11-30" } }), ctx({ id, qid })));
    expect(saved).toMatchObject({ kind: "quotation", data: { id: qid, lines: 2, totalPaise: 1_300_000, currency: "INR" }, label: "Draft saved: 2 lines." });
    let p = await getProjectForAdmin(id);
    expect(p!.quotations[0]).toMatchObject({ status: "draft", notes: "Furniture moved by us", paymentTerms: null, validUntil: "2026-11-30", totalPaise: 1_300_000 });
    expect(p!.quotations[0].lines.map((l) => [l.position, l.item, l.ratePaise])).toEqual([
      [1, "Living room walls", 2_500],
      [2, "Main door", null],
    ]);

    const sent = await expectOk(await statusRoute(req("POST", `/api/admin/projects/${id}/quotations/${qid}/status`, { body: { status: "sent" } }), ctx({ id, qid })));
    expect(sent).toMatchObject({ data: { id: qid, status: "sent" }, label: "Quotation sent to the customer." });
    expect((await getProjectForAdmin(id))?.stage).toBe("quotation_shared");

    // a sent version can no longer be edited or sent again
    const locked = await expectError(await saveRoute(req("PUT", `/api/admin/projects/${id}/quotations/${qid}`, { body: { lines } }), ctx({ id, qid })), 409, "invalid_state");
    expect(locked.error.message).toMatch(/start a new version/);
    await expectError(await statusRoute(req("POST", `/api/admin/projects/${id}/quotations/${qid}/status`, { body: { status: "sent" } }), ctx({ id, qid })), 409, "invalid_state");

    await expectOk(await statusRoute(req("POST", `/api/admin/projects/${id}/quotations/${qid}/status`, { body: { status: "declined" } }), ctx({ id, qid })));
    const approved = await expectOk(await statusRoute(req("POST", `/api/admin/projects/${id}/quotations/${qid}/status`, { body: { status: "approved" } }), ctx({ id, qid })));
    expect(approved.label).toBe("Quotation approved: the price is final.");
    p = await getProjectForAdmin(id);
    expect(p).toMatchObject({ stage: "price_finalised", finalPricePaise: 1_300_000 });

    // a revision starts as a copy of the latest version
    const v2 = await expectOk(await createRoute(req("POST", `/api/admin/projects/${id}/quotations`), ctx({ id })), 201);
    expect(v2.data.version).toBe(2);
    expect((await getProjectForAdmin(id))!.quotations[0]).toMatchObject({ version: 2, status: "draft", totalPaise: 1_300_000 });
  });

  it("keeps a quotation to its own project, and validates lines with the line named", async () => {
    const a = await project();
    const b = await project();
    const created = await expectOk(await createRoute(req("POST", `/api/admin/projects/${a.id}/quotations`), ctx({ id: a.id })), 201);
    const qid = created.data.id as string;

    // project b's URL with project a's quotation: not found, and nothing changes
    await expectError(await saveRoute(req("PUT", `/api/admin/projects/${b.id}/quotations/${qid}`, { body: { lines } }), ctx({ id: b.id, qid })), 404, "not_found");
    await expectError(await statusRoute(req("POST", `/api/admin/projects/${b.id}/quotations/${qid}/status`, { body: { status: "sent" } }), ctx({ id: b.id, qid })), 404, "not_found");
    expect((await getProjectForAdmin(a.id))!.quotations[0]).toMatchObject({ status: "draft", lines: [] });

    const bad = await expectError(
      await saveRoute(req("PUT", `/api/admin/projects/${a.id}/quotations/${qid}`, { body: { lines: [lines[0], { item: " ", amountPaise: 10.5 }] } }), ctx({ id: a.id, qid })),
      400,
      "invalid_request",
    );
    expect(bad.error.message).toBe("Line 2: Name the room or item");
    expect(bad.error.details).toMatchObject({ "lines.1.item": "Name the room or item", "lines.1.amountPaise": "Amount must be a whole number" });
    await expectError(await saveRoute(req("PUT", `/api/admin/projects/${a.id}/quotations/${qid}`, { body: { lines, validUntil: "soon" } }), ctx({ id: a.id, qid })), 400, "invalid_request");
    await expectError(await saveRoute(req("PUT", `/api/admin/projects/${a.id}/quotations/${qid}`, { body: [] }), ctx({ id: a.id, qid })), 400, "invalid_request");
    const choice = await expectError(await statusRoute(req("POST", `/api/admin/projects/${a.id}/quotations/${qid}/status`, { body: { status: "superseded" } }), ctx({ id: a.id, qid })), 400, "invalid_request");
    expect(choice.error.details.status).toMatch(/sent, approved, declined/);

    // sending an empty draft, or approving a draft, does not fit its state
    await expectError(await statusRoute(req("POST", `/api/admin/projects/${a.id}/quotations/${qid}/status`, { body: { status: "sent" } }), ctx({ id: a.id, qid })), 409, "invalid_state");
    await expectError(await statusRoute(req("POST", `/api/admin/projects/${a.id}/quotations/${qid}/status`, { body: { status: "approved" } }), ctx({ id: a.id, qid })), 409, "invalid_state");
    await expectError(await createRoute(req("POST", `/api/admin/projects/${MISSING}/quotations`), ctx({ id: MISSING })), 404, "not_found");
  });

  it("takes a long quotation (more than 16 KB) but not an unbounded one", async () => {
    const { id } = await project();
    const created = await expectOk(await createRoute(req("POST", `/api/admin/projects/${id}/quotations`), ctx({ id })), 201);
    const qid = created.data.id as string;
    const long = Array.from({ length: 60 }, (_, i) => ({ item: `Room ${i + 1}`, description: "Putty, primer and two coats of premium emulsion. ".repeat(6).slice(0, 300), amountPaise: 100_000 }));
    expect(Buffer.byteLength(JSON.stringify({ lines: long }))).toBeGreaterThan(16 * 1024);
    await expectOk(await saveRoute(req("PUT", `/api/admin/projects/${id}/quotations/${qid}`, { body: { lines: long } }), ctx({ id, qid })));
    expect((await getProjectForAdmin(id))!.quotations[0].lines).toHaveLength(60);

    await expectError(await saveRoute(req("PUT", `/api/admin/projects/${id}/quotations/${qid}`, { body: { lines: long, notes: "x".repeat(130 * 1024) } }), ctx({ id, qid })), 413, "payload_too_large");
    // a body without a Content-Length is measured as it is read
    const chunked = req("PUT", `/api/admin/projects/${id}/quotations/${qid}`, { body: { lines: long, notes: "x".repeat(130 * 1024) }, noLength: true });
    await expectError(await saveRoute(chunked, ctx({ id, qid })), 413, "payload_too_large");
  });
});

describe("GET /api/admin/projects/{id}/quotations/{qid}/pdf", () => {
  it("shows staff the branded PDF of any version, a draft included, inline and never cached", async () => {
    const { id } = await project();
    const created = await expectOk(await createRoute(req("POST", `/api/admin/projects/${id}/quotations`), ctx({ id })), 201);
    const qid = created.data.id as string;
    await expectOk(await saveRoute(req("PUT", `/api/admin/projects/${id}/quotations/${qid}`, { body: { lines: [lines[0]] } }), ctx({ id, qid })));
    // a link click: a GET with no Origin header
    const res = await pdfRoute(req("GET", `/api/admin/projects/${id}/quotations/${qid}/pdf`, { origin: null }), ctx({ id, qid }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toBe('inline; filename="Paint-Saathi-quotation-v1.pdf"');
    expect(res.headers.get("cache-control")).toContain("no-store");
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(res.headers.get("content-length")).toBe(String(bytes.byteLength));
  });

  it("needs the admin session, and keeps a quotation to its own project", async () => {
    const a = await project();
    const b = await project();
    const created = await expectOk(await createRoute(req("POST", `/api/admin/projects/${a.id}/quotations`), ctx({ id: a.id })), 201);
    const qid = created.data.id as string;
    await expectError(await pdfRoute(req("GET", `/api/admin/projects/${a.id}/quotations/${qid}/pdf`, { cookie: null }), ctx({ id: a.id, qid })), 401, "unauthenticated");
    await expectError(await pdfRoute(req("GET", `/api/admin/projects/${b.id}/quotations/${qid}/pdf`), ctx({ id: b.id, qid })), 404, "not_found");
    await expectError(await pdfRoute(req("GET", `/api/admin/projects/${a.id}/quotations/nope/pdf`), ctx({ id: a.id, qid: "nope" })), 404, "not_found");
    vi.spyOn(console, "error").mockImplementation(() => {});
    setDb({ select: () => { throw new TypeError("boom"); } } as never);
    await expectError(await pdfRoute(req("GET", `/api/admin/projects/${a.id}/quotations/${qid}/pdf`), ctx({ id: a.id, qid })), 500, "internal_error");
  });
});

describe("singular labels", () => {
  it("says \"1 line\" for a one-line draft", async () => {
    const { id } = await project();
    const created = await expectOk(await createRoute(req("POST", `/api/admin/projects/${id}/quotations`), ctx({ id })), 201);
    const qid = created.data.id as string;
    const saved = await expectOk(await saveRoute(req("PUT", `/api/admin/projects/${id}/quotations/${qid}`, { body: { lines: [lines[1]] } }), ctx({ id, qid })));
    expect(saved.label).toBe("Draft saved: 1 line.");
  });
});
