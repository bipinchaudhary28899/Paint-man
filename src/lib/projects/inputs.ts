import { z } from "zod";
import { isCalendarDate } from "@/lib/leads/dates";
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

export type StageChangeInput = z.infer<typeof stageChangeSchema>;
export type QuotationSaveInput = z.infer<typeof quotationSaveSchema>;
