import type { Colour, Room } from "@/config/colours";
import { palettes, type Palette } from "@/config/palettes";
import { lrvBand } from "@/config/shades";
import { getColour } from "./search";

export type ResolvedPalette = Palette & {
  /** The three shades in the order of `codes`, resolved from the catalogue (paletteRoles says what each is for). */
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

type Roles = readonly [string, string, string];

/**
 * What each of a palette's three shades is for, worded for the kind of palette: an outside scheme
 * has main walls, trim and a door or gate (no ceiling); a rental has walls, ceilings and the
 * kitchen and bathrooms; a pooja corner has the alcove, the walls round it and the back panel.
 * Inside, palettes come in two layouts: a coloured wall against white (the first shade is the bed
 * or feature wall), or colour on the main walls with a white ceiling and a deeper feature wall
 * (the first shade is light, or the last one deep).
 */
const ROLES = {
  exterior: ["the main walls", "the trim and boundary", "the door, gate or pillars"],
  rental: ["the walls throughout", "the ceilings", "the kitchen and bathroom walls"],
  pooja: ["the alcove walls", "the walls around the alcove", "the back panel behind the deities"],
  bedroom: ["the wall behind the bed", "the other walls and ceiling", "the accent (niche, door or wardrobe wall)"],
  livingRoom: ["the feature wall", "the other walls and ceiling", "the accent (door, niche or trim)"],
  bedroomWalls: ["the main walls", "the ceiling", "the wall behind the bed or desk"],
  livingRoomWalls: ["the main walls", "the ceiling", "the feature wall"],
} as const satisfies Record<string, Roles>;

type PaletteKind = Pick<Palette, "codes" | "rooms" | "scene">;

/** The three roles of a palette, in the order of its codes. */
export function paletteRoles(p: PaletteKind): Roles {
  if (p.scene === "House exterior" || p.rooms.includes("Exterior")) return ROLES.exterior;
  if (p.rooms.includes("Rental refresh")) return ROLES.rental;
  if (p.rooms.includes("Pooja room")) return ROLES.pooja;
  const [first, , last] = p.codes.map((code) => getColour(code));
  const wallsFirst = (first !== undefined && lrvBand(first.lrv) === "light") || (last !== undefined && lrvBand(last.lrv) === "deep");
  if (p.scene === "Bedroom") return wallsFirst ? ROLES.bedroomWalls : ROLES.bedroom;
  return wallsFirst ? ROLES.livingRoomWalls : ROLES.livingRoom;
}

/** Where a shade goes in a palette ("the wall behind the bed", "the trim and boundary"), or undefined when it is not in it. */
export function paletteRole(p: PaletteKind, code: string): string | undefined {
  const c = getColour(code);
  const i = c ? p.codes.indexOf(c.code) : -1;
  return i < 0 ? undefined : paletteRoles(p)[i];
}
