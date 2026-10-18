import "server-only";
import raw from "@/data/paintdb.json";

// Brand paint shades: 50,000+ real shades from 25 paint brands (Asian Paints, Berger, Nerolac,
// Dulux, Sherwin-Williams…), from PaintDB's open dataset (CC BY 4.0), vendored as
// src/data/paintdb.json by scripts/import-paintdb.mjs. Searched in memory on the server; the
// browser only ever sees one page of results through /api/v1/colours/paint.

type Raw = {
  source: string;
  license: string;
  licenseUrl: string;
  attribution: string;
  note: string;
  generatedAt: string;
  brands: { slug: string; name: string }[];
  families: string[];
  undertones: string[];
  shades: [number, string, string, string, number, number, number, number][];
};
const data = raw as unknown as Raw;

export const paintdb = {
  source: data.source,
  license: data.license,
  licenseUrl: data.licenseUrl,
  attribution: data.attribution,
  note: data.note,
  updated: data.generatedAt,
};

export type BrandShade = {
  /** `brand-slug:code`, stable and URL-safe once encoded */
  id: string;
  brand: string;
  brandName: string;
  code: string;
  name: string;
  hex: string;
  lrv: number;
  family: string;
  undertone: string;
  interior: boolean;
  exterior: boolean;
};

/** Indian brands first (our customers ask for these by code), then A–Z. */
const BRAND_FIRST = ["asian-paints", "berger", "nerolac"];
const brandRank = (slug: string) => {
  const i = BRAND_FIRST.indexOf(slug);
  return i < 0 ? BRAND_FIRST.length : i;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

let cache: { shades: BrandShade[]; keys: { code: string; name: string; words: string[] }[] } | null = null;
function load() {
  if (cache) return cache;
  const order = data.shades
    .map((s, i) => ({ s, i }))
    .sort((a, b) => brandRank(data.brands[a.s[0]].slug) - brandRank(data.brands[b.s[0]].slug) || a.s[0] - b.s[0] || a.i - b.i);
  const shades = order.map(({ s: [b, code, name, hex, lrv, f, u, where] }) => {
    const brand = data.brands[b];
    return {
      id: `${brand.slug}:${code}`,
      brand: brand.slug,
      brandName: brand.name,
      code,
      name,
      hex: `#${hex}`,
      lrv,
      family: data.families[f],
      undertone: data.undertones[u],
      interior: (where & 1) === 1,
      exterior: (where & 2) === 2,
    };
  });
  const keys = shades.map((s) => ({ code: norm(s.code), name: s.name.toLowerCase(), words: s.name.toLowerCase().split(/[\s\-/&,.'()]+/).filter(Boolean) }));
  cache = { shades, keys };
  return cache;
}

export const shadeCount = () => data.shades.length;

/** Brands with shade counts, Indian brands first. */
export function brandList() {
  const counts = new Map<number, number>();
  for (const s of data.shades) counts.set(s[0], (counts.get(s[0]) ?? 0) + 1);
  return data.brands
    .map((b, i) => ({ slug: b.slug, name: b.name, count: counts.get(i) ?? 0 }))
    .sort((a, b) => brandRank(a.slug) - brandRank(b.slug) || a.name.localeCompare(b.name));
}

/** Colour families in the data, in a light-to-dark, warm-to-cool reading order. */
export function shadeFamilies(): string[] {
  const order = ["white", "beige", "yellow", "orange", "pink", "red", "purple", "blue", "green", "gray", "brown", "black"];
  return [...data.families].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
}

export const isBrand = (s: unknown): s is string => typeof s === "string" && data.brands.some((b) => b.slug === s);
export const isShadeFamily = (s: unknown): s is string => typeof s === "string" && data.families.includes(s);

/** One shade by `brand-slug:code` (code compared without spaces or case). */
export function getBrandShade(id: string): BrandShade | undefined {
  const at = id.indexOf(":");
  if (at < 1) return undefined;
  const brand = id.slice(0, at), code = norm(id.slice(at + 1));
  if (!code) return undefined;
  const { shades, keys } = load();
  const i = shades.findIndex((s, j) => s.brand === brand && keys[j].code === code);
  return i < 0 ? undefined : shades[i];
}

/**
 * Pulls a brand name from the start of a query ("asian paints 7982", "Berger 3P0050",
 * "nerolac light plum"), so customers can type what is printed on a shade card.
 */
export function splitBrand(q: string): { brand?: string; rest: string } {
  const lower = q.trim().toLowerCase();
  const candidates = data.brands.flatMap((b) => {
    const names = [b.name.toLowerCase(), b.slug.replace(/-/g, " ")];
    if (b.slug === "nerolac") names.push("nerolac");
    if (b.slug === "berger") names.push("berger");
    if (b.slug === "asian-paints") names.push("asian");
    return names.map((n) => ({ slug: b.slug, n }));
  });
  // longest name first, so "dulux australia" wins over "dulux"
  for (const { slug, n } of candidates.sort((a, b) => b.n.length - a.n.length)) {
    if (lower === n || lower.startsWith(`${n} `)) return { brand: slug, rest: lower.slice(n.length).trim() };
  }
  return { rest: q.trim() };
}

const hexRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export type BrandQuery = { q?: string; brand?: string; family?: string; page?: number; perPage?: number };

/**
 * Searches the brand shades. A hex finds the nearest shades; otherwise matches rank as: exact
 * code, code prefix, exact name, name prefix, a word starting with the query, name contains,
 * code contains. Brand and family narrow the set; with no query the brand order is kept.
 */
export function searchBrandShades({ q = "", brand, family, page = 1, perPage = 60 }: BrandQuery) {
  const { shades, keys } = load();
  const split = brand ? { rest: q.trim() } : splitBrand(q);
  const inBrand = brand ?? split.brand;
  const rest = split.rest;

  let idx: number[] = [];
  for (let i = 0; i < shades.length; i++) {
    if (inBrand && shades[i].brand !== inBrand) continue;
    if (family && shades[i].family !== family) continue;
    idx.push(i);
  }

  const hex = /^#?[0-9a-f]{6}$/i.test(rest) ? `#${rest.replace(/^#/, "").toLowerCase()}` : null;
  if (hex) {
    const [r, g, b] = hexRgb(hex);
    const dist = (i: number) => {
      const [r2, g2, b2] = hexRgb(shades[i].hex);
      // weighted RGB distance (cheap, close to perceived difference for paint colours)
      return 2 * (r - r2) ** 2 + 4 * (g - g2) ** 2 + 3 * (b - b2) ** 2;
    };
    idx = idx.map((i) => [i, dist(i)] as const).sort((a, b) => a[1] - b[1]).map(([i]) => i);
  } else if (rest) {
    const nq = norm(rest), lq = rest.toLowerCase();
    const rank = (i: number) => {
      const k = keys[i];
      if (nq && k.code === nq) return 0;
      if (nq && k.code.startsWith(nq)) return 1;
      if (k.name === lq) return 2;
      if (k.name.startsWith(lq)) return 3;
      if (k.words.some((w) => w.startsWith(lq))) return 4;
      if (k.name.includes(lq)) return 5;
      if (nq && k.code.includes(nq)) return 6;
      return -1;
    };
    idx = idx
      .map((i) => [i, rank(i)] as const)
      .filter(([, r]) => r >= 0)
      .sort((a, b) => a[1] - b[1] || a[0] - b[0])
      .map(([i]) => i);
  }

  const total = idx.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page), pages);
  return { items: idx.slice((p - 1) * perPage, p * perPage).map((i) => shades[i]), total, page: p, pages, perPage, brand: inBrand ?? null, q: rest };
}
