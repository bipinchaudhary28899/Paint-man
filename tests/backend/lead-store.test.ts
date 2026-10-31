import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { leads, projectEvents, projects, users } from "@/lib/db/schema";
import { dbErrorCode, leadLoadErrorMessage } from "@/lib/leads/load-error";
import { LEAD_COLUMNS, LEAD_STATUSES, statusLabel } from "@/lib/leads/record";
import type { LeadInput } from "@/lib/leads/schema";
import { readLeads, saveLead, toLeadRecord, toLeadRow } from "@/lib/leads/store";
import { createTimer } from "@/lib/timing";
import { resetTestDb, useTestDb } from "../support/db";

// Leads in Postgres (an in-memory PGlite per file): every form submission is a row, and a booking
// also opens its project with a first timeline event, in one transaction.

const testDb = useTestDb();
beforeEach(() => resetTestDb(testDb.db));

const booking: Extract<LeadInput, { type: "booking" }> = {
  type: "booking",
  name: "Asha",
  phone: "9876543210",
  address: "12, Rose Villa, Nehru Road",
  locality: "Dayalbagh",
  pincode: "282005",
  city: "agra",
  propertyType: "Independent House",
  service: "Interior Painting",
  preferredDate: "2026-11-02",
  message: "Cracks on the east wall",
  floors: "2",
  homeSize: "3 BHK",
  carpetArea: 1200,
  page: "/book",
  tracking: { utmSource: "google", utmMedium: "cpc", utmCampaign: "diwali", landingPage: "/", referrer: "https://google.com" },
};
const contact: LeadInput = { type: "contact", name: "Ravi", phone: "9123456789", message: "Hello there" };

describe("toLeadRow", () => {
  it("maps a booking to the leads columns, with the estimated paint area", () => {
    expect(toLeadRow(booking)).toEqual({
      kind: "booking",
      source: "web",
      name: "Asha",
      phone: "9876543210",
      address: "12, Rose Villa, Nehru Road",
      locality: "Dayalbagh",
      pincode: "282005",
      city: "agra",
      propertyType: "Independent House",
      service: "Interior Painting",
      preferredDate: "2026-11-02",
      message: "Cracks on the east wall",
      floors: "2",
      homeSize: "3 BHK",
      carpetArea: 1200,
      estPaintArea: 8400, // 1200 × 2 floors × 3.5
      page: "/book",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "diwali",
      landingPage: "/",
      referrer: "https://google.com",
      locationLat: null,
      locationLng: null,
    });
  });

  it("leaves unanswered details empty (null), assumes one floor and adds the app's source and map pin", () => {
    const { propertyType: _p, service: _s, floors: _f, homeSize: _h, carpetArea: _c, preferredDate: _d, message: _m, page: _pg, tracking: _t, ...bare } = booking;
    const row = toLeadRow(bare, { source: "app", location: { lat: 27.2152, lng: 78.0081 } });
    expect(row).toMatchObject({ source: "app", propertyType: null, service: null, floors: null, carpetArea: null, estPaintArea: null, page: null, utmSource: null, locationLat: 27.2152, locationLng: 78.0081 });
    expect(toLeadRow({ ...booking, floors: undefined }).estPaintArea).toBe(4200);
    expect(toLeadRow({ ...booking, service: "Exterior Painting" }).estPaintArea).toBeNull(); // measured on site
  });

  it("files contact messages and quick visits; a city that is not live yet is a waitlist entry", () => {
    expect(toLeadRow(contact)).toMatchObject({ kind: "contact", message: "Hello there" });
    expect(toLeadRow({ type: "visit", name: "Asha", phone: "9876543210", city: "agra", locality: "Kamla Nagar" })).toMatchObject({ kind: "visit", city: "agra", locality: "Kamla Nagar" });
    expect(toLeadRow({ type: "visit", name: "Ravi", phone: "9123456789", city: "bangalore" })).toMatchObject({ kind: "waitlist", city: "bangalore", locality: null });
  });
});

