import "server-only";
import { colourFamilies, type ColourFamily } from "@/config/colours";

// The public colour-names catalogue: ~32,000 named colours from color.pizza (the open
// "Color Names" project, CC0 names). Fetched once on the server, trimmed to what the finder
// needs, kept in memory for a day, and classified into our families by hue and lightness so
// the same chips work for both catalogues. The browser never calls color.pizza directly.

export type WebColour = { name: string; hex: string; family: ColourFamily; lrv: number };

const SOURCE = "https://api.color.pizza/v1/?list=default";
const TTL_MS = 24 * 60 * 60 * 1000;

let cache: { at: number; items: WebColour[] } | null = null;
let inflight: Promise<WebColour[]> | null = null;

type Raw = { name: string; hex: string; hsl: { h: number; s: number; l: number }; luminanceWCAG?: number };

/** Our family for an HSL colour: greys/whites by saturation and lightness, otherwise by hue band. */
export function familyOf(h: number, s: number, l: number): ColourFamily {
  if (l >= 94 || (l >= 90 && s < 25)) return "Whites";
  if (s < 10) return "Greys";
  if (s < 22 && h >= 20 && h <= 70) return "Beiges";
  if (s < 18) return "Greys";
  if (h < 12 || h >= 345) return l < 75 ? "Reds" : "Pinks";
  if (h < 40) return s < 45 && l < 60 ? "Browns" : "Oranges";
  if (h < 68) return "Yellows";
  if (h < 95) return "Olives";
  if (h < 165) return "Greens";
  if (h < 200) return "Teals";
  if (h < 262) return "Blues";
  if (h < 315) return "Purples";
  return "Pinks";
}

export function toWebColour(raw: Raw): WebColour {
  const hex = raw.hex.toLowerCase();
  return { name: raw.name, hex, family: familyOf(raw.hsl.h, raw.hsl.s, raw.hsl.l), lrv: Math.round((raw.luminanceWCAG ?? 0) * 100) };
}

export async function loadWebColours(fetcher: typeof fetch = fetch): Promise<WebColour[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      // Plain fetch: the 14 MB payload is above Next's data-cache limit, so we cache the trimmed list in memory ourselves.
      const res = await fetcher(SOURCE, { headers: { accept: "application/json" }, cache: "no-store" });
      if (!res.ok) throw new Error(`color.pizza ${res.status}`);
      const json = (await res.json()) as { colors: Raw[] };
      const items = json.colors.filter((c) => /^#[0-9a-f]{6}$/i.test(c.hex) && c.hsl).map(toWebColour);
      cache = { at: Date.now(), items };
      return items;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** For tests and warm restarts. */
export function resetWebColourCache() { cache = null; inflight = null; }

export type WebQuery = { q?: string; family?: ColourFamily; page?: number; perPage?: number };

/** Ranked, paged search over the named-colour catalogue. */
export function searchWebColours(items: WebColour[], { q = "", family, page = 1, perPage = 60 }: WebQuery) {
  const needle = q.trim().toLowerCase();
  const isHex = /^#?[0-9a-f]{6}$/i.test(needle);
  let pool = family ? items.filter((c) => c.family === family) : items;
  let ranked: WebColour[];
  if (isHex) {
    const hex = needle.startsWith("#") ? needle : `#${needle}`;
    const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [r, g, b] = p(hex);
    ranked = [...pool].sort((a, c) => { const [ar, ag, ab] = p(a.hex), [cr, cg, cb] = p(c.hex); return ((ar - r) ** 2 + (ag - g) ** 2 + (ab - b) ** 2) - ((cr - r) ** 2 + (cg - g) ** 2 + (cb - b) ** 2); });
  } else if (needle) {
    const exact: WebColour[] = [], starts: WebColour[] = [], words: WebColour[] = [], contains: WebColour[] = [];
    for (const c of pool) {
      const n = c.name.toLowerCase();
      if (n === needle) exact.push(c);
      else if (n.startsWith(needle)) starts.push(c);
      else if (n.split(/\s+/).some((w) => w.startsWith(needle))) words.push(c);
      else if (n.includes(needle)) contains.push(c);
    }
    ranked = [...exact, ...starts, ...words, ...contains];
  } else {
    ranked = pool;
  }
  const total = ranked.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(pages, Math.max(1, page));
  return { items: ranked.slice((safePage - 1) * perPage, safePage * perPage), total, page: safePage, pages, perPage };
}

export const isColourFamily = (s: unknown): s is ColourFamily => typeof s === "string" && (colourFamilies as readonly string[]).includes(s);
