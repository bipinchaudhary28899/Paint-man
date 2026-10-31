import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { getCity } from "@/config/site";
import { getDb, type Db } from "@/lib/db/client";
import { inspections, leads, projectEvents, projects, quotationLines, quotations } from "@/lib/db/schema";
import { isForward, STAGE_LABELS, stageExplanation, stageSteps, type MainStage, type ProjectStage, type StageStep } from "./stages";

// Projects, their timeline, inspection and quotations: the one data layer behind the customer API
// (/api/v1/projects), the website's tracker pages and /admin. Customer reads only ever see their own
// projects and never a draft quotation; admin functions see everything. Money is integer paise and
// quotation totals are summed from the lines, never stored.

export const CURRENCY = "INR" as const;
export type QuotationStatus = (typeof quotations.$inferSelect)["status"];
/** What a customer may see: every quotation except drafts. */
export const VISIBLE_QUOTATION_STATUSES: QuotationStatus[] = ["sent", "approved", "declined", "superseded"];

/** A failed admin action: `not_found`, or `invalid_state` (e.g. editing a quotation already sent). */
export class ProjectError extends Error {
  constructor(
    public code: "not_found" | "invalid_state",
    message: string,
  ) {
    super(message);
    this.name = "ProjectError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Ids are uuids; anything else is answered as not found without asking the database. */
export const isUuid = (value: string) => UUID.test(value);

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const cityName = (slug: string | null) => (slug ? (getCity(slug)?.name ?? slug) : null);

type ProjectRow = typeof projects.$inferSelect;
type QuotationRow = typeof quotations.$inferSelect;
type LineRow = typeof quotationLines.$inferSelect;
type EventRow = typeof projectEvents.$inferSelect;
type InspectionRow = typeof inspections.$inferSelect;

// ---------- Shapes ----------

export type QuotationLine = {
  position: number;
  item: string;
  description: string | null;
  areaSqft: number | null;
  coats: number | null;
  ratePaise: number | null;
  amountPaise: number;
};

export type Quotation = {
  id: string;
  version: number;
  status: QuotationStatus;
  sentAt: string | null;
  approvedAt: string | null;
  validUntil: string | null;
  notes: string | null;
  paymentTerms: string | null;
  lines: QuotationLine[];
  subtotalPaise: number;
  totalPaise: number;
  currency: typeof CURRENCY;
  /** The PDF download (served for visible versions only). */
  pdf: string;
};

export type AdminQuotation = Quotation & { createdAt: string; updatedAt: string };

export type Inspection = { scheduledAt: string | null; visitedAt: string | null; inspectorName: string | null; findings: string | null };

export type TimelineEvent = { stage: ProjectStage; label: string; note: string | null; at: string };

export type ProjectSummary = {
  id: string;
  service: string | null;
  city: string | null;
  citySlug: string | null;
  locality: string | null;
  stage: ProjectStage;
  stageLabel: string;
  createdAt: string;
  updatedAt: string;
  finalPricePaise?: number;
  currency: typeof CURRENCY;
};

export type ProjectDetail = Omit<ProjectSummary, "createdAt" | "updatedAt"> & {
  address: string | null;
  pincode: string | null;
  stageExplanation: string;
  workStartsOn: string | null;
  createdAt: string;
  updatedAt: string;
  stages: StageStep[];
  timeline: TimelineEvent[];
  inspection: Inspection | null;
  quotations: Quotation[];
};

/** A row of the /admin projects list: the summary (with the approved price) plus the customer. */
export type AdminProjectSummary = ProjectSummary & {
  name: string;
  phone: string;
  userId: string | null;
  leadId: string | null;
};

export type AdminLead = {
  id: string;
  source: "web" | "app";
  propertyType: string | null;
  floors: string | null;
  homeSize: string | null;
  carpetArea: number | null;
  estPaintArea: number | null;
  preferredDate: string | null;
  message: string | null;
  location: { lat: number; lng: number } | null;
  createdAt: string;
};

export type AdminProject = Omit<ProjectDetail, "quotations" | "timeline"> & {
  name: string;
  phone: string;
  userId: string | null;
  lead: AdminLead | null;
  timeline: (TimelineEvent & { id: string })[];
  quotations: AdminQuotation[];
};

// ---------- Mapping ----------

function toLine(l: LineRow): QuotationLine {
  return { position: l.position, item: l.item, description: l.description, areaSqft: l.areaSqft, coats: l.coats, ratePaise: l.ratePaise, amountPaise: l.amountPaise };
}

/** Sum of the line amounts, in paise. There are no taxes or discounts on top, so the total equals it. */
export const quotationTotal = (lines: { amountPaise: number }[]) => lines.reduce((sum, l) => sum + l.amountPaise, 0);

function toQuotation(q: QuotationRow, lines: LineRow[]): Quotation {
  const mine = lines.filter((l) => l.quotationId === q.id).sort((a, b) => a.position - b.position);
  const total = quotationTotal(mine);
  return {
    id: q.id,
    version: q.version,
    status: q.status,
    sentAt: iso(q.sentAt),
    approvedAt: iso(q.approvedAt),
    validUntil: q.validUntil,
    notes: q.notes,
    paymentTerms: q.paymentTerms,
    lines: mine.map(toLine),
    subtotalPaise: total,
    totalPaise: total,
    currency: CURRENCY,
    pdf: `/api/v1/projects/${q.projectId}/quotations/${q.id}/pdf`,
  };
}

const toEvent = (e: EventRow): TimelineEvent => ({ stage: e.stage, label: STAGE_LABELS[e.stage], note: e.note, at: e.createdAt.toISOString() });

const toInspection = (i: InspectionRow | undefined): Inspection | null =>
  i ? { scheduledAt: iso(i.scheduledAt), visitedAt: iso(i.visitedAt), inspectorName: i.inspectorName, findings: i.findings } : null;

function toSummary(p: ProjectRow, finalPricePaise: number | undefined): ProjectSummary {
  return {
    id: p.id,
    service: p.service,
    city: cityName(p.city),
    citySlug: p.city,
    locality: p.locality,
    stage: p.stage,
    stageLabel: STAGE_LABELS[p.stage],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    ...(finalPricePaise !== undefined && { finalPricePaise }),
    currency: CURRENCY,
  };
}

/** The approved quotation's total for each project that has one. */
async function finalPrices(db: Db, projectIds: string[]): Promise<Map<string, number>> {
  if (projectIds.length === 0) return new Map();
  const rows = await db
    .select({ projectId: quotations.projectId, total: sql<number>`coalesce(sum(${quotationLines.amountPaise}), 0)`.mapWith(Number) })
    .from(quotations)
    .leftJoin(quotationLines, eq(quotationLines.quotationId, quotations.id))
    .where(and(inArray(quotations.projectId, projectIds), eq(quotations.status, "approved")))
    .groupBy(quotations.id, quotations.projectId);
  return new Map(rows.map((r) => [r.projectId, r.total]));
}

/** Timeline (oldest first), inspection and quotations (newest version first) of a project. */
async function projectParts(db: Db, projectId: string, statuses?: QuotationStatus[]) {
  const quoteFilter = statuses ? and(eq(quotations.projectId, projectId), inArray(quotations.status, statuses)) : eq(quotations.projectId, projectId);
  const [events, inspectionRows, quoteRows] = await Promise.all([
    db.select().from(projectEvents).where(eq(projectEvents.projectId, projectId)).orderBy(asc(projectEvents.createdAt), asc(projectEvents.id)),
    db.select().from(inspections).where(eq(inspections.projectId, projectId)).limit(1),
    db.select().from(quotations).where(quoteFilter).orderBy(desc(quotations.version)),
  ]);
  const lines = quoteRows.length
    ? await db.select().from(quotationLines).where(inArray(quotationLines.quotationId, quoteRows.map((q) => q.id))).orderBy(asc(quotationLines.position))
    : [];
  return { events, inspection: inspectionRows[0], quoteRows, lines };
}

function toDetail(p: ProjectRow, parts: Awaited<ReturnType<typeof projectParts>>) {
  const quotes = parts.quoteRows.map((q) => toQuotation(q, parts.lines));
  const approved = quotes.find((q) => q.status === "approved");
  const inspection = toInspection(parts.inspection);
  return {
    ...toSummary(p, approved?.totalPaise),
    address: p.address,
    pincode: p.pincode,
    stageExplanation: stageExplanation(p.stage, { inspectionAt: parts.inspection?.scheduledAt, workStartsOn: p.workStartsOn }),
    workStartsOn: p.workStartsOn,
    stages: stageSteps(p.stage, parts.events.map((e) => ({ stage: e.stage, at: e.createdAt }))),
    inspection,
    quotes,
  };
}

// ---------- Customer reads ----------

/** The customer's projects, newest first. */
export async function listProjectsForUser(userId: string): Promise<ProjectSummary[]> {
  const db = await getDb();
  const rows = await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt), desc(projects.id));
  const prices = await finalPrices(db, rows.map((r) => r.id));
  return rows.map((p) => toSummary(p, prices.get(p.id)));
}