describe("saveLead", () => {
  it("stores a booking with its project in stage booked and a first timeline event, recording the step time", async () => {
    const timer = createTimer();
    const saved = await saveLead(booking, { timer });
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.projectId).toMatch(/^[0-9a-f-]{36}$/);
    expect(Object.keys(timer.summary())).toContain("db");

    const [lead] = await testDb.db.select().from(leads).where(eq(leads.id, saved.id));
    expect(lead).toMatchObject({ kind: "booking", source: "web", name: "Asha", status: "new", estPaintArea: 8400, userId: null });
    const [project] = await testDb.db.select().from(projects).where(eq(projects.id, saved.projectId!));
    expect(project).toMatchObject({ leadId: saved.id, stage: "booked", phone: "9876543210", name: "Asha", service: "Interior Painting", city: "agra", locality: "Dayalbagh", address: "12, Rose Villa, Nehru Road", pincode: "282005", userId: null });
    const events = await testDb.db.select().from(projectEvents).where(eq(projectEvents.projectId, project.id));
    expect(events).toMatchObject([{ stage: "booked", note: null }]);
  });

  it("opens no project for messages or quick visits", async () => {
    expect((await saveLead(contact)).projectId).toBeNull();
    expect((await saveLead({ type: "visit", name: "A", phone: "9876543210", city: "agra" })).projectId).toBeNull();
    expect(await testDb.db.select().from(projects)).toHaveLength(0);
  });

  it("links a signed-in customer's booking and gives a nameless account the booking's name", async () => {
    const [user] = await testDb.db.insert(users).values({ phone: "9000000001" }).returning();
    const saved = await saveLead(booking, { userId: user.id, source: "app", location: { lat: 27.1, lng: 78.0 } });
    const [lead] = await testDb.db.select().from(leads).where(eq(leads.id, saved.id));
    expect(lead).toMatchObject({ userId: user.id, source: "app", locationLat: 27.1, locationLng: 78 });
    const [project] = await testDb.db.select().from(projects).where(eq(projects.id, saved.projectId!));
    expect(project.userId).toBe(user.id);
    expect((await testDb.db.select().from(users).where(eq(users.id, user.id)))[0].name).toBe("Asha");

    // a name the customer already has is kept
    await saveLead({ ...booking, name: "Someone Else" }, { userId: user.id });
    expect((await testDb.db.select().from(users).where(eq(users.id, user.id)))[0].name).toBe("Asha");
  });

  it("links a booking to the account with the same mobile number", async () => {
    const [user] = await testDb.db.insert(users).values({ phone: "9876543210", name: "Asha" }).returning();
    const saved = await saveLead(booking);
    const [project] = await testDb.db.select().from(projects).where(eq(projects.id, saved.projectId!));
    expect(project.userId).toBe(user.id);
  });

  it("saves nothing when the transaction fails (an unknown account)", async () => {
    await expect(saveLead(booking, { userId: "00000000-0000-4000-8000-000000000000" })).rejects.toThrow();
    expect(await testDb.db.select().from(leads)).toHaveLength(0);
    expect(await testDb.db.select().from(projects)).toHaveLength(0);
  });
});

