// The full shade ladder: every hue family from near-white to deep, generated in OKLCH so
// steps are perceptually even, then clipped to sRGB. Names run light → dark per family.
// Codes are PM-<family><step> (four digits), e.g. PM-1204 = Blues, step 4.
// The 32 curated shades in colours.ts (with inspector notes and pairings) sit on top of these.

import type { Colour, ColourFamily, Finish, Room } from "./colours";

type FamilySpec = { id: number; family: ColourFamily; hue: number; chroma: number; names: string[]; tags: string[]; rooms: Room[]; exterior?: boolean; /** how far down the ladder this family goes (whites stop pale) */ steps?: number };

// chroma = peak OKLCH chroma at mid-lightness; neutrals keep a whisper of warmth/coolness.
export const familySpecs: FamilySpec[] = [
  { id: 10, family: "Whites", hue: 80, chroma: 0.02, names: ["Snow", "Milk", "Calico", "Rice", "Chalk Dust", "Muslin"], tags: ["white", "off white", "safed", "bright", "ceiling"], rooms: ["Living room", "Bedroom", "Kitchen", "Rental refresh"], steps: 4 },
  { id: 11, family: "Greys", hue: 260, chroma: 0.012, names: ["Mist", "Pearl Grey", "Silver Lining", "Dove Grey", "Cloud", "Pebble Grey", "Flannel", "Stone Grey", "Slate Grey", "Graphite", "Charcoal", "Soot"], tags: ["grey", "gray", "neutral", "cool", "modern"], rooms: ["Living room", "Bedroom", "Kitchen", "Rental refresh"] },
  { id: 12, family: "Beiges", hue: 70, chroma: 0.045, names: ["Linen", "Oat", "Biscuit", "Sand", "Wheat", "Khaki", "Jute Beige", "Camel", "Mushroom", "Taupe"], tags: ["beige", "neutral", "warm", "sandstone", "earthy"], rooms: ["Living room", "Bedroom", "Rental refresh", "Exterior"], exterior: true, steps: 10 },
  { id: 13, family: "Yellows", hue: 95, chroma: 0.16, names: ["Buttercream", "Primrose", "Lemon Ice", "Daffodil", "Haldi", "Sunflower", "Mustard", "Genda", "Ochre", "Amber", "Saffron Gold", "Bronze"], tags: ["yellow", "peela", "sunny", "haldi", "mustard"], rooms: ["Kitchen", "Kids room", "Pooja room", "Balcony"] },
  { id: 14, family: "Oranges", hue: 55, chroma: 0.17, names: ["Peach Cream", "Apricot", "Melon", "Papaya", "Peach", "Mango", "Tangerine", "Saffron", "Burnt Orange", "Rust", "Copper", "Cinnamon"], tags: ["orange", "peach", "kesari", "warm", "apricot"], rooms: ["Pooja room", "Kids room", "Living room", "Balcony"] },
  { id: 15, family: "Reds", hue: 25, chroma: 0.19, names: ["Rose Water", "Coral Blush", "Salmon", "Watermelon", "Coral", "Poppy", "Tomato", "Sindoor Red", "Brick Red", "Crimson", "Maroon", "Oxblood"], tags: ["red", "lal", "coral", "brick", "bold"], rooms: ["Pooja room", "Living room", "Exterior"], exterior: true },
  { id: 16, family: "Pinks", hue: 355, chroma: 0.14, names: ["Blush Pink", "Ballet", "Petal", "Baby Pink", "Rani Pink", "Rose", "Flamingo", "Raspberry", "Magenta", "Mauve", "Onion Pink", "Plum Wine"], tags: ["pink", "gulabi", "rose", "blush", "soft"], rooms: ["Bedroom", "Kids room", "Living room"] },
  { id: 17, family: "Purples", hue: 300, chroma: 0.13, names: ["Lilac Mist", "Lavender", "Wisteria", "Lilac", "Orchid", "Amethyst", "Violet", "Grape", "Brinjal", "Royal Purple", "Plum", "Deep Plum"], tags: ["purple", "lilac", "lavender", "violet", "baingan"], rooms: ["Bedroom", "Kids room"] },
  { id: 18, family: "Blues", hue: 255, chroma: 0.15, names: ["Frost", "Powder Blue", "Sky Blue", "Monsoon Blue", "Cornflower", "Periwinkle", "Denim", "Yamuna Blue", "Cobalt", "Royal Blue", "Navy", "Midnight"], tags: ["blue", "neela", "aasmani", "sky", "navy"], rooms: ["Bedroom", "Kids room", "Living room", "Exterior"], exterior: true },
  { id: 19, family: "Teals", hue: 200, chroma: 0.12, names: ["Sea Foam", "Aqua Mist", "Aqua", "Turquoise", "Lagoon", "Peacock Teal", "Teal", "Ocean", "Deep Teal", "Petrol", "Dark Teal", "Ink Teal"], tags: ["teal", "aqua", "turquoise", "mor", "sea green"], rooms: ["Living room", "Kids room", "Balcony", "Bedroom"] },
  { id: 20, family: "Greens", hue: 150, chroma: 0.13, names: ["Mint Cream", "Spearmint", "Mint", "Celadon", "Sage Green", "Jade", "Leaf", "Tulsi Green", "Emerald", "Forest", "Deep Bottle", "Pine"], tags: ["green", "hara", "mint", "sage", "leaf"], rooms: ["Bedroom", "Living room", "Kitchen", "Balcony"] },
  { id: 21, family: "Olives", hue: 115, chroma: 0.09, names: ["Pale Olive", "Pistachio", "Celery", "Moss Light", "Eucalyptus", "Olive", "Fern", "Moss", "Army Green", "Dark Olive", "Deep Moss", "Hunter"], tags: ["olive", "moss", "earthy green", "khaki green", "muted"], rooms: ["Living room", "Balcony", "Exterior", "Bedroom"], exterior: true },
  { id: 22, family: "Browns", hue: 45, chroma: 0.09, names: ["Cream Caramel", "Almond", "Sandal", "Latte", "Caramel", "Clay", "Terracotta Brown", "Toffee", "Chocolate", "Jaggery Brown", "Coffee", "Espresso"], tags: ["brown", "chandan", "wood", "clay", "mitti"], rooms: ["Living room", "Exterior", "Pooja room", "Bedroom"], exterior: true },
];

