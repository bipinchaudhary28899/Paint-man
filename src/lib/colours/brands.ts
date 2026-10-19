import "server-only";
import raw from "@/data/paintdb.json";
import { hexToRgb, rgbToOklab } from "@/lib/visualizer/recolour";

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

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", reg: "®", copy: "©", trade: "™" };

/**
 * PaintDB names arrive HTML-escaped from its source sites ("Dove&#039;s Wing-w", "Spick &amp; Span").
 * Decodes named, decimal and hex entities in one pass, so "&amp;#039;" stays "&#039;" as written;
 * unknown or out-of-range entities are left as they are. scripts/import-paintdb.mjs does the same
 * on import.
 */
export function decodeEntities(s: string): string {
  return s.replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] !== "#") return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
    const n = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
  });
}

export const SORTS = ["shade", "code", "name"] as const;
export type ShadeSort = (typeof SORTS)[number];
export const isShadeSort = (s: unknown): s is ShadeSort => typeof s === "string" && (SORTS as readonly string[]).includes(s);

const FAMILY_ORDER = ["white", "beige", "yellow", "orange", "pink", "red", "purple", "blue", "green", "gray", "brown", "black"];
const familyRank = (f: string) => (FAMILY_ORDER.indexOf(f) + 1 || 99);

/**
 * "Shade card" order key: near-neutral shades first, then narrow hue bands (20°, starting at
 * magenta-red so reds aren't split across 0°/360°), each band light → dark, like the strips
 * of a paper shade card. Exported for tests.
 */
export function shadeCardKey(hex: string): [number, number] {
  const [L, a, b] = rgbToOklab(...hexToRgb(hex));
  const chroma = Math.hypot(a, b);
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360 + 30) % 360;
  const band = chroma < 0.025 ? -1 : Math.floor(hue / 20);
  return [band, -L];
}

