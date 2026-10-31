ALTER TABLE "projects" ADD COLUMN "property_type" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "floors" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "home_size" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "carpet_area" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "preferred_date" date;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "location_lat" numeric(9, 6);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "location_lng" numeric(9, 6);