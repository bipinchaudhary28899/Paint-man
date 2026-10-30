import { apiGet, type ApiEnvelope } from "./api";

// The colour finder's data: brand paint shades from the website's public API
// (GET /api/v1/colours/paint and /api/v1/colours/brands). The shade data is PaintDB's, under
// CC BY 4.0, so wherever shades are shown the app shows the attribution the API sends in `meta`.

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
export type ShadeCredit = { attribution: string; license: string; licenseUrl: string; note: string };

export type ShadePage = { shades: PaintShade[]; total: number; page: number; pages: number; credit: ShadeCredit };
export type BrandList = { brands: PaintBrand[]; families: string[]; shades: number; credit: ShadeCredit };

export type ShadeQuery = { q?: string; brand?: string; family?: string; page?: number };

/** Shades per page: two columns of swatches, a few screens' worth. */
export const PER_PAGE = 30;

/** Used only if a response ever arrives without its licence fields: the credit is never left off. */
export const FALLBACK_CREDIT: ShadeCredit = {
  attribution: "Shade data: PaintDB (paintdb.com), CC BY 4.0",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  note: "Hex values approximate each brand's published colours.",
};

function creditFrom(meta: ApiEnvelope<unknown>["meta"]): ShadeCredit {
  const pick = (key: keyof ShadeCredit) => (typeof meta[key] === "string" && meta[key] ? (meta[key] as string) : FALLBACK_CREDIT[key]);
  return { attribution: pick("attribution"), license: pick("license"), licenseUrl: pick("licenseUrl"), note: pick("note") };
}

const num = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

/** One page of shades. The search text is capped at the API's 80 characters; the family filter applies only inside a brand, as on the website. */
export async function searchShades({ q = "", brand, family, page = 1 }: ShadeQuery, signal?: AbortSignal): Promise<ShadePage> {
  const res = await apiGet<PaintShade[]>(
    "/api/v1/colours/paint",
    { q: q.trim().slice(0, 80), brand, family: brand ? family : undefined, page, perPage: PER_PAGE },
    { signal },
  );
  return {
    shades: res.data,
    total: num(res.meta.total, res.data.length),
    page: num(res.meta.page, page),
    pages: num(res.meta.pages, 1),
    credit: creditFrom(res.meta),
  };
}

/** The brands in the catalogue with their shade counts, and the colour families to filter by. */
export async function fetchBrands(signal?: AbortSignal): Promise<BrandList> {
  const res = await apiGet<PaintBrand[]>("/api/v1/colours/brands", undefined, { signal });
  const families = Array.isArray(res.meta.families) ? res.meta.families.filter((f): f is string => typeof f === "string") : [];
  return { brands: res.data, families, shades: num(res.meta.shades, 0), credit: creditFrom(res.meta) };
}

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
