import "server-only";
import { paintdb, shadeCount } from "./brands";
import { FAMILY_PAGE_MIN, SAMPLE_SIZE, shadeCardPath, shadeCards, toSwatch, type ShadeCard, type ShadeCardFamily } from "./shade-cards";

// The brand shade cards as JSON (/api/v1/colours/shade-cards...): the same cards, counts and copy
// facts the /shade-cards pages are built from (src/lib/colours/shade-cards.ts), shaped for the API
// envelope so the app and other integrations show what the pages show without the 8,500-shade data.

const shadeRef = ({ id, code, name, hex, lrv }: { id: string; code: string; name: string; hex: string; lrv: number }) => ({ id, code, name, hex, lrv });

/** One family's facts: counts, LRV range, lightest and darkest shade, the two common undertones and a representative swatch. */
export function familySummary(card: ShadeCard, f: ShadeCardFamily) {
  return {
    family: f.family,
    label: f.label,
    count: f.count,
    hasPage: f.hasPage,
    lrv: f.lrv,
    lightest: shadeRef(f.lightest),
    darkest: shadeRef(f.darkest),
    undertones: f.undertones,
    /** the middle shade of the family's spread, as the pages colour its chip and strip */
    swatch: f.sample[Math.floor(f.sample.length / 2)].hex,
    links: {
      html: f.hasPage ? shadeCardPath(card.slug, f.family) : `${shadeCardPath(card.slug)}#${f.family}`,
      ...(f.hasPage && { self: `/api/v1/colours/shade-cards/${card.slug}/${f.family}` }),
    },
  };
}

/** A brand's card without its swatches. */
export function cardSummary(card: ShadeCard) {
  return {
    slug: card.slug,
    name: card.name,
    shortName: card.shortName,
    count: card.count,
    lrv: card.lrv,
    families: card.families.map((f) => familySummary(card, f)),
    links: { self: `/api/v1/colours/shade-cards/${card.slug}`, html: shadeCardPath(card.slug) },
  };
}

/** A brand's card with each family's swatches: SAMPLE_SIZE spread light to dark, or all of a family that has no page. */
export function cardWithSamples(card: ShadeCard) {
  const summary = cardSummary(card);
  return { ...summary, families: card.families.map((f, i) => ({ ...summary.families[i], sample: f.sample.map(toSwatch) })) };
}

/** The licence fields PaintDB's CC BY 4.0 asks for, sent in every response's meta. */
export const creditMeta = () => ({ source: paintdb.source, license: paintdb.license, licenseUrl: paintdb.licenseUrl, attribution: paintdb.attribution, note: paintdb.note });

/** The facts every shade-card response's meta carries. */
export const cardsMeta = () => ({ catalogueSize: shadeCount(), familyPageMin: FAMILY_PAGE_MIN, sampleSize: SAMPLE_SIZE, ...creditMeta() });

/** The brand slugs with a card, the hint for an unknown brand. */
export const cardSlugs = () => shadeCards().map((c) => c.slug);

/** At most 40 characters of a path segment, for echoing it in an error message. */
export const echo = (s: string) => s.slice(0, 40);
