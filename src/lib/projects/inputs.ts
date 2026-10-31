import { z } from "zod";
import { bookingDateRange, isCalendarDate } from "@/lib/leads/dates";
import { FIELD_MESSAGES } from "@/lib/leads/field-checks";
import { CARPET_AREA_MAX, CARPET_AREA_MIN, floorOptions, homeSizes, propertyTypes, serviceTypes } from "@/lib/leads/options";
import { addressField, pincodeField } from "@/lib/leads/schema";
import { PROJECT_STAGES } from "./stages";

// Bounded input for the /admin project actions (route handlers or server actions validate with
// these, then call src/lib/projects/repo.ts). Blank optional text becomes null. Money is integer
// paise; a line's amount is required, its area, coats and rate are optional details.

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optionalText = (max: number) => z.preprocess(blankToNull, z.string().trim().max(max, `Use ${max} characters or fewer`).nullable().optional());
const day = z.preprocess(blankToNull, z.string().refine(isCalendarDate, "Choose a date (YYYY-MM-DD)").nullable().optional());
const instant = z.iso.datetime({ offset: true, message: "Use an ISO date and time, e.g. 2026-11-04T11:30:00+05:30" }).transform((v) => new Date(v));
const int = (min: number, max: number, what: string) => z.number({ message: `${what} must be a number` }).int(`${what} must be a whole number`).min(min).max(max);

export const stageChangeSchema = z.object({
  stage: z.enum(PROJECT_STAGES, { message: "Choose a stage" }),
  note: optionalText(500),
  workStartsOn: day,
});

/** The crew's start date on its own (null clears it). */
export const workStartSchema = z.object({ workStartsOn: z.preprocess(blankToNull, z.string().refine(isCalendarDate, "Choose a date (YYYY-MM-DD)").nullable()) });

export const inspectionScheduleSchema = z.object({ scheduledAt: instant, inspectorName: optionalText(80) });

export const inspectionVisitSchema = z.object({ visitedAt: instant.optional(), findings: optionalText(2000), inspectorName: optionalText(80) });

/** ₹1 crore in paise: a ceiling no single line comes near. */
export const MAX_LINE_PAISE = 1_00_00_000 * 100;

export const quotationLineSchema = z.object({
  item: z.string().trim().min(1, "Name the room or item").max(120, "Use 120 characters or fewer"),
  description: optionalText(500).transform((v) => v ?? null),
  areaSqft: int(0, 1_000_000, "Area").nullable().optional().transform((v) => v ?? null),
  coats: int(0, 10, "Coats").nullable().optional().transform((v) => v ?? null),
  ratePaise: int(0, MAX_LINE_PAISE, "Rate").nullable().optional().transform((v) => v ?? null),
  amountPaise: int(0, MAX_LINE_PAISE, "Amount"),
});

export const quotationSaveSchema = z.object({
  lines: z.array(quotationLineSchema).max(100, "Use 100 lines or fewer"),
  notes: optionalText(2000),
  paymentTerms: optionalText(1000),
  validUntil: day,
});

/** What /admin can do to a quotation's status: send a draft, or record the customer's answer to a sent one. */
export const QUOTATION_ACTIONS = ["sent", "approved", "declined"] as const;
export const quotationStatusSchema = z.object({ status: z.enum(QUOTATION_ACTIONS, { message: "Choose sent, approved or declined" }) });

/** A choice from a fixed list; blank clears it. */
const choice = <T extends readonly [string, ...string[]]>(values: T, message: string) => z.preprocess(blankToNull, z.enum(values, { message }).nullable().optional());
const carpetMessage = `Enter the carpet area in sq ft (${CARPET_AREA_MIN}–${CARPET_AREA_MAX.toLocaleString("en-IN")}), or leave it blank`;

/**
 * What the customer adds to their project in their account (src/lib/projects/details.ts): any of
 * the address and job fields; each one sent replaces what was there, blank clears an optional one.
 * The address and PIN code use the booking form's own checks and messages; the area cannot be cleared.
 * `location` is the address's map pin from the app's map picker.
 */
export const projectDetailsSchema = z
  .object({
    address: addressField.transform((v) => v ?? null),
    pincode: pincodeField.transform((v) => v ?? null),
    locality: z.string().trim().min(2, FIELD_MESSAGES.locality).max(80, "Use 80 characters or fewer").optional(),
    service: choice(serviceTypes, "Choose what needs painting"),
    propertyType: choice(propertyTypes, "Choose a property type"),
    floors: choice(floorOptions, "Choose how many floors"),
    homeSize: choice(homeSizes, "Choose the size of the home"),
    carpetArea: z.preprocess(
      (v) => (v === "" || v === null ? null : typeof v === "string" ? Number(v.replace(/[,\s]/g, "")) : v),
      z.number({ message: carpetMessage }).int("Enter a whole number of sq ft").min(CARPET_AREA_MIN, carpetMessage).max(CARPET_AREA_MAX, carpetMessage).nullable().optional(),
    ),
    preferredDate: z.preprocess(
      blankToNull,
      z
        .string()
        .superRefine((value, ctx) => {
          const { min, max } = bookingDateRange();
          if (!isCalendarDate(value)) ctx.addIssue({ code: "custom", message: "Choose a date from the calendar" });
          else if (value < min) ctx.addIssue({ code: "custom", message: "Choose today or a later date" });
          else if (value > max) ctx.addIssue({ code: "custom", message: "Choose a date within the next year" });
        })
        .nullable()
        .optional(),
    ),
    notes: optionalText(1000),
    /** The map pin for the address (the app's map picker); null removes it. */
    location: z
      .object({
        lat: z.number({ message: "lat must be a number" }).min(-90).max(90),
        lng: z.number({ message: "lng must be a number" }).min(-180).max(180),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .partial()
  .strict();

export type ProjectDetailsInput = z.infer<typeof projectDetailsSchema>;

export type StageChangeInput = z.infer<typeof stageChangeSchema>;
export type QuotationSaveInput = z.infer<typeof quotationSaveSchema>;
