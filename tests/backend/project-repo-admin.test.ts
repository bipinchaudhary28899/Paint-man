import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { leads } from "@/lib/db/schema";
import { InvalidLeadStatusError, isLeadStatus, readLeads, saveLead, updateLeadStatus } from "@/lib/leads/store";
import {
  approveQuotation,
  createQuotation,
  declineQuotation,
  getProjectForAdmin,
  getQuotationForAdmin,
  listProjects,
  saveQuotation,
  sendQuotation,
  setProjectStage,
  setWorkStartDate,
} from "@/lib/projects/repo";
import { resetTestDb, useTestDb } from "../support/db";

// What /admin added to the data layer: the projects list order and final prices, the crew's start
// date on its own, quotation writes scoped to their project, the admin PDF's read, and a lead's
// follow-up status.

const testDb = useTestDb();
beforeEach(() => resetTestDb(testDb.db));

const MISSING = "00000000-0000-4000-8000-000000000000";
const booking = { type: "booking" as const, name: "Asha", phone: "9876543210", address: "12 Rose Villa", locality: "Kamla Nagar", pincode: "282005", city: "agra", service: "Interior Painting" as const };
const lines = [{ item: "Living room walls", description: null, areaSqft: 420, coats: 2, ratePaise: 2_500, amountPaise: 1_050_000 }];

describe("listProjects for /admin", () => {
  it("puts the most recently updated first and carries the approved price", async () => {
    const a = (await saveLead(booking)).projectId!;
    const b = (await saveLead({ ...booking, name: "Ravi", phone: "9123456789" })).projectId!;
    await setProjectStage(a, "call_confirmed", { now: new Date(Date.now() + 60_000) });
    let list = await listProjects();
    expect(list.items.map((p) => p.id)).toEqual([a, b]);
    expect(list.items[0]).toMatchObject({ name: "Asha", stageLabel: "Visit being arranged", currency: "INR" });
    expect(list.items[0].finalPricePaise).toBeUndefined();

    const q = await createQuotation(b);
    await saveQuotation(q.id, { lines });
    await sendQuotation(q.id);
    await approveQuotation(q.id, { now: new Date(Date.now() + 120_000) });
    list = await listProjects();
    expect(list.items.map((p) => [p.id, p.finalPricePaise])).toEqual([
      [b, 1_050_000],
      [a, undefined],
    ]);
  });
});

describe("setWorkStartDate", () => {
  it("sets and clears the crew's start date without a stage change or timeline event", async () => {
    const id = (await saveLead(booking)).projectId!;
    await setProjectStage(id, "work_scheduled");
    await setWorkStartDate(id, "2026-11-10");
    let p = await getProjectForAdmin(id);
    expect(p).toMatchObject({ stage: "work_scheduled", workStartsOn: "2026-11-10", stageExplanation: expect.stringMatching(/10 Nov/) });
    expect(p!.timeline).toHaveLength(2);
    await setWorkStartDate(id, null);
    p = await getProjectForAdmin(id);
    expect(p).toMatchObject({ workStartsOn: null, stageExplanation: "We are fixing the crew's start date with you." });
    await expect(setWorkStartDate(MISSING, null)).rejects.toMatchObject({ code: "not_found" });
    await expect(setWorkStartDate("nope", null)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("quotation writes scoped to a project", () => {
  it("finds the quotation only through its own project", async () => {
    const a = (await saveLead(booking)).projectId!;
    const b = (await saveLead({ ...booking, phone: "9123456789" })).projectId!;
    const q = await createQuotation(a);
    await expect(saveQuotation(q.id, { lines }, { projectId: b })).rejects.toMatchObject({ code: "not_found" });
    await saveQuotation(q.id, { lines }, { projectId: a });
    await expect(sendQuotation(q.id, { projectId: b })).rejects.toMatchObject({ code: "not_found" });
    await sendQuotation(q.id, { projectId: a });
    await expect(declineQuotation(q.id, { projectId: b })).rejects.toMatchObject({ code: "not_found" });
    await expect(approveQuotation(q.id, { projectId: b })).rejects.toMatchObject({ code: "not_found" });
    await approveQuotation(q.id, { projectId: a });
    expect((await getProjectForAdmin(a))?.finalPricePaise).toBe(1_050_000);
  });
});

describe("getQuotationForAdmin", () => {
  it("returns any version of the project, drafts included, for the PDF preview", async () => {
    const id = (await saveLead(booking)).projectId!;
    const q = await createQuotation(id);
    await saveQuotation(q.id, { lines, notes: "Draft note" });
    const doc = await getQuotationForAdmin(id, q.id);
    expect(doc).toMatchObject({
      project: { id, name: "Asha", phone: "9876543210", city: "Agra", locality: "Kamla Nagar", stageLabel: "Booking received" },
      quotation: { id: q.id, version: 1, status: "draft", notes: "Draft note", totalPaise: 1_050_000, lines: [{ position: 1, item: "Living room walls" }] },
    });
    const other = (await saveLead({ ...booking, phone: "9123456789" })).projectId!;
    expect(await getQuotationForAdmin(other, q.id)).toBeNull();
    expect(await getQuotationForAdmin(id, MISSING)).toBeNull();
    expect(await getQuotationForAdmin("nope", q.id)).toBeNull();
    expect(await getQuotationForAdmin(id, "nope")).toBeNull();
  });
});

describe("updateLeadStatus", () => {
  it("sets one of the team's statuses, shown by its label in the leads table", async () => {
    const { id } = await saveLead(booking);
    expect(await updateLeadStatus(id, "called")).toBe(true);
    const [row] = await testDb.db.select({ status: leads.status }).from(leads).where(eq(leads.id, id));
    expect(row.status).toBe("called");
    expect((await readLeads())[0].Status).toBe("Called");
  });

  it("refuses a status outside the list, and answers false for an unknown lead", async () => {
    const { id } = await saveLead(booking);
    await expect(updateLeadStatus(id, "won")).rejects.toBeInstanceOf(InvalidLeadStatusError);
    await expect(updateLeadStatus(id, "toString")).rejects.toThrow("Choose one of: new, called, converted, not_interested, spam.");
    expect(await updateLeadStatus(MISSING, "spam")).toBe(false);
    expect(await updateLeadStatus("not-a-uuid", "spam")).toBe(false);
    expect([isLeadStatus("new"), isLeadStatus("New"), isLeadStatus(1), isLeadStatus("constructor")]).toEqual([true, false, false, false]);
  });
});
