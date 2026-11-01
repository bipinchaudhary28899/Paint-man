import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUserSession } from "@/lib/auth/user-session";
import { signInUser } from "@/lib/auth/users";
import { setDb } from "@/lib/db/client";
import { quotations } from "@/lib/db/schema";
import { saveLead } from "@/lib/leads/store";
import { createQuotation, saveQuotation, sendQuotation } from "@/lib/projects/repo";
import { resetTestDb, useTestDb } from "../support/db";

// POST /api/v1/projects/{id}/quotations/{quotationId}/accept: the customer accepts their quotation
// in the app (slide to accept), against an in-memory Postgres.

const testDb = useTestDb();
const BASE = "http://localhost:3000";
const PHONE = "9876543210";
const booking = { type: "booking" as const, name: "Asha", phone: PHONE, locality: "Kamla Nagar", city: "agra" };
const line = { item: "Living room walls", description: null, areaSqft: 400, coats: 2, ratePaise: 2_500, amountPaise: 1_000_000 };

beforeEach(async () => {
  await resetTestDb(testDb.db);
  vi.resetModules();
});
afterEach(() => {
  vi.restoreAllMocks();
  setDb(testDb.db);
});

const accept = async () => (await import("@/app/api/v1/projects/[id]/quotations/[quotationId]/accept/route")).POST;
const patchProject = async () => (await import("@/app/api/v1/projects/[id]/route")).PATCH;

async function signedIn(client: "web" | "app" = "app", phone = PHONE) {
  const user = await signInUser(phone);
  const { token } = await createUserSession(user.id, client);
  return { user, bearer: { authorization: `Bearer ${token}` }, cookie: `ps_session=${token}` };
}

/** A booking in the account with a quotation sent (and `validUntil` when given). */
async function quoted(userId: string, validUntil?: string) {
  const saved = await saveLead(booking, { userId });
  const q = await createQuotation(saved.projectId!);
  await saveQuotation(q.id, { lines: [line], validUntil: validUntil ?? null });
  await sendQuotation(q.id);
  return { projectId: saved.projectId!, quotationId: q.id };
}

const post = (projectId: string, quotationId: string, headers: Record<string, string> = {}) =>
  new NextRequest(`${BASE}/api/v1/projects/${projectId}/quotations/${quotationId}/accept`, { method: "POST", headers: { host: "localhost:3000", ...headers } });
const params = (id: string, quotationId: string) => ({ params: Promise.resolve({ id, quotationId }) });

const expectError = async (res: Response, status: number, code: string) => {
  expect(res.status).toBe(status);
  expect(res.headers.get("cache-control")).toContain("no-store");
  const body = await res.json();
  expect(body).toMatchObject({ apiVersion: "v1", kind: "error", error: { code } });
  return body;
};

