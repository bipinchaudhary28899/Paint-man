import { liveCities, normalizeMobile, requiredFieldErrors, type City } from "~/shared";
import { ApiError, apiRequest, BAD_RESPONSE_MESSAGE, type ApiEnvelope, type ApiRequestInit } from "./api";
import { FORM_ERROR, toBookingPayload, validateBooking, type BookingField, type BookingValues } from "./booking";
import type { LatLng } from "./location";

// The website has one lead form (LeadForm) in two kinds: booking, and contact (the contact page, and
// the waitlist note on a city coming soon). Both check their answers exactly as the website does.
// A booking is sent to POST /api/v1/bookings with the visitor's session (a verified mobile number).
// Signed out, it is sent without one: while customer accounts are coming soon the API takes it by the
// number given, as the website's form does; once they are open the API answers 401 and the form asks
// the visitor to sign in first and then sends it. A contact message (and a city's waitlist, which
// is one) goes to POST /api/v1/messages, no account needed, and is saved as the website's contact
// form saves it.

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
 * What the form shows for a booking or a message the API refused: the API's message for each form field it names
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
  /** a call without the session, for a signed-out booking (apiRequest) */
  send?: typeof apiRequest;
};

/** Checks the booking as the website does, then sends it with the session; signed out, without it (or asks for sign-in). */
export async function submitBooking(values: BookingValues, { live = liveCities(), location, request, send = apiRequest }: BookingOptions): Promise<SubmitResult> {
  const errors = validateBooking(values, live);
  if (Object.keys(errors).length > 0) return { ok: false, errors, message: FORM_ERROR };
  const body = toBookingPayload(values, live, location);
  try {
    return booked(await request<Booked>("/api/v1/bookings", { method: "POST", body }));
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 401)) return { ok: false, ...bookingErrors(err) };
  }
  // no session (or it expired): booked by the number while accounts are coming soon, else a 401 asks for sign-in
  try {
    return booked(await send<Booked>("/api/v1/bookings", { method: "POST", body }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return { ok: false, signIn: true };
    return { ok: false, ...bookingErrors(err) };
  }
}

type Booked = { received?: boolean; projectId?: unknown };

/** A booking the API took: its project id when it went into the visitor's account. */
function booked(res: ApiEnvelope<Booked>): SubmitResult {
  const projectId = res.data?.projectId;
  return { ok: true, sent: true, projectId: typeof projectId === "string" ? projectId : undefined };
}

export type ContactValues = { name: string; phone: string; message: string };

type ContactOptions = {
  /** the screen it was sent from (the website sends its page's path) */
  page?: string;
  /** the call that sends it (apiRequest) */
  send?: typeof apiRequest;
};

/** Checks a contact message as the website does, then sends it; the API's words for anything that stops it. */
export async function submitContact(values: ContactValues, { page, send = apiRequest }: ContactOptions = {}): Promise<SubmitResult> {
  const errors = requiredFieldErrors("contact", values);
  if (Object.keys(errors).length > 0) return { ok: false, errors, message: FORM_ERROR };
  try {
    await send("/api/v1/messages", { method: "POST", body: toContactPayload(values, page) });
    return { ok: true, sent: true };
  } catch (err) {
    return { ok: false, ...bookingErrors(err) };
  }
}

/** The JSON a contact message sends (cleaned as the website's schema cleans it). */
export const toContactPayload = (values: ContactValues, page = "app") => ({
  type: "contact" as const,
  name: values.name.trim(),
  phone: normalizeMobile(values.phone),
  message: values.message.trim(),
  page,
});

export { FORM_ERROR, type BookingValues };
