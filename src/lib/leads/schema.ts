import { z } from "zod";

import { bookingDateRange, isCalendarDate } from "./dates";
import { CARPET_AREA_MAX, CARPET_AREA_MIN, floorOptions, homeSizes, propertyTypes, serviceTypes } from "./options";

export { floorOptions, homeSizes, propertyTypes, serviceTypes };

const indianMobile = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number");

const trimmed = (max: number) => z.string().trim().max(max);

/** The problem with a preferred inspection date, if any: it must be a real date from today (in India) to a year ahead. */
function dateProblem(value: string): string | undefined {
  if (!isCalendarDate(value)) return "Choose a date from the calendar";
  const { min, max } = bookingDateRange();
  if (value < min) return "Choose today or a later date";
  if (value > max) return "Choose a date within the next year";
  return undefined;
}

// Optional: left blank (or not sent), the team agrees a date on the call.
const preferredDate = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v),
  z
    .string()
    .superRefine((value, ctx) => {
      const problem = dateProblem(value);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    })
    .optional(),
);

const tracking = z
  .object({
    utmSource: trimmed(100).optional(),
    utmMedium: trimmed(100).optional(),
    utmCampaign: trimmed(150).optional(),
    landingPage: trimmed(300).optional(),
    referrer: trimmed(300).optional(),
  })
  .partial()
  .optional();

// `website` is a honeypot: real users never see or fill it.
const common = {
  name: trimmed(80).min(2, "Enter your name"),
  phone: indianMobile,
  website: z.string().max(0).optional(),
  page: trimmed(300).optional(),
  tracking,
};

export const bookingSchema = z.object({
  type: z.literal("booking"),
  ...common,
  locality: trimmed(80).min(2, "Enter your locality"),
  propertyType: z.enum(propertyTypes, { message: "Choose a property type" }),
  service: z.enum(serviceTypes, { message: "Choose a service" }),
  preferredDate,
  message: trimmed(1000).optional(),
  // job size, so a crew can be planned before the visit
  floors: z.enum(floorOptions, { message: "Choose how many floors" }),
  homeSize: z.enum(homeSizes, { message: "Choose the size of the home" }),
  carpetArea: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : typeof v === "string" ? Number(v.replace(/[,\s]/g, "")) : v),
    z
      .number({ message: `Enter the carpet area in sq ft (${CARPET_AREA_MIN}–${CARPET_AREA_MAX.toLocaleString("en-IN")}), or leave it blank` })
      .int(`Enter a whole number of sq ft`)
      .min(CARPET_AREA_MIN, `Enter the carpet area in sq ft (${CARPET_AREA_MIN}–${CARPET_AREA_MAX.toLocaleString("en-IN")}), or leave it blank`)
      .max(CARPET_AREA_MAX, `Enter the carpet area in sq ft (${CARPET_AREA_MIN}–${CARPET_AREA_MAX.toLocaleString("en-IN")}), or leave it blank`)
      .optional(),
  ),
});

export const contactSchema = z.object({
  type: z.literal("contact"),
  ...common,
  message: trimmed(1000).min(5, "Tell us a little about what you need"),
});

export const leadSchema = z.discriminatedUnion("type", [bookingSchema, contactSchema]);

export type LeadInput = z.infer<typeof leadSchema>;
