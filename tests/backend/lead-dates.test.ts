import { describe, expect, it } from "vitest";
import { BOOKING_DAYS_AHEAD, bookingDateRange, indiaToday, isCalendarDate } from "@/lib/leads/dates";

describe("booking dates (India time)", () => {
  it("takes today's date in India, not UTC, around midnight", () => {
    // 18:29 UTC is 23:59 in India; 18:30 UTC is already the next day there
    expect(indiaToday(new Date("2026-10-19T18:29:00Z"))).toBe("2026-10-19");
    expect(indiaToday(new Date("2026-10-19T18:30:00Z"))).toBe("2026-10-20");
  });

  it("offers today to a year ahead, across a year end and a leap day", () => {
    expect(bookingDateRange(new Date("2026-12-31T12:00:00Z"))).toEqual({ min: "2026-12-31", max: "2027-12-31" });
    // 2028-02-29 (India) plus 365 days lands on 2029-02-28
    expect(bookingDateRange(new Date("2028-02-29T06:00:00Z"))).toEqual({ min: "2028-02-29", max: "2029-02-28" });
    expect(BOOKING_DAYS_AHEAD).toBe(365);
  });

  it("accepts only real calendar dates written YYYY-MM-DD", () => {
    expect(isCalendarDate("2026-10-19")).toBe(true);
    expect(isCalendarDate("2028-02-29")).toBe(true);
    for (const bad of ["2027-02-29", "2026-02-30", "2026-13-01", "2026-00-10", "19-10-2026", "2026-1-9", "", "0099-01-01"]) {
      expect(isCalendarDate(bad), bad).toBe(false);
    }
  });
});
