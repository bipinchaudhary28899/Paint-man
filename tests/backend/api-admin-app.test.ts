import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as leadsRoute } from "@/app/api/admin/leads/route";
import { GET as projectRoute } from "@/app/api/admin/projects/[id]/route";
import { POST as createQuotation } from "@/app/api/admin/projects/[id]/quotations/route";
import { GET as projectsRoute } from "@/app/api/admin/projects/route";
import { hashPassword } from "@/lib/auth/password";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";
import { setDb } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import * as store from "@/lib/leads/store";
import { saveLead } from "@/lib/leads/store";
import * as repo from "@/lib/projects/repo";
import { resetTestDb, useTestDb } from "../support/db";
import { postJson } from "../support/request";

// The admin API as the phone app uses it: sign in for a bearer token (POST /api/admin/session, with
// the website form's lockout), then read the leads, the projects and one project with that token.

const testDb = useTestDb();
const BASE = "http://localhost:3000";
const PASSWORD = "a-very-long-test-password";
const SECRET = "s".repeat(48);
const MISSING = "00000000-0000-4000-8000-000000000000";
let hash: string;
let token = "";

beforeAll(async () => {
  hash = await hashPassword(PASSWORD, { N: 2 ** 14, r: 8, p: 1 });
});

beforeEach(async () => {
  await resetTestDb(testDb.db);
  vi.stubEnv("ADMIN_USERNAME", "owner");
  vi.stubEnv("ADMIN_PASSWORD_HASH", hash);
  vi.stubEnv("SESSION_SECRET", SECRET);
  token = await createSessionToken("owner", SECRET);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setDb(testDb.db);
});

/** A GET as the app sends it: no Origin, no cookie, the bearer token unless told otherwise. */
function get(path: string, { bearer = token as string | null, cookie }: { bearer?: string | null; cookie?: string } = {}) {
  const headers: Record<string, string> = { host: "localhost:3000", accept: "application/json" };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  if (cookie) headers.cookie = cookie;
  return new NextRequest(`${BASE}${path}`, { headers });
}

const ctx = <P extends Record<string, string>>(params: P) => ({ params: Promise.resolve(params) });