async function ownProject(db: Db, userId: string, projectId: string): Promise<ProjectRow | undefined> {
  if (!isUuid(projectId)) return undefined;
  const [p] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, userId))).limit(1);
  return p;
}

/** One of the customer's projects with its stages, timeline, inspection and visible quotations; null when it is not theirs. */
export async function getProjectForUser(userId: string, projectId: string): Promise<ProjectDetail | null> {
  const db = await getDb();
  const p = await ownProject(db, userId, projectId);
  if (!p) return null;
  const parts = await projectParts(db, p.id, VISIBLE_QUOTATION_STATUSES);
  const { quotes, ...detail } = toDetail(p, parts);
  return { ...detail, timeline: parts.events.map(toEvent), quotations: quotes };
}

/** What a quotation PDF prints: the project's customer and address with one visible quotation. */
export type QuotationDocument = {
  project: { id: string; name: string; phone: string; service: string | null; city: string | null; locality: string | null; address: string | null; pincode: string | null; stage: ProjectStage; stageLabel: string };
  quotation: Quotation;
};

/** One visible (never draft) quotation of the customer's own project, for the PDF; null otherwise. */
export async function getVisibleQuotationForUser(userId: string, projectId: string, quotationId: string): Promise<QuotationDocument | null> {
  if (!isUuid(quotationId)) return null;
  const db = await getDb();
  const p = await ownProject(db, userId, projectId);
  if (!p) return null;
  const [q] = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, quotationId), eq(quotations.projectId, p.id), inArray(quotations.status, VISIBLE_QUOTATION_STATUSES)))
    .limit(1);
  if (!q) return null;
  const lines = await db.select().from(quotationLines).where(eq(quotationLines.quotationId, q.id));
  return {
    project: { id: p.id, name: p.name, phone: p.phone, service: p.service, city: cityName(p.city), locality: p.locality, address: p.address, pincode: p.pincode, stage: p.stage, stageLabel: STAGE_LABELS[p.stage] },
    quotation: toQuotation(q, lines),
  };
}

