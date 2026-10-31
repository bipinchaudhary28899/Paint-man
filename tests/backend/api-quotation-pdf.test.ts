import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createUserSession } from "@/lib/auth/user-session";
import { signInUser } from "@/lib/auth/users";
import { setDb } from "@/lib/db/client";
import { saveLead } from "@/lib/leads/store";
import { createQuotation, saveQuotation, sendQuotation } from "@/lib/projects/repo";
import { resetTestDb, useTestDb } from "../support/db";

// GET /api/v1/projects/{id}/quotations/{qid}/pdf: the customer's quotation as a PDF file, against an
// in-memory Postgres.

const testDb = useTestDb();
const PHONE = "9876543210";
const BASE = "http://localhost:3000";
const booking = { type: "booking" as const, name: "Asha", phone: PHONE, address: "12 Rose Villa, Nehru Road", locality: "Kamla Nagar", pincode: "282005", city: "agra" };

beforeEach(async () => {
  await resetTestDb(testDb.db);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setDb(testDb.db);
});

const route = async () => (await import("@/app/api/v1/projects/[id]/quotations/[qid]/pdf/route")).GET;
const get = async (id: string, qid: string, headers: Record<string, string> = {}) =>
  (await route())(new NextRequest(`${BASE}/api/v1/projects/${id}/quotations/${qid}/pdf`, { headers: { host: "localhost:3000", ...headers } }), {
    params: Promise.resolve({ id, qid }),
  });

async function signedIn(phone = PHONE) {
  const user = await signInUser(phone);
  const { token } = await createUserSession(user.id, "app");
  return { user, bearer: { authorization: `Bearer ${token}` }, cookie: { cookie: `ps_session=${token}` } };
}

/** A booking with a quotation: sent (v1) and, optionally, a draft v2. */
async function quoted(userId?: string, phone = PHONE) {
  const { projectId } = await saveLead({ ...booking, phone, service: "Interior Painting" }, { userId });
  const v1 = await createQuotation(projectId!);
  await saveQuotation(v1.id, { lines: [{ item: "Living room walls", description: "Two coats", areaSqft: 400, coats: 2, ratePaise: 2_500, amountPaise: 1_000_000 }], notes: "Furniture covered." });
  await sendQuotation(v1.id);
  const v2 = await createQuotation(projectId!);
  return { projectId: projectId!, sent: v1, draft: v2 };
}

const expectError = async (res: Response, status: number, code: string) => {
  expect(res.status).toBe(status);
  expect(res.headers.get("cache-control")).toContain("no-store");
  expect(res.headers.get("content-type")).toContain("application/json");
  expect(await res.json()).toMatchObject({ apiVersion: "v1", kind: "error", error: { code } });
};

describe("GET /api/v1/projects/{id}/quotations/{qid}/pdf", () => {
  it("serves a sent quotation as a PDF attachment named by version, never cached (bearer or cookie)", async () => {
    const { user, bearer, cookie } = await signedIn();
    const { projectId, sent } = await quoted(user.id);
    for (const headers of [bearer, cookie]) {
      const res = await get(projectId, sent.id, headers);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/pdf");
      expect(res.headers.get("content-disposition")).toBe('attachment; filename="Paint-Saathi-quotation-v1.pdf"');
      expect(res.headers.get("cache-control")).toContain("no-store");
      const bytes = new Uint8Array(await res.arrayBuffer());
      expect(res.headers.get("content-length")).toBe(String(bytes.byteLength));
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(1);
      expect(pdf.getTitle()).toBe("Quotation v1 – Paint Saathi");
    }
  });

  it("401 unauthenticated without a session", async () => {
    const { user } = await signedIn();
    const { projectId, sent } = await quoted(user.id);
    await expectError(await get(projectId, sent.id), 401, "unauthenticated");
    await expectError(await get(projectId, sent.id, { authorization: `Bearer ${"b".repeat(43)}` }), 401, "unauthenticated");
  });

  it("404 not_found for a draft, another customer's project, a mismatched pair or ids that are not uuids", async () => {
    const { user, bearer } = await signedIn();
    const mine = await quoted(user.id);
    const theirs = await quoted(undefined, "9123456789");
    await expectError(await get(mine.projectId, mine.draft.id, bearer), 404, "not_found");
    await expectError(await get(theirs.projectId, theirs.sent.id, bearer), 404, "not_found");
    await expectError(await get(mine.projectId, theirs.sent.id, bearer), 404, "not_found");
    await expectError(await get("nope", "nope", bearer), 404, "not_found");
  });

  it("503 database_unavailable when production has no database", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    setDb(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expectError(await get("3f0c1a2b-1111-4222-8333-444455556666", "9a8b7c6d-1111-4222-8333-444455556666", { authorization: `Bearer ${"c".repeat(43)}` }), 503, "database_unavailable");
  });
});
