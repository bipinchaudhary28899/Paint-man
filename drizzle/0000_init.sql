CREATE TYPE "public"."lead_kind" AS ENUM('booking', 'contact', 'visit', 'waitlist');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('web', 'app');--> statement-breakpoint
CREATE TYPE "public"."project_stage" AS ENUM('booked', 'call_confirmed', 'inspection_scheduled', 'inspected', 'quotation_shared', 'price_finalised', 'work_scheduled', 'in_progress', 'completed', 'on_hold', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'sent', 'approved', 'declined', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."session_client" AS ENUM('web', 'app');--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone,
	"visited_at" timestamp with time zone,
	"inspector_name" text,
	"findings" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inspections_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
ALTER TABLE "inspections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "lead_kind" NOT NULL,
	"source" "lead_source" DEFAULT 'web' NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text,
	"locality" text,
	"pincode" text,
	"city" text,
	"property_type" text,
	"service" text,
	"preferred_date" date,
	"message" text,
	"floors" text,
	"home_size" text,
	"carpet_area" integer,
	"est_paint_area" integer,
	"page" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"landing_page" text,
	"referrer" text,
	"status" text DEFAULT 'new' NOT NULL,
	"location_lat" numeric(9, 6),
	"location_lng" numeric(9, 6),
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "otp_challenges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"stage" "project_stage" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"user_id" uuid,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"service" text,
	"city" text,
	"locality" text,
	"address" text,
	"pincode" text,
	"stage" "project_stage" DEFAULT 'booked' NOT NULL,
	"work_starts_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quotation_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"item" text NOT NULL,
	"description" text,
	"area_sqft" integer,
	"coats" integer,
	"rate_paise" integer,
	"amount_paise" integer NOT NULL,
	CONSTRAINT "quotation_lines_amount_check" CHECK ("quotation_lines"."amount_paise" >= 0)
);
--> statement-breakpoint
ALTER TABLE "quotation_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "quotation_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"payment_terms" text,
	"valid_until" date,
	"sent_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quotations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"client" "session_client" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_phone_idx" ON "leads" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "leads_user_id_idx" ON "leads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "otp_challenges_phone_idx" ON "otp_challenges" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "project_events_project_idx" ON "project_events" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_lead_id_idx" ON "projects" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_phone_idx" ON "projects" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "projects_stage_idx" ON "projects" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "quotation_lines_quotation_idx" ON "quotation_lines" USING btree ("quotation_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "quotations_project_version_idx" ON "quotations" USING btree ("project_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");