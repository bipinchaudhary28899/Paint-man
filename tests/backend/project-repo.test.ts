import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { signInUser } from "@/lib/auth/users";
import { projectEvents, projects, quotations } from "@/lib/db/schema";
import { saveLead } from "@/lib/leads/store";
import {
  approveQuotation,
  createQuotation,
  declineQuotation,
  getProjectForAdmin,
  getProjectForUser,
  getVisibleQuotationForUser,
  isUuid,
  listProjects,
  listProjectsForUser,
  markInspectionVisited,
  ProjectError,
  quotationTotal,
  saveQuotation,
  scheduleInspection,
  sendQuotation,
  setProjectStage,
} from "@/lib/projects/repo";
import { resetTestDb, useTestDb } from "../support/db";

// The project data layer against an in-memory Postgres: what customers see (their own projects,
// never drafts) and what /admin does (stages, inspection, quotation versions).

const testDb = useTestDb();
beforeEach(() => resetTestDb(testDb.db));

const PHONE = "9876543210";
const booking = {
  type: "booking" as const,
  name: "Asha",
  phone: PHONE,
  address: "12 Rose Villa, Nehru Road",
  locality: "Kamla Nagar",
  pincode: "282005",
  city: "agra",
  service: "Interior Painting" as const,
};
const t = (iso: string) => new Date(iso);
const MISSING = "00000000-0000-4000-8000-000000000000";

/** A booking's project, dated the day before the tests' own timestamps so the timeline stays in order. */
async function bookedProject(over: Partial<typeof booking> = {}) {
  const saved = await saveLead({ ...booking, ...over });
  await testDb.db.update(projectEvents).set({ createdAt: t("2026-10-30T00:00:00Z") }).where(eq(projectEvents.projectId, saved.projectId!));
  return saved.projectId!;
}

const lines = [
  { item: "Living room walls", description: "Putty, primer, 2 coats Apcolite Premium Emulsion", areaSqft: 420, coats: 2, ratePaise: 2_500, amountPaise: 1_050_000 },
  { item: "Main door", description: null, areaSqft: null, coats: null, ratePaise: null, amountPaise: 250_000 },
];

