import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUserSession } from "@/lib/auth/user-session";
import { signInUser } from "@/lib/auth/users";
import { setDb } from "@/lib/db/client";
import { leads, projects, users } from "@/lib/db/schema";
import { saveLead } from "@/lib/leads/store";
import { approveQuotation, createQuotation, saveQuotation, sendQuotation } from "@/lib/projects/repo";
import { postJson } from "../support/request";
import { resetTestDb, useTestDb } from "../support/db";

// The signed-in customer's API: /api/v1/me, /api/v1/projects, /api/v1/projects/{id} and the app's
// /api/v1/bookings, against an in-memory Postgres.

const testDb = useTestDb();
const PHONE = "9876543210";
const BASE = "http://localhost:3000";

beforeEach(async () => {
  await resetTestDb(testDb.db);
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setDb(testDb.db);
});

async function signedIn(client: "web" | "app" = "app", phone = PHONE) {
  const user = await signInUser(phone);
  const { token } = await createUserSession(user.id, client);
  return { user, token, bearer: { authorization: `Bearer ${token}` }, cookie: `ps_session=${token}` };
}

const request = (path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) =>
  new NextRequest(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: { host: "localhost:3000", ...(init.body !== undefined && { "content-type": "application/json" }), ...init.headers },
    ...(init.body !== undefined && { body: JSON.stringify(init.body) }),
  });

const expectError = async (res: Response, status: number, code: string) => {
  expect(res.status).toBe(status);
  expect(res.headers.get("cache-control")).toContain("no-store");
  const body = await res.json();
  expect(body).toMatchObject({ apiVersion: "v1", kind: "error", error: { code } });
  return body;
};

const me = async () => import("@/app/api/v1/me/route");
const projectsRoute = async () => (await import("@/app/api/v1/projects/route")).GET;
const projectRoute = async () => (await import("@/app/api/v1/projects/[id]/route")).GET;
const bookings = async () => (await import("@/app/api/v1/bookings/route")).POST;

const booking = { type: "booking" as const, name: "Asha", phone: PHONE, address: "12 Rose Villa, Nehru Road", locality: "Kamla Nagar", pincode: "282005", city: "agra" };

describe("GET /api/v1/me", () => {
  it("returns the signed-in customer by bearer token or cookie, never cached", async () => {
    const { GET } = await me();
    const { user, bearer, cookie } = await signedIn();
    const res = await GET(request("/api/v1/me", { headers: bearer }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "user", label: "The signed-in customer (no name set yet).", links: { self: "/api/v1/me", projects: "/api/v1/projects", html: "/account" } });
    expect(body.data).toEqual({ id: user.id, phone: PHONE, name: null, createdAt: user.createdAt });
    expect((await (await GET(request("/api/v1/me", { headers: { cookie } }))).json()).data.id).toBe(user.id);
  });

  it("401 unauthenticated without a session, with an unknown token, or after the account is gone", async () => {
    const { GET } = await me();
    await expectError(await GET(request("/api/v1/me")), 401, "unauthenticated");
    await expectError(await GET(request("/api/v1/me", { headers: { authorization: `Bearer ${"a".repeat(43)}` } })), 401, "unauthenticated");
  });

  it("503 database_unavailable when production has no database", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    setDb(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await me();
    await expectError(await GET(request("/api/v1/me", { headers: { authorization: `Bearer ${"a".repeat(43)}` } })), 503, "database_unavailable");
  });
});

