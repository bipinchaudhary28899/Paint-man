import { curatedColours, type Colour } from "@/config/colours";
import { site } from "@/config/site";
import { familyPhrase } from "./guide";

// Search metadata for a shade's page (/colours/PM-502). Built from whole clauses so nothing is
// cut mid-word, and tested over the whole catalogue: titles fit the root template's
// " | Paint Man" suffix within 60 characters, descriptions land in 140–155 characters and only
// promise what the page shows (one living-room preview, the nearest brand codes).

const curatedCodes = new Set(curatedColours.map((c) => c.code));

/**
 * Only the 32 curated shades (inspector notes, pairings, palettes, brand matches) are indexed.
 * The generated ladder stays live and linked, with `noindex, follow`, until each has its own copy.
 */
export const isIndexableShade = (code: string) => curatedCodes.has(code);

/** The shades that belong in the sitemap. */
export const indexableColours = (): Colour[] => curatedColours.filter((c) => isIndexableShade(c.code));

/** The root layout's title template adds this to every page title. */
export const TITLE_SUFFIX = ` | ${site.name}`;
export const TITLE_MAX = 60;

/** "Sage Mist (PM-502) Wall Paint Colour", shortened if the full title would pass 60 characters. */
export function colourTitle(c: Pick<Colour, "name" | "code">): string {
  const options = [`${c.name} (${c.code}) Wall Paint Colour`, `${c.name} (${c.code}) Paint Colour`, `${c.name} (${c.code})`];
  const fit = options.find((t) => t.length + TITLE_SUFFIX.length <= TITLE_MAX);
  if (!fit) throw new Error(`No title of ${TITLE_MAX} characters or fewer for ${c.code}`);
  return fit;
}

/** The finder hub, /colours. */
export const finderTitle = (city: string = site.city) => `Wall Colour Finder & Shade Codes in ${city}`;
/** Counts stay modest on purpose: the brand data has 50,762 shades from 25 brands, so "50,000+" and three named brands. */
export const finderDescription = (shades: number, city: string = site.city) =>
  `Search ${shades} Paint Man shades and 50,000+ brand shades incl. Asian Paints, Berger and Nerolac on one room wall. We bring the shade card to your ${city} home.`;

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/**
 * "Sage Mist (PM-502) is a green wall paint colour for bedroom and living room walls. See it on a
 * living room wall. We bring the shade card to your Agra home." One benefit (the preview, or the
 * brand matches, that the page shows) and one proof (the shade card brought to the home). Rooms
 * leave out "Rental refresh"; the LRV goes in when there is room for it.
 */
export function colourDescription(c: Pick<Colour, "name" | "code" | "family" | "lrv" | "rooms">, city: string = site.city): string {
  const rooms = c.rooms.filter((r) => r !== "Rental refresh").map((r) => r.toLowerCase());
  const opener = (n: number, lrv: boolean) =>
    `${c.name} (${c.code}) is ${familyPhrase(c)} wall paint colour${lrv ? `, LRV ${c.lrv},` : ""}${rooms.length ? ` for ${list(rooms.slice(0, n))} walls` : ""}.`;
  // richest first; the first combination that lands in 140-155 characters wins
  const benefits = [
    " Compare its closest Asian Paints, Berger and Nerolac codes.",
    " See it on a living room wall with its closest brand codes.",
    " See it on a living room wall.",
    " Preview it on a room wall.",
  ];
  const proofs = [
    ` Our inspector brings the real shade card to your home in ${city}.`,
    ` We bring the shade card to your home in ${city}.`,
    ` We bring the shade card to your ${city} home.`,
    ` Shade card brought to your ${city} home.`,
  ];
  for (const n of [3, 2, 1]) for (const b of benefits) for (const lrv of [true, false]) for (const p of proofs) {
    const s = `${opener(n, lrv)}${b}${p}`;
    if (s.length >= 140 && s.length <= 155) return s;
  }
  throw new Error(`No 140-155 character description for ${c.code}`);
}
