import { z } from "zod";

import { bookingDateRange, isCalendarDate } from "./dates";
import { FIELD_MESSAGES, MOBILE_PATTERN, normalizeMobile, PINCODE_PATTERN } from "./field-checks";
import { cities, homeCity, liveCities } from "@/config/site";
import { CARPET_AREA_MAX, CARPET_AREA_MIN, floorOptions, homeSizes, propertyTypes, serviceTypes } from "./options";

export { floorOptions, homeSizes, propertyTypes, serviceTypes };

const indianMobile = z
  .string()
  .transform(normalizeMobile)
  .refine((v) => MOBILE_PATTERN.test(v), FIELD_MESSAGES.phone);

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
  name: trimmed(80).min(2, FIELD_MESSAGES.name),
  phone: indianMobile,
  website: z.string().max(0).optional(),
  page: trimmed(300).optional(),
  tracking,
};

/** A select left on "Select" sends "": the same as not answering. */
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalChoice = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.preprocess(blankToUndefined, z.enum(values, { message }).optional());

/** Cities a booking can be for: the live ones. */
export const liveCitySlugs = liveCities().map((c) => c.slug) as [string, ...string[]];

/**
 * The booking form: name, mobile and the full address are required; everything about the job
 * (what to paint, the property, its size, a date, a note) sits under "Add more details" and is
 * optional, so a single wall or a door is as quick to book as a whole house.
 */
export const bookingSchema = z.object({
  type: z.literal("booking"),
  ...common,
  address: trimmed(200).min(5, FIELD_MESSAGES.address),
  locality: trimmed(80).min(2, FIELD_MESSAGES.locality),
  pincode: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\s/g, "") : v),
    z.string({ message: FIELD_MESSAGES.pincode }).regex(PINCODE_PATTERN, FIELD_MESSAGES.pincode),
  ),
  // one live city today, so the form sends none and the booking is for that city
  city: z.preprocess((v) => blankToUndefined(v) ?? homeCity.slug, z.enum(liveCitySlugs, { message: "Choose your city" })),
  propertyType: optionalChoice(propertyTypes, "Choose a property type"),
  service: optionalChoice(serviceTypes, "Choose what needs painting"),
  preferredDate,
  message: trimmed(1000).optional(),
  // job size, so a crew can be planned before the visit
  floors: optionalChoice(floorOptions, "Choose how many floors"),
  homeSize: optionalChoice(homeSizes, "Choose the size of the home"),
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
  message: trimmed(1000).min(5, FIELD_MESSAGES.message),
});

/** City slugs a quick site-visit request can name (live cities book a visit; "soon" cities join the waitlist). */
export const citySlugs = cities.map((c) => c.slug) as [string, ...string[]];

/**
 * The quick "Book site visit" form (home page hero, city pages): name, mobile and city, plus an
 * optional locality. The team takes the job details on the call. For a city that is not live yet
 * the same request is a waitlist entry.
 */
export const visitSchema = z.object({
  type: z.literal("visit"),
  ...common,
  city: z.enum(citySlugs, { message: "Choose your city" }),
  locality: z.preprocess((v) => (typeof v === "string" ? v.trim() || undefined : v), trimmed(80).optional()),
});

export const leadSchema = z.discriminatedUnion("type", [bookingSchema, contactSchema, visitSchema]);

export type LeadInput = z.infer<typeof leadSchema>;