// ---------- Admin reads ----------

export type ProjectFilter = { stage?: ProjectStage; city?: string; q?: string; limit?: number; offset?: number };

const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Projects for /admin, the most recently updated first (a stage change, inspection or quotation
 * brings a project to the top): filter by stage or city slug, search by phone digits or name. Each
 * row carries the approved quotation's total once there is one.
 */
export async function listProjects({ stage, city, q, limit = 50, offset = 0 }: ProjectFilter = {}): Promise<{ total: number; items: AdminProjectSummary[] }> {
  const db = await getDb();
  const conditions: SQL[] = [];
  if (stage) conditions.push(eq(projects.stage, stage));
  if (city) conditions.push(eq(projects.city, city));
  const term = q?.trim();
  if (term) {
    const digits = term.replace(/\D/g, "");
    const byName = ilike(projects.name, `%${likeEscape(term)}%`);
    conditions.push(digits.length >= 3 ? or(byName, ilike(projects.phone, `%${digits}%`))! : byName);
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(projects).where(where).orderBy(desc(projects.updatedAt), desc(projects.id)).limit(Math.min(Math.max(limit, 1), 200)).offset(Math.max(offset, 0)),
    db.select({ total: count() }).from(projects).where(where),
  ]);
  const prices = await finalPrices(db, rows.map((r) => r.id));
  return {
    total,
    items: rows.map((p) => ({ ...toSummary(p, prices.get(p.id)), name: p.name, phone: p.phone, userId: p.userId, leadId: p.leadId })),
  };
}

