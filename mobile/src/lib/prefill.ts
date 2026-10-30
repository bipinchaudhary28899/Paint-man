import { liveCities, serviceTypes } from "~/shared";
import type { BookingValues } from "./booking";

// What the booking form starts with when another screen sends the visitor there (a service, a city
// or a shade). Route params come from deep links too, so only known services and live cities are
// taken, and the note is capped at the form's 1,000 characters.

type Param = string | string[] | undefined;

const first = (p: Param) => (Array.isArray(p) ? p[0] : p)?.trim() ?? "";

export function bookingPrefill(params: { service?: Param; city?: Param; message?: Param }): Partial<BookingValues> {
  const prefill: Partial<BookingValues> = {};
  const service = first(params.service);
  const city = first(params.city);
  const message = first(params.message).slice(0, 1000);
  if ((serviceTypes as readonly string[]).includes(service)) prefill.service = service;
  if (liveCities().some((c) => c.slug === city)) prefill.city = city;
  if (message) prefill.message = message;
  return prefill;
}
