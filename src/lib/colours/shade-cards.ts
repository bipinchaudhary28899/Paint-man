import "server-only";
import { fullTitle, MAX_TITLE_LENGTH } from "@/lib/seo";
import type { Swatch } from "@/components/colours/ShadeSwatches";
import { brandList, hasShadeCardCode, searchBrandShades, shadeCount, shadeFamilies, type BrandShade } from "./brands";

// The brand shade-card pages (/shade-cards, /shade-cards/<brand>, /shade-cards/<brand>/<family>):
// every shade of a brand's card in shade-card order (families light to dark, each family light to
// dark), with the copy built from the data itself so it stays true when PaintDB is refreshed.
// A family with fewer than FAMILY_PAGE_MIN shades gets no page of its own (it would be thin); the
// brand page shows all of its shades instead.

export const FAMILY_PAGE_MIN = 24;
/** Swatches per family on a brand page, spread from the lightest to the darkest. */
export const SAMPLE_SIZE = 12;

/** The names customers say and search ("Berger shade card", "Nerolac shade card"). */
const SHORT_NAMES: Record<string, string> = { "asian-paints": "Asian Paints", berger: "Berger", nerolac: "Nerolac", "nippon-paint": "Nippon Paint" };

export const shadeCardPath = (brand: string, family?: string) => `/shade-cards/${brand}${family ? `/${family}` : ""}`;
/** A shade as a swatch: the code only when it is a real shade-card code. */
export const toSwatch = (s: BrandShade): Swatch => {
  const real = hasShadeCardCode(s);
  return { id: s.id, brand: s.brand, code: real ? s.code : null, query: real ? s.code : s.name, name: s.name, hex: s.hex, lrv: s.lrv };
};
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);
const count = (n: number) => n.toLocaleString("en-IN");

export type ShadeCardFamily = {
  family: string;
  /** "Blue" */
  label: string;
  count: number;
  /** whether /shade-cards/<brand>/<family> exists */
  hasPage: boolean;
  lrv: { min: number; max: number };
  lightest: BrandShade;
  darkest: BrandShade;
  /** the two most common undertones, most common first, in lower case ("cool blue") */
  undertones: string[];
  /** SAMPLE_SIZE shades spread light to dark, or every shade when the family has no page */
  sample: BrandShade[];
};

export type ShadeCard = { slug: string; name: string; shortName: string; count: number; lrv: { min: number; max: number }; families: ShadeCardFamily[] };

/** `n` items spread evenly from first to last (all of them when there are no more than `n`). */
export function spread<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  return Array.from({ length: n }, (_, i) => items[Math.round((i * (items.length - 1)) / (n - 1))]);
}

/** Every shade of one brand's family, in shade-card order. */
export const familyShades = (brand: string, family: string) => searchBrandShades({ brand, family, perPage: shadeCount() }).items;

function topUndertones(shades: BrandShade[]): string[] {
  const tally = new Map<string, number>();
  for (const s of shades) tally.set(s.undertone, (tally.get(s.undertone) ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([u]) => u.toLowerCase());
}

const cards = new Map<string, ShadeCard>();

/** One brand's shade card, or undefined for a brand not in the catalogue. */
export function shadeCard(slug: string): ShadeCard | undefined {
  const cached = cards.get(slug);
  if (cached) return cached;
  const brand = brandList().find((b) => b.slug === slug);
  if (!brand) return undefined;
  const families = shadeFamilies().flatMap((family): ShadeCardFamily[] => {
    const shades = familyShades(slug, family);
    if (!shades.length) return [];
    const byLrv = [...shades].sort((a, b) => b.lrv - a.lrv);
    const hasPage = shades.length >= FAMILY_PAGE_MIN;
    return [{
      family,
      label: capital(family),
      count: shades.length,
      hasPage,
      lrv: { min: byLrv.at(-1)!.lrv, max: byLrv[0].lrv },
      lightest: byLrv[0],
      darkest: byLrv.at(-1)!,
      undertones: topUndertones(shades),
      sample: hasPage ? spread(shades, SAMPLE_SIZE) : shades,
    }];
  });
  const card: ShadeCard = {
    slug,
    name: brand.name,
    shortName: SHORT_NAMES[slug] ?? brand.name,
    count: brand.count,
    lrv: { min: Math.min(...families.map((f) => f.lrv.min)), max: Math.max(...families.map((f) => f.lrv.max)) },
    families,
  };
  cards.set(slug, card);
  return card;
}

export const shadeCards = () => brandList().map((b) => shadeCard(b.slug)!);

/** A family that has its own page, with its brand's card. */
export function shadeCardFamily(brand: string, family: string): { card: ShadeCard; family: ShadeCardFamily } | undefined {
  const card = shadeCard(brand);
  const f = card?.families.find((x) => x.family === family && x.hasPage);
  return card && f ? { card, family: f } : undefined;
}

/** Every page under /shade-cards, for the sitemap. */
export function shadeCardPaths(): string[] {
  return ["/shade-cards", ...shadeCards().flatMap((c) => [shadeCardPath(c.slug), ...c.families.filter((f) => f.hasPage).map((f) => shadeCardPath(c.slug, f.family))])];
}

/** The first title that fits within MAX_TITLE_LENGTH once the site suffix is added. */
export const fitTitle = (...titles: string[]) => titles.find((t) => fullTitle(t).length <= MAX_TITLE_LENGTH) ?? titles.at(-1)!;
/** The first description of 140–155 characters (the length a results page shows in full). */
export const fitDescription = (...texts: string[]) => texts.find((t) => t.length >= 140 && t.length <= 155) ?? texts[0];

export const indexMeta = () => ({
  title: "Shade Cards: Asian Paints, Berger, Nerolac",
  description: `Shade cards of Asian Paints, Berger, Nerolac and Nippon Paint: ${count(shadeCount())} colour codes, light to dark. Shortlist online, see the real card at a free site visit.`,
});

export const cardMeta = (c: ShadeCard) => ({
  title: fitTitle(`${c.shortName} Shade Card: ${count(c.count)} Colour Codes`, `${c.shortName} Shade Card With Colour Codes`),
  description: `All ${count(c.count)} ${c.shortName} shades in shade-card order, light to dark, with code, name and LRV. Shortlist online, then see the real card at a free site visit.`,
});

export const familyMeta = (c: ShadeCard, f: ShadeCardFamily) => ({
  title: fitTitle(`${c.shortName} ${f.label} Shades: ${count(f.count)} Colour Codes`, `${c.shortName} ${f.label} Shades With Codes`),
  description: fitDescription(
    `${count(f.count)} ${c.shortName} ${f.family} shades, light to dark, with code, name and LRV. Shortlist online, then see the real ${c.shortName} card at a free site visit.`,
    `${count(f.count)} ${c.shortName} ${f.family} shades from the card, light to dark, with code, name and LRV. Shortlist online, then see the real card at a free site visit.`,
    `${count(f.count)} ${c.shortName} ${f.family} shades from the shade card, light to dark, with code, name and LRV. Shortlist online, see the real card at a free visit.`,
  ),
});
