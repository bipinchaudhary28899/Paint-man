import { apiGet, type ApiEnvelope } from "./api";

// The colour pages' data, from the website's public API: brand paint shades (GET /api/v1/colours/paint
// and /api/v1/colours/brands), the brands' shade cards (/api/v1/colours/shade-cards...) and the
// palettes' LRV and closest matches (/api/v1/palettes). The shade data is PaintDB's, under CC BY 4.0,
// so wherever shades are shown the app shows the attribution the API sends in `meta`. Answers are
// kept in memory for the session (the catalogue changes only with a website release), so going back
// to a brand, a family or a card never asks again; a failed request is forgotten and retried.

/** One brand shade, as /api/v1/colours/paint returns it. */
export type PaintShade = {
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

export type PaintBrand = { slug: string; name: string; count: number };

/** The licence fields every colour response carries in `meta`. */
export type ShadeCredit = { attribution: string; source: string; license: string; licenseUrl: string; note: string };

/** The browse orders /api/v1/colours/paint knows (the finder's Sort). */
export const SORTS = ["shade", "code", "name"] as const;
export type Sort = (typeof SORTS)[number];
export const isSort = (s: unknown): s is Sort => typeof s === "string" && (SORTS as readonly string[]).includes(s);

export type ShadePage = { shades: PaintShade[]; total: number; page: number; pages: number; credit: ShadeCredit };
export type BrandList = { brands: PaintBrand[]; families: string[]; shades: number; credit: ShadeCredit };

export type ShadeQuery = { q?: string; brand?: string; family?: string; sort?: Sort; page?: number };

/** Shades per load, as on the website: 12 rows of 4 on a phone. */
export const PER_PAGE = 48;
/** Pages the finder loads by itself as the list nears its end; after that "Show more" takes over. */
export const AUTO_LOAD_PAGES = 20;

/** Used only if a response ever arrives without its licence fields: the credit is never left off. */
export const FALLBACK_CREDIT: ShadeCredit = {
  attribution: "Shade data: PaintDB (paintdb.com), CC BY 4.0",
  source: "https://paintdb.com",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  note: "Hex values approximate each brand's published colours.",
};

function creditFrom(meta: ApiEnvelope<unknown>["meta"]): ShadeCredit {
  const pick = (key: keyof ShadeCredit) => (typeof meta[key] === "string" && meta[key] ? (meta[key] as string) : FALLBACK_CREDIT[key]);
  return { attribution: pick("attribution"), source: pick("source"), license: pick("license"), licenseUrl: pick("licenseUrl"), note: pick("note") };
}

const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

// ---------- the session cache ----------

const cache = new Map<string, Promise<unknown>>();
/** Entries kept at most (oldest dropped first): a few hundred pages of shades is a few MB at most. */
const CACHE_LIMIT = 300;

/** One request per key for the session; a failure is dropped so the next call tries again. */
function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as Promise<T> | undefined;
  if (hit) return hit;
  const promise = load();
  promise.catch(() => cache.delete(key));
  cache.set(key, promise);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  return promise;
}

/** Forgets every answer (tests, and a pull-to-refresh if one is ever added). */
export function clearColourCache(): void {
  cache.clear();
}

// ---------- the finder ----------

/** One page of shades, as the website's finder asks for it: the text capped at the API's 80 characters, the family only inside a brand, the order only when it is not the shade-card order. */
export function searchShades({ q = "", brand, family, sort = "shade", page = 1 }: ShadeQuery): Promise<ShadePage> {
  const params = { q: q.trim().slice(0, 80), brand, family: brand ? family : undefined, sort: sort === "shade" ? undefined : sort, page, perPage: PER_PAGE };
  return remember(`paint:${JSON.stringify(params)}`, async () => {
    const res = await apiGet<PaintShade[]>("/api/v1/colours/paint", params);
    return {
      shades: res.data,
      total: num(res.meta.total, res.data.length),
      page: num(res.meta.page, page),
      pages: num(res.meta.pages, 1),
      credit: creditFrom(res.meta),
    };
  });
}

/** The brands in the catalogue with their shade counts, the colour families to filter by and the number of shades. */
export function fetchBrands(): Promise<BrandList> {
  return remember("brands", async () => {
    const res = await apiGet<PaintBrand[]>("/api/v1/colours/brands");
    const families = Array.isArray(res.meta.families) ? res.meta.families.filter((f): f is string => typeof f === "string") : [];
    return { brands: res.data, families, shades: num(res.meta.shades, 0), credit: creditFrom(res.meta) };
  });
}

/** A legacy `shade=brand:code` param (old visualizer links) as the brand and search it opens. */
export function shadeParam(shade: string | undefined): { brand: string; q: string } | undefined {
  const [brand, code] = (shade ?? "").split(/:(.*)/s);
  return brand && code ? { brand, q: code } : undefined;
}

// ---------- the brands' shade cards ----------

/** A swatch as the shade-card pages print it: `code` is null when the data has no real shade-card code, and `query` is what the finder is searched with. */
export type Swatch = { id: string; brand: string; code: string | null; query: string; name: string; hex: string; lrv: number };
export type ShadeRef = { id: string; code: string; name: string; hex: string; lrv: number };
export type Range = { min: number; max: number };

export type CardFamily = {
  family: string;
  label: string;
  count: number;
  /** whether /shade-cards/<brand>/<family> exists */
  hasPage: boolean;
  lrv: Range;
  lightest: ShadeRef;
  darkest: ShadeRef;
  undertones: string[];
  /** the middle shade of the family's spread, which colours its chip and strip */
  swatch: string;
};

