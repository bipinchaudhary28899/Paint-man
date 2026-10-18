import type { Colour, Room } from "@/config/colours";
import { palettes, type Palette } from "@/config/palettes";
import { getColour } from "./search";

export type ResolvedPalette = Palette & {
  /** [feature wall, other walls, accent], resolved from the catalogue. */
  colours: [Colour, Colour, Colour];
};

/** Palettes with their three shades resolved; a palette naming an unknown code is dropped (and is a data bug). */
export function resolvePalettes(list: Palette[] = palettes): ResolvedPalette[] {
  const out: ResolvedPalette[] = [];
  for (const p of list) {
    const cs = p.codes.map((c) => getColour(c));
    if (cs.every((c): c is Colour => Boolean(c))) out.push({ ...p, colours: cs as [Colour, Colour, Colour] });
  }
  return out;
}

export function palettesForRoom(room?: Room): ResolvedPalette[] {
  const all = resolvePalettes();
  return room ? all.filter((p) => p.rooms.includes(room)) : all;
}

/** Palettes that use a given shade anywhere; used on a colour's detail page. */
export function palettesUsing(code: string): ResolvedPalette[] {
  const c = getColour(code);
  return c ? resolvePalettes().filter((p) => p.codes.includes(c.code)) : [];
}

const ROLES = ["the feature wall", "the other walls and ceiling", "the accent (door, niche or trim)"] as const;

/** Where a shade goes in a palette: the feature wall, the other walls, or the accent. */
export function paletteRole(p: Pick<ResolvedPalette, "codes">, code: string): (typeof ROLES)[number] | undefined {
  const c = getColour(code);
  const i = c ? p.codes.indexOf(c.code) : -1;
  return i < 0 ? undefined : ROLES[i];
}
