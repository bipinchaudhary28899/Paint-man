import { liveCities, normalizeMobile, requiredFieldErrors, type City } from "~/shared";
import { ApiError, BAD_RESPONSE_MESSAGE, type ApiEnvelope, type ApiRequestInit } from "./api";
import { FORM_ERROR, toBookingPayload, validateBooking, type BookingField, type BookingValues } from "./booking";
import type { LatLng } from "./location";

// The website has one lead form (LeadForm) in two kinds: booking, and contact (the contact page, and
// the waitlist note on a city coming soon). Both check their answers exactly as the website does.
// A booking is sent to POST /api/v1/bookings with the visitor's session (a verified mobile number):
// signed out, the form asks them to sign in first and then sends it. The website's /api/leads accepts
// same-origin requests only and there is no app endpoint for contact messages yet, so a contact
// request is checked and reported as not sent: nothing is transmitted or stored.

/** Which forms leave the phone: bookings (once signed in), not contact messages (no app endpoint yet). */
export const LEADS_ARE_SENT = { booking: true, contact: false } as const;

export type SubmitResult =
  | { ok: true; sent: boolean; projectId?: string }
  | { ok: false; errors: Partial<Record<BookingField, string>>; message: string; signIn?: false }
  /** the visitor must sign in first (no session, or it expired) */
  | { ok: false; signIn: true };

/** An /api/v1 call with the session's bearer token (useAuth().request); it throws a 401 ApiError when signed out. */
export type AuthedRequest = <T>(path: string, init?: Omit<ApiRequestInit, "token">) => Promise<ApiEnvelope<T>>;

const BOOKING_FIELDS: readonly string[] = ["name", "phone", "address", "city", "locality", "pincode", "service", "propertyType", "floors", "homeSize", "carpetArea", "preferredDate", "message"];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * What the form shows for a booking the API refused: the API's message for each form field it names
 * (the website's own words, such as "Use the mobile number you signed in with (******3210)") with the
 * form's line, or the API's one message (rate limited with the wait, unavailable, offline).
 */
export function bookingErrors(err: unknown): { errors: Partial<Record<BookingField, string>>; message: string } {
  if (!(err instanceof ApiError)) return { errors: {}, message: BAD_RESPONSE_MESSAGE };
  const errors: Partial<Record<BookingField, string>> = {};
  if (err.code === "invalid_request" && isRecord(err.details)) {
    for (const [field, message] of Object.entries(err.details)) {
      if (BOOKING_FIELDS.includes(field) && typeof message === "string") errors[field as BookingField] = message;
    }
  }
  return Object.keys(errors).length > 0 ? { errors, message: FORM_ERROR } : { errors: {}, message: err.message };
}

type BookingOptions = {
  live?: readonly City[];
  /** the spot pinned on the map, sent as the booking's `location` */
  location?: LatLng;
  request: AuthedRequest;
};

/** Checks the booking as the website does, then sends it with the session; signed out, asks for sign-in. */
export async function submitBooking(values: BookingValues, { live = liveCities(), location, request }: BookingOptions): Promise<SubmitResult> {
  const errors = validateBooking(values, live);
  if (Object.keys(errors).length > 0) return { ok: false, errors, message: FORM_ERROR };
  try {
    const res = await request<{ received?: boolean; projectId?: unknown }>("/api/v1/bookings", { method: "POST", body: toBookingPayload(values, live, location) });
    const projectId = res.data?.projectId;
    return { ok: true, sent: true, projectId: typeof projectId === "string" ? projectId : undefined };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { ok: false, signIn: true };
    return { ok: false, ...bookingErrors(err) };
  }
}

export type ContactValues = { name: string; phone: string; message: string };

/** Checks a contact request as the website does; it is not sent (no app endpoint for messages yet). */
export async function submitContact(values: ContactValues): Promise<SubmitResult> {
  const errors = requiredFieldErrors("contact", values);
  if (Object.keys(errors).length > 0) return { ok: false, errors, message: FORM_ERROR };
  return { ok: true, sent: LEADS_ARE_SENT.contact };
}

/** The JSON a contact request would send (cleaned as the website's schema cleans it). */
export const toContactPayload = (values: ContactValues) => ({
  type: "contact" as const,
  name: values.name.trim(),
  phone: normalizeMobile(values.phone),
  message: values.message.trim(),
  page: "app",
});

export { FORM_ERROR, type BookingValues };