export type ShadeCard = { slug: string; name: string; shortName: string; count: number; lrv: Range; families: CardFamily[] };
export type ShadeCardWithSamples = Omit<ShadeCard, "families"> & { families: (CardFamily & { sample: Swatch[] })[] };
export type ShadeFamily = CardFamily & { brand: string; brandName: string; shortName: string; shades: Swatch[] };

export type CardList = { cards: ShadeCard[]; shades: number; credit: ShadeCredit };

/** Every brand's card without swatches (the hub, the "other cards" lists, a family's neighbours). */
export function fetchShadeCards(): Promise<CardList> {
  return remember("cards", async () => {
    const res = await apiGet<ShadeCard[]>("/api/v1/colours/shade-cards");
    return { cards: res.data, shades: num(res.meta.shades, res.data.reduce((n, c) => n + c.count, 0)), credit: creditFrom(res.meta) };
  });
}

/** One brand's card with each family's swatches. */
export function fetchShadeCard(brand: string): Promise<{ card: ShadeCardWithSamples; credit: ShadeCredit }> {
  return remember(`card:${brand}`, async () => {
    const res = await apiGet<ShadeCardWithSamples>(`/api/v1/colours/shade-cards/${encodeURIComponent(brand)}`);
    return { card: res.data, credit: creditFrom(res.meta) };
  });
}

/** Every shade of one family of a brand's card. */
export function fetchShadeFamily(brand: string, family: string): Promise<{ family: ShadeFamily; credit: ShadeCredit }> {
  return remember(`family:${brand}:${family}`, async () => {
    const res = await apiGet<ShadeFamily>(`/api/v1/colours/shade-cards/${encodeURIComponent(brand)}/${encodeURIComponent(family)}`);
    return { family: res.data, credit: creditFrom(res.meta) };
  });
}

/** The finder searching one swatch: /colours?brand=asian-paints&q=7982. */
export const swatchHref = (s: Pick<Swatch, "brand" | "query">) => `/colours?${new URLSearchParams({ brand: s.brand, q: s.query })}`;

/** /shade-cards/asian-paints, /shade-cards/asian-paints/blue. */
export const shadeCardPath = (brand: string, family?: string) => `/shade-cards/${brand}${family ? `/${family}` : ""}`;

// ---------- the palettes ----------

/** The closest shade of another brand to a palette shade, as the palettes page names it. */
export type PaletteMatch = { id: string; brand: string; brandName: string; code: string | null; name: string; hex: string; lrv: number; distance: number; match: string };
export type PaletteShadeFacts = { lrv: number | null; closest: PaletteMatch[] };

type ApiPaletteColour = { id: string; lrv?: number | null; closest?: PaletteMatch[] };
type ApiPalette = { colours: Record<string, ApiPaletteColour> };

/** Each palette shade's LRV and its closest Berger and Nerolac shades, by shade id. */
export function fetchPaletteFacts(): Promise<Record<string, PaletteShadeFacts>> {
  return remember("palettes", async () => {
    const res = await apiGet<ApiPalette[]>("/api/v1/palettes");
    const facts: Record<string, PaletteShadeFacts> = {};
    for (const p of res.data) {
      for (const c of Object.values(p.colours)) facts[c.id] = { lrv: typeof c.lrv === "number" ? c.lrv : null, closest: Array.isArray(c.closest) ? c.closest : [] };
    }
    return facts;
  });
}

/** The finder searching one shade by code: /colours?brand=berger&q=7T1508. */
export const finderHref = (s: { brand: string; code: string }) => `/colours?${new URLSearchParams({ brand: s.brand, q: s.code })}`;

// ---------- text ----------

/** Text that reads on a swatch: ink on light colours, cream on dark ones (by relative luminance). */
export function textOnSwatch(hex: string): "#242522" | "#f8f5ef" {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#242522";
  const n = parseInt(m[1], 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return luminance > 0.36 ? "#242522" : "#f8f5ef";
}

/** "Asian Paints 8386 Pepper Leaf". */
export const shadeLabel = (s: Pick<PaintShade, "brandName" | "code" | "name">) => `${s.brandName} ${s.code} ${s.name}`;

/** The note a booking starts with when it comes from a shade: the same wording as the website's finder. */
export const shadeBookingNote = (s: PaintShade) => `Interested in ${shadeLabel(s)} (${s.hex.toUpperCase()}). Please bring the shade card.`;

/** "Interior and exterior", "Interior only"... from the shade's flags. */
export function shadeUse(s: Pick<PaintShade, "interior" | "exterior">): string {
  if (s.interior && s.exterior) return "Interior and exterior";
  if (s.interior) return "Interior";
  if (s.exterior) return "Exterior";
  return "Not stated";
}

/** "white" → "White". */
export const familyLabel = (family: string) => (family ? family[0].toUpperCase() + family.slice(1) : family);

/** A count as the website prints it (toLocaleString("en-IN")): 8,539; 1,23,456. */
export function formatCount(n: number): string {
  const [whole, fraction] = String(Math.abs(n)).split(".");
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}${rest ? `${rest},` : ""}${last3}${fraction ? `.${fraction}` : ""}`;
}

/** "A, B and C" (the shade-card hub's list of brands). */
export const joinAnd = (items: string[]) => items.join(", ").replace(/, ([^,]*)$/, " and $1");