async function expectOk(res: Response) {
  expect(res.status).toBe(200);
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

describe("POST /api/admin/session (the app's admin sign-in)", () => {
  async function load() {
    vi.resetModules();
    return {
      session: (await import("@/app/api/admin/session/route")).POST,
      login: (await import("@/app/api/admin/login/route")).POST,
    };
  }
  /** As the app sends it: no Origin header. */
  const signIn = (body: unknown, ip = "198.51.100.1", origin: string | null = null) => postJson(`${BASE}/api/admin/session`, { body, origin, headers: { "x-forwarded-for": ip } });

  it("answers a token the admin endpoints accept as a bearer token, with when it expires", async () => {
    const { session } = await load();
    const body = await expectOk(await session(signIn({ username: "owner", password: PASSWORD })));
    expect(body).toMatchObject({ kind: "admin-session", data: { username: "owner", token: expect.any(String), expiresAt: expect.any(String) }, links: { html: "/admin" } });
    expect((await verifySessionToken(body.data.token, SECRET))?.sub).toBe("owner");
    const hours = (Date.parse(body.data.expiresAt) - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(7.9);
    expect(hours).toBeLessThanOrEqual(8);
    expect(body.label).not.toContain(PASSWORD);
    await expectOk(await projectsRoute(get("/api/admin/projects", { bearer: body.data.token })));
  });

  it("refuses a wrong password or username with one generic message, and never a token", async () => {
    const { session } = await load();
    const wrong = await expectError(await session(signIn({ username: "owner", password: "wrong-password-here" }, "198.51.100.2")), 401, "invalid_credentials");
    const unknown = await expectError(await session(signIn({ username: "someone", password: PASSWORD }, "198.51.100.2")), 401, "invalid_credentials");
    expect(wrong.error.message).toBe("Incorrect username or password.");
    expect(unknown.error.message).toBe(wrong.error.message);
    expect(JSON.stringify(wrong)).not.toContain("token");
  });

  it("shares the website form's lockout: 5 failures there lock the app out too", async () => {
    const { session, login } = await load();
    const ip = "198.51.100.3";
    for (let i = 0; i < 5; i++) {
      expect((await login(postJson(`${BASE}/api/admin/login`, { body: { username: "owner", password: "nope-nope-nope" }, headers: { "x-forwarded-for": ip } }))).status).toBe(401);
    }
    await expectError(await session(signIn({ username: "owner", password: PASSWORD }, ip)), 429, "rate_limited");
    await expectOk(await session(signIn({ username: "owner", password: PASSWORD }, "198.51.100.4")));
  });

  it("rejects cross-site requests, oversized and malformed bodies", async () => {
    const { session } = await load();
    await expectError(await session(signIn({ username: "owner", password: PASSWORD }, "198.51.100.5", "https://evil.example")), 403, "forbidden");
    await expectError(await session(postJson(`${BASE}/api/admin/session`, { raw: "x".repeat(17 * 1024), origin: null })), 413, "payload_too_large");
    await expectError(await session(postJson(`${BASE}/api/admin/session`, { raw: "nope", origin: null })), 400, "invalid_request");
    await expectError(await session(signIn({ username: "owner" }, "198.51.100.5")), 400, "invalid_request");
  });

  it("is off when admin login is not set up", async () => {
    vi.stubEnv("SESSION_SECRET", "short");
    const { session } = await load();
    await expectError(await session(signIn({ username: "owner", password: PASSWORD })), 503, "not_configured");
  });

  it("answers 500 when the check itself fails", async () => {
    const { session } = await load();
    const login = await import("@/lib/admin/login");
    vi.spyOn(login, "adminLogin").mockRejectedValue(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expectError(await session(signIn({ username: "owner", password: PASSWORD })), 500, "internal_error");
  });
});

describe("the admin session in a bearer token", () => {
  it("is refused when forged, expired, for another username or missing", async () => {
    await expectError(await projectsRoute(get("/api/admin/projects", { bearer: `${token}x` })), 401, "unauthenticated");
    await expectError(await projectsRoute(get("/api/admin/projects", { bearer: await createSessionToken("owner", SECRET, Date.now() - 9 * 3_600_000) })), 401, "unauthenticated");
    await expectError(await projectsRoute(get("/api/admin/projects", { bearer: await createSessionToken("someone", SECRET) })), 401, "unauthenticated");
    await expectError(await projectsRoute(get("/api/admin/projects", { bearer: null })), 401, "unauthenticated");
  });

  it("takes the place of the cookie, which still works on its own (the website)", async () => {
    await expectError(await projectsRoute(get("/api/admin/projects", { bearer: "not-a-token", cookie: `pm_admin=${token}` })), 401, "unauthenticated");
    await expectOk(await projectsRoute(get("/api/admin/projects", { bearer: null, cookie: `pm_admin=${token}` })));
  });

  it("lets the app change data without an Origin header", async () => {
    const saved = await saveLead(booking);
    const req = new NextRequest(`${BASE}/api/admin/projects/${saved.projectId}/quotations`, { method: "POST", headers: { host: "localhost:3000", authorization: `Bearer ${token}` } });
    expect((await createQuotation(req, ctx({ id: saved.projectId! }))).status).toBe(201);
  });
});

describe("GET /api/admin/leads", () => {
  async function seed() {
    const a = await saveLead(booking);
    await saveLead({ type: "contact", name: "Ravi", phone: "9812345678", message: "Do you paint grills?", page: "/contact" });
    await saveLead({ ...booking, name: "Meena", phone: "9898989898", city: "mathura", locality: "Krishna Nagar" });
    // the newest lead first: give each a distinct arrival time
    const rows = await testDb.db.select({ id: leads.id, name: leads.name }).from(leads);
    const at = { Asha: "2026-10-28T05:00:00Z", Ravi: "2026-10-29T05:00:00Z", Meena: "2026-10-30T05:00:00Z" } as Record<string, string>;
    for (const r of rows) {
      const { eq } = await import("drizzle-orm");
      await testDb.db.update(leads).set({ createdAt: new Date(at[r.name]) }).where(eq(leads.id, r.id));
    }
    return a;
  }

  it("lists the leads newest first in camelCase, with counts, choices and the project link", async () => {
    const asha = await seed();
    const body = await expectOk(await leadsRoute(get("/api/admin/leads")));
    expect(body.kind).toBe("lead");
    expect(body.data.map((l: { name: string }) => l.name)).toEqual(["Meena", "Ravi", "Asha"]);
    expect(body.data[2]).toMatchObject({
      id: asha.id,
      type: "booking",
      receivedAt: "2026-10-28T05:00:00.000Z",
      received: expect.stringContaining("2026"),
      name: "Asha",
      phone: "9876543210",
      city: "Agra",
      address: "12 Rose Villa, Kamla Nagar, Agra 282005",
      service: "Interior Painting",
      source: "Direct",
      status: "new",
      statusLabel: "New",
      projectId: asha.projectId,
    });
    expect(body.data[1]).toMatchObject({ type: "contact", message: "Do you paint grills?", projectId: null });
    expect(body.meta).toMatchObject({ total: 3, page: 1, pages: 1, perPage: 50, stats: { total: 3, bookings: 2, messages: 1, new: 3 }, options: { cities: ["Agra", "Mathura"], statuses: ["New"] } });
    expect(body.links).toMatchObject({ self: "/api/admin/leads", html: "/admin" });
  });

  it("searches and filters by type, city and status, and pages through the matches", async () => {
    await seed();
    const byType = await expectOk(await leadsRoute(get("/api/admin/leads?type=booking")));
    expect(byType.data.map((l: { name: string }) => l.name)).toEqual(["Meena", "Asha"]);
    expect(byType.label).toContain("bookings");
    const byCity = await expectOk(await leadsRoute(get("/api/admin/leads?city=Mathura")));
    expect(byCity.data.map((l: { name: string }) => l.name)).toEqual(["Meena"]);
    const byText = await expectOk(await leadsRoute(get("/api/admin/leads?q=grills")));
    expect(byText.data.map((l: { name: string }) => l.name)).toEqual(["Ravi"]);
    expect(byText.meta.query).toEqual({ q: "grills", type: "all", city: null, status: null });
    expect((await expectOk(await leadsRoute(get("/api/admin/leads?status=called")))).meta.total).toBe(0);
    const paged = await expectOk(await leadsRoute(get("/api/admin/leads?perPage=2&page=2")));
    expect(paged.data.map((l: { name: string }) => l.name)).toEqual(["Asha"]);
    expect(paged.meta).toMatchObject({ total: 3, page: 2, pages: 2, perPage: 2 });
    // the counts and choices always cover every lead
    expect(paged.meta.stats.total).toBe(3);
  });

  it("refuses unknown filters with the valid choices, and bad pages", async () => {
    await seed();
    expect((await expectError(await leadsRoute(get("/api/admin/leads?type=nope")), 400, "invalid_type")).error.details).toContain("booking");
    expect((await expectError(await leadsRoute(get("/api/admin/leads?status=nope")), 400, "invalid_status")).error.details).toContain("not_interested");
    expect((await expectError(await leadsRoute(get("/api/admin/leads?city=Paris")), 400, "invalid_city")).error.details).toEqual(["Agra", "Mathura"]);
    await expectError(await leadsRoute(get("/api/admin/leads?page=0")), 400, "invalid_page");
    await expectError(await leadsRoute(get("/api/admin/leads?perPage=101")), 400, "invalid_per_page");
    await expectError(await leadsRoute(get("/api/admin/leads?perPage=abc")), 400, "invalid_per_page");
  });

  it("needs the admin session and answers 503/500 when the database fails", async () => {
    await expectError(await leadsRoute(get("/api/admin/leads", { bearer: null })), 401, "unauthenticated");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(store, "readLeadEntries").mockRejectedValueOnce(new Error("boom"));
    await expectError(await leadsRoute(get("/api/admin/leads")), 500, "internal_error");
  });
});

describe("GET /api/admin/projects", () => {
  it("lists the projects with the customer, filtered by stage, city and search, in pages", async () => {
    const a = await saveLead(booking);
    await saveLead({ ...booking, name: "Meena", phone: "9898989898", city: "mathura", locality: "Krishna Nagar" });
    const all = await expectOk(await projectsRoute(get("/api/admin/projects")));
    expect(all.kind).toBe("project");
    expect(all.meta).toMatchObject({ total: 2, page: 1, pages: 1, perPage: 50, query: { q: "", stage: null, city: null } });
    expect(all.meta.cities).toContainEqual({ slug: "agra", name: "Agra" });
    expect(all.data.find((p: { id: string }) => p.id === a.projectId)).toMatchObject({ name: "Asha", phone: "9876543210", stage: "booked", stageLabel: "Booking received", leadId: a.id });
    const byCity = await expectOk(await projectsRoute(get("/api/admin/projects?city=mathura")));
    expect(byCity.data.map((p: { name: string }) => p.name)).toEqual(["Meena"]);
    expect(byCity.label).toContain("Mathura");
    const byPhone = await expectOk(await projectsRoute(get("/api/admin/projects?q=98765")));
    expect(byPhone.data.map((p: { name: string }) => p.name)).toEqual(["Asha"]);
    const byStage = await expectOk(await projectsRoute(get("/api/admin/projects?stage=completed")));
    expect(byStage.meta.total).toBe(0);
    const paged = await expectOk(await projectsRoute(get("/api/admin/projects?perPage=1&page=2")));
    expect(paged.data).toHaveLength(1);
    expect(paged.meta).toMatchObject({ total: 2, pages: 2 });
  });

  it("refuses unknown stages and cities with the choices, and bad pages", async () => {
    expect((await expectError(await projectsRoute(get("/api/admin/projects?stage=nope")), 400, "invalid_stage")).error.details).toContain("on_hold");
    expect((await expectError(await projectsRoute(get("/api/admin/projects?city=paris")), 400, "invalid_city")).error.details).toContain("agra");
    await expectError(await projectsRoute(get("/api/admin/projects?page=-1")), 400, "invalid_page");
    await expectError(await projectsRoute(get("/api/admin/projects?perPage=0")), 400, "invalid_per_page");
  });

  it("answers 500 when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(repo, "listProjects").mockRejectedValueOnce(new Error("boom"));
    await expectError(await projectsRoute(get("/api/admin/projects")), 500, "internal_error");
  });
});

describe("GET /api/admin/projects/{id}", () => {
  it("answers the whole project for staff, drafts included", async () => {
    const saved = await saveLead(booking);
    const req = new NextRequest(`${BASE}/api/admin/projects/${saved.projectId}/quotations`, { method: "POST", headers: { host: "localhost:3000", authorization: `Bearer ${token}` } });
    await createQuotation(req, ctx({ id: saved.projectId! }));
    const body = await expectOk(await projectRoute(get(`/api/admin/projects/${saved.projectId}`), ctx({ id: saved.projectId! })));
    expect(body).toMatchObject({ kind: "project", data: { id: saved.projectId, name: "Asha", phone: "9876543210", lead: { id: saved.id, source: "web" }, quotations: [{ version: 1, status: "draft" }] } });
    expect(body.data.timeline.length).toBeGreaterThan(0);
    expect(body.label).toContain("Asha");
    expect(body.links.html).toBe(`/admin/projects/${saved.projectId}`);
  });

  it("answers 404 for an unknown project, 401 without the session and 500 when the database fails", async () => {
    await expectError(await projectRoute(get(`/api/admin/projects/${MISSING}`), ctx({ id: MISSING })), 404, "not_found");
    await expectError(await projectRoute(get(`/api/admin/projects/${MISSING}`, { bearer: null }), ctx({ id: MISSING })), 401, "unauthenticated");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(repo, "getProjectForAdmin").mockRejectedValueOnce(new Error("boom"));
    await expectError(await projectRoute(get(`/api/admin/projects/${MISSING}`), ctx({ id: MISSING })), 500, "internal_error");
  });
});