// Lightness ladder, light → dark. Chroma follows a bell so pale and deep steps stay believable paint.
const L_STEPS = [0.96, 0.92, 0.87, 0.81, 0.74, 0.67, 0.6, 0.53, 0.47, 0.41, 0.36];
const chromaAt = (i: number, peak: number) => peak * Math.max(0.15, Math.sin((Math.PI * (i + 1)) / (L_STEPS.length + 1)));
// Whites get a touch more chroma per step than the bell would give, so Milk and Rice are not just grey.

// --- OKLCH → sRGB (Björn Ottosson's matrices), with chroma reduced until in gamut ---
function oklabToLinear(L: number, a: number, b: number) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const gamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const inGamut = (rgb: number[]) => rgb.every((c) => c >= -0.0005 && c <= 1.0005);

export function oklchToHex(L: number, C: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  let lo = 0, hi = C, rgb = oklabToLinear(L, C * Math.cos(rad), C * Math.sin(rad));
  if (!inGamut(rgb)) {
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      const t = oklabToLinear(L, mid * Math.cos(rad), mid * Math.sin(rad));
      if (inGamut(t)) { lo = mid; rgb = t; } else hi = mid;
    }
  }
  return "#" + rgb.map((c) => Math.round(Math.min(1, Math.max(0, gamma(c))) * 255).toString(16).padStart(2, "0")).join("");
}

/** Light reflectance value (0–100) from a hex colour. */
export function lrvOf(hex: string): number {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return Math.round((0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]) * 100);
}

/** Family name as a singular adjective: "a green wall", "an olive green wall". */
export const familySingular: Record<ColourFamily, string> = { Whites: "white", Greys: "grey", Beiges: "beige", Yellows: "yellow", Oranges: "orange", Reds: "red", Pinks: "pink", Purples: "purple", Blues: "blue", Teals: "teal", Greens: "green", Olives: "olive green", Browns: "brown" };

