import { describe, expect, it } from "vitest";
import { crewEstimate, estimatePaintArea, floorCount, formatSqft } from "@/lib/leads/estimate";

describe("job size estimate", () => {
  it("counts floors, with 4+ as 4", () => {
    expect([floorCount("1"), floorCount("3"), floorCount("4+"), floorCount("")]).toEqual([1, 3, 4, 1]);
  });

  it("estimates interior walls + ceilings at 3.5× carpet area per floor, rounded to 10 sq ft", () => {
    expect(estimatePaintArea(1200, "2", "Interior Painting")).toBe(8400);
    expect(estimatePaintArea(853, "1", "Rental Property")).toBe(2990);
    expect(estimatePaintArea(1000, "4+", "Interior + Exterior")).toBe(14000);
  });

  it("does not guess without a carpet area or for exterior-only jobs", () => {
    expect(estimatePaintArea(undefined, "2", "Interior Painting")).toBeNull();
    expect(estimatePaintArea(0, "2", "Interior Painting")).toBeNull();
    expect(estimatePaintArea(1200, "2", "Exterior Painting")).toBeNull();
  });

  it("turns an area into painter-days and a crew for about a week", () => {
    expect(crewEstimate(8400)).toEqual({ painterDays: 84, painters: 8, days: 11 });
    expect(crewEstimate(2990)).toEqual({ painterDays: 30, painters: 5, days: 6 });
    expect(crewEstimate(300)).toEqual({ painterDays: 3, painters: 2, days: 2 });
    expect(crewEstimate(0).painterDays).toBe(1);
  });

  it("formats square feet the Indian way", () => {
    expect(formatSqft(140000)).toBe("1,40,000 sq ft");
  });
});
