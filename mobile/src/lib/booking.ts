import {
  CARPET_AREA_MAX,
  CARPET_AREA_MIN,
  estimatePaintArea,
  liveCities,
  normalizeMobile,
  REQUIRED_FIELDS,
  requiredFieldErrors,
  type City,
  type RequiredField,
} from "~/shared";
import { roundLatLng, type LatLng } from "./location";

// The booking form's data, matching the website's LeadForm: name, mobile and the full address are
// required (plus the city, as we paint in more than one); everything about the job is optional.
// The required-field checks and their messages are the website's own (src/lib/leads/field-checks.ts).

export type BookingValues = {
  name: string;
  phone: string;
  address: string;
  city: string;
  locality: string;
  pincode: string;
  service: string;
  propertyType: string;
  floors: string;
  homeSize: string;
  carpetArea: string;
  preferredDate: string;
  message: string;
};

export type BookingField = keyof BookingValues;

const BLANK: BookingValues = {
  name: "",
  phone: "",
  address: "",
  city: "",
  locality: "",
  pincode: "",
  service: "",
  propertyType: "",
  floors: "",
  homeSize: "",
  carpetArea: "",
  preferredDate: "",
  message: "",
};

export const emptyBooking = (prefill: Partial<BookingValues> = {}): BookingValues => ({ ...BLANK, ...prefill });

/** Fields under "Add more details": an error in one of them opens the section. */
export const DETAIL_FIELDS: readonly BookingField[] = ["service", "propertyType", "floors", "homeSize", "carpetArea", "preferredDate", "message"];

/** The form-level line shown with field errors, as on the website. */
export const FORM_ERROR = "Please check the highlighted fields.";

/** The required fields in the order the form shows them; the city only when more than one city is live. */
export function bookingRequiredFields(live: readonly City[] = liveCities()): RequiredField[] {
  const fields: RequiredField[] = [...REQUIRED_FIELDS.booking];
  if (live.length > 1) fields.splice(fields.indexOf("locality"), 0, "city");
  return fields;
}

const sqftRange = `Enter the carpet area in sq ft (${CARPET_AREA_MIN}–${CARPET_AREA_MAX.toLocaleString("en-IN")}), or leave it blank`;

/**
 * The carpet area is optional; when given it must be a whole number of sq ft in range. Same rule and
 * wording as the website's booking schema (src/lib/leads/schema.ts), which the server applies.
 */
export function carpetAreaProblem(value: string): string | undefined {
  const raw = value.replace(/[,\s]/g, "");
  if (raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return sqftRange;
  if (!Number.isInteger(n)) return "Enter a whole number of sq ft";
  return n < CARPET_AREA_MIN || n > CARPET_AREA_MAX ? sqftRange : undefined;
}

/** Every field that needs fixing, with its message. */
export function validateBooking(values: BookingValues, live: readonly City[] = liveCities()): Partial<Record<BookingField, string>> {
  const errors: Partial<Record<BookingField, string>> = requiredFieldErrors("booking", values, bookingRequiredFields(live));
  const carpet = carpetAreaProblem(values.carpetArea);
  if (carpet) errors.carpetArea = carpet;
  return errors;
}

/** The rough size of the job as the visitor fills in floors, service and carpet area (LeadForm's live estimate). */
export function jobEstimate(values: Pick<BookingValues, "carpetArea" | "floors" | "service">) {
  const carpet = Number(values.carpetArea.replace(/[,\s]/g, ""));
  const hasCarpet = values.carpetArea.trim() !== "" && Number.isInteger(carpet) && carpet >= CARPET_AREA_MIN && carpet <= CARPET_AREA_MAX;
  const area = hasCarpet ? estimatePaintArea(carpet, values.floors || "1", values.service) : null;
  return { area, hasCarpet, measuredOnSite: hasCarpet && area === null };
}

/**
 * The JSON a booking endpoint would receive: the website's booking fields, cleaned the way its
 * schema cleans them, with blank optional answers left out. With one live city the form asks for
 * none and the booking is for that city. `location` is the spot the visitor pinned on the map (kept
 * in the form's state, not in its text fields), sent to 6 decimals and only when there is one.
 */
export function toBookingPayload(values: BookingValues, live: readonly City[] = liveCities(), location?: LatLng) {
  const optional = (v: string) => v.trim() || undefined;
  const carpet = values.carpetArea.replace(/[,\s]/g, "");
  return {
    type: "booking" as const,
    name: values.name.trim(),
    phone: normalizeMobile(values.phone),
    address: values.address.trim(),
    locality: values.locality.trim(),
    pincode: values.pincode.replace(/\s/g, ""),
    city: live.length === 1 ? live[0].slug : values.city,
    service: optional(values.service),
    propertyType: optional(values.propertyType),
    floors: optional(values.floors),
    homeSize: optional(values.homeSize),
    carpetArea: carpet ? Number(carpet) : undefined,
    preferredDate: optional(values.preferredDate),
    message: optional(values.message),
    ...(location ? { location: roundLatLng(location) } : {}),
    page: "app",
  };
}

export type SubmitResult = { ok: true; sent: boolean } | { ok: false; errors: Partial<Record<BookingField, string>>; message: string };

/**
 * Whether bookings leave the phone. The website's /api/leads accepts same-origin requests only, so
 * the app needs its own endpoint (POST /api/v1/bookings, proposed in mobile/README.md). Until the
 * owner approves and it is built, submitting checks the booking exactly as the website would and
 * reports it as not sent: nothing is transmitted or stored.
 */
export const BOOKINGS_ARE_SENT = false;

export async function submitBooking(values: BookingValues, live: readonly City[] = liveCities()): Promise<SubmitResult> {
  const errors = validateBooking(values, live);
  if (Object.keys(errors).length > 0) return { ok: false, errors, message: FORM_ERROR };
  return { ok: true, sent: BOOKINGS_ARE_SENT };
}