let cache: { shades: BrandShade[]; keys: { code: string; name: string; words: string[] }[]; order: Record<ShadeSort, number[]> } | null = null;
function load() {
  if (cache) return cache;
  const byBrand = data.shades
    .map((s, i) => ({ s, i }))
    .sort((a, b) => brandRank(data.brands[a.s[0]].slug) - brandRank(data.brands[b.s[0]].slug) || a.s[0] - b.s[0] || a.i - b.i);
  const shades = byBrand.map(({ s: [b, code, name, hex, lrv, f, u, where] }) => {
    const brand = data.brands[b];
    return {
      id: `${brand.slug}:${code}`,
      brand: brand.slug,
      brandName: decodeEntities(brand.name),
      code,
      name: decodeEntities(name),
      hex: `#${hex}`,
      lrv,
      family: data.families[f],
      undertone: data.undertones[u],
      interior: (where & 1) === 1,
      exterior: (where & 2) === 2,
    };
  });
  const keys = shades.map((s) => ({ code: norm(s.code), name: s.name.toLowerCase(), words: s.name.toLowerCase().split(/[\s\-/&,.'’()®]+/).filter(Boolean) }));
  // the three browse orders, computed once: brand first, then the chosen order within it
  const idx = shades.map((_, i) => i);
  const brandCmp = (i: number, j: number) => brandRank(shades[i].brand) - brandRank(shades[j].brand) || shades[i].brand.localeCompare(shades[j].brand);
  const card = shades.map((s) => shadeCardKey(s.hex));
  const codeCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
  const order: Record<ShadeSort, number[]> = {
    shade: [...idx].sort((i, j) => brandCmp(i, j) || familyRank(shades[i].family) - familyRank(shades[j].family) || card[i][0] - card[j][0] || card[i][1] - card[j][1] || i - j),
    code: [...idx].sort((i, j) => brandCmp(i, j) || codeCollator.compare(shades[i].code, shades[j].code) || i - j),
    name: [...idx].sort((i, j) => brandCmp(i, j) || shades[i].name.localeCompare(shades[j].name) || i - j),
  };
  cache = { shades, keys, order };
  return cache;
}

/** OKLab coordinates of every shade, and the shade indices of each brand, computed on first use. */
let labCache: { lab: Float64Array; byBrand: Map<string, number[]> } | null = null;
function labs() {
  if (labCache) return labCache;
  const { shades } = load();
  const lab = new Float64Array(shades.length * 3);
  const byBrand = new Map<string, number[]>();
  shades.forEach((s, i) => {
    lab.set(rgbToOklab(...hexToRgb(s.hex)), i * 3);
    const list = byBrand.get(s.brand);
    if (list) list.push(i);
    else byBrand.set(s.brand, [i]);
  });
  labCache = { lab, byBrand };
  return labCache;
}

export type BrandMatch = {
  brand: string;
  brandName: string;
  /** closest first; `distance` is the OKLab distance (about 0.02 is a just-visible difference) */
  shades: (BrandShade & { distance: number })[];
};

/**
 * The `n` shades of each brand nearest to `hex` by OKLab distance (perceptually even, unlike RGB),
 * brands in the order given. Unknown brands are left out. Used on a Paint Man shade's page to
 * name the closest Asian Paints, Berger and Nerolac codes; a screen match to confirm on the card.
 */
export function nearestBrandShades(hex: string, brands: readonly string[], n = 2): BrandMatch[] {
  const { shades } = load();
  const { lab, byBrand } = labs();
  const [L, A, B] = rgbToOklab(...hexToRgb(hex));
  const k = Math.min(10, Math.max(1, Math.floor(n)));
  return brands.flatMap((slug) => {
    const idx = byBrand.get(slug);
    if (!idx) return [];
    const best: { i: number; d: number }[] = [];
    for (const i of idx) {
      const d = Math.hypot(lab[i * 3] - L, lab[i * 3 + 1] - A, lab[i * 3 + 2] - B);
      if (best.length === k && d >= best[k - 1].d) continue;
      best.push({ i, d });
      best.sort((x, y) => x.d - y.d);
      if (best.length > k) best.pop();
    }
    return [{ brand: slug, brandName: shades[idx[0]].brandName, shades: best.map(({ i, d }) => ({ ...shades[i], distance: Math.round(d * 1000) / 1000 })) }];
  });
}

export const shadeCount = () => data.shades.length;

/** Brands with shade counts, Indian brands first. */
export function brandList() {
  const counts = new Map<number, number>();
  for (const s of data.shades) counts.set(s[0], (counts.get(s[0]) ?? 0) + 1);
  return data.brands
    .map((b, i) => ({ slug: b.slug, name: decodeEntities(b.name), count: counts.get(i) ?? 0 }))
    .sort((a, b) => brandRank(a.slug) - brandRank(b.slug) || a.name.localeCompare(b.name));
}

/** Colour families in the data, in a light-to-dark, warm-to-cool reading order. */
export function shadeFamilies(): string[] {
  return [...data.families].sort((a, b) => familyRank(a) - familyRank(b));
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

export type BrandQuery = { q?: string; brand?: string; family?: string; sort?: ShadeSort; page?: number; perPage?: number };

/**
 * Searches the brand shades. A hex finds the nearest shades; otherwise matches rank as: exact
 * code, code prefix, exact name, name prefix, a word starting with the query, name contains,
 * code contains. Brand and family narrow the set. With no query, `sort` sets the browse order:
 * "shade" (shade-card order: similar colours together, light → dark), "code" or "name".
 */
export function searchBrandShades({ q = "", brand, family, sort = "shade", page = 1, perPage = 60 }: BrandQuery) {
  const { shades, keys, order } = load();
  const split = brand ? { rest: q.trim() } : splitBrand(q);
  const inBrand = brand ?? split.brand;
  const rest = split.rest;

  let idx: number[] = [];
  for (const i of order[sort]) {
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
      .sort((a, b) => a[1] - b[1]) // stable: equal matches keep the browse order
      .map(([i]) => i);
  }

  const total = idx.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page), pages);
  return { items: idx.slice((p - 1) * perPage, p * perPage).map((i) => shades[i]), total, page: p, pages, perPage, brand: inBrand ?? null, q: rest, sort };
}