describe("customer reads", () => {
  it("lists only the customer's projects, newest first, with the final price once approved", async () => {
    const user = await signInUser(PHONE);
    const older = await bookedProject();
    await testDb.db.update(projects).set({ createdAt: t("2026-10-01T00:00:00Z") }).where(eq(projects.id, older));
    const newer = await bookedProject({ locality: "Sikandra" });
    await bookedProject({ phone: "9123456789" }); // someone else's

    const q = await createQuotation(older);
    await saveQuotation(q.id, { lines });
    await sendQuotation(q.id);
    await approveQuotation(q.id);

    const list = await listProjectsForUser(user.id);
    expect(list.map((p) => p.id)).toEqual([newer, older]);
    expect(list[0]).toEqual({
      id: newer,
      service: "Interior Painting",
      city: "Agra",
      citySlug: "agra",
      locality: "Sikandra",
      stage: "booked",
      stageLabel: "Booking received",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      currency: "INR",
    });
    expect(list[1]).toMatchObject({ stage: "price_finalised", stageLabel: "Price finalised", finalPricePaise: 1_300_000 });
    expect(await listProjectsForUser(MISSING)).toEqual([]);
  });

  it("shows a project's stepper, timeline, inspection and visible quotations, never a draft", async () => {
    const user = await signInUser(PHONE);
    const id = await bookedProject();
    await setProjectStage(id, "call_confirmed", { note: "Spoke to Asha, visit on Tuesday", now: t("2026-10-31T06:00:00Z") });
    await scheduleInspection(id, { scheduledAt: t("2026-11-04T06:00:00Z"), inspectorName: "Ramesh", now: t("2026-10-31T07:00:00Z") });
    await markInspectionVisited(id, { visitedAt: t("2026-11-04T07:00:00Z"), findings: "Damp patch on the north wall", now: t("2026-11-04T08:00:00Z") });
    const v1 = await createQuotation(id, { now: t("2026-11-05T05:00:00Z") });
    await saveQuotation(v1.id, { lines, notes: "Includes damp treatment", paymentTerms: "Pay after handover", validUntil: "2026-12-05" });
    await sendQuotation(v1.id, { now: t("2026-11-05T06:00:00Z") });
    const draft = await createQuotation(id); // v2, not sent

    const project = await getProjectForUser(user.id, id);
    expect(project).toMatchObject({
      id,
      address: "12 Rose Villa, Nehru Road",
      pincode: "282005",
      stage: "quotation_shared",
      stageLabel: "Quotation shared",
      stageExplanation: "Your itemised quotation is ready to review.",
      inspection: { scheduledAt: "2026-11-04T06:00:00.000Z", visitedAt: "2026-11-04T07:00:00.000Z", inspectorName: "Ramesh", findings: "Damp patch on the north wall" },
      currency: "INR",
    });
    expect(project!.finalPricePaise).toBeUndefined();
    expect(project!.timeline.map((e) => [e.stage, e.note])).toEqual([
      ["booked", null],
      ["call_confirmed", "Spoke to Asha, visit on Tuesday"],
      ["inspection_scheduled", null],
      ["inspected", null],
      ["quotation_shared", null],
    ]);
    expect(project!.stages.filter((s) => s.done).map((s) => s.stage)).toEqual(["booked", "call_confirmed", "inspection_scheduled", "inspected"]);
    expect(project!.stages.find((s) => s.current)?.stage).toBe("quotation_shared");

    expect(project!.quotations).toHaveLength(1); // the v2 draft is hidden
    expect(project!.quotations[0]).toEqual({
      id: v1.id,
      version: 1,
      status: "sent",
      sentAt: "2026-11-05T06:00:00.000Z",
      approvedAt: null,
      validUntil: "2026-12-05",
      notes: "Includes damp treatment",
      paymentTerms: "Pay after handover",
      lines: [
        { position: 1, ...lines[0] },
        { position: 2, ...lines[1] },
      ],
      subtotalPaise: 1_300_000,
      totalPaise: 1_300_000,
      currency: "INR",
      pdf: `/api/v1/projects/${id}/quotations/${v1.id}/pdf`,
    });

    // the PDF's data: visible versions only, of the customer's own project
    const doc = await getVisibleQuotationForUser(user.id, id, v1.id);
    expect(doc?.project).toMatchObject({ id, name: "Asha", phone: PHONE, city: "Agra", address: "12 Rose Villa, Nehru Road", stageLabel: "Quotation shared" });
    expect(doc?.quotation.totalPaise).toBe(1_300_000);
    expect(await getVisibleQuotationForUser(user.id, id, draft.id)).toBeNull();
    expect(await getVisibleQuotationForUser(user.id, id, "nope")).toBeNull();
    expect(await getVisibleQuotationForUser(user.id, MISSING, v1.id)).toBeNull();
  });

  it("never shows another customer's project, and answers null for ids that are not uuids", async () => {
    const asha = await signInUser(PHONE);
    const ravi = await signInUser("9123456789");
    const id = await bookedProject();
    expect(await getProjectForUser(ravi.id, id)).toBeNull();
    expect(await getProjectForUser(asha.id, "../etc")).toBeNull();
    expect(await getProjectForUser(asha.id, MISSING)).toBeNull();
    expect(isUuid(id)).toBe(true);
  });
});

