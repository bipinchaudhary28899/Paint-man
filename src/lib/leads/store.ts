import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getCity } from "@/config/site";
import { getDb } from "@/lib/db/client";
import { leads, projectEvents, projects, users } from "@/lib/db/schema";
import type { Timer } from "@/lib/timing";
import { estimatePaintArea } from "./estimate";
import { LEAD_COLUMNS, LEAD_STATUSES, statusLabel, type LeadRecord, type LeadStatus } from "./record";
import type { LeadInput } from "./schema";

// Leads live in Postgres (the `leads` table). Every booking also opens its project, in stage
// `booked` with a first timeline event, in the same transaction, so the customer can track it
// once they sign in with that mobile number.

export { LEAD_COLUMNS, LEAD_STATUSES, type LeadRecord, type LeadStatus };

export type LeadLocation = { lat: number; lng: number };

export type SaveLeadOptions = {
  /** Where the lead came from: the website's forms (default) or the app. */
  source?: "web" | "app";
  /** The signed-in customer who sent it. Without one, a customer with the lead's phone is linked. */
  userId?: string | null;
  /** The app's map pin for the booking address. */
  location?: LeadLocation | null;
  /** Records the database step's duration (no data). */
  timer?: Timer;
};

export type SavedLead = { id: string; projectId: string | null };

type LeadRow = typeof leads.$inferInsert;

/** A quick site-visit request is a waitlist entry when its city is not live yet. */
function visitKind(city: string): "visit" | "waitlist" {
  return getCity(city)?.status === "live" ? "visit" : "waitlist";
}

const blank = (v: string | undefined | null) => (v === undefined || v === null || v === "" ? null : v);

/** The `leads` row for a submission (the user link is added when it is saved). */
export function toLeadRow(lead: LeadInput, opts: Pick<SaveLeadOptions, "source" | "location"> = {}): LeadRow {
  const t = lead.tracking ?? {};
  const common = {
    source: opts.source ?? "web",
    name: lead.name,
    phone: lead.phone,
    page: blank(lead.page),
    utmSource: blank(t.utmSource),
    utmMedium: blank(t.utmMedium),
    utmCampaign: blank(t.utmCampaign),
    landingPage: blank(t.landingPage),
    referrer: blank(t.referrer),
    locationLat: opts.location?.lat ?? null,
    locationLng: opts.location?.lng ?? null,
  } satisfies Partial<LeadRow>;

  if (lead.type === "contact") return { ...common, kind: "contact", message: lead.message };
  if (lead.type === "visit") return { ...common, kind: visitKind(lead.city), city: lead.city, locality: blank(lead.locality) };
  return {
    ...common,
    kind: "booking",
    address: lead.address,
    locality: lead.locality,
    pincode: lead.pincode,
    city: lead.city,
    propertyType: blank(lead.propertyType),
    service: blank(lead.service),
    preferredDate: blank(lead.preferredDate),
    message: blank(lead.message),
    floors: blank(lead.floors),
    homeSize: blank(lead.homeSize),
    carpetArea: lead.carpetArea ?? null,
    estPaintArea: estimatePaintArea(lead.carpetArea, lead.floors ?? "1", lead.service ?? ""),
  };
}

/**
 * Saves a lead and returns its id, plus the project a booking opened. One transaction: the lead,
 * its project and the project's first timeline event are stored together or not at all.
 */
export async function saveLead(lead: LeadInput, opts: SaveLeadOptions = {}): Promise<SavedLead> {
  const db = await getDb();
  const row = toLeadRow(lead, opts);
  const work = db.transaction(async (tx) => {
    let userId = opts.userId ?? null;
    if (userId) {
      // the account takes the booking's name when it has none yet
      await tx.update(users).set({ name: lead.name }).where(and(eq(users.id, userId), isNull(users.name)));
    } else {
      // projects are linked to customers by their verified mobile number
      const [owner] = await tx.select({ id: users.id }).from(users).where(eq(users.phone, lead.phone)).limit(1);
      userId = owner?.id ?? null;
    }

    const [saved] = await tx.insert(leads).values({ ...row, userId }).returning({ id: leads.id });
    if (lead.type !== "booking") return { id: saved.id, projectId: null };

    const [project] = await tx
      .insert(projects)
      .values({
        leadId: saved.id,
        userId,
        phone: lead.phone,
        name: lead.name,
        service: row.service,
        city: lead.city,
        locality: lead.locality,
        address: lead.address,
        pincode: lead.pincode,
        stage: "booked",
      })
      .returning({ id: projects.id });
    await tx.insert(projectEvents).values({ projectId: project.id, stage: "booked" });
    return { id: saved.id, projectId: project.id };
  });
  return opts.timer ? opts.timer.time("db", work) : work;
}