describe("POST /api/v1/projects/{id}/quotations/{quotationId}/accept", () => {
  it("accepts the sent quotation: the price is final and the timeline says the customer accepted it", async () => {
    const POST = await accept();
    const { user, bearer } = await signedIn();
    const { projectId, quotationId } = await quoted(user.id, "2099-12-31");
    const res = await POST(post(projectId, quotationId, bearer), params(projectId, quotationId));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "project", label: "Quotation accepted: the price is final.", data: { id: projectId, stage: "price_finalised" } });
    expect(body.data.quotations[0]).toMatchObject({ id: quotationId, status: "approved", approvedAt: expect.any(String) });
    expect(body.data.timeline.map((e: { note: string | null }) => e.note)).toContain("Accepted by the customer in the app.");
    expect(body.links).toMatchObject({ self: `/api/v1/projects/${projectId}`, html: `/account/projects/${projectId}` });
  });

  it("works from the website too, with its session cookie on the same site", async () => {
    const POST = await accept();
    const { user, cookie } = await signedIn("web");
    const { projectId, quotationId } = await quoted(user.id);
    expect((await POST(post(projectId, quotationId, { cookie, origin: BASE }), params(projectId, quotationId))).status).toBe(200);
  });

  it("only takes the latest version sent, and only once", async () => {
    const POST = await accept();
    const { user, bearer } = await signedIn();
    const { projectId, quotationId: first } = await quoted(user.id);
    const second = await createQuotation(projectId);
    await sendQuotation(second.id);
    const older = await expectError(await POST(post(projectId, first, bearer), params(projectId, first)), 409, "not_acceptable");
    expect(older.error.message).toMatch(/not the latest one we sent/);
    expect((await POST(post(projectId, second.id, bearer), params(projectId, second.id))).status).toBe(200);
    const again = await expectError(await POST(post(projectId, second.id, bearer), params(projectId, second.id)), 409, "not_acceptable");
    expect(again.error.message).toMatch(/is approved/);
    // the earlier version was superseded by the approval
    const [row] = await testDb.db.select().from(quotations).where(eq(quotations.id, first));
    expect(row.status).toBe("superseded");
  });

  it("409 quotation_expired once its validity date has passed (India time)", async () => {
    const POST = await accept();
    const { user, bearer } = await signedIn();
    const { projectId, quotationId } = await quoted(user.id, "2020-01-31");
    const body = await expectError(await POST(post(projectId, quotationId, bearer), params(projectId, quotationId)), 409, "quotation_expired");
    expect(body.error.message).toBe("This price held until 2020-01-31. Message us and we'll send a fresh quotation.");
  });

  it("404 for a project or quotation that is not in the account", async () => {
    const POST = await accept();
    const { user } = await signedIn();
    const { projectId, quotationId } = await quoted(user.id);
    const other = await signedIn("app", "9123456789");
    await expectError(await POST(post(projectId, quotationId, other.bearer), params(projectId, quotationId)), 404, "not_found");
    const mine = await signedIn();
    await expectError(await POST(post(projectId, "00000000-0000-4000-8000-000000000000", mine.bearer), params(projectId, "00000000-0000-4000-8000-000000000000")), 404, "not_found");
  });

  it("401 without a session, and refuses the cookie from another site", async () => {
    const POST = await accept();
    const { user, cookie } = await signedIn("web");
    const { projectId, quotationId } = await quoted(user.id);
    await expectError(await POST(post(projectId, quotationId), params(projectId, quotationId)), 401, "unauthenticated");
    await expectError(await POST(post(projectId, quotationId, { cookie, origin: "https://elsewhere.example" }), params(projectId, quotationId)), 403, "forbidden");
    const [row] = await testDb.db.select().from(quotations).where(eq(quotations.id, quotationId));
    expect(row.status).toBe("sent");
  });

  it("429 once the account has made 20 changes in 10 minutes", async () => {
    const POST = await accept();
    const PATCH = await patchProject();
    const { user, bearer } = await signedIn();
    const { projectId, quotationId } = await quoted(user.id);
    const patch = new NextRequest(`${BASE}/api/v1/projects/${projectId}`, {
      method: "PATCH",
      headers: { host: "localhost:3000", "content-type": "application/json", ...bearer },
      body: JSON.stringify({ notes: "Damp near the balcony" }),
    });
    for (let i = 0; i < 20; i++) await PATCH(patch.clone() as NextRequest, { params: Promise.resolve({ id: projectId }) });
    await expectError(await POST(post(projectId, quotationId, bearer), params(projectId, quotationId)), 429, "rate_limited");
  });

  it("500 internal_error (logged by type only) when saving fails", async () => {
    const POST = await accept();
    const { user, bearer } = await signedIn();
    const { projectId, quotationId } = await quoted(user.id);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(testDb.db, "transaction").mockRejectedValue(Object.assign(new Error("deadlock"), { code: "40P01" }));
    await expectError(await POST(post(projectId, quotationId, bearer), params(projectId, quotationId)), 500, "internal_error");
    expect(error).toHaveBeenCalledWith("Accepting a quotation failed:", "Error (40P01)");
  });
});
