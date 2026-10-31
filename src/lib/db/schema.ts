// The Postgres schema (Drizzle). Every table of the customer accounts and project tracker, plus the
// leads the website and the app collect. drizzle-kit reads this file to generate the SQL migrations
// in drizzle/ (npm run db:generate), so it imports only relative modules with no server-only code.
//
// Conventions: uuid ids, timestamptz with a default of now(), phone numbers as the 10-digit Indian
// mobile (normalizeMobile), money as integer paise. Quotation totals are never stored: they are
// summed from the lines.
//
// Row level security is on for every table with no policies: Supabase's Data API (anon and
// authenticated roles) can read nothing, while the app connects as the tables' owner, which RLS
// does not restrict.
import { sql } from "drizzle-orm";
import { check, date, index, integer, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { PROJECT_STAGES } from "../projects/stages";

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const projectStage = pgEnum("project_stage", PROJECT_STAGES);
/** `waitlist` is a quick site-visit request for a city we do not paint in yet. */
export const leadKind = pgEnum("lead_kind", ["booking", "contact", "visit", "waitlist"]);
export const leadSource = pgEnum("lead_source", ["web", "app"]);
export const sessionClient = pgEnum("session_client", ["web", "app"]);
export const quotationStatus = pgEnum("quotation_status", ["draft", "sent", "approved", "declined", "superseded"]);

/** Customers: one row per verified mobile number. Deleting a user removes the row (no soft delete). */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  createdAt: createdAt(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
}).enableRLS();

/** One-time sign-in codes, stored only as an HMAC of phone and code. */
export const otpChallenges = pgTable(
  "otp_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("otp_challenges_phone_idx").on(t.phone)],
).enableRLS();

/** Signed-in devices: the sha256 of a random token (the token itself is never stored). */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    client: sessionClient("client").notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("sessions_token_hash_idx").on(t.tokenHash), index("sessions_user_id_idx").on(t.userId)],
).enableRLS();

/** Every form submission: website bookings, contact messages, quick site visits and app bookings. */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: leadKind("kind").notNull(),
    source: leadSource("source").notNull().default("web"),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    address: text("address"),
    locality: text("locality"),
    pincode: text("pincode"),
    /** The city slug (src/config/site.ts `cities`). */
    city: text("city"),
    propertyType: text("property_type"),
    service: text("service"),
    preferredDate: date("preferred_date", { mode: "string" }),
    message: text("message"),
    floors: text("floors"),
    homeSize: text("home_size"),
    carpetArea: integer("carpet_area"),
    estPaintArea: integer("est_paint_area"),
    page: text("page"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    landingPage: text("landing_page"),
    referrer: text("referrer"),
    /** The team's follow-up status (src/lib/leads/record.ts `LEAD_STATUSES`). */
    status: text("status").notNull().default("new"),
    /** The app's map pin for the address, when the customer dropped one. */
    locationLat: numeric("location_lat", { precision: 9, scale: 6, mode: "number" }),
    locationLng: numeric("location_lng", { precision: 9, scale: 6, mode: "number" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("leads_created_at_idx").on(t.createdAt), index("leads_phone_idx").on(t.phone), index("leads_user_id_idx").on(t.userId)],
).enableRLS();

/** A painting job, from booking to handover. Every booking lead creates one in stage `booked`. */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    service: text("service"),
    /** The city slug (src/config/site.ts `cities`). */
    city: text("city"),
    locality: text("locality"),
    address: text("address"),
    pincode: text("pincode"),
    stage: projectStage("stage").notNull().default("booked"),
    /** The crew's start date, named in the `work_scheduled` explanation. */
    workStartsOn: date("work_starts_on", { mode: "string" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("projects_lead_id_idx").on(t.leadId),
    index("projects_user_id_idx").on(t.userId),
    index("projects_phone_idx").on(t.phone),
    index("projects_stage_idx").on(t.stage),
  ],
).enableRLS();

/** The timeline: one row per stage change, with an optional note the customer sees. */
export const projectEvents = pgTable(
  "project_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stage: projectStage("stage").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("project_events_project_idx").on(t.projectId, t.createdAt)],
).enableRLS();

/** The site inspection: one per project. `findings` is shown to the customer. */
export const inspections = pgTable("inspections", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  visitedAt: timestamp("visited_at", { withTimezone: true }),
  inspectorName: text("inspector_name"),
  findings: text("findings"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}).enableRLS();

/** Versioned quotations. Drafts are admin-only; the customer sees every other status. */
export const quotations = pgTable(
  "quotations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: quotationStatus("status").notNull().default("draft"),
    notes: text("notes"),
    paymentTerms: text("payment_terms"),
    validUntil: date("valid_until", { mode: "string" }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("quotations_project_version_idx").on(t.projectId, t.version)],
).enableRLS();

/** The itemised lines of a quotation. Money in integer paise. */
export const quotationLines = pgTable(
  "quotation_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quotationId: uuid("quotation_id")
      .notNull()
      .references(() => quotations.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    item: text("item").notNull(),
    description: text("description"),
    areaSqft: integer("area_sqft"),
    coats: integer("coats"),
    ratePaise: integer("rate_paise"),
    amountPaise: integer("amount_paise").notNull(),
  },
  (t) => [index("quotation_lines_quotation_idx").on(t.quotationId, t.position), check("quotation_lines_amount_check", sql`${t.amountPaise} >= 0`)],
).enableRLS();