// ---------- Reading (admin only) ----------

const IST = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
const text = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));
const cityName = (slug: string | null) => (slug ? (getCity(slug)?.name ?? slug) : "");

/** What a quick visit or waitlist entry asks of the team (these forms have no message of their own). */
function visitNote(kind: string, city: string | null): string {
  if (kind === "visit") return "Quick site-visit request: take the job details on the call.";
  return `Waitlist: not painting in ${cityName(city)} yet. Call when bookings open there.`;
}

type ReadRow = typeof leads.$inferSelect & { projectId: string | null };

/** One stored lead as the admin table's record. */
export function toLeadRecord(l: ReadRow): LeadRecord {
  const isVisit = l.kind === "visit" || l.kind === "waitlist";
  const record: Record<string, string> = {
    "Submitted At (IST)": IST(l.createdAt),
    "Lead ID": l.id,
    Type: l.kind,
    Name: l.name,
    Phone: l.phone,
    Locality: text(l.locality),
    "Property Type": text(l.propertyType),
    Service: text(l.service),
    "Preferred Inspection Date": text(l.preferredDate),
    Message: isVisit ? visitNote(l.kind, l.city) : text(l.message),
    Page: text(l.page),
    "UTM Source": text(l.utmSource),
    "UTM Medium": text(l.utmMedium),
    "UTM Campaign": text(l.utmCampaign),
    "Landing Page": text(l.landingPage),
    Referrer: text(l.referrer),
    Status: statusLabel(l.status),
    Floors: text(l.floors),
    "Home Size": text(l.homeSize),
    "Carpet Area per Floor (sq ft)": text(l.carpetArea),
    "Est. Paint Area (sq ft)": text(l.estPaintArea),
    Address: text(l.address),
    "PIN Code": text(l.pincode),
    City: cityName(l.city),
    Channel: l.source,
    "Project ID": text(l.projectId),
  };
  return Object.fromEntries(LEAD_COLUMNS.map((c) => [c, record[c]])) as LeadRecord;
}

/** The newest leads first (up to `limit`), each with the project its booking opened. */
export async function readLeads(limit = 5000): Promise<LeadRecord[]> {
  const db = await getDb();
  const rows = await db
    .select({ lead: leads, projectId: projects.id })
    .from(leads)
    .leftJoin(projects, eq(projects.leadId, leads.id))
    .orderBy(desc(leads.createdAt), desc(leads.id))
    .limit(limit);
  return rows.map(({ lead, projectId }) => toLeadRecord({ ...lead, projectId }));
}

// ---------- Follow-up status (admin only) ----------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for one of the team's stored statuses (`new`, `called`, …; src/lib/leads/record.ts). */
export const isLeadStatus = (value: unknown): value is LeadStatus => typeof value === "string" && Object.hasOwn(LEAD_STATUSES, value);

/** A status outside LEAD_STATUSES: the caller's input was not one of the team's statuses. */
export class InvalidLeadStatusError extends Error {
  constructor() {
    super(`Choose one of: ${Object.keys(LEAD_STATUSES).join(", ")}.`);
    this.name = "InvalidLeadStatusError";
  }
}

/**
 * Sets a lead's follow-up status. Throws InvalidLeadStatusError for a status outside
 * LEAD_STATUSES; answers false when there is no such lead (an id that is not a uuid included).
 */
export async function updateLeadStatus(id: string, status: string): Promise<boolean> {
  if (!isLeadStatus(status)) throw new InvalidLeadStatusError();
  if (!UUID.test(id)) return false;
  const db = await getDb();
  const updated = await db.update(leads).set({ status }).where(eq(leads.id, id)).returning({ id: leads.id });
  return updated.length > 0;
}
