import { generateShades } from "./shades";

// Paint Man shade catalogue. Codes are our own (PM-xxx) so a customer and our inspector
// talk about the same shade; the inspector maps it to the brand/range the customer approves
// (Asian Paints, Berger, Dulux, Nerolac) on the quotation. Hex values are screen previews:
// real paint shifts with light and sheen, which is why we bring physical shade cards.

export const colourFamilies = ["Whites", "Greys", "Beiges", "Yellows", "Oranges", "Reds", "Pinks", "Purples", "Blues", "Teals", "Greens", "Olives", "Browns"] as const;
export type ColourFamily = (typeof colourFamilies)[number];

export const rooms = ["Living room", "Bedroom", "Kitchen", "Kids room", "Pooja room", "Exterior", "Balcony", "Rental refresh"] as const;
export type Room = (typeof rooms)[number];

export const finishes = ["Matt emulsion", "Silk / sheen", "Exterior weatherproof", "Washable"] as const;
export type Finish = (typeof finishes)[number];

export type Colour = {
  /** Paint Man catalogue code, e.g. "PM-214". Stable, used in URLs and quotations. */
  code: string;
  name: string;
  hex: string;
  family: ColourFamily;
  /** Rooms it suits, main room first. The main room sets the headline finish. */
  rooms: Room[];
  /**
   * The finish we quote for the main room: "Exterior weatherproof" only when the first room is
   * outside (Exterior or Balcony), otherwise an interior finish. Shades good both inside and out
   * show both finishes on their page.
   */
  finish: Finish;
  /** How much light the wall reflects, 0–100. Below 35 makes a small room feel smaller. */
  lrv: number;
  /** Codes of shades that sit well with it: a trim/ceiling white and an accent. */
  pairsWith: string[];
  /** One honest sentence an inspector would say. */
  note: string;
  /** Extra search words: regional names, moods, common misspellings. */
  tags: string[];
};

