import { colours, colourFamilies, rooms, type Colour, type ColourFamily, type Room } from "@/config/colours";

export type ColourQuery = {
  /** Free text: name, code ("PM-214", "214"), hex ("#b8c7b0"), family, room, tag. */
  q?: string;
  family?: ColourFamily;
  room?: Room;
  limit?: number;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9#]+/g, " ").trim();

/** "214", "pm214", "PM 214" → "PM-214" (3 or 4 digits); anything else unchanged. */
export function normaliseCode(input: string): string {
  const m = input.trim().toUpperCase().match(/^(?:PM[\s-]*)?(\d{3,4})$/);
  return m ? `PM-${m[1]}` : input.trim().toUpperCase();
}

export function getColour(code: string): Colour | undefined {
  const c = normaliseCode(code);
  return colours.find((x) => x.code === c);
}

/** Lower is closer; squared RGB distance is plenty for "nearest shade to this hex". */
function hexDistance(a: string, b: string): number {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
}

export const isHex = (s: string) => /^#?[0-9a-f]{6}$/i.test(s.trim());

function scoreColour(c: Colour, q: string): number {
  const n = norm(q);
  if (!n) return 1;
  const code = normaliseCode(q);
  if (c.code === code) return 100;
  const name = norm(c.name);
  if (name === n) return 90;
  if (name.startsWith(n)) return 80;
  if (name.includes(n)) return 70;
  const words = n.split(" ");
  const hay = [c.family, ...c.rooms, ...c.tags, c.finish, c.note].map(norm);
  let score = 0;
  for (const w of words) {
    if (!w) continue;
    if (name.includes(w)) score += 40;
    else if (c.tags.some((t) => norm(t).includes(w))) score += 30;
    else if (hay.some((h) => h.split(" ").some((hw) => hw.startsWith(w)))) score += 15;
    else if (hay.some((h) => h.includes(w))) score += 8;
  }
  return score;
}

/** Ranked search over the catalogue. Empty query returns the catalogue in family order. */
export function searchColours({ q = "", family, room, limit }: ColourQuery = {}): Colour[] {
  let pool = colours;
  if (family) pool = pool.filter((c) => c.family === family);
  if (room) pool = pool.filter((c) => c.rooms.includes(room));

  let out: Colour[];
  if (isHex(q)) {
    const hex = q.trim().startsWith("#") ? q.trim() : `#${q.trim()}`;
    out = [...pool].sort((a, b) => hexDistance(a.hex, hex) - hexDistance(b.hex, hex)).slice(0, limit ?? 6);
  } else {
    const scored = pool.map((c) => ({ c, s: scoreColour(c, q) })).filter((x) => x.s > 0);
    scored.sort((a, b) => b.s - a.s || colours.indexOf(a.c) - colours.indexOf(b.c));
    out = scored.map((x) => x.c);
  }
  return limit ? out.slice(0, limit) : out;
}

/** Suggestions when a search returns nothing: the families and rooms a person can tap. */
export function searchHints() {
  return { families: [...colourFamilies], rooms: [...rooms] };
}

/** The shades listed in `pairsWith`, resolved; unknown codes are skipped. */
export function pairings(c: Colour): Colour[] {
  return c.pairsWith.map((code) => getColour(code)).filter((x): x is Colour => Boolean(x));
}

/**
 * The shade's nearest neighbours by lightness in its own family: the family sorted light → dark,
 * then the shades either side of it (one lighter, one darker, two lighter, ...), wrapping at the
 * ends. Every shade gets its own "close by" set, so links spread through the whole family.
 */
export function similar(c: Colour, n = 4): Colour[] {
  const fam = colours.filter((x) => x.family === c.family).sort((a, b) => b.lrv - a.lrv || a.code.localeCompare(b.code));
  const i = fam.findIndex((x) => x.code === c.code);
  if (i < 0) return fam.slice(0, Math.max(0, n));
  const len = fam.length;
  const want = Math.min(Math.max(0, n), len - 1);
  const seen = new Set([i]);
  const out: Colour[] = [];
  for (let k = 1; out.length < want; k++) {
    for (const j of [i - k, i + k]) {
      const w = ((j % len) + len) % len;
      if (out.length >= want || seen.has(w)) continue;
      seen.add(w);
      out.push(fam[w]);
    }
  }
  return out;
}

export function isFamily(s: unknown): s is ColourFamily {
  return typeof s === "string" && (colourFamilies as readonly string[]).includes(s);
}
export function isRoom(s: unknown): s is Room {
  return typeof s === "string" && (rooms as readonly string[]).includes(s);
}
