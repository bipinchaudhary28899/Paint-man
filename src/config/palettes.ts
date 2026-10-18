import type { Room } from "./colours";

// Curated combinations from the shade catalogue: one main wall colour, the white that goes
// with it, and an accent. Written the way our inspector proposes them on a site visit, so a
// palette page can be shared with a customer and quoted as-is.

export type Palette = {
  /** URL slug, stable. */
  slug: string;
  name: string;
  mood: string;
  rooms: Room[];
  /** Catalogue codes: [feature wall, other walls / ceiling white, accent (door, niche, trim)]. */
  codes: [string, string, string];
  /** Which scene best shows it on the palette page. */
  scene: "Living room" | "Bedroom" | "House exterior";
  description: string;
  tip: string;
};

export const palettes: Palette[] = [
  {
    slug: "calm-bedroom",
    name: "Calm bedroom",
    mood: "Soft, restful, grown-up",
    rooms: ["Bedroom"],
    codes: ["PM-502", "PM-101", "PM-204"],
    scene: "Bedroom",
    description: "Sage Mist behind the bed, Taj White on the other three walls and ceiling, Jute on the wardrobe wall or a niche.",
    tip: "Keep bulbs warm (2700K); sage turns grey under cool white tubes.",
  },
  {
    slug: "sunny-living-room",
    name: "Sunny living room",
    mood: "Bright, friendly, family",
    rooms: ["Living room"],
    codes: ["PM-303", "PM-102", "PM-803"],
    scene: "Living room",
    description: "Butter on the long walls, Chalk on the ceiling, one Peacock wall behind the TV or sofa.",
    tip: "Put the Peacock wall opposite the window so it gets daylight and photographs well.",
  },
  {
    slug: "pooja-corner",
    name: "Pooja corner",
    mood: "Traditional, warm, quiet",
    rooms: ["Pooja room"],
    codes: ["PM-403", "PM-103", "PM-302"],
    scene: "Living room",
    description: "Sandalwood on the alcove walls, Morning Milk around it, Kesar on the back panel behind the deities.",
    tip: "Quote the alcove in washable finish: diya smoke marks wipe off without re-painting.",
  },
  {
    slug: "kids-room-pista",
    name: "Kids room, pista and sky",
    mood: "Playful but not loud",
    rooms: ["Kids room"],
    codes: ["PM-503", "PM-102", "PM-601"],
    scene: "Bedroom",
    description: "Pista on three walls, Chalk ceiling, Monsoon Sky on the study wall so the desk has a calmer backdrop.",
    tip: "Washable finish throughout; crayon comes off with a damp cloth.",
  },
  {
    slug: "monsoon-blue-bedroom",
    name: "Monsoon blue bedroom",
    mood: "Cool, airy, summer",
    rooms: ["Bedroom"],
    codes: ["PM-601", "PM-104", "PM-304"],
    scene: "Bedroom",
    description: "Monsoon Sky on the bed wall, Cotton elsewhere, a Peach Lassi niche or door for warmth.",
    tip: "Best in west-facing bedrooms that heat up in the afternoon.",
  },
  {
    slug: "dramatic-feature-wall",
    name: "Dramatic feature wall",
    mood: "Evening, hotel-like",
    rooms: ["Living room", "Bedroom"],
    codes: ["PM-603", "PM-101", "PM-301"],
    scene: "Living room",
    description: "Indigo Night on one wall in sheen finish, Taj White on the rest, a Marigold accent in a shelf niche or on a single door.",
    tip: "Dark walls need two finish coats and a tinted primer: it is on the quotation, not a surprise.",
  },
  {
    slug: "agra-stone-exterior",
    name: "Agra stone exterior",
    mood: "Classic, dust-friendly",
    rooms: ["Exterior"],
    codes: ["PM-201", "PM-101", "PM-401"],
    scene: "House exterior",
    description: "Agra Stone on the walls, Taj White on the parapet and window bands, Terracotta on the gate pillars and boundary-wall cap.",
    tip: "Weatherproof finish only; emulsion chalks in one summer.",
  },
  {
    slug: "blue-door-exterior",
    name: "White house, blue door",
    mood: "Fresh, photogenic",
    rooms: ["Exterior", "Balcony"],
    codes: ["PM-101", "PM-201", "PM-604"],
    scene: "House exterior",
    description: "Taj White walls, Agra Stone on the plinth and boundary wall, Blue Pottery on the front door, gate and grilles.",
    tip: "Repaint the door every two years; it is the cheapest refresh for the whole front.",
  },
  {
    slug: "rental-refresh",
    name: "Rental refresh",
    mood: "Clean, neutral, quick",
    rooms: ["Rental refresh"],
    codes: ["PM-101", "PM-102", "PM-202"],
    scene: "Living room",
    description: "Taj White on walls, Chalk on ceilings, Dove in the kitchen and bathrooms where marks show.",
    tip: "One coat over sound existing paint is often enough between tenants; we tell you if it is not.",
  },
  {
    slug: "earthy-living-room",
    name: "Earthy living room",
    mood: "Warm, textured, wooden furniture",
    rooms: ["Living room"],
    codes: ["PM-204", "PM-103", "PM-401"],
    scene: "Living room",
    description: "Jute on the walls, Morning Milk ceiling, Terracotta on the wall behind the dining table.",
    tip: "Works best with cane, teak or sheesham furniture; avoid with glossy white laminates.",
  },
];

export function getPalette(slug: string): Palette | undefined {
  return palettes.find((p) => p.slug === slug);
}
