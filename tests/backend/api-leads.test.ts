import { beforeEach, describe, expect, it, vi } from "vitest";
import { postJson } from "../support/request";

const saveLead = vi.fn();
const warmLeadStorage = vi.fn();
const ensureSheetHeader = vi.fn(() => Promise.resolve());
vi.mock("@/lib/leads/store", () => ({ saveLead, warmLeadStorage, ensureSheetHeader }));
// `after` needs a request scope; run the callback straight away in tests
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (fn: () => unknown) => { void fn(); } }));

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
  saveLead.mockResolvedValue("LTEST");
});

describe("POST /api/leads", () => {
  it("saves a valid lead and returns only { ok: true }", async () => {
    const { POST } = await loadRoute();
    const res = await POST(postJson(URL_, { body: valid }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(saveLead).toHaveBeenCalledWith(expect.objectContaining({ name: "Asha Verma", phone: "9876543210" }), expect.anything());
  });

  it("starts the Google token early and reports step timings (durations only)", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { POST } = await loadRoute();
    const res = await POST(postJson(URL_, { body: valid }));
    expect(warmLeadStorage).toHaveBeenCalled();
    expect(ensureSheetHeader).toHaveBeenCalled(); // header kept current after the response
    expect(res.headers.get("server-timing")).toMatch(/^ratelimit;dur=[\d.]+, total;dur=[\d.]+$/);
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
    saveLead.mockRejectedValue(new Error("Google Sheets 500: backend error"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(postJson(URL_, { body: valid, headers: { "x-forwarded-for": "198.51.100.5" } }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(JSON.stringify(json)).not.toMatch(/Google|Sheets|stack/i);
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain("9876543210");
    expect(logged).not.toContain("Asha");
  });
});
