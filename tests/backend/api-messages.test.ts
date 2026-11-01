import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setDb } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import { postJson } from "../support/request";
import { resetTestDb, useTestDb } from "../support/db";

// POST /api/v1/messages: the app's contact form and a coming-soon city's waitlist, against an
// in-memory Postgres.

const testDb = useTestDb();
const URL = "http://localhost:3000/api/v1/messages";
const message = { name: "Asha Verma", phone: "+91 98765 43210", message: "Please add me to the Delhi NCR waitlist." };

beforeEach(async () => {
  await resetTestDb(testDb.db);
  vi.resetModules();
});
afterEach(() => {
  vi.restoreAllMocks();
  setDb(testDb.db);
});

const route = async () => (await import("@/app/api/v1/messages/route")).POST;
/** As the app sends it: no Origin header. */
const fromApp = (body: unknown, headers: Record<string, string> = {}) => postJson(URL, { body, origin: null, headers });

const expectError = async (res: Response, status: number, code: string) => {
  expect(res.status).toBe(status);
  expect(res.headers.get("cache-control")).toContain("no-store");
  const body = await res.json();
  expect(body).toMatchObject({ apiVersion: "v1", kind: "error", error: { code } });
  return body;
};

describe("POST /api/v1/messages", () => {
  it("saves the message as a contact lead from the app, and echoes none of it", async () => {
    const POST = await route();
    const res = await POST(fromApp({ ...message, page: "/services/house-painting/delhi-ncr" }));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "contact-message", label: expect.any(String), data: { received: true }, links: { self: "/api/v1/messages", html: "/contact" } });
    expect(JSON.stringify(body)).not.toMatch(/Asha|98765|Delhi NCR waitlist/);
    const [lead] = await testDb.db.select().from(leads);
    expect(lead).toMatchObject({ kind: "contact", source: "app", name: "Asha Verma", phone: "9876543210", message: message.message, userId: null });
  });

  it("takes a request from the website's own pages too", async () => {
    const POST = await route();
    expect((await POST(postJson(URL, { body: { ...message, type: "contact" } }))).status).toBe(201);
  });

  it("400 invalid_request with the form's own messages, and for a body that is not an object", async () => {
    const POST = await route();
    const missing = await expectError(await POST(fromApp({})), 400, "invalid_request");
    expect(Object.keys(missing.error.details).sort()).toEqual(["message", "name", "phone"]);
    const short = await expectError(await POST(fromApp({ ...message, phone: "12345", message: "hi" })), 400, "invalid_request");
    expect(Object.keys(short.error.details).sort()).toEqual(["message", "phone"]);
    await expectError(await POST(fromApp([message])), 400, "invalid_request");
    await expectError(await POST(postJson(URL, { raw: "{bad", origin: null })), 400, "invalid_request");
    expect(await testDb.db.select().from(leads)).toHaveLength(0);
  });

  it("413 for a big body, 415 for a non-JSON one", async () => {
    const POST = await route();
    await expectError(await POST(fromApp({ ...message, message: "x".repeat(20_000) })), 413, "payload_too_large");
    await expectError(await POST(postJson(URL, { raw: "name=Asha", origin: null, headers: { "content-type": "text/plain" } })), 415, "unsupported_media_type");
  });

  it("tells a bot that fills the hidden field it worked, and keeps nothing", async () => {
    const POST = await route();
    const res = await POST(fromApp({ ...message, website: "https://spam.example" }));
    expect(res.status).toBe(201);
    expect(await testDb.db.select().from(leads)).toHaveLength(0);
  });

  it("403 forbidden for another site's pages", async () => {
    const POST = await route();
    await expectError(await POST(postJson(URL, { body: message, origin: "https://elsewhere.example" })), 403, "forbidden");
    expect(await testDb.db.select().from(leads)).toHaveLength(0);
  });

  it("429 after 5 messages from one IP in 10 minutes", async () => {
    const POST = await route();
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await POST(fromApp(message, { "x-forwarded-for": "198.51.100.20" }))).status);
    expect(statuses).toEqual([201, 201, 201, 201, 201]);
    const res = await POST(fromApp(message, { "x-forwarded-for": "198.51.100.20" }));
    await expectError(res, 429, "rate_limited");
    expect(res.headers.get("retry-after")).toMatch(/^\d+$/);
    // another IP is not held up
    expect((await POST(fromApp(message, { "x-forwarded-for": "198.51.100.21" }))).status).toBe(201);
  });

  it("500 internal_error (logged by type only) when saving fails", async () => {
    const POST = await route();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(testDb.db, "transaction").mockRejectedValue(Object.assign(new Error("Key (phone)=(9876543210)"), { code: "23505" }));
    await expectError(await POST(fromApp(message)), 500, "internal_error");
    expect(error).toHaveBeenCalledWith("Saving an app message failed:", "Error (23505)");
  });
});