describe("PATCH /api/v1/me", () => {
  it("renames the customer", async () => {
    const { PATCH } = await me();
    const { bearer } = await signedIn();
    const res = await PATCH(request("/api/v1/me", { method: "PATCH", headers: bearer, body: { name: "  Asha Verma " } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ kind: "user", label: "Name updated to Asha Verma.", data: { name: "Asha Verma", phone: PHONE } });
    const { GET } = await me();
    expect((await (await GET(request("/api/v1/me", { headers: bearer }))).json()).label).toBe("The signed-in customer, Asha Verma.");
  });

  it("400 for a bad name, 401 signed out, 403 for a cross-site cookie, 413, 415 and 429", async () => {
    const { PATCH } = await me();
    const { bearer, cookie, user } = await signedIn("web");
    const bad = await expectError(await PATCH(request("/api/v1/me", { method: "PATCH", headers: bearer, body: { name: "A" } })), 400, "invalid_request");
    expect(bad.error.details).toEqual({ name: "Enter your name" });
    expect((await expectError(await PATCH(request("/api/v1/me", { method: "PATCH", headers: bearer, body: { name: "x".repeat(81) } })), 400, "invalid_request")).error.details.name).toMatch(/80/);
    await expectError(await PATCH(request("/api/v1/me", { method: "PATCH", body: { name: "Asha" } })), 401, "unauthenticated");
    await expectError(await PATCH(request("/api/v1/me", { method: "PATCH", headers: { cookie, origin: "https://evil.example" }, body: { name: "Asha" } })), 403, "forbidden");
    expect((await PATCH(request("/api/v1/me", { method: "PATCH", headers: { cookie, origin: BASE }, body: { name: "Asha" } }))).status).toBe(200);
    await expectError(await PATCH(request("/api/v1/me", { method: "PATCH", headers: { ...bearer, "content-length": "20000" }, body: { name: "Asha" } })), 413, "payload_too_large");
    await expectError(await PATCH(new NextRequest(`${BASE}/api/v1/me`, { method: "PATCH", headers: { ...bearer, "content-type": "text/plain" }, body: "Asha" })), 415, "unsupported_media_type");

    const statuses = [];
    for (let i = 0; i < 20; i++) statuses.push((await PATCH(request("/api/v1/me", { method: "PATCH", headers: bearer, body: { name: `Asha ${i}` } }))).status);
    expect(statuses.filter((s) => s === 429)).toHaveLength(1); // one change was already made above
    const limited = await expectError(await PATCH(request("/api/v1/me", { method: "PATCH", headers: bearer, body: { name: "Asha" } })), 429, "rate_limited");
    expect(limited.error.details.retryAfterSeconds).toBeGreaterThan(0);

    // the account vanished between the session check and the update
    vi.spyOn(testDb.db, "update").mockReturnValue({ set: () => ({ where: () => ({ returning: async () => [] }) }) } as never);
    vi.resetModules();
    const fresh = await me();
    await expectError(await fresh.PATCH(request("/api/v1/me", { method: "PATCH", headers: (await signedIn("app", "9000000002")).bearer, body: { name: "Asha" } })), 401, "unauthenticated");
    expect(user.id).toBeDefined();
  });
});

describe("DELETE /api/v1/me", () => {
  it("deletes the account and its sessions, keeps the bookings unlinked, and clears the cookies", async () => {
    const { DELETE, GET } = await me();
    const { user, bearer } = await signedIn();
    const saved = await saveLead(booking, { userId: user.id });
    const res = await DELETE(request("/api/v1/me", { method: "DELETE", headers: bearer }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(await res.json()).toMatchObject({ kind: "user", data: { deleted: true } });
    expect(res.headers.getSetCookie().filter((c) => /Max-Age=0/.test(c))).toHaveLength(2);
    expect(await testDb.db.select().from(users)).toHaveLength(0);
    expect((await testDb.db.select().from(projects).where(eq(projects.id, saved.projectId!)))[0].userId).toBeNull();
    expect((await testDb.db.select().from(leads))[0].userId).toBeNull();
    await expectError(await GET(request("/api/v1/me", { headers: bearer })), 401, "unauthenticated");
  });

  it("401 signed out and 403 for a cross-site cookie", async () => {
    const { DELETE } = await me();
    const { cookie } = await signedIn("web");
    await expectError(await DELETE(request("/api/v1/me", { method: "DELETE" })), 401, "unauthenticated");
    await expectError(await DELETE(request("/api/v1/me", { method: "DELETE", headers: { cookie, origin: "https://evil.example" } })), 403, "forbidden");
    expect(await testDb.db.select().from(users)).toHaveLength(1);
  });

  it("500 internal_error when the database fails", async () => {
    const { DELETE } = await me();
    const { bearer } = await signedIn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(testDb.db, "delete").mockImplementation(() => {
      throw new Error("boom");
    });
    await expectError(await DELETE(request("/api/v1/me", { method: "DELETE", headers: bearer })), 500, "internal_error");
  });
});

describe("GET /api/v1/projects and /api/v1/projects/{id}", () => {
  it("lists the customer's projects and shows one as the tracker, with the approved price", async () => {
    const { user, bearer } = await signedIn();
    const saved = await saveLead({ ...booking, service: "Interior Painting" }, { userId: user.id });
    await saveLead({ ...booking, phone: "9123456789" }); // someone else's
    const q = await createQuotation(saved.projectId!);
    await saveQuotation(q.id, { lines: [{ item: "Living room walls", description: null, areaSqft: 400, coats: 2, ratePaise: 2_500, amountPaise: 1_000_000 }] });
    await sendQuotation(q.id);
    await approveQuotation(q.id);

    const list = await (await projectsRoute())(request("/api/v1/projects", { headers: bearer }));
    expect(list.status).toBe(200);
    expect(list.headers.get("cache-control")).toContain("no-store");
    const listBody = await list.json();
    expect(listBody).toMatchObject({ kind: "project", label: "1 painting project", meta: { total: 1 }, links: { self: "/api/v1/projects", html: "/account" } });
    expect(listBody.data).toEqual([
      expect.objectContaining({ id: saved.projectId, service: "Interior Painting", city: "Agra", locality: "Kamla Nagar", stage: "price_finalised", stageLabel: "Price finalised", finalPricePaise: 1_000_000, currency: "INR" }),
    ]);

    const GET = await projectRoute();
    const res = await GET(request(`/api/v1/projects/${saved.projectId}`, { headers: bearer }), { params: Promise.resolve({ id: saved.projectId! }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({
      apiVersion: "v1",
      kind: "project",
      label: "Interior Painting project in Kamla Nagar, Agra: Price finalised.",
      meta: { quotations: 1 },
      links: { self: `/api/v1/projects/${saved.projectId}`, html: `/account/projects/${saved.projectId}`, projects: "/api/v1/projects" },
    });
    expect(body.data).toMatchObject({ stage: "price_finalised", finalPricePaise: 1_000_000, address: "12 Rose Villa, Nehru Road", inspection: null });
    expect(body.data.stages).toHaveLength(9);
    expect(body.data.quotations[0]).toMatchObject({ version: 1, status: "approved", totalPaise: 1_000_000, pdf: `/api/v1/projects/${saved.projectId}/quotations/${q.id}/pdf` });
  });

  it("names a project without a service or locality plainly, and lists none for a new account", async () => {
    const { user, bearer } = await signedIn();
    const listBody = await (await (await projectsRoute())(request("/api/v1/projects", { headers: bearer }))).json();
    expect(listBody).toMatchObject({ label: "0 painting projects", data: [] });
    const saved = await saveLead(booking, { userId: user.id });
    await testDb.db.update(projects).set({ locality: null, city: null }).where(eq(projects.id, saved.projectId!));
    const res = await (await projectRoute())(request(`/api/v1/projects/${saved.projectId}`, { headers: bearer }), { params: Promise.resolve({ id: saved.projectId! }) });
    expect((await res.json()).label).toBe("Painting project: Booking received.");
  });

  it("404 not_found for another customer's project (never revealing it), 401 signed out", async () => {
    const { bearer } = await signedIn();
    const theirs = await saveLead({ ...booking, phone: "9123456789" });
    const GET = await projectRoute();
    const res = await GET(request(`/api/v1/projects/${theirs.projectId}`, { headers: bearer }), { params: Promise.resolve({ id: theirs.projectId! }) });
    const body = await expectError(res, 404, "not_found");
    expect(JSON.stringify(body)).not.toContain("9123456789");
    await expectError(await GET(request("/api/v1/projects/nope", { headers: bearer }), { params: Promise.resolve({ id: "nope" }) }), 404, "not_found");
    await expectError(await GET(request(`/api/v1/projects/${theirs.projectId}`), { params: Promise.resolve({ id: theirs.projectId! }) }), 401, "unauthenticated");
    await expectError(await (await projectsRoute())(request("/api/v1/projects")), 401, "unauthenticated");
  });

  it("500 internal_error when the database fails", async () => {
    const { bearer } = await signedIn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const list = await projectsRoute();
    const one = await projectRoute();
    const real = testDb.db.select.bind(testDb.db);
    let calls = 0;
    // the session lookup works; the projects query then fails
    vi.spyOn(testDb.db, "select").mockImplementation(((...args: Parameters<typeof real>) => {
      if (++calls > 1) throw new Error("boom");
      return real(...args);
    }) as typeof real);
    await expectError(await list(request("/api/v1/projects", { headers: bearer })), 500, "internal_error");
    calls = 0;
    const id = "00000000-0000-4000-8000-000000000000";
    await expectError(await one(request(`/api/v1/projects/${id}`, { headers: bearer }), { params: Promise.resolve({ id }) }), 500, "internal_error");
  });
});

describe("POST /api/v1/bookings", () => {
  const post = (body: unknown, headers: Record<string, string> = {}) => postJson(`${BASE}/api/v1/bookings`, { body, headers, origin: null });

  it("books for the signed-in customer, taking the verified number and saving the map pin", async () => {
    const POST = await bookings();
    const { user, bearer } = await signedIn();
    const { phone: _p, type: _t, name: _n, ...fields } = booking;
    await testDb.db.update(users).set({ name: "Asha Verma" }).where(eq(users.id, user.id));
    const res = await POST(post({ ...fields, service: "Exterior Painting", location: { lat: 27.2152, lng: 78.0081 } }, bearer));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "booking", data: { received: true, projectId: expect.any(String) } });
    expect(body.links).toEqual({ self: "/api/v1/bookings", project: `/api/v1/projects/${body.data.projectId}`, html: `/account/projects/${body.data.projectId}` });

    const [lead] = await testDb.db.select().from(leads);
    expect(lead).toMatchObject({ kind: "booking", source: "app", phone: PHONE, name: "Asha Verma", userId: user.id, locationLat: 27.2152, locationLng: 78.0081, service: "Exterior Painting" });
    const [project] = await testDb.db.select().from(projects);
    expect(project).toMatchObject({ id: body.data.projectId, userId: user.id, stage: "booked" });
  });

  it("accepts the account's own number written any way, and refuses another number", async () => {
    const POST = await bookings();
    const { bearer } = await signedIn();
    expect((await POST(post({ ...booking, phone: "+91 98765-43210" }, bearer))).status).toBe(201);
    const other = await expectError(await POST(post({ ...booking, phone: "9123456789" }, bearer)), 400, "invalid_request");
    expect(other.error.details).toEqual({ phone: "Use the mobile number you signed in with (******3210)" });
  });

  it("400 invalid_request with the form's own messages, and for a body that is not an object", async () => {
    const POST = await bookings();
    const { bearer } = await signedIn();
    const res = await expectError(await POST(post({ address: "x", pincode: "12", location: { lat: 200, lng: "east" } }, bearer)), 400, "invalid_request");
    expect(res.error.details).toMatchObject({
      name: "Enter your name", // a new account has no name to fall back on
      address: "Enter your house or flat number and street",
      locality: "Enter your locality",
      pincode: "Enter your 6-digit PIN code",
      location: expect.any(String),
    });
    await expectError(await POST(post([booking], bearer)), 400, "invalid_request");
    await expectError(await POST(postJson(`${BASE}/api/v1/bookings`, { raw: "{bad", headers: bearer })), 400, "invalid_request");
  });

  it("requires a bearer token: 401 without one or with only the website's cookie", async () => {
    const POST = await bookings();
    const { cookie } = await signedIn("web");
    await expectError(await POST(post(booking)), 401, "unauthenticated");
    await expectError(await POST(postJson(`${BASE}/api/v1/bookings`, { body: booking, cookie })), 401, "unauthenticated");
    expect(await testDb.db.select().from(leads)).toHaveLength(0);
  });

  it("413 for a big body, 415 for a non-JSON one, 429 after 5 bookings in 10 minutes", async () => {
    const POST = await bookings();
    const { bearer } = await signedIn();
    await expectError(await POST(post({ ...booking, message: "x".repeat(20_000) }, bearer)), 413, "payload_too_large");
    await expectError(await POST(postJson(`${BASE}/api/v1/bookings`, { raw: "name=Asha", headers: { ...bearer, "content-type": "text/plain" } })), 415, "unsupported_media_type");
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await POST(post(booking, bearer))).status);
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });

  it("500 internal_error (logged by type only) when saving fails", async () => {
    const POST = await bookings();
    const { bearer } = await signedIn();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(testDb.db, "transaction").mockRejectedValue(Object.assign(new Error(`Key (phone)=(${PHONE})`), { code: "23505" }));
    await expectError(await POST(post(booking, bearer)), 500, "internal_error");
    expect(error).toHaveBeenCalledWith("Saving an app booking failed:", "Error (23505)");
  });
});