describe("admin", () => {
  it("lists and searches projects by stage, city, phone digits or name", async () => {
    const a = await bookedProject();
    const b = await bookedProject({ name: "Ravi_100%", phone: "9123456789" });
    await setProjectStage(b, "on_hold");

    expect((await listProjects()).total).toBe(2);
    expect((await listProjects({ stage: "on_hold" })).items.map((p) => p.id)).toEqual([b]);
    expect((await listProjects({ city: "agra" })).total).toBe(2);
    expect((await listProjects({ city: "delhi-ncr" })).total).toBe(0);
    expect((await listProjects({ q: "98765 43" })).items.map((p) => p.id)).toEqual([a]);
    expect((await listProjects({ q: "asha" })).items.map((p) => p.id)).toEqual([a]);
    expect((await listProjects({ q: "_100%" })).items.map((p) => p.id)).toEqual([b]); // % and _ are literal
    const page = await listProjects({ limit: 1, offset: 1 });
    expect(page).toMatchObject({ total: 2 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ name: expect.any(String), phone: expect.any(String), leadId: expect.any(String), userId: null, stageLabel: expect.any(String) });
  });

  it("shows everything about a project: the lead, drafts and the full timeline", async () => {
    const saved = await saveLead({ ...booking, message: "Cracks", floors: "2", carpetArea: 1000 }, { source: "app", location: { lat: 27.2, lng: 78 } });
    const draft = await createQuotation(saved.projectId!);
    const project = await getProjectForAdmin(saved.projectId!);
    expect(project).toMatchObject({
      name: "Asha",
      phone: PHONE,
      lead: { id: saved.id, source: "app", message: "Cracks", floors: "2", carpetArea: 1000, estPaintArea: 7000, location: { lat: 27.2, lng: 78 } },
      quotations: [{ id: draft.id, version: 1, status: "draft", lines: [], totalPaise: 0, createdAt: expect.any(String) }],
      timeline: [{ id: expect.any(String), stage: "booked", label: "Booking received" }],
    });
    expect(await getProjectForAdmin(MISSING)).toBeNull();
    expect(await getProjectForAdmin("x")).toBeNull();

    // a project whose lead is gone (or was entered without one) has no lead details
    await testDb.db.update(projects).set({ leadId: null }).where(eq(projects.id, saved.projectId!));
    expect((await getProjectForAdmin(saved.projectId!))?.lead).toBeNull();
    const plain = await saveLead(booking);
    expect((await getProjectForAdmin(plain.projectId!))?.lead?.location).toBeNull();
  });

  it("sets stages by hand (back, on hold, a progress note) and records the crew's start date", async () => {
    const id = await bookedProject();
    await setProjectStage(id, "work_scheduled", { workStartsOn: "2026-11-10", note: "  " });
    let project = await getProjectForAdmin(id);
    expect(project).toMatchObject({ stage: "work_scheduled", workStartsOn: "2026-11-10", stageExplanation: expect.stringMatching(/The crew starts on .*10 Nov/) });
    expect(project!.timeline.at(-1)).toMatchObject({ stage: "work_scheduled", note: null });

    await setProjectStage(id, "in_progress");
    await setProjectStage(id, "in_progress", { note: "Second coat done in the living room" });
    await setProjectStage(id, "on_hold", { note: "Paused for the festival" });
    project = await getProjectForAdmin(id);
    expect(project!.timeline.slice(-3).map((e) => [e.stage, e.note])).toEqual([
      ["in_progress", null],
      ["in_progress", "Second coat done in the living room"],
      ["on_hold", "Paused for the festival"],
    ]);
    expect(project!.workStartsOn).toBe("2026-11-10"); // kept unless given
    await expect(setProjectStage(MISSING, "booked")).rejects.toMatchObject({ code: "not_found" });
  });

  it("moves forward automatically with the inspection and quotations, never backwards or out of a hold", async () => {
    const id = await bookedProject();
    await setProjectStage(id, "in_progress");
    await scheduleInspection(id, { scheduledAt: t("2026-11-04T06:00:00Z") });
    expect((await getProjectForAdmin(id))?.stage).toBe("in_progress");

    const held = await bookedProject();
    await setProjectStage(held, "on_hold");
    await markInspectionVisited(held, { findings: "Fine" });
    const project = await getProjectForAdmin(held);
    expect(project).toMatchObject({ stage: "on_hold", inspection: { findings: "Fine", visitedAt: expect.any(String), scheduledAt: null } });

    await scheduleInspection(held, { scheduledAt: t("2026-11-06T06:00:00Z"), inspectorName: null });
    expect((await getProjectForAdmin(held))?.inspection).toMatchObject({ scheduledAt: "2026-11-06T06:00:00.000Z", findings: "Fine", inspectorName: null });
    await expect(scheduleInspection(MISSING, { scheduledAt: new Date() })).rejects.toBeInstanceOf(ProjectError);
  });

  it("versions quotations: a revision copies the latest, only drafts change, approval supersedes and finalises the price", async () => {
    const user = await signInUser(PHONE);
    const id = await bookedProject();
    const v1 = await createQuotation(id);
    expect(v1.version).toBe(1);
    await expect(sendQuotation(v1.id)).rejects.toMatchObject({ code: "invalid_state", message: expect.stringMatching(/at least one line/) });
    await saveQuotation(v1.id, { lines, notes: "v1 notes", paymentTerms: "After handover", validUntil: "2026-12-01" });
    await sendQuotation(v1.id);
    await expect(saveQuotation(v1.id, { lines: [] })).rejects.toMatchObject({ code: "invalid_state" });
    await expect(sendQuotation(v1.id)).rejects.toMatchObject({ code: "invalid_state" });

    const v2 = await createQuotation(id);
    expect(v2.version).toBe(2);
    let admin = await getProjectForAdmin(id);
    const copied = admin!.quotations.find((q) => q.id === v2.id)!;
    expect(copied).toMatchObject({ status: "draft", notes: "v1 notes", paymentTerms: "After handover", validUntil: "2026-12-01", totalPaise: 1_300_000 });
    await saveQuotation(v2.id, { lines: [lines[0]], notes: null });
    await sendQuotation(v2.id);
    admin = await getProjectForAdmin(id);
    expect(admin!.timeline.at(-1)).toMatchObject({ stage: "quotation_shared", note: "Revised quotation (version 2)." });
    expect(admin!.stage).toBe("quotation_shared");

    await approveQuotation(v2.id);
    const statuses = Object.fromEntries((await testDb.db.select().from(quotations)).map((q) => [q.version, q.status]));
    expect(statuses).toEqual({ 1: "superseded", 2: "approved" });
    const project = await getProjectForUser(user.id, id);
    expect(project).toMatchObject({ stage: "price_finalised", finalPricePaise: 1_050_000 });
    expect(project!.quotations.map((q) => [q.version, q.status])).toEqual([
      [2, "approved"],
      [1, "superseded"],
    ]);
    expect(project!.quotations[0].approvedAt).toEqual(expect.any(String));
    await expect(approveQuotation(v2.id)).rejects.toMatchObject({ code: "invalid_state" });
    await expect(declineQuotation(v2.id)).rejects.toMatchObject({ code: "invalid_state" });
  });

  it("declines a sent quotation, and a declined one can still be approved later", async () => {
    const id = await bookedProject();
    const q = await createQuotation(id);
    await saveQuotation(q.id, { lines });
    await sendQuotation(q.id);
    await declineQuotation(q.id);
    expect((await getProjectForAdmin(id))?.quotations[0].status).toBe("declined");
    await approveQuotation(q.id);
    expect((await getProjectForAdmin(id))?.quotations[0].status).toBe("approved");
    await expect(declineQuotation(MISSING)).rejects.toMatchObject({ code: "not_found" });
    await expect(saveQuotation("bad", { lines })).rejects.toMatchObject({ code: "not_found" });
    await expect(createQuotation(MISSING)).rejects.toMatchObject({ code: "not_found" });
  });

  it("sums line amounts in paise", () => {
    expect(quotationTotal([])).toBe(0);
    expect(quotationTotal(lines)).toBe(1_300_000);
  });
});
