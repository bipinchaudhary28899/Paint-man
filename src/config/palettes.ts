// Ready three-shade combinations, written the way our inspector proposes them on a site visit:
// one main wall colour, the white that goes with it, and an accent. Every shade is a real
// Asian Paints shade-card code from the vendored PaintDB data (src/data/paintdb.json, CC BY 4.0),
// copied here so client pages (the booking prefill) can name them without loading the 50,000-shade
// catalogue; tests/backend/palettes.test.ts checks each one against the catalogue.

export const rooms = ["Living room", "Bedroom", "Kitchen", "Kids room", "Pooja room", "Exterior", "Balcony", "Rental refresh"] as const;
export type Room = (typeof rooms)[number];
export const isRoom = (s: unknown): s is Room => typeof s === "string" && (rooms as readonly string[]).includes(s);

export const finishes = ["Matt emulsion", "Silk / sheen", "Exterior weatherproof", "Washable"] as const;
export type Finish = (typeof finishes)[number];

/** One brand paint shade in a palette, with the finish we would quote for its place in the room. */
export type PaletteShade = {
  /** `brand-slug:code`, as in /api/v1/colours/paint */
  id: string;
  brand: string;
  brandName: string;
  code: string;
  name: string;
  hex: string;
  finish: Finish;
};

export type Palette = {
  /** URL slug, stable. */
  slug: string;
  name: string;
  mood: string;
  rooms: Room[];
  /** [feature wall, other walls / ceiling white, accent (door, niche, trim)]. */
  shades: [PaletteShade, PaletteShade, PaletteShade];
  /** Which scene best shows it on the palette page. */
  scene: "Living room" | "Bedroom" | "House exterior";
  description: string;
  tip: string;
};

/** An Asian Paints shade as PaintDB lists it (name and hex exactly as in the catalogue). */
const asian = (code: string, name: string, hex: string, finish: Finish): PaletteShade => ({
  id: `asian-paints:${code}`,
  brand: "asian-paints",
  brandName: "Asian Paints",
  code,
  name,
  hex,
  finish,
});