export const curatedColours: Colour[] = [
  // Whites
  { code: "PM-101", name: "Taj White", hex: "#f6f1e7", family: "Whites", rooms: ["Living room", "Bedroom", "Rental refresh"], finish: "Matt emulsion", lrv: 88, pairsWith: ["PM-402", "PM-601"], note: "A soft marble white that doesn't go blue under tube light. Our default ceiling and rental white.", tags: ["off white", "ivory", "safed", "ceiling", "marble"] },
  { code: "PM-102", name: "Chalk", hex: "#fdfcf8", family: "Whites", rooms: ["Kitchen", "Bedroom", "Rental refresh"], finish: "Washable", lrv: 94, pairsWith: ["PM-203", "PM-702"], note: "The brightest white in the range. Shows scuffs, so we quote it in washable finish.", tags: ["pure white", "bright white", "brilliant"] },
  { code: "PM-103", name: "Morning Milk", hex: "#f3ecdc", family: "Whites", rooms: ["Living room", "Pooja room", "Bedroom"], finish: "Matt emulsion", lrv: 84, pairsWith: ["PM-301", "PM-501"], note: "Warm white with a drop of cream; makes a north-facing room feel sunnier.", tags: ["cream", "warm white", "doodh"] },
  { code: "PM-104", name: "Cotton", hex: "#eeeae3", family: "Whites", rooms: ["Bedroom", "Living room", "Rental refresh"], finish: "Matt emulsion", lrv: 81, pairsWith: ["PM-202", "PM-603"], note: "A grey-white for people who find cream too yellow. Clean with wooden furniture.", tags: ["greige white", "light grey white"] },

  // Neutrals
  { code: "PM-201", name: "Agra Stone", hex: "#d9cfc0", family: "Beiges", rooms: ["Exterior", "Balcony", "Living room"], finish: "Exterior weatherproof", lrv: 62, pairsWith: ["PM-101", "PM-404"], note: "Sandstone beige that hides dust on exteriors better than white.", tags: ["beige", "sandstone", "stone", "red fort", "dust"] },
  { code: "PM-202", name: "Dove", hex: "#c9c6c1", family: "Greys", rooms: ["Bedroom", "Living room", "Kitchen"], finish: "Matt emulsion", lrv: 56, pairsWith: ["PM-104", "PM-802"], note: "A warm light grey. Reads calm, not cold, with 2700K bulbs.", tags: ["light grey", "warm grey", "gray"] },
  { code: "PM-203", name: "Pebble", hex: "#a39d95", family: "Greys", rooms: ["Living room", "Exterior"], finish: "Matt emulsion", lrv: 34, pairsWith: ["PM-102", "PM-702"], note: "Mid grey for one feature wall behind the TV; keep the other three walls white.", tags: ["grey", "mid grey", "feature wall", "tv wall"] },
  { code: "PM-204", name: "Jute", hex: "#bfa98a", family: "Beiges", rooms: ["Living room", "Bedroom"], finish: "Matt emulsion", lrv: 42, pairsWith: ["PM-103", "PM-401"], note: "Looks like raw jute in daylight; hides handprints in a busy family room.", tags: ["tan", "khaki", "camel", "brown beige"] },
  { code: "PM-205", name: "Slate", hex: "#5d6168", family: "Greys", rooms: ["Living room", "Bedroom"], finish: "Silk / sheen", lrv: 12, pairsWith: ["PM-101", "PM-301"], note: "Deep charcoal for a single wall. Needs good light and a sheen finish to avoid looking flat.", tags: ["charcoal", "dark grey", "black", "graphite"] },

  // Warm
  { code: "PM-301", name: "Marigold", hex: "#f2b73f", family: "Yellows", rooms: ["Pooja room", "Kids room", "Balcony"], finish: "Matt emulsion", lrv: 54, pairsWith: ["PM-101", "PM-205"], note: "Festival yellow. One wall is plenty; four walls and the room glows at night.", tags: ["yellow", "genda", "haldi", "mustard", "festival"] },
  { code: "PM-302", name: "Kesar", hex: "#e8893a", family: "Oranges", rooms: ["Pooja room", "Living room"], finish: "Matt emulsion", lrv: 36, pairsWith: ["PM-103", "PM-403"], note: "Saffron with the brightness turned down. Traditional in a pooja alcove.", tags: ["saffron", "orange", "kesari", "bhagwa"] },
  { code: "PM-303", name: "Butter", hex: "#f7e1a4", family: "Yellows", rooms: ["Kitchen", "Kids room", "Bedroom"], finish: "Washable", lrv: 77, pairsWith: ["PM-102", "PM-502"], note: "Pale yellow that keeps a small kitchen cheerful without feeling hot.", tags: ["pale yellow", "lemon", "light yellow", "makhan"] },
  { code: "PM-304", name: "Peach Lassi", hex: "#f6c8ae", family: "Oranges", rooms: ["Bedroom", "Kids room"], finish: "Matt emulsion", lrv: 66, pairsWith: ["PM-101", "PM-601"], note: "A soft peach that flatters skin tones; popular for the main bedroom.", tags: ["peach", "apricot", "light orange", "aadu"] },

  // Earthy
  { code: "PM-401", name: "Terracotta", hex: "#c2623f", family: "Browns", rooms: ["Exterior", "Living room", "Balcony"], finish: "Exterior weatherproof", lrv: 18, pairsWith: ["PM-101", "PM-201"], note: "Clay red that suits brick and jaali. Our most-requested exterior accent.", tags: ["clay", "brick", "rust", "red brown", "mitti"] },
  { code: "PM-402", name: "Jaggery", hex: "#8a5a3c", family: "Browns", rooms: ["Living room", "Exterior"], finish: "Silk / sheen", lrv: 13, pairsWith: ["PM-101", "PM-103"], note: "Dark brown like gur. Only for a wall that gets daylight and has light furniture against it.", tags: ["brown", "gur", "chocolate", "coffee", "dark brown"] },
  { code: "PM-403", name: "Sandalwood", hex: "#d8b89a", family: "Browns", rooms: ["Pooja room", "Bedroom", "Living room"], finish: "Matt emulsion", lrv: 52, pairsWith: ["PM-103", "PM-302"], note: "Pale wood tone; makes a pooja room feel calm without being yellow.", tags: ["chandan", "light brown", "wood", "nude"] },
  { code: "PM-404", name: "Rose Brick", hex: "#b57a73", family: "Browns", rooms: ["Exterior", "Balcony"], finish: "Exterior weatherproof", lrv: 24, pairsWith: ["PM-201", "PM-101"], note: "Dusty rose-brown for boundary walls and gate pillars; weathers gracefully.", tags: ["dusty rose", "brick pink", "boundary wall", "pillar"] },

  // Greens
  { code: "PM-501", name: "Tulsi", hex: "#7f9c6a", family: "Greens", rooms: ["Kitchen", "Balcony", "Pooja room"], finish: "Washable", lrv: 30, pairsWith: ["PM-103", "PM-101"], note: "Leaf green that works next to actual plants on a balcony wall.", tags: ["green", "leaf", "plant", "hara", "olive green"] },
  { code: "PM-502", name: "Sage Mist", hex: "#b8c7b0", family: "Greens", rooms: ["Bedroom", "Living room", "Kitchen"], finish: "Matt emulsion", lrv: 56, pairsWith: ["PM-102", "PM-204"], note: "The quiet green everyone asks for after seeing it once. Good in bedrooms.", tags: ["sage", "pastel green", "light green", "mint grey"] },
  { code: "PM-503", name: "Pista", hex: "#cfe3c4", family: "Greens", rooms: ["Kids room", "Kitchen"], finish: "Washable", lrv: 73, pairsWith: ["PM-102", "PM-303"], note: "Pistachio pastel; bright enough for a kids room, soft enough to live with.", tags: ["pistachio", "mint", "pastel", "light green"] },
  { code: "PM-504", name: "Bottle Green", hex: "#2f5d4a", family: "Greens", rooms: ["Living room", "Bedroom"], finish: "Silk / sheen", lrv: 9, pairsWith: ["PM-101", "PM-403"], note: "A deep, hotel-lobby green for one wall behind a bed or sofa.", tags: ["dark green", "emerald", "forest", "hunter"] },

  // Blues
  { code: "PM-601", name: "Monsoon Sky", hex: "#9fb9d6", family: "Blues", rooms: ["Bedroom", "Kids room", "Balcony"], finish: "Washable", lrv: 48, pairsWith: ["PM-101", "PM-304"], note: "Soft rainy-season blue; cools a west-facing bedroom in summer.", tags: ["sky blue", "light blue", "powder blue", "aasmani", "neela"] },
  { code: "PM-602", name: "Yamuna", hex: "#5f7f96", family: "Blues", rooms: ["Living room", "Bedroom"], finish: "Matt emulsion", lrv: 21, pairsWith: ["PM-104", "PM-201"], note: "A grey-blue that reads sophisticated with wooden furniture. Feature wall only.", tags: ["grey blue", "steel blue", "slate blue", "denim"] },
  { code: "PM-603", name: "Indigo Night", hex: "#2f3f7a", family: "Blues", rooms: ["Bedroom", "Living room"], finish: "Silk / sheen", lrv: 6, pairsWith: ["PM-101", "PM-301"], note: "Dark blue for a dramatic bed wall. Pair with warm lights or it turns cold.", tags: ["navy", "dark blue", "indigo", "neel", "royal blue"] },
  { code: "PM-604", name: "Blue Pottery", hex: "#3f74c3", family: "Blues", rooms: ["Exterior", "Balcony", "Kids room"], finish: "Exterior weatherproof", lrv: 18, pairsWith: ["PM-101", "PM-201"], note: "Jaipur-pottery cobalt for a front door, gate or one balcony wall. Fades slower in weatherproof finish.", tags: ["cobalt", "bright blue", "jaipur", "door", "gate"] },

  // Pinks
  { code: "PM-701", name: "Gulabi", hex: "#e8a7bd", family: "Pinks", rooms: ["Kids room", "Bedroom"], finish: "Washable", lrv: 50, pairsWith: ["PM-102", "PM-502"], note: "A proper pink that stays pretty under daylight; one wall in a kids room.", tags: ["pink", "rose", "gulabi", "baby pink"] },
  { code: "PM-702", name: "Blush", hex: "#f1d6d0", family: "Pinks", rooms: ["Bedroom", "Living room"], finish: "Matt emulsion", lrv: 72, pairsWith: ["PM-102", "PM-203"], note: "Barely-there pink; looks like warm white until the evening light hits it.", tags: ["pale pink", "nude pink", "light pink", "skin"] },
  { code: "PM-703", name: "Onion", hex: "#b77c9a", family: "Purples", rooms: ["Bedroom", "Living room"], finish: "Matt emulsion", lrv: 26, pairsWith: ["PM-101", "PM-403"], note: "Mauve like the inside of an onion skin. Unusual, calm, grown-up.", tags: ["mauve", "lilac", "purple pink", "pyaaz"] },

  // Bold
  { code: "PM-801", name: "Sindoor", hex: "#c9302f", family: "Reds", rooms: ["Exterior", "Pooja room"], finish: "Exterior weatherproof", lrv: 10, pairsWith: ["PM-101", "PM-103"], note: "Vermilion red for a door, a pooja wall or a gate pillar. Never a whole room.", tags: ["red", "vermilion", "lal", "door", "temple"] },
  { code: "PM-802", name: "Mustard Oil", hex: "#c7962a", family: "Yellows", rooms: ["Living room", "Balcony"], finish: "Matt emulsion", lrv: 32, pairsWith: ["PM-104", "PM-202"], note: "Deep mustard for one wall with grey or white around it. Retro, warm.", tags: ["mustard", "ochre", "dark yellow", "sarson"] },
  { code: "PM-803", name: "Peacock", hex: "#1f8f85", family: "Teals", rooms: ["Living room", "Kids room", "Balcony"], finish: "Silk / sheen", lrv: 20, pairsWith: ["PM-102", "PM-303"], note: "Teal with real depth; the wall people photograph. One wall, sheen finish.", tags: ["teal", "mor", "turquoise", "sea green", "aqua"] },
  { code: "PM-804", name: "Aubergine", hex: "#5a3457", family: "Purples", rooms: ["Bedroom"], finish: "Silk / sheen", lrv: 6, pairsWith: ["PM-101", "PM-702"], note: "Deep plum for a bed wall in a room with a big window. Luxurious in the evening.", tags: ["purple", "plum", "baingan", "wine", "dark purple"] },
];

// The curated 32 first (they rank first on ties), then the generated ladder of every family.
export const colours: Colour[] = [...curatedColours, ...generateShades()];
