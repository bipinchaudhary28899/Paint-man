import { getCity } from "./site";

// What customers say about their jobs, shown on the home page (website and app) as "What customers say".
//
// Only real customers' own words go in `reviews`, with their permission, as they wrote or said them
// (first name and initial, their locality, what was painted and the month the job was handed over).
// Never invent, edit the meaning of or pay for a review: made-up reviews mislead the people deciding
// whom to let into their home, and India's consumer protection rules treat them as misleading ads.
// Until `reviews` has an entry the section is not shown at all, except on a development server and
// in a development build of the app, where `sampleReviews` stand in under a "Sample reviews" notice
// so the layout can be checked with realistic text.
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

/**
 * Layout stand-ins for a development server and development builds only: invented names and words,
 * no real customer. Never shown on the live site or in a release build, and never to be moved into
 * `reviews` (a test fails if one is).
 */
export const sampleReviews: Review[] = [
  {
    name: "Neha S.",
    locality: "Kamla Nagar",
    city: "agra",
    job: "2 BHK interior",
    quote: "The inspector measured every room, and the quote listed each wall with its paint and coats. The crew covered our furniture every morning and left the flat clean each evening.",
    date: "2026-10",
  },
  {
    name: "Rajesh G.",
    locality: "Krishna Nagar",
    city: "mathura",
    job: "Exterior walls",
    quote: "They filled the cracks and treated the damp patch before painting, as the quote said. Nothing was asked in advance, and the work finished on the day they gave us.",
    date: "2026-09",
  },
  {
    name: "Pooja M.",
    locality: "Raman Reti",
    city: "vrindavan",
    job: "Front door and grills",
    quote: "Only the main door and the window grills needed doing, and they took the small job seriously: rust scraped off, primer, then two coats.",
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