export const palettes: Palette[] = [
  {
    slug: "calm-bedroom",
    name: "Calm bedroom",
    mood: "Soft, restful, grown-up",
    rooms: ["Bedroom"],
    shades: [asian("8386", "Pepper Leaf", "#bbc8b2", "Matt emulsion"), asian("L146", "Sonnet", "#f7f1e7", "Matt emulsion"), asian("8504", "Wood Fence", "#bea57e", "Matt emulsion")],
    scene: "Bedroom",
    description: "Pepper Leaf (Asian Paints 8386) behind the bed, Sonnet (L146) on the other three walls and ceiling, Wood Fence (8504) on the wardrobe wall or a niche.",
    tip: "Keep bulbs warm (2700K); a sage green like Pepper Leaf turns grey under cool white tubes.",
  },
  {
    slug: "sunny-living-room",
    name: "Sunny living room",
    mood: "Bright, friendly, family",
    rooms: ["Living room"],
    shades: [asian("7912", "Yellow Tulip", "#fee19d", "Washable"), asian("M0950", "Old Lace", "#fdf5e6", "Washable"), asian("9722", "Malibu Green-n", "#009188", "Silk / sheen")],
    scene: "Living room",
    description: "Yellow Tulip (Asian Paints 7912) on the long walls, Old Lace (M0950) on the ceiling, one Malibu Green (9722) wall behind the TV or sofa.",
    tip: "Put the Malibu Green wall opposite the window so it gets daylight and photographs well.",
  },
  {
    slug: "pooja-corner",
    name: "Pooja corner",
    mood: "Traditional, warm, quiet",
    rooms: ["Pooja room"],
    shades: [asian("0362", "Light Buff", "#dbb79a", "Washable"), asian("L140", "Crushed Ice", "#f3ecde", "Matt emulsion"), asian("X111", "Glorious Sunset", "#f38933", "Matt emulsion")],
    scene: "Living room",
    description: "Light Buff (Asian Paints 0362) on the alcove walls, Crushed Ice (L140) around it, Glorious Sunset (X111) on the back panel behind the deities.",
    tip: "Quote the alcove in washable finish: diya smoke marks wipe off without re-painting.",
  },
  {
    slug: "kids-room-pista",
    name: "Kids room, pista and sky",
    mood: "Playful but not loud",
    rooms: ["Kids room"],
    shades: [asian("7682", "Spring Fields", "#d4e0c6", "Washable"), asian("M0950", "Old Lace", "#fdf5e6", "Washable"), asian("7273", "Scuba Blue", "#a2bfd9", "Washable")],
    scene: "Bedroom",
    description: "Spring Fields (Asian Paints 7682) on three walls, Old Lace (M0950) on the ceiling, Scuba Blue (7273) on the study wall so the desk has a calmer backdrop.",
    tip: "Washable finish throughout; crayon comes off with a damp cloth.",
  },
  {
    slug: "monsoon-blue-bedroom",
    name: "Monsoon blue bedroom",
    mood: "Cool, airy, summer",
    rooms: ["Bedroom"],
    shades: [asian("7273", "Scuba Blue", "#a2bfd9", "Washable"), asian("L107", "Virgin Lace", "#eee9e2", "Matt emulsion"), asian("9963", "Sunrise Ray-n", "#fac9ad", "Matt emulsion")],
    scene: "Bedroom",
    description: "Scuba Blue (Asian Paints 7273) on the bed wall, Virgin Lace (L107) elsewhere, a Sunrise Ray (9963) niche or door for warmth.",
    tip: "Best in west-facing bedrooms that heat up in the afternoon.",
  },
  {
    slug: "dramatic-feature-wall",
    name: "Dramatic feature wall",
    mood: "Evening, hotel-like",
    rooms: ["Living room", "Bedroom"],
    shades: [asian("9642", "Sharp Navy-n", "#3b4f7d", "Silk / sheen"), asian("L146", "Sonnet", "#f7f1e7", "Matt emulsion"), asian("X166", "Dhoop-i", "#f1bc47", "Matt emulsion")],
    scene: "Living room",
    description: "Sharp Navy (Asian Paints 9642) on one wall in sheen finish, Sonnet (L146) on the rest, a Dhoop (X166) accent in a shelf niche or on a single door.",
    tip: "Dark walls need two finish coats and a tinted primer: it is on the quotation, not a surprise.",
  },
  {
    slug: "agra-stone-exterior",
    name: "Agra stone exterior",
    mood: "Classic, dust-friendly",
    rooms: ["Exterior"],
    shades: [asian("8771", "Cambridge", "#dacfc4", "Exterior weatherproof"), asian("L146", "Sonnet", "#f7f1e7", "Exterior weatherproof"), asian("9937", "Red Rust-n", "#c76944", "Exterior weatherproof")],
    scene: "House exterior",
    description: "Cambridge (Asian Paints 8771) on the walls, Sonnet (L146) on the parapet and window bands, Red Rust (9937) on the gate pillars and boundary-wall cap.",
    tip: "Weatherproof finish only; emulsion chalks in one summer.",
  },
  {
    slug: "blue-door-exterior",
    name: "White house, blue door",
    mood: "Fresh, photogenic",
    rooms: ["Exterior", "Balcony"],
    shades: [asian("L146", "Sonnet", "#f7f1e7", "Exterior weatherproof"), asian("8771", "Cambridge", "#dacfc4", "Exterior weatherproof"), asian("9651", "Pangong Blue-n", "#407eb6", "Exterior weatherproof")],
    scene: "House exterior",
    description: "Sonnet (Asian Paints L146) walls, Cambridge (8771) on the plinth and boundary wall, Pangong Blue (9651) on the front door, gate and grilles.",
    tip: "Repaint the door every two years; it is the cheapest refresh for the whole front.",
  },
  {
    slug: "rental-refresh",
    name: "Rental refresh",
    mood: "Clean, neutral, quick",
    rooms: ["Rental refresh"],
    shades: [asian("L146", "Sonnet", "#f7f1e7", "Matt emulsion"), asian("M0950", "Old Lace", "#fdf5e6", "Washable"), asian("8298", "Silver Trinket", "#c8c6c1", "Matt emulsion")],
    scene: "Living room",
    description: "Sonnet (Asian Paints L146) on walls, Old Lace (M0950) on ceilings, Silver Trinket (8298) in the kitchen and bathrooms where marks show.",
    tip: "One coat over sound existing paint is often enough between tenants; we tell you if it is not.",
  },
  {
    slug: "earthy-living-room",
    name: "Earthy living room",
    mood: "Warm, textured, wooden furniture",
    rooms: ["Living room"],
    shades: [asian("8504", "Wood Fence", "#bea57e", "Matt emulsion"), asian("L140", "Crushed Ice", "#f3ecde", "Matt emulsion"), asian("9937", "Red Rust-n", "#c76944", "Silk / sheen")],
    scene: "Living room",
    description: "Wood Fence (Asian Paints 8504) on the walls, Crushed Ice (L140) ceiling, Red Rust (9937) on the wall behind the dining table.",
    tip: "Works best with cane, teak or sheesham furniture; avoid with glossy white laminates.",
  },
];

export function getPalette(slug: string): Palette | undefined {
  return palettes.find((p) => p.slug === slug);
}

/** Palettes for a room, or all of them. */
export function palettesForRoom(room?: Room): Palette[] {
  return room ? palettes.filter((p) => p.rooms.includes(room)) : palettes;
}

/**
 * A shade's name as visitors read it. PaintDB keeps a one-letter suffix on some Asian Paints names
 * ("Malibu Green-n", "Dhoop-i"); that is how the catalogue stores them, so PaletteShade.name keeps it
 * and lookups stay exact, but in copy it reads like a typo, so it is dropped: "Malibu Green".
 */
export const shadeDisplayName = (name: string): string => name.replace(/-[a-z]$/, "");

/** The brand names in a palette, in order of first use ("Asian Paints"). */
export const paletteBrands = (p: Pick<Palette, "shades">): string[] => [...new Set(p.shades.map((s) => s.brandName))];
