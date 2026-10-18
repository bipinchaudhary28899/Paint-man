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

export const wallUses = ["all", "feature"] as const;
export type WallUse = (typeof wallUses)[number];

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
  /**
   * How much of a room we would paint in it, and so what the page advises: "all" (every wall of
   * the main room) or "feature" (one wall; outside, a door, gate, pillars or trim). Set by hand
   * for the curated shades so it agrees with the note; every deep shade (LRV under 35) is
   * "feature". Generated shades take it from their LRV band.
   */
  walls: WallUse;
  /** Codes of shades that sit well with it: a trim/ceiling white and an accent. */
  pairsWith: string[];
  /** One honest sentence an inspector would say. */
  note: string;
  /**
   * Curated shades only: one sentence about the colour itself (undertone, depth, what it sits
   * well with), written from its hex and LRV. No claims about jobs or customers.
   */
  guide?: string;
  /** Extra search words: regional names, moods, common misspellings. */
  tags: string[];
};

export const curatedColours: Colour[] = [
  // Whites
  { code: "PM-101", name: "Taj White", hex: "#f6f1e7", family: "Whites", rooms: ["Living room", "Bedroom", "Rental refresh"], finish: "Matt emulsion", lrv: 88, walls: "all", pairsWith: ["PM-402", "PM-601"], note: "A soft marble white that doesn't go blue under tube light. Our default ceiling and rental white.", guide: "Taj White has just enough yellow in it to look soft rather than stark, so it sits easily beside marble, wood and brass and works as the ceiling over most other colours.", tags: ["off white", "ivory", "safed", "ceiling", "marble"] },
  { code: "PM-102", name: "Chalk", hex: "#fdfcf8", family: "Whites", rooms: ["Kitchen", "Bedroom", "Rental refresh"], finish: "Washable", lrv: 94, walls: "all", pairsWith: ["PM-203", "PM-702"], note: "The brightest white in the range. Shows scuffs, so we quote it in washable finish.", guide: "Chalk is as close to plain white as the range gets, with only a trace of warmth, so it gives the crispest edge against a coloured wall and bounces the most light off a ceiling.", tags: ["pure white", "bright white", "brilliant"] },
  { code: "PM-103", name: "Morning Milk", hex: "#f3ecdc", family: "Whites", rooms: ["Living room", "Pooja room", "Bedroom"], finish: "Matt emulsion", lrv: 84, walls: "all", pairsWith: ["PM-301", "PM-501"], note: "Warm white with a drop of cream; makes a north-facing room feel sunnier.", guide: "Morning Milk carries more cream than Taj White, Chalk or Cotton, which warms the flat, cool light from a north-facing window and flatters wood, brass and yellow accents.", tags: ["cream", "warm white", "doodh"] },
  { code: "PM-104", name: "Cotton", hex: "#eeeae3", family: "Whites", rooms: ["Bedroom", "Living room", "Rental refresh"], finish: "Matt emulsion", lrv: 81, walls: "all", pairsWith: ["PM-202", "PM-603"], note: "A grey-white for people who find cream too yellow. Clean with wooden furniture.", guide: "Cotton is a shade greyer and darker than Taj White or Morning Milk, so its slight warmth never tips into cream and it stays clean next to wooden furniture.", tags: ["greige white", "light grey white"] },

  // Neutrals
  { code: "PM-201", name: "Agra Stone", hex: "#d9cfc0", family: "Beiges", rooms: ["Exterior", "Balcony", "Living room"], finish: "Exterior weatherproof", lrv: 62, walls: "all", pairsWith: ["PM-101", "PM-404"], note: "Sandstone beige that hides dust on exteriors better than white.", guide: "Agra Stone is a pale, greyed sandstone beige close to the colour of dry dust, which is why dust shows less on it than on white, and it still reflects more than half the light that hits it.", tags: ["beige", "sandstone", "stone", "red fort", "dust"] },
  { code: "PM-202", name: "Dove", hex: "#c9c6c1", family: "Greys", rooms: ["Bedroom", "Living room", "Kitchen"], finish: "Matt emulsion", lrv: 56, walls: "all", pairsWith: ["PM-104", "PM-802"], note: "A warm light grey. Reads calm, not cold, with 2700K bulbs.", guide: "Dove is a light grey with a faint yellow cast instead of a blue one, which keeps it soft and calm under warm 2700K bulbs rather than cold.", tags: ["light grey", "warm grey", "gray"] },
  { code: "PM-203", name: "Pebble", hex: "#a39d95", family: "Greys", rooms: ["Living room", "Exterior"], finish: "Matt emulsion", lrv: 34, walls: "feature", pairsWith: ["PM-102", "PM-702"], note: "Mid grey for one feature wall behind the TV; keep the other three walls white.", guide: "Pebble is a grey with a hint of brown in it, so on one wall against white it reads as a soft, deliberate colour rather than a cold shadow.", tags: ["grey", "mid grey", "feature wall", "tv wall"] },
  { code: "PM-204", name: "Jute", hex: "#bfa98a", family: "Beiges", rooms: ["Living room", "Bedroom"], finish: "Matt emulsion", lrv: 42, walls: "all", pairsWith: ["PM-103", "PM-401"], note: "Looks like raw jute in daylight; hides handprints in a busy family room.", guide: "Jute is a mid beige with a clear yellow-brown cast, close to natural fibre, so it sits naturally with cane, teak and sheesham and shows everyday marks less than a pale wall does.", tags: ["tan", "khaki", "camel", "brown beige"] },
  { code: "PM-205", name: "Slate", hex: "#5d6168", family: "Greys", rooms: ["Living room", "Bedroom"], finish: "Silk / sheen", lrv: 12, walls: "feature", pairsWith: ["PM-101", "PM-301"], note: "Deep charcoal for a single wall. Needs good light and a sheen finish to avoid looking flat.", guide: "Slate is a charcoal with a faint blue cast, so it looks cool and crisp against white trim and turns softer and warmer under yellow lamp light.", tags: ["charcoal", "dark grey", "black", "graphite"] },

  // Warm
  { code: "PM-301", name: "Marigold", hex: "#f2b73f", family: "Yellows", rooms: ["Pooja room", "Kids room", "Balcony"], finish: "Matt emulsion", lrv: 54, walls: "feature", pairsWith: ["PM-101", "PM-205"], note: "Festival yellow. One wall is plenty; four walls and the room glows at night.", guide: "Marigold is a rich, clear yellow that leans towards orange, like the flower, so a single wall fills a room with colour and glows under brass lamps and diyas.", tags: ["yellow", "genda", "haldi", "mustard", "festival"] },
  { code: "PM-302", name: "Kesar", hex: "#e8893a", family: "Oranges", rooms: ["Pooja room", "Living room"], finish: "Matt emulsion", lrv: 36, walls: "feature", pairsWith: ["PM-103", "PM-403"], note: "Saffron with the brightness turned down. Traditional in a pooja alcove.", guide: "Kesar is a strong saffron orange with its brightness held back a little, so it looks rich in a small alcove or on one wall instead of loud.", tags: ["saffron", "orange", "kesari", "bhagwa"] },
  { code: "PM-303", name: "Butter", hex: "#f7e1a4", family: "Yellows", rooms: ["Kitchen", "Kids room", "Bedroom"], finish: "Washable", lrv: 77, walls: "all", pairsWith: ["PM-102", "PM-502"], note: "Pale yellow that keeps a small kitchen cheerful without feeling hot.", guide: "Butter is a pale yellow with no orange or green in it, so it lifts a room on a grey day and stays fresh rather than hot in strong sun.", tags: ["pale yellow", "lemon", "light yellow", "makhan"] },
  { code: "PM-304", name: "Peach Lassi", hex: "#f6c8ae", family: "Oranges", rooms: ["Bedroom", "Kids room"], finish: "Matt emulsion", lrv: 66, walls: "all", pairsWith: ["PM-101", "PM-601"], note: "A soft peach that flatters skin tones; popular for the main bedroom.", guide: "Peach Lassi is a pale, soft peach close to skin tones, so it looks warm and flattering in the low light of a bedroom without turning orange.", tags: ["peach", "apricot", "light orange", "aadu"] },

  // Earthy
  { code: "PM-401", name: "Terracotta", hex: "#c2623f", family: "Browns", rooms: ["Exterior", "Living room", "Balcony"], finish: "Exterior weatherproof", lrv: 18, walls: "feature", pairsWith: ["PM-101", "PM-201"], note: "Clay red that suits brick and jaali. Our most-requested exterior accent.", guide: "Terracotta is a strong clay colour between red and brown, close to fired brick, so it ties a house to its brick, jaali and red sandstone details.", tags: ["clay", "brick", "rust", "red brown", "mitti"] },
  { code: "PM-402", name: "Jaggery", hex: "#8a5a3c", family: "Browns", rooms: ["Living room", "Exterior"], finish: "Silk / sheen", lrv: 13, walls: "feature", pairsWith: ["PM-101", "PM-103"], note: "Dark brown like gur. Only for a wall that gets daylight and has light furniture against it.", guide: "Jaggery is a warm dark brown with an orange-red base, like gur, so it looks rich in daylight and needs pale furniture against it to stand out.", tags: ["brown", "gur", "chocolate", "coffee", "dark brown"] },
  { code: "PM-403", name: "Sandalwood", hex: "#d8b89a", family: "Browns", rooms: ["Pooja room", "Bedroom", "Living room"], finish: "Matt emulsion", lrv: 52, walls: "all", pairsWith: ["PM-103", "PM-302"], note: "Pale wood tone; makes a pooja room feel calm without being yellow.", guide: "Sandalwood is a light, warm wood tone that leans to yellow-beige rather than orange, so it calms a room without the glare of a bright yellow.", tags: ["chandan", "light brown", "wood", "nude"] },
  { code: "PM-404", name: "Rose Brick", hex: "#b57a73", family: "Browns", rooms: ["Exterior", "Balcony"], finish: "Exterior weatherproof", lrv: 24, walls: "feature", pairsWith: ["PM-201", "PM-101"], note: "Dusty rose-brown for boundary walls and gate pillars; weathers gracefully.", guide: "Rose Brick is a softened brick colour with a pink-red lean, so it looks warm on a boundary wall or pillar without the punch of Terracotta.", tags: ["dusty rose", "brick pink", "boundary wall", "pillar"] },

  // Greens
  { code: "PM-501", name: "Tulsi", hex: "#7f9c6a", family: "Greens", rooms: ["Kitchen", "Balcony", "Pooja room"], finish: "Washable", lrv: 30, walls: "feature", pairsWith: ["PM-103", "PM-101"], note: "Leaf green that works next to actual plants on a balcony wall.", guide: "Tulsi is a leaf green that leans to yellow, the green of real foliage, so it sits naturally behind potted plants instead of competing with them.", tags: ["green", "leaf", "plant", "hara", "olive green"] },
  { code: "PM-502", name: "Sage Mist", hex: "#b8c7b0", family: "Greens", rooms: ["Bedroom", "Living room", "Kitchen"], finish: "Matt emulsion", lrv: 56, walls: "all", pairsWith: ["PM-102", "PM-204"], note: "The quiet green everyone asks for after seeing it once. Good in bedrooms.", guide: "Sage Mist is a greyed green: there is enough grey in it to read as a calm neutral by lamp light and enough green to look fresh by day.", tags: ["sage", "pastel green", "light green", "mint grey"] },
  { code: "PM-503", name: "Pista", hex: "#cfe3c4", family: "Greens", rooms: ["Kids room", "Kitchen"], finish: "Washable", lrv: 73, walls: "all", pairsWith: ["PM-102", "PM-303"], note: "Pistachio pastel; bright enough for a kids room, soft enough to live with.", guide: "Pista is lighter and a touch brighter than Sage Mist, a pale pistachio green, so it keeps a small room cheerful without the sharpness of a mint.", tags: ["pistachio", "mint", "pastel", "light green"] },
  { code: "PM-504", name: "Bottle Green", hex: "#2f5d4a", family: "Greens", rooms: ["Living room", "Bedroom"], finish: "Silk / sheen", lrv: 9, walls: "feature", pairsWith: ["PM-101", "PM-403"], note: "A deep, hotel-lobby green for one wall behind a bed or sofa.", guide: "Bottle Green is a deep green that leans slightly to blue, like old glass bottles, so it reads rich and cool and makes brass, wood and white trim stand out.", tags: ["dark green", "emerald", "forest", "hunter"] },

  // Blues
  { code: "PM-601", name: "Monsoon Sky", hex: "#9fb9d6", family: "Blues", rooms: ["Bedroom", "Kids room", "Balcony"], finish: "Washable", lrv: 48, walls: "all", pairsWith: ["PM-101", "PM-304"], note: "Soft rainy-season blue; cools a west-facing bedroom in summer.", guide: "Monsoon Sky is a soft, slightly greyed blue, the colour of an overcast sky, cool enough to make a hot room feel calmer without turning icy.", tags: ["sky blue", "light blue", "powder blue", "aasmani", "neela"] },
  { code: "PM-602", name: "Yamuna", hex: "#5f7f96", family: "Blues", rooms: ["Living room", "Bedroom"], finish: "Matt emulsion", lrv: 21, walls: "feature", pairsWith: ["PM-104", "PM-201"], note: "A grey-blue that reads sophisticated with wooden furniture. Feature wall only.", guide: "Yamuna is a blue with a lot of grey in it and a slight green lean, more steel than sky, so it looks considered rather than bright next to wood.", tags: ["grey blue", "steel blue", "slate blue", "denim"] },
  { code: "PM-603", name: "Indigo Night", hex: "#2f3f7a", family: "Blues", rooms: ["Bedroom", "Living room"], finish: "Silk / sheen", lrv: 6, walls: "feature", pairsWith: ["PM-101", "PM-301"], note: "Dark blue for a dramatic bed wall. Pair with warm lights or it turns cold.", guide: "Indigo Night is a very dark blue that leans to violet, like indigo dye, so it looks velvety under warm lamps and close to black in weak light.", tags: ["navy", "dark blue", "indigo", "neel", "royal blue"] },
  { code: "PM-604", name: "Blue Pottery", hex: "#3f74c3", family: "Blues", rooms: ["Exterior", "Balcony", "Kids room"], finish: "Exterior weatherproof", lrv: 18, walls: "feature", pairsWith: ["PM-101", "PM-201"], note: "Jaipur-pottery cobalt for a front door, gate or one balcony wall. Fades slower in weatherproof finish.", guide: "Blue Pottery is a clear, strong cobalt with more colour than Monsoon Sky, Yamuna or Indigo Night, so a little of it on a door, gate or grille goes a long way.", tags: ["cobalt", "bright blue", "jaipur", "door", "gate"] },

  // Pinks
  { code: "PM-701", name: "Gulabi", hex: "#e8a7bd", family: "Pinks", rooms: ["Kids room", "Bedroom"], finish: "Washable", lrv: 50, walls: "feature", pairsWith: ["PM-102", "PM-502"], note: "A proper pink that stays pretty under daylight; one wall in a kids room.", guide: "Gulabi is a true rose pink, leaning neither to peach nor to purple, so it looks fresh in daylight and deepens under warm evening bulbs.", tags: ["pink", "rose", "gulabi", "baby pink"] },
  { code: "PM-702", name: "Blush", hex: "#f1d6d0", family: "Pinks", rooms: ["Bedroom", "Living room"], finish: "Matt emulsion", lrv: 72, walls: "all", pairsWith: ["PM-102", "PM-203"], note: "Barely-there pink; looks like warm white until the evening light hits it.", guide: "Blush is a very pale pink with a peach lean and little colour, which is why it passes for a warm white by day and shows its pink under evening light.", tags: ["pale pink", "nude pink", "light pink", "skin"] },
  { code: "PM-703", name: "Onion", hex: "#b77c9a", family: "Purples", rooms: ["Bedroom", "Living room"], finish: "Matt emulsion", lrv: 26, walls: "feature", pairsWith: ["PM-101", "PM-403"], note: "Mauve like the inside of an onion skin. Unusual, calm, grown-up.", guide: "Onion is a mauve that sits between pink and purple, much nearer the pink, so it reads soft and muted rather than sweet.", tags: ["mauve", "lilac", "purple pink", "pyaaz"] },

  // Bold
  { code: "PM-801", name: "Sindoor", hex: "#c9302f", family: "Reds", rooms: ["Exterior", "Pooja room"], finish: "Exterior weatherproof", lrv: 10, walls: "feature", pairsWith: ["PM-101", "PM-103"], note: "Vermilion red for a door, a pooja wall or a gate pillar. Never a whole room.", guide: "Sindoor is a strong vermilion red with more colour than Terracotta or Kesar, so a door, pillar or panel of it draws the eye from across the street.", tags: ["red", "vermilion", "lal", "door", "temple"] },
  { code: "PM-802", name: "Mustard Oil", hex: "#c7962a", family: "Yellows", rooms: ["Living room", "Balcony"], finish: "Matt emulsion", lrv: 32, walls: "feature", pairsWith: ["PM-104", "PM-202"], note: "Deep mustard for one wall with grey or white around it. Retro, warm.", guide: "Mustard Oil is an earthy yellow with brown in it, much darker than Marigold, so it looks warm and retro rather than sunny and sits well against grey.", tags: ["mustard", "ochre", "dark yellow", "sarson"] },
  { code: "PM-803", name: "Peacock", hex: "#1f8f85", family: "Teals", rooms: ["Living room", "Kids room", "Balcony"], finish: "Silk / sheen", lrv: 20, walls: "feature", pairsWith: ["PM-102", "PM-303"], note: "Teal with real depth; the wall people photograph. One wall, sheen finish.", guide: "Peacock is a rich blue-green that leans to green, between teal and jade, so it reads as a jewel colour against white, cream or wood.", tags: ["teal", "mor", "turquoise", "sea green", "aqua"] },
  { code: "PM-804", name: "Aubergine", hex: "#5a3457", family: "Purples", rooms: ["Bedroom"], finish: "Silk / sheen", lrv: 6, walls: "feature", pairsWith: ["PM-101", "PM-702"], note: "Deep plum for a bed wall in a room with a big window. Luxurious in the evening.", guide: "Aubergine is a very dark plum with a red lean, so it looks warm and velvety under lamp light and needs daylight to read as colour rather than black.", tags: ["purple", "plum", "baingan", "wine", "dark purple"] },
];

// The curated 32 first (they rank first on ties), then the generated ladder of every family.
export const colours: Colour[] = [...curatedColours, ...generateShades()];
