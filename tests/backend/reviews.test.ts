import { describe, expect, it } from "vitest";
import { reviews, sampleReviews, type Review } from "@/config/reviews";
import { getCity } from "@/config/site";
import { reviewMonth, reviewPlace, reviewsToShow } from "@/config/reviews";

const thisMonth = new Date().toISOString().slice(0, 7);

/** The rules every review keeps, real or sample: a live city and one of its localities, a past month, a short quote. */
function checkReview(r: Review) {
  const city = getCity(r.city);
  expect(city?.status, `${r.name}: ${r.city}`).toBe("live");
  expect(city?.areas, `${r.name}: ${r.locality}`).toContain(r.locality);
  expect(r.date).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  expect(r.date <= thisMonth, `${r.name}: ${r.date} is in the future`).toBe(true);
  expect(r.quote.length).toBeGreaterThanOrEqual(40);
  expect(r.quote.length).toBeLessThanOrEqual(400);
  expect(r.name.length).toBeLessThanOrEqual(30);
  expect(r.job.length).toBeLessThanOrEqual(40);
}

describe("reviews", () => {
  it("are real customers' words: never a sample, never repeated, each with a live locality and a past month", () => {
    for (const r of reviews) {
      checkReview(r);
      expect(r.name).not.toMatch(/sample/i);
      expect(r.quote).not.toMatch(/sample review/i);
    }
    expect(new Set(reviews.map((r) => r.quote)).size).toBe(reviews.length);
  });

  it("samples keep the same rules, and none is ever among the real reviews", () => {
    expect(sampleReviews.length).toBeGreaterThan(0);
    for (const r of sampleReviews) checkReview(r);
    // invented names and words for checking the layout: one copied into `reviews` would pass for a customer
    const isSample = (r: Review) => sampleReviews.some((s) => s.quote === r.quote || (s.name === r.name && s.locality === r.locality && s.date === r.date));
    for (const r of reviews) expect(isSample(r), `${r.name}: a sample, not a customer`).toBe(false);
    expect(isSample(sampleReviews[0])).toBe(true);
  });
});

describe("which reviews show", () => {
  const real: Review[] = [{ name: "Ritu S.", locality: "Dayalbagh", city: "agra", job: "2 BHK interior", quote: "A quote of the right length from a customer about the job.", date: "2026-01" }];

  it("shows real ones whenever there are any, in development or not", () => {
    expect(reviewsToShow(real, false)).toEqual({ items: real, sample: false });
    expect(reviewsToShow(real, true)).toEqual({ items: real, sample: false });
  });

  it("shows the marked samples only on a development server, and nothing on the live site", () => {
    expect(reviewsToShow([], true)).toEqual({ items: sampleReviews, sample: true });
    expect(reviewsToShow([], false)).toEqual({ items: [], sample: false });
    // tests run outside development, like a production build
    expect(reviewsToShow()).toEqual(reviews.length ? { items: reviews, sample: false } : { items: [], sample: false });
  });

  it("names the place and the month the way people say them", () => {
    expect(reviewPlace(real[0])).toBe("Dayalbagh, Agra");
    expect(reviewPlace({ ...real[0], city: "nowhere" })).toBe("Dayalbagh, nowhere");
    expect(reviewMonth("2026-10")).toBe("Oct 2026");
    expect(reviewMonth("2025-01")).toBe("Jan 2025");
  });
});