/** Everything about a project for /admin, drafts included; null when there is no such project. */
export async function getProjectForAdmin(projectId: string): Promise<AdminProject | null> {
  if (!isUuid(projectId)) return null;
  const db = await getDb();
  const [row] = await db.select({ project: projects, lead: leads }).from(projects).leftJoin(leads, eq(leads.id, projects.leadId)).where(eq(projects.id, projectId)).limit(1);
  if (!row) return null;
  const p = row.project;
  const parts = await projectParts(db, p.id);
  const { quotes, ...detail } = toDetail(p, parts);
  const l = row.lead;
  return {
    ...detail,
    name: p.name,
    phone: p.phone,
    userId: p.userId,
    lead: l
      ? {
          id: l.id,
          source: l.source,
          propertyType: l.propertyType,
          floors: l.floors,
          homeSize: l.homeSize,
          carpetArea: l.carpetArea,
          estPaintArea: l.estPaintArea,
          preferredDate: l.preferredDate,
          message: l.message,
          location: l.locationLat !== null && l.locationLng !== null ? { lat: l.locationLat, lng: l.locationLng } : null,
          createdAt: l.createdAt.toISOString(),
        }
      : null,
    timeline: parts.events.map((e) => ({ id: e.id, ...toEvent(e) })),
    quotations: quotes.map((q) => {
      const source = parts.quoteRows.find((r) => r.id === q.id)!;
      return { ...q, createdAt: source.createdAt.toISOString(), updatedAt: source.updatedAt.toISOString() };
    }),
  };
}

/** What the quotation PDF prints for /admin: the project with any of its quotations, drafts included (a preview before sending); null when the pair does not match. */
export async function getQuotationForAdmin(projectId: string, quotationId: string): Promise<QuotationDocument | null> {
  if (!isUuid(projectId) || !isUuid(quotationId)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ p: projects, q: quotations })
    .from(quotations)
    .innerJoin(projects, eq(projects.id, quotations.projectId))
    .where(and(eq(quotations.id, quotationId), eq(quotations.projectId, projectId)))
    .limit(1);
  if (!row) return null;
  const { p, q } = row;
  const lines = await db.select().from(quotationLines).where(eq(quotationLines.quotationId, q.id));
  return {
    project: { id: p.id, name: p.name, phone: p.phone, service: p.service, city: cityName(p.city), locality: p.locality, address: p.address, pincode: p.pincode, stage: p.stage, stageLabel: STAGE_LABELS[p.stage] },
    quotation: toQuotation(q, lines),
  };
}

// ---------- Admin writes ----------

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function lockProject(tx: Tx, projectId: string): Promise<ProjectRow> {
  const [p] = isUuid(projectId) ? await tx.select().from(projects).where(eq(projects.id, projectId)).for("update") : [];
  if (!p) throw new ProjectError("not_found", "No such project.");
  return p;
}

/** Moves the project to `stage` and appends the timeline event. */
async function moveTo(tx: Tx, p: ProjectRow, stage: ProjectStage, note: string | null, now: Date, extra: Partial<ProjectRow> = {}) {
  await tx.update(projects).set({ stage, updatedAt: now, ...extra }).where(eq(projects.id, p.id));
  await tx.insert(projectEvents).values({ projectId: p.id, stage, note, createdAt: now });
}

/** Advances along the main line only (never back, never out of a hold): the automatic moves. */
async function advance(tx: Tx, p: ProjectRow, stage: MainStage, note: string | null, now: Date) {
  if (isForward(p.stage, stage)) await moveTo(tx, p, stage, note, now);
  else await tx.update(projects).set({ updatedAt: now }).where(eq(projects.id, p.id));
}

/**
 * Sets the stage by hand (any stage, including back or on hold) with an optional note the customer
 * sees. Setting the current stage again with a note posts an update (e.g. progress while painting).
 * `workStartsOn` (YYYY-MM-DD) is the crew's start date for `work_scheduled`.
 */
export async function setProjectStage(projectId: string, stage: ProjectStage, opts: { note?: string | null; workStartsOn?: string | null; now?: Date } = {}) {
  const db = await getDb();
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const p = await lockProject(tx, projectId);
    await moveTo(tx, p, stage, opts.note?.trim() || null, now, opts.workStartsOn !== undefined ? { workStartsOn: opts.workStartsOn } : {});
  });
}

