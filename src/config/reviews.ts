import { getCity } from "./site";

// What customers say about their jobs, shown on the home page (website and app) as "What customers say".
//
// Only real customers' own words go in `reviews`, with their permission, as they wrote or said them
// (first name and initial, their locality, what was painted and the month the job was handed over).
// Never invent, edit the meaning of or pay for a review: made-up reviews mislead the people deciding
// whom to let into their home, and India's consumer protection rules treat them as misleading ads.
// Until `reviews` has an entry the section is not shown at all, except on a development server,
// where `sampleReviews` stand in (marked "Sample") so the layout can be checked.
//
// No Review or AggregateRating markup: Google ignores a business's reviews of itself on its own site.

export type Review = {
  /** First name and last initial, as the customer agreed to be named ("Ritu S."). */
  name: string;
  /** One of the city's `areas` in src/config/site.ts. */
  locality: string;
  /** A city slug from `cities` in src/config/site.ts (a live one). */
  city: string;
  /** What was painted, in a few words ("2 BHK interior", "front gate and grills"). */
  job: string;
  /** The customer's words: one to three sentences. */
  quote: string;
  /** The month the job was handed over, "YYYY-MM". */
  date: string;
};

export const reviews: Review[] = [];

/** Layout stand-ins for a development server only. Never shown on the live site or in a release build. */
export const sampleReviews: Review[] = [
  {
    name: "Sample customer",
    locality: "Kamla Nagar",
    city: "agra",
    job: "2 BHK interior",
    quote: "Sample review. A real customer's words go here: how the inspection, the itemised quote and the crew went, in one to three sentences.",
    date: "2026-10",
  },
  {
    name: "Sample customer",
    locality: "Krishna Nagar",
    city: "mathura",
    job: "Exterior walls",
    quote: "Sample review. Keep each one as the customer wrote it, with their permission, their locality and the month the job was handed over.",
    date: "2026-09",
  },
  {
    name: "Sample customer",
    locality: "Raman Reti",
    city: "vrindavan",
    job: "Front door and grills",
    quote: "Sample review. The section stays hidden on the live site until src/config/reviews.ts has a real one.",
    date: "2026-08",
  },
];

// Which reviews the "What customers say" section shows (website and app): the real ones, else the
// marked samples on a development server only, else none, and the section is left out.

export type ShownReviews = { items: Review[]; sample: boolean };

export function reviewsToShow(real: Review[] = reviews, dev: boolean = process.env.NODE_ENV === "development"): ShownReviews {
  if (real.length > 0) return { items: real, sample: false };
  return dev ? { items: sampleReviews, sample: true } : { items: [], sample: false };
}

/** "Kamla Nagar, Agra" */
export const reviewPlace = (r: Review) => `${r.locality}, ${getCity(r.city)?.name ?? r.city}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 2026" from "2026-10" (by hand, so the app's engine needs no date locale data) */
export function reviewMonth(date: string): string {
  const [y, m] = date.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}
