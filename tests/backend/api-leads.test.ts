import { beforeEach, describe, expect, it, vi } from "vitest";
import { postJson } from "../support/request";

// Storage is mocked here (tests/backend/lead-store.test.ts covers it against a real Postgres).
const saveLead = vi.fn();
const readUserSession = vi.fn();
vi.mock("@/lib/leads/store", () => ({ saveLead }));
vi.mock("@/lib/auth/user-session", () => ({ readUserSession }));

const URL_ = "http://localhost:3000/api/leads";
const valid = {
  type: "booking",
  name: "Asha Verma",
  phone: "9876543210",
  address: "12, Rose Villa, Nehru Road",
  locality: "Kamla Nagar",
  pincode: "282005",
  city: "agra",
  propertyType: "Apartment / Flat",
  service: "Interior Painting",
  floors: "2",
  homeSize: "3 BHK",
};

async function loadRoute() {
  vi.resetModules();
  return import("@/app/api/leads/route");
}

beforeEach(() => {
  saveLead.mockReset();
  saveLead.mockResolvedValue({ id: "lead-1", projectId: "project-1" });
  readUserSession.mockReset();
  readUserSession.mockResolvedValue(null);
});

describe("POST /api/leads", () => {
  it("saves a valid lead and returns only { ok: true }", async () => {
    const { POST } = await loadRoute();
    const res = await POST(postJson(URL_, { body: valid }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(saveLead).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Asha Verma", phone: "9876543210" }),
      expect.objectContaining({ source: "web", userId: undefined, timer: expect.anything() }),
    );
  });

  it("links the lead to the signed-in customer (session cookie), still answering only { ok: true }", async () => {
    readUserSession.mockResolvedValue({ sessionId: "s1", via: "cookie", client: "web", user: { id: "user-1", phone: "9876543210", name: "Asha" } });
    const { POST } = await loadRoute();
    const res = await POST(postJson(URL_, { body: valid, cookie: "ps_session=abc", headers: { "x-forwarded-for": "198.51.100.200" } }));
    expect(await res.json()).toEqual({ ok: true });
    expect(saveLead).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ source: "web", userId: "user-1" }));
  });

  it("reports step timings (durations only)", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { POST } = await loadRoute();
    const res = await POST(postJson(URL_, { body: valid }));
    expect(res.headers.get("server-timing")).toMatch(/^ratelimit;dur=[\d.]+, session;dur=[\d.]+, total;dur=[\d.]+$/);
    const logged = info.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logged).toMatch(/Lead saved in .*"ratelimit"/);
    expect(logged).not.toContain("Asha");
    expect(logged).not.toContain("9876543210");
    info.mockRestore();
  });

  it("returns field errors for invalid input without saving", async () => {
    const { POST } = await loadRoute();
    const res = await POST(postJson(URL_, { body: { ...valid, phone: "123", locality: "" } }));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.fieldErrors).toEqual(expect.objectContaining({ phone: expect.any(String), locality: expect.any(String) }));
    expect(saveLead).not.toHaveBeenCalled();
  });

  it("silently drops bot submissions that fill the honeypot", async () => {
    const { POST } = await loadRoute();
    const res = await POST(postJson(URL_, { body: { ...valid, website: "http://spam" } }));
    expect(res.status).toBe(200);
    expect(saveLead).not.toHaveBeenCalled();
  });

  it("rejects cross-site submissions", async () => {
    const { POST } = await loadRoute();
    const res = await POST(postJson(URL_, { body: valid, origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(saveLead).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies", async () => {
    const { POST } = await loadRoute();
    const res = await POST(postJson(URL_, { body: { ...valid, message: "a".repeat(20_000) } }));
    expect(res.status).toBe(413);
  });

  it("rejects malformed JSON", async () => {
    const { POST } = await loadRoute();
    const res = await POST(postJson(URL_, { raw: "{not json" }));
    expect(res.status).toBe(400);
  });

  it("rate-limits valid submissions per IP", async () => {
    const { POST } = await loadRoute();
    const statuses = [];
    for (let i = 0; i < 6; i++) {
      statuses.push((await POST(postJson(URL_, { body: valid, headers: { "x-forwarded-for": "198.51.100.77" } }))).status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    // Another visitor is unaffected.
    expect((await POST(postJson(URL_, { body: valid, headers: { "x-forwarded-for": "198.51.100.78" } }))).status).toBe(200);
  });

  it("does not count invalid attempts towards the rate limit", async () => {
    const { POST } = await loadRoute();
    const headers = { "x-forwarded-for": "198.51.100.90" };
    for (let i = 0; i < 8; i++) await POST(postJson(URL_, { body: { ...valid, phone: "1" }, headers }));
    expect((await POST(postJson(URL_, { body: valid, headers }))).status).toBe(200);
  });

  it("returns a generic error and never logs personal details when saving fails", async () => {
    const { POST } = await loadRoute();
    saveLead.mockRejectedValue(Object.assign(new Error('duplicate key value: Key (phone)=(9876543210) "Asha"'), { code: "23505" }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(postJson(URL_, { body: valid, headers: { "x-forwarded-for": "198.51.100.5" } }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(JSON.stringify(json)).not.toMatch(/duplicate|stack|9876543210/i);
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain("9876543210");
    expect(logged).not.toContain("Asha");
  });
});
