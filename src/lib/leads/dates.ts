// Dates for the booking form's "preferred inspection date". Inspections happen in Agra, so
// "today" is the date in India (Asia/Kolkata, UTC+05:30 all year: India has no daylight saving),
// whatever the server's or the visitor's clock zone. The form and the lead schema share this, so
// the date picker never offers a day the server would refuse.

const INDIA_OFFSET_MS = (5 * 60 + 30) * 60_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** How far ahead a visitor can ask for an inspection. */
export const BOOKING_DAYS_AHEAD = 365;

/** Today's date in India as YYYY-MM-DD. */
export function indiaToday(now: Date = new Date()): string {
  return new Date(now.getTime() + INDIA_OFFSET_MS).toISOString().slice(0, 10);
}

/** True for a real calendar date written YYYY-MM-DD ("2026-02-30" is not one). */
export function isCalendarDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** The first and last dates a visitor can pick, YYYY-MM-DD: today in India to a year ahead. */
export function bookingDateRange(now: Date = new Date()): { min: string; max: string } {
  const min = indiaToday(now);
  const [y, m, d] = min.split("-").map(Number);
  const max = new Date(Date.UTC(y, m - 1, d + BOOKING_DAYS_AHEAD)).toISOString().slice(0, 10);
  return { min, max };
}