/**
 * Sets (or, with null, clears) the crew's start date without changing the stage: the customer's
 * "Work scheduled" step then reads "The crew starts on {date}".
 */
export async function setWorkStartDate(projectId: string, workStartsOn: string | null, opts: { now?: Date } = {}) {
  const db = await getDb();
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const p = await lockProject(tx, projectId);
    await tx.update(projects).set({ workStartsOn, updatedAt: now }).where(eq(projects.id, p.id));
  });
}

/** Schedules (or reschedules) the inspection visit; the project moves to `inspection_scheduled` if it was earlier. */
export async function scheduleInspection(projectId: string, opts: { scheduledAt: Date; inspectorName?: string | null; now?: Date }) {
  const db = await getDb();
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const p = await lockProject(tx, projectId);
    const values = { scheduledAt: opts.scheduledAt, updatedAt: now, ...(opts.inspectorName !== undefined && { inspectorName: opts.inspectorName }) };
    await tx.insert(inspections).values({ projectId: p.id, ...values }).onConflictDoUpdate({ target: inspections.projectId, set: values });
    await advance(tx, p, "inspection_scheduled", null, now);
  });
}

/** Records the visit and the findings the customer sees; the project moves to `inspected` if it was earlier. */
export async function markInspectionVisited(projectId: string, opts: { visitedAt?: Date; findings?: string | null; inspectorName?: string | null; now?: Date } = {}) {
  const db = await getDb();
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const p = await lockProject(tx, projectId);
    const values = {
      visitedAt: opts.visitedAt ?? now,
      updatedAt: now,
      ...(opts.findings !== undefined && { findings: opts.findings }),
      ...(opts.inspectorName !== undefined && { inspectorName: opts.inspectorName }),
    };
    await tx.insert(inspections).values({ projectId: p.id, ...values }).onConflictDoUpdate({ target: inspections.projectId, set: values });
    await advance(tx, p, "inspected", null, now);
  });
}

/**
 * Starts the next quotation version as a draft. A revision starts as a copy of the latest version
 * (its lines, notes, payment terms and validity), so only the changes need entering.
 */
export async function createQuotation(projectId: string, opts: { now?: Date } = {}): Promise<{ id: string; version: number }> {
  const db = await getDb();
  const now = opts.now ?? new Date();
  return db.transaction(async (tx) => {
    const p = await lockProject(tx, projectId);
    const [latest] = await tx.select().from(quotations).where(eq(quotations.projectId, p.id)).orderBy(desc(quotations.version)).limit(1);
    const [created] = await tx
      .insert(quotations)
      .values({
        projectId: p.id,
        version: (latest?.version ?? 0) + 1,
        status: "draft",
        notes: latest?.notes ?? null,
        paymentTerms: latest?.paymentTerms ?? null,
        validUntil: latest?.validUntil ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: quotations.id, version: quotations.version });
    if (latest) {
      const lines = await tx.select().from(quotationLines).where(eq(quotationLines.quotationId, latest.id)).orderBy(asc(quotationLines.position));
      if (lines.length) await tx.insert(quotationLines).values(lines.map(({ id: _id, ...l }) => ({ ...l, quotationId: created.id })));
    }
    return created;
  });
}

/**
 * Locks the quotation's project, then the quotation: every write to a project's quotations takes the
 * project lock first. With `projectId`, a quotation of another project is not found.
 */
async function lockQuotation(tx: Tx, quotationId: string, projectId?: string): Promise<{ q: QuotationRow; p: ProjectRow }> {
  const [found] = isUuid(quotationId) ? await tx.select({ projectId: quotations.projectId }).from(quotations).where(eq(quotations.id, quotationId)) : [];
  if (!found || (projectId !== undefined && found.projectId !== projectId)) throw new ProjectError("not_found", "No such quotation.");
  const p = await lockProject(tx, found.projectId);
  const [q] = await tx.select().from(quotations).where(eq(quotations.id, quotationId)).for("update");
  return { q, p };
}

