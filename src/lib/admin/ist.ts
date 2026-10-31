// Dates and times as staff enter them in /admin: India time (Asia/Kolkata, UTC+05:30 all year,
// no daylight saving), whatever the browser's or server's clock zone. Plain functions, no server
// imports, shared by the admin forms and their tests.

const INDIA_OFFSET_MS = (5 * 60 + 30) * 60_000;

/** An instant as the India date and time a date and a time input show: { date: "2026-11-04", time: "11:30" }. */
export function toIstParts(at: Date | string): { date: string; time: string } {
  const shifted = new Date(new Date(at).getTime() + INDIA_OFFSET_MS).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

/** An India date and time from the inputs as an ISO date-time with its offset: "2026-11-04T11:30:00+05:30". */
export function fromIstParts(date: string, time: string): string {
  return `${date}T${time}:00+05:30`;
}

/** "4 Nov 2026, 11:30 am" in India time: when something happened, with the year so old entries are clear. */
export function formatIstDateTime(at: Date | string): string {
  return new Date(at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
