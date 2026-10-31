import type { BookingValues } from "./booking";
import type { LatLng } from "./location";

// A booking waiting for its visitor to sign in. "Book my inspection" while signed out keeps the form's
// answers here and opens the login screen; once signed in, the form on that page (still open under
// the login screen, or opened again) takes them back and sends the booking, so nothing typed is lost.
// It lives in memory only (never written to the phone's storage), the login screen lets it go when
// the visitor leaves without signing in, and it is never sent after HOLD_MS (a sign-in takes minutes).

/** The map pin the visitor confirmed: the spot, the short address shown, and whether it is outside our cities. */
export type HeldPin = { coords: LatLng; short: string; outside: boolean };

export type HeldBooking = {
  /** the screen the form is on (the login screen's `next`) */
  path: string;
  values: BookingValues;
  pin?: HeldPin;
};

/** How long a held booking waits for its sign-in: older, it is let go rather than sent unexpectedly later. */
export const HOLD_MS = 15 * 60 * 1000;

let held: (HeldBooking & { at: number }) | null = null;

export function holdBooking(booking: HeldBooking, now = Date.now()): void {
  held = { ...booking, at: now };
}

/** The booking waiting for sign-in, if any (and not yet too old). */
export function heldBooking(now = Date.now()): HeldBooking | null {
  if (held && now - held.at > HOLD_MS) held = null;
  if (!held) return null;
  const { at: _at, ...booking } = held;
  return booking;
}

/** Takes the waiting booking for the screen at `path` (it is then gone), or null. */
export function takeBooking(path: string, now = Date.now()): HeldBooking | null {
  const booking = heldBooking(now);
  if (!booking || booking.path !== path) return null;
  held = null;
  return booking;
}

/** Forgets the waiting booking (the visitor left the login screen without signing in). */
export function releaseBooking(): void {
  held = null;
}