export type QuotationLineInput = Omit<QuotationLine, "position">;
export type QuotationInput = { lines: QuotationLineInput[]; notes?: string | null; paymentTerms?: string | null; validUntil?: string | null };
/** Options of the quotation writes: `projectId` scopes the quotation to that project (else not found). */
export type QuotationWriteOptions = { now?: Date; projectId?: string };

/** Saves a draft: replaces its lines (in the order given) and sets notes, payment terms and validity. */
export async function saveQuotation(quotationId: string, input: QuotationInput, opts: QuotationWriteOptions = {}) {
  const db = await getDb();
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const { q } = await lockQuotation(tx, quotationId, opts.projectId);
    if (q.status !== "draft") throw new ProjectError("invalid_state", `Version ${q.version} has been sent; start a new version to change it.`);
    await tx.delete(quotationLines).where(eq(quotationLines.quotationId, q.id));
    if (input.lines.length) await tx.insert(quotationLines).values(input.lines.map((l, i) => ({ ...l, quotationId: q.id, position: i + 1 })));
    await tx
      .update(quotations)
      .set({
        updatedAt: now,
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.paymentTerms !== undefined && { paymentTerms: input.paymentTerms }),
        ...(input.validUntil !== undefined && { validUntil: input.validUntil }),
      })
      .where(eq(quotations.id, q.id));
  });
}

/**
 * Sends a draft to the customer (it must have lines); the project moves to `quotation_shared` if
 * it was earlier. A revision (version 2 on) adds "Revised quotation (version n)." to the timeline.
 */
export async function sendQuotation(quotationId: string, opts: QuotationWriteOptions = {}) {
  const db = await getDb();
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const { q, p } = await lockQuotation(tx, quotationId, opts.projectId);
    if (q.status !== "draft") throw new ProjectError("invalid_state", `Version ${q.version} has already been sent.`);
    const [{ lines }] = await tx.select({ lines: count() }).from(quotationLines).where(eq(quotationLines.quotationId, q.id));
    if (lines === 0) throw new ProjectError("invalid_state", "Add at least one line before sending the quotation.");
    await tx.update(quotations).set({ status: "sent", sentAt: now, updatedAt: now }).where(eq(quotations.id, q.id));
    const note = q.version > 1 ? `Revised quotation (version ${q.version}).` : null;
    // a revision sent while the first is still under review is posted as an update at this stage
    if (note && p.stage === "quotation_shared") await moveTo(tx, p, "quotation_shared", note, now);
    else await advance(tx, p, "quotation_shared", note, now);
  });
}

/**
 * Marks a sent (or declined) quotation approved: the price is final. Every other sent or approved
 * version becomes `superseded` (drafts and declined versions keep their status), and the project
 * moves to `price_finalised` if it was earlier.
 */
export async function approveQuotation(quotationId: string, opts: QuotationWriteOptions = {}) {
  const db = await getDb();
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const { q, p } = await lockQuotation(tx, quotationId, opts.projectId);
    if (q.status !== "sent" && q.status !== "declined") throw new ProjectError("invalid_state", `Version ${q.version} is ${q.status}; only a sent quotation can be approved.`);
    await tx
      .update(quotations)
      .set({ status: "superseded", updatedAt: now })
      .where(and(eq(quotations.projectId, q.projectId), ne(quotations.id, q.id), inArray(quotations.status, ["sent", "approved"])));
    await tx.update(quotations).set({ status: "approved", approvedAt: now, updatedAt: now }).where(eq(quotations.id, q.id));
    await advance(tx, p, "price_finalised", null, now);
  });
}

/** Marks a sent quotation declined by the customer. */
export async function declineQuotation(quotationId: string, opts: QuotationWriteOptions = {}) {
  const db = await getDb();
  const now = opts.now ?? new Date();
  await db.transaction(async (tx) => {
    const { q } = await lockQuotation(tx, quotationId, opts.projectId);
    if (q.status !== "sent") throw new ProjectError("invalid_state", `Version ${q.version} is ${q.status}; only a sent quotation can be declined.`);
    await tx.update(quotations).set({ status: "declined", updatedAt: now }).where(eq(quotations.id, q.id));
    await tx.update(projects).set({ updatedAt: now }).where(eq(projects.id, q.projectId));
  });
}