describe("readLeads", () => {
  it("returns the newest first in the admin table's columns", async () => {
    const first = await saveLead(booking);
    await testDb.db.update(leads).set({ createdAt: new Date("2026-10-18T06:30:00Z") }).where(eq(leads.id, first.id));
    await saveLead(contact);

    const records = await readLeads();
    expect(records.map((r) => r.Name)).toEqual(["Ravi", "Asha"]);
    const asha = records[1];
    expect(Object.keys(asha)).toEqual([...LEAD_COLUMNS]);
    expect(asha["Submitted At (IST)"]).toMatch(/18\/10\/2026, 12:00:00\s?pm/i);
    expect(asha).toMatchObject({
      "Lead ID": first.id,
      Type: "booking",
      Phone: "9876543210",
      Locality: "Dayalbagh",
      "Property Type": "Independent House",
      Service: "Interior Painting",
      "Preferred Inspection Date": "2026-11-02",
      Message: "Cracks on the east wall",
      Page: "/book",
      "UTM Source": "google",
      "UTM Medium": "cpc",
      "UTM Campaign": "diwali",
      "Landing Page": "/",
      Referrer: "https://google.com",
      Status: "New",
      Floors: "2",
      "Home Size": "3 BHK",
      "Carpet Area per Floor (sq ft)": "1200",
      "Est. Paint Area (sq ft)": "8400",
      Address: "12, Rose Villa, Nehru Road",
      "PIN Code": "282005",
      City: "Agra",
      Channel: "web",
      "Project ID": first.projectId,
    });
    // a message has no booking columns
    expect(records[0]).toMatchObject({ Type: "contact", Message: "Hello there", Address: "", City: "", "Project ID": "", "Carpet Area per Floor (sq ft)": "" });
  });

  it("explains quick visits and waitlist entries in the message column", async () => {
    await saveLead({ type: "visit", name: "Asha", phone: "9876543210", city: "agra", locality: "Kamla Nagar" });
    await saveLead({ type: "visit", name: "Ravi", phone: "9123456789", city: "bangalore" });
    const [waitlist, visit] = await readLeads();
    expect(visit).toMatchObject({ Type: "visit", Locality: "Kamla Nagar", City: "Agra", Message: expect.stringMatching(/Quick site-visit request/) });
    expect(waitlist).toMatchObject({ Type: "waitlist", City: "Bangalore", Message: "Waitlist: not painting in Bangalore yet. Call when bookings open there." });
  });

  it("caps the list and returns nothing when there are no leads", async () => {
    expect(await readLeads()).toEqual([]);
    await saveLead(contact);
    await saveLead(contact);
    expect(await readLeads(1)).toHaveLength(1);
  });
});

describe("statuses and records", () => {
  it("labels known statuses and shows any other value as stored", () => {
    expect(statusLabel("new")).toBe("New");
    expect(statusLabel("not_interested")).toBe("Not interested");
    expect(statusLabel("Called back twice")).toBe("Called back twice");
    expect(Object.keys(LEAD_STATUSES)).toContain("spam");
  });

  it("shows a city that is not in the site's list by its slug", () => {
    const record = toLeadRecord({ ...toLeadRow({ type: "visit", name: "A", phone: "9876543210", city: "agra" }), city: "pune", kind: "waitlist", id: "x", status: "called", createdAt: new Date(), userId: null, projectId: null } as Parameters<typeof toLeadRecord>[0]);
    expect(record).toMatchObject({ City: "pune", Status: "Called", Message: "Waitlist: not painting in pune yet. Call when bookings open there." });
  });
});

describe("leadLoadErrorMessage (shown to the signed-in admin)", () => {
  const withCode = (code: string, wrapped = false) => {
    const inner = Object.assign(new Error("details that may quote 9876543210"), { code });
    return wrapped ? new Error("Failed query", { cause: inner }) : inner;
  };

  it("explains each failure with the setting or step to fix, never a value", () => {
    expect(leadLoadErrorMessage(new DatabaseNotConfiguredError())).toMatch(/isn't connected yet.*DATABASE_URL/);
    expect(leadLoadErrorMessage(withCode("42P01", true))).toMatch(/npm run db:migrate/);
    expect(leadLoadErrorMessage(withCode("28P01"))).toMatch(/refused the login/);
    expect(leadLoadErrorMessage(withCode("ECONNREFUSED"))).toMatch(/Couldn't reach the database/);
    expect(leadLoadErrorMessage(withCode("CONNECT_TIMEOUT", true))).toMatch(/Couldn't reach the database/);
    expect(leadLoadErrorMessage(new Error("something else"))).toMatch(/Couldn't load leads/);
    expect(leadLoadErrorMessage("not an error")).toMatch(/Couldn't load leads/);
    for (const code of ["42P01", "28P01", "ECONNREFUSED"]) expect(leadLoadErrorMessage(withCode(code))).not.toContain("9876543210");
  });

  it("finds the code through wrapped causes, and gives up on endless chains", () => {
    expect(dbErrorCode(withCode("23505", true))).toBe("23505");
    expect(dbErrorCode(null)).toBe("");
    const loop: { cause?: unknown } = {};
    loop.cause = loop;
    expect(dbErrorCode(loop)).toBe("");
  });
});