/**
 * One set of LRV bands for the generated notes, the depth tags, the room rules and the label on
 * a shade's page, so they never disagree: light (60+) opens a room, mid (35–59) is easy to live
 * with on four walls, deep (under 35) is a feature wall.
 */
export type LrvBand = "light" | "mid" | "deep";
export const LRV_LIGHT = 60;
export const LRV_DEEP = 35;
export const lrvBand = (lrv: number): LrvBand => (lrv >= LRV_LIGHT ? "light" : lrv >= LRV_DEEP ? "mid" : "deep");

/** Rooms whose walls are outside (or open to the weather) and take exterior paint. */
export const outdoorRooms: readonly Room[] = ["Exterior", "Balcony"];
export const isOutdoor = (room: Room) => outdoorRooms.includes(room);

/** The finish we would quote for this shade on an inside wall. Pale walls scuff visibly; deep ones look flat in matt. */
export const interiorFinishFor = (lrv: number): Finish => (lrv >= 70 ? "Washable" : lrvBand(lrv) === "deep" ? "Silk / sheen" : "Matt emulsion");

/**
 * The headline finish follows the shade's main (first) room: exterior weatherproof only when that
 * room is outside, otherwise the interior finish. A shade that is also good outside shows both
 * on its page (see finishSummary in src/lib/colours/guide.ts).
 */
export const finishFor = (lrv: number, rooms: readonly Room[]): Finish => (rooms.length > 0 && isOutdoor(rooms[0]) ? "Exterior weatherproof" : interiorFinishFor(lrv));

function noteFor(family: ColourFamily, lrv: number, exterior: boolean): string {
  const f = familySingular[family];
  const band = lrvBand(lrv);
  if (band === "light") return `A pale ${f} that keeps a small room bright and open (LRV ${lrv}).`;
  if (band === "mid") return `A mid ${f} you can paint on all four walls without the room closing in (LRV ${lrv}).`;
  if (lrv >= 25) return `A full ${f}: best on one feature wall with a light shade around it (LRV ${lrv}).`;
  return `A deep ${f} for a single feature wall in a room with good daylight; needs a tinted primer and two finish coats (LRV ${lrv}).${exterior ? " Also strong on gate pillars." : ""}`;
}
const roomsFor = (base: Room[], lrv: number): Room[] => {
  const band = lrvBand(lrv);
  if (band === "light") return Array.from(new Set<Room>([...base, "Rental refresh"]));
  if (band === "deep") return base.filter((r) => r !== "Rental refresh" && r !== "Kids room");
  return base;
};

/** Every generated shade, family by family, light → dark. */
export function generateShades(): Colour[] {
  const out: Colour[] = [];
  for (const spec of familySpecs) {
    const steps = L_STEPS.slice(0, spec.steps ?? L_STEPS.length);
    const last = steps.length - 1;
    const codes = steps.map((_, i) => `PM-${spec.id}${String(i + 1).padStart(2, "0")}`);
    steps.forEach((L, i) => {
      const hex = oklchToHex(L, chromaAt(i, spec.chroma), spec.hue);
      const lrv = lrvOf(hex);
      const name = spec.names[i];
      const band = lrvBand(lrv);
      const depth = band === "light" ? "pale" : band;
      const shadeRooms = roomsFor(spec.rooms, lrv);
      out.push({
        code: codes[i],
        name,
        hex,
        family: spec.family,
        rooms: shadeRooms,
        finish: finishFor(lrv, shadeRooms),
        lrv,
        pairsWith: [i < 6 ? "PM-101" : codes[0], i < last / 2 ? codes[Math.min(last, i + 4)] : codes[Math.max(0, i - 6)]],
        note: noteFor(spec.family, lrv, Boolean(spec.exterior)),
        tags: [...spec.tags, `${depth} ${familySingular[spec.family]}`, band === "deep" ? "dark" : band === "light" ? "light" : "medium", `step ${i + 1}`],
      });
    });
  }
  return out;
}
