import { curatedColours, type Colour, type ColourFamily, type Finish, type Room, type WallUse } from "@/config/colours";
import { familySingular, familySpecs, interiorFinishFor, isOutdoor, lrvBand, wallsFor, type LrvBand } from "@/config/shades";
import { hexToRgb, rgbToOklab } from "@/lib/visualizer/recolour";
import { paletteRole, palettesUsing } from "./palettes";
import { neighbours, pairings } from "./search";

// Plain-language guidance for a shade's page and the finder's preview panel, built from the
// shade's own data: its hex (undertone, read in OKLab), its LRV and its neighbours in the family,
// its curated walls advice, pairings, palettes and quoted finish. Every sentence that advises on
// walls follows `walls`, and every sentence that names a finish names the one we quote, so a page
// never contradicts its own note or finish line. Client-safe: config only, no server data (brand
// matches come in as an argument).

// The band says how much light the wall gives back; the walls advice says how much of the room
// it goes on. A mid shade curated as one wall (Marigold, Gulabi, Kesar) is "mid, one wall", never
// "easy to live with", so the label agrees with a note like "One wall is plenty".
const LRV_LABELS: Record<LrvBand, Record<WallUse, string>> = {
  light: { all: "light, opens a room", feature: "light, one wall" },
  mid: { all: "mid, easy to live with", feature: "mid, one wall" },
  deep: { all: "deep, needs good daylight", feature: "deep, feature wall" },
};

/**
 * Short label next to the LRV number: the LRV band, worded for the shade's walls advice. Pass the
 * shade; a bare LRV is read with the walls advice its band would get (as for a generated shade).
 */
export function lrvLabel(shade: number | Pick<Colour, "lrv" | "walls">): string {
  const { lrv, walls } = typeof shade === "number" ? { lrv: shade, walls: wallsFor(shade) } : shade;
  return LRV_LABELS[lrvBand(lrv)][walls];
}

/** The finish we quote for this shade on an inside wall: its headline finish, or the interior one when that is weatherproof. */
const insideFinish = (c: Pick<Colour, "finish" | "lrv">): Finish => (c.finish === "Exterior weatherproof" ? interiorFinishFor(c.lrv) : c.finish);

/** The finish we would quote for this shade in one room: weatherproof outside, the inside finish elsewhere. */
export const roomFinish = (c: Pick<Colour, "finish" | "lrv">, room: Room): Finish => (isOutdoor(room) ? "Exterior weatherproof" : insideFinish(c));

/**
 * The finish line for a shade: its headline finish, plus the other one when it suits both inside
 * and outside walls ("Matt emulsion indoors, exterior weatherproof outside").
 */
export function finishSummary(c: Pick<Colour, "finish" | "rooms" | "lrv">): string {
  const inside = c.rooms.some((r) => !isOutdoor(r));
  const outside = c.rooms.some((r) => isOutdoor(r));
  if (c.finish === "Exterior weatherproof") return inside ? `Exterior weatherproof outside, ${interiorFinishFor(c.lrv).toLowerCase()} indoors` : c.finish;
  return outside ? `${c.finish} indoors, exterior weatherproof outside` : c.finish;
}

// --- Undertone, read from the hex -------------------------------------------------------------

export type Warmth = "warm" | "cool" | "neutral";
/**
 * "near-neutral" is a white or grey, described by its cast; "muted" is a shade of a colour family
 * with almost no colour (a very pale tint, or a greyed one), described by its family.
 */
export type Strength = "near-neutral" | "muted" | "pastel" | "greyed" | "soft" | "rich" | "strong";
export type Undertone = {
  /** OKLab a (green − / red +) and b (blue − / yellow +), rounded to three places. */
  a: number;
  b: number;
  /** OKLCH chroma and hue angle (degrees). */
  chroma: number;
  hue: number;
  strength: Strength;
  /** The hue the shade leans to within its family ("yellow" for a sage green), if it leans at all. */
  lean?: string;
  warmth: Warmth;
  /** "a greyed green with a slight yellow lean", "a white with a faint warm cast", "a muted red, so pale it reads as a tinted white". */
  phrase: string;
  /** The same in a few words, for use inside a sentence: "yellow lean", "cool, blue cast", "hint of red", "strong colour". */
  short: string;
  /** Whites and greys only: the cast ("warm", "warm, creamy", "warm, greige", "cool, blue", "none"). */
  cast?: string;
};

/** Whites and greys (and muted shades of any family) carry so little colour that their cast, not a hue, is what shows. */
const isNeutralish = (u: Pick<Undertone, "strength">) => u.strength === "near-neutral" || u.strength === "muted";

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The undertone as three label/value pairs for the shade page's fact box. */
export function undertoneFacts(u: Undertone): { label: string; value: string }[] {
  const third = u.lean ? { label: "Leans to", value: u.lean } : u.cast ? { label: "Cast", value: u.cast } : { label: "Leans to", value: "no lean" };
  return [{ label: "Undertone", value: u.warmth }, { label: "Colour", value: u.strength }, third].map((f) => ({ ...f, value: capitalise(f.value) }));
}

/** Which way a family's shades can lean: [towards a lower hue angle, towards a higher one]. Neutrals have a cast instead. */
const LEANS: Record<ColourFamily, readonly [string, string] | null> = {
  Whites: null,
  Greys: null,
  Beiges: ["pink", "yellow"],
  Yellows: ["orange", "green"],
  Oranges: ["red", "yellow"],
  Reds: ["pink", "orange"],
  Pinks: ["purple", "peach"],
  Purples: ["blue", "pink"],
  Blues: ["green", "violet"],
  Teals: ["green", "blue"],
  Greens: ["yellow", "blue"],
  Olives: ["yellow", "green"],
  Browns: ["red", "yellow"],
};
const WARM_LEANS = new Set(["yellow", "orange", "red", "pink", "peach"]);
const r3 = (x: number) => Math.round(x * 1000) / 1000;

/**
 * The cast of a white or grey, from OKLab a and b. Only a clear yellow cast (b above 0.018, with no
 * pink in it) is "creamy", and only on a white: a faint one is just "warm" (Cotton, whose note says
 * cream is too yellow), and a grey's warmth is "greige" (Dove, Pebble). A pink (a > 0) or green
 * (a < 0) tint gives a cast of its own.
 */
function castOf(family: ColourFamily, warmth: Warmth, a: number, b: number): { cast: string; amount: "clear" | "faint" } {
  if (warmth === "neutral") return { cast: "", amount: "faint" };
  if (warmth === "cool") return { cast: a < -0.008 ? "green-grey" : "cool, blue", amount: "faint" };
  if (a > 0.008) return { cast: "pink-beige", amount: "faint" };
  const amount = b > 0.018 ? "clear" : "faint";
  if (family === "Greys") return { cast: "warm, greige", amount };
  return { cast: amount === "clear" ? "warm, creamy" : "warm", amount };
}

/**
 * The shade's undertone from its hex, in OKLab: how much colour it carries for its lightness, which
 * way it leans from the middle of its family, and whether it reads warm or cool. Whites and greys
 * get a cast (warm, cool or none) from the yellow–blue axis instead; a shade of a colour family with
 * almost no colour is "muted", named by its family rather than given a cast.
 */
export function undertone(c: Pick<Colour, "hex" | "family">): Undertone {
  const [L, a, b] = rgbToOklab(...hexToRgb(c.hex));
  const chroma = Math.hypot(a, b);
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  const base = { a: r3(a), b: r3(b), chroma: r3(chroma), hue: Math.round(hue) };
  const noun = familySingular[c.family];
  const relative = chroma / Math.max(L, 0.05);
  const leans = LEANS[c.family];

  if (!leans || relative < 0.025) {
    // yellow (b) decides first; with almost no yellow or blue, a pink (a > 0) or green (a < 0) tint still decides
    const warmth: Warmth = b > 0.006 || (b >= -0.006 && a > 0.008) ? "warm" : b < -0.006 || a < -0.008 ? "cool" : "neutral";
    if (leans) {
      // a pale or greyed shade of a colour family: too little colour to lean, but still that colour
      const phrase = L >= 0.88 ? `a muted ${noun}, so pale it reads as a tinted white` : `a muted, greyed ${noun}`;
      return { ...base, strength: "muted", warmth, phrase, short: `hint of ${noun}` };
    }
    const { cast, amount } = castOf(c.family, warmth, a, b);
    return {
      ...base,
      strength: "near-neutral",
      warmth,
      phrase: cast ? `a ${noun} with a ${amount} ${cast} cast` : `a ${noun} with almost no colour cast`,
      short: cast ? `${cast} cast` : "lack of any cast",
      cast: cast || "none",
    };
  }

  const strength: Strength = relative < 0.06 ? (L >= 0.88 ? "pastel" : "greyed") : relative < 0.13 ? "soft" : relative < 0.2 ? "rich" : "strong";
  const centre = familySpecs.find((s) => s.family === c.family)!.hue;
  const delta = ((hue - centre + 540) % 360) - 180;
  let lean: string | undefined;
  if (Math.abs(delta) >= 8) lean = delta < 0 ? leans[0] : leans[1];
  if (lean === "pink" && c.family === "Purples" && L < 0.5) lean = "red"; // a deep plum reads red, not pink
  const leanPhrase = !lean ? "" : Math.abs(delta) < 20 ? ` with a slight ${lean} lean` : ` that leans to ${lean}`;
  const warmth: Warmth = hue >= 330 || hue < 105 ? "warm" : hue >= 165 && hue < 300 ? "cool" : lean ? (WARM_LEANS.has(lean) ? "warm" : "cool") : "neutral";
  return { ...base, strength, lean, warmth, phrase: `a ${strength} ${noun}${leanPhrase}`, short: lean ? `${lean} lean` : `${strength} colour` };
}

// --- Wording helpers --------------------------------------------------------------------------

/** "a green", "an olive green", "an orange": the family as a singular adjective with its article. */
export function familyPhrase(c: Pick<Colour, "family">): string {
  const adj = familySingular[c.family];
  return `${/^[aeiou]/.test(adj) ? "an" : "a"} ${adj}`;
}

const familyPlural = (f: ColourFamily) => (f === "Olives" ? "olive greens" : f.toLowerCase());

/** A room as it reads in a sentence: "a bedroom", "outside walls". */
const ROOM_NOUN: Record<Room, string> = {
  "Living room": "a living room",
  Bedroom: "a bedroom",
  Kitchen: "a kitchen",
  "Kids room": "a kids room",
  "Pooja room": "a pooja room",
  Exterior: "outside walls",
  Balcony: "a balcony",
  "Rental refresh": "a rental between tenants",
};
/** The room in a few words after "the" or "a softer": "house front", "rental". */
const ROOM_SHORT: Record<Room, string> = {
  "Living room": "living room",
  Bedroom: "bedroom",
  Kitchen: "kitchen",
  "Kids room": "kids room",
  "Pooja room": "pooja room",
  Exterior: "house front",
  Balcony: "balcony",
  "Rental refresh": "rental",
};

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const named = (c: Pick<Colour, "name" | "code">) => `${c.name} (${c.code})`;

/**
 * A paired shade in a few words, so the reader knows what it is without opening it: "a deep brown",
 * "a pale grey", or for a white, lighter or deeper than the shade it is paired with.
 */
function describe(x: Pick<Colour, "family" | "lrv">, of: Pick<Colour, "lrv">): string {
  if (x.family === "Whites") return `a ${x.lrv > of.lrv ? "lighter" : "deeper"} white`;
  const band = lrvBand(x.lrv);
  return `a ${band === "light" ? "pale" : band} ${familySingular[x.family]}`;
}

/**
 * Its pairings split into the light one (for ceilings and the walls around it: the lightest pairing
 * lighter than the shade, or a white at least as light) and the accent (another pairing, a colour
 * before a white, since a white makes no contrast against a pale shade).
 */
function partners(c: Colour): { light?: Colour; accent?: Colour } {
  const ps = pairings(c);
  const light = ps.filter((p) => p.lrv > c.lrv || (p.family === "Whites" && p.lrv >= c.lrv)).sort((x, y) => y.lrv - x.lrv)[0];
  const rest = ps.filter((p) => p !== light);
  return { light, accent: rest.find((p) => p.family !== "Whites") ?? rest[0] };
}

// --- The colour itself (the "what colour is it" section) ---------------------------------------

/** Two casts differ when OKLab b differs by more than this (about the smallest step the eye picks out on a wall). */
const CAST_STEP = 0.002;
const ORDINAL = ["", "", "second", "third", "fourth", "fifth", "sixth"];

/**
 * For a white or grey: where its cast sits among the curated shades of its family, by OKLab b. A
 * curated shade gets its rank among them; a generated one is placed against them.
 */
function castComparison(c: Colour, u: Undertone): string {
  if (u.strength !== "near-neutral") return "";
  const curated = curatedColours.some((x) => x.code === c.code);
  const siblings = curatedColours.filter((x) => x.family === c.family && x.code !== c.code).map((x) => ({ x, b: undertone(x).b }));
  const warmers = siblings.filter((s) => s.b > u.b + CAST_STEP).sort((p, q) => p.b - q.b);
  const coolers = siblings.filter((s) => s.b < u.b - CAST_STEP).sort((p, q) => q.b - p.b);
  const [warmer, cooler] = [warmers[0], coolers[0]];
  const fam = familyPlural(c.family);
  const same = siblings.filter((s) => Math.abs(s.b - u.b) <= CAST_STEP).sort((p, q) => Math.abs(p.b - u.b) - Math.abs(q.b - u.b))[0];
  if (same) return `, much like ${same.x.name}'s`;
  if (warmer && cooler) {
    // counted from the nearer end: "the second warmest", "the second coolest"
    const rank = warmers.length <= coolers.length ? `${ORDINAL[warmers.length + 1]} warmest` : `${ORDINAL[coolers.length + 1]} coolest`;
    return `${curated ? `, the ${rank} of the curated ${fam}` : ""}: cooler than ${warmer.x.name} and warmer than ${cooler.x.name}`;
  }
  if (warmer)
    return curated ? `, the coolest of the curated ${fam}, with ${warmer.x.name} the next warmer` : `, cooler than any of the curated ${fam}, with ${warmer.x.name} the nearest`;
  if (cooler)
    return curated ? `, the warmest of the curated ${fam}, with ${cooler.x.name} the next cooler` : `, warmer than any of the curated ${fam}, with ${cooler.x.name} the nearest`;
  return "";
}

/** The palettes it is in and its role in each, or its pairings when it is in none. */
function paletteSentence(c: Colour): string {
  const ps = palettesUsing(c.code);
  if (!ps.length) {
    const pairs = pairings(c);
    return pairs.length ? `It is not in one of the ready palettes; the shades listed with it are ${list(pairs.map(named))}.` : "It is not in one of the ready palettes.";
  }
  const byRole = new Map<string, string[]>();
  for (const p of ps) {
    const role = paletteRole(p, c.code)!;
    byRole.set(role, [...(byRole.get(role) ?? []), `“${p.name}”`]);
  }
  const parts = [...byRole].map(([role, names]) => `${role} in ${list(names)}`);
  return `In the ready palettes it is ${parts.length > 2 ? `${parts.slice(0, -1).join("; ")}; and ${parts[parts.length - 1]}` : list(parts)}.`;
}

/** Facts about the colour itself: the curated guide sentence, its undertone from the hex, and the palettes it is in. */
export function colourFacts(c: Colour): string[] {
  const u = undertone(c);
  const warmth = u.strength === "near-neutral" ? "" : u.warmth === "warm" ? ", on the warm side" : u.warmth === "cool" ? ", on the cool side" : "";
  return [c.guide, `Read from its hex, ${c.hex.toUpperCase()}, ${c.name} is ${u.phrase}${warmth}${castComparison(c, u)}.`, paletteSentence(c)].filter(
    (s): s is string => Boolean(s),
  );
}

// --- Light and depth (the LRV section) --------------------------------------------------------

/**
 * How a white or grey's cast compares with its lighter and darker neighbours, so a reader who
 * wants a step lighter or darker knows whether it gets warmer or cooler on the way.
 */
function castNote(c: Colour, u: Undertone, lighter?: Colour, darker?: Colour): string {
  const vs = (x: Colour) => {
    const d = u.b - undertone(x).b;
    return d > CAST_STEP ? "warmer" : d < -CAST_STEP ? "cooler" : "same";
  };
  const [up, down] = [lighter && vs(lighter), darker && vs(darker)];
  if (!up || !down) {
    const one = up ?? down;
    return !one ? "" : one === "same" ? ", with much the same cast" : `, and ${c.name} is the ${one} of the two`;
  }
  if (up === down) return up === "same" ? ", with much the same cast as both" : `, and it is ${up} than either`;
  const side = (rel: string, step: string) => (rel === "same" ? `close in cast to the ${step}` : `${rel} than the ${step}`);
  return `; it is ${side(up, "lighter step")} and ${side(down, "darker one")}`;
}

/** The LRV, what it means, and how it compares with the next lighter and darker shades of its family. */
function lrvSentence(c: Colour, u: Undertone): string {
  const { lighter, darker } = neighbours(c);
  const fam = familyPlural(c.family);
  const near = [lighter, darker].filter((x): x is Colour => Boolean(x));
  const chromas = near.map((x) => undertone(x).chroma);
  const either = near.length > 1 ? "either" : near[0]?.name;
  const colourNote =
    u.strength === "near-neutral"
      ? castNote(c, u, lighter, darker)
      : !near.length
        ? ""
        : chromas.every((k) => k > u.chroma + 0.01)
          ? `, and it carries less colour than ${either}`
          : chromas.every((k) => k < u.chroma - 0.01)
            ? `, and it carries more colour than ${either}`
            : "";
  const opening = `At LRV ${c.lrv}, ${c.name} reflects roughly ${c.lrv}% of the light that hits it`;
  if (lighter && darker)
    return `${opening}, between ${named(lighter)} at LRV ${lighter.lrv}, the next step lighter among the ${fam}, and ${named(darker)} at LRV ${darker.lrv}, the next step darker${colourNote}.`;
  if (darker) return `${opening}, the most of any of the ${fam}; ${named(darker)} at LRV ${darker.lrv} is the next step darker${colourNote}.`;
  if (lighter) return `${opening}, the least of any of the ${fam}; ${named(lighter)} at LRV ${lighter.lrv} is the next step lighter${colourNote}.`;
  return `${opening}.`;
}

const DEEP_COATS = "; as a deep shade it needs a tinted primer and two finish coats, which we list on the quotation";

/** What to paint: every wall or one, in its main room, with its paired shades around it. Follows `walls`, never the band alone. */
function wallsSentence(c: Colour, u: Undertone): string {
  const main = c.rooms[0];
  const room = main ? ROOM_NOUN[main] : "a room";
  const { light, accent } = partners(c);
  const band = lrvBand(c.lrv);
  const coats = band === "deep" ? DEEP_COATS : "";
  if (main && isOutdoor(main)) {
    if (c.walls === "all")
      return `On a house front, ${c.name} is light enough for all the outside walls${light ? `, with ${light.name} on the trim and parapet` : ""}${accent ? ` and ${accent.name}, ${describe(accent, c)}, on the gate or pillars` : ""}${coats}.`;
    return `Outside, keep ${c.name} to a door, gate pillars, a boundary wall or trim rather than the whole house, since at LRV ${c.lrv} it soaks up about ${100 - c.lrv}% of the light that hits it${light ? `, with ${light.name} on the walls around it` : ""}${coats}.`;
  }
  if (c.walls === "all") {
    const ceiling = light ? `, with ${light.name} on the ceiling` : " and on the ceiling";
    const lead =
      band === "light"
        ? "It bounces daylight back into the room, so it is comfortable on"
        : isNeutralish(u)
          ? "It reads as a soft neutral rather than a colour, and stays light enough for"
          : "It shows real colour yet stays light enough for";
    return `${lead} all four walls of ${room}${band === "light" ? "" : " with a decent window"}${ceiling}${accent ? `, and ${accent.name}, ${describe(accent, c)}, makes the contrast on a niche or door` : ""}${coats}.`;
  }
  const around = light ? `, with ${light.name} on the walls around it and the ceiling` : "";
  // a pale accent next to a pale surround adds nothing on a one-wall scheme, so it is left out
  const small = accent && lrvBand(accent.lrv) !== "light" ? ` and ${accent.name}, ${describe(accent, c)}, as a small accent` : "";
  if (band === "deep") return `Keep it to one wall of ${room} that gets daylight${around}${small}${coats}.`;
  return `Its colour is strong enough that one wall of ${room} carries it${around}${small}.`;
}

const LIGHT_COPY: Record<LrvBand, Record<Warmth, (short: string) => string>> = {
  light: {
    warm: (s) => `Midday sun bleaches it towards white; warm evening bulbs bring its ${s} back.`,
    cool: (s) => `Midday sun bleaches it towards white; cool tube lights sharpen its ${s}.`,
    neutral: () => "Midday sun bleaches it towards white, and it shifts little under bulbs.",
  },
  mid: {
    warm: (s) => `Sun lifts it on a bright wall; warm bulbs keep its ${s} glowing, tube lights flatten it.`,
    cool: (s) => `Sun lifts it on a bright wall; tube lights push its ${s} cooler, warm bulbs soften it.`,
    neutral: () => "Sun lifts it on a bright wall, while tube lights can make it look flat.",
  },
  deep: {
    warm: (s) => `In a dim corner it can look nearly black by evening; warm bulbs bring its ${s} back.`,
    cool: (s) => `In a dim corner it can look nearly black by evening; tube lights deepen its ${s}, warm bulbs help.`,
    neutral: () => "In a dim corner it can look nearly black by evening, so light it with warm bulbs.",
  },
};

/** What the shade's LRV means on the wall, in three short paragraphs: the number against its neighbours, how many walls, and how it changes with the light. */
export function lrvExplanation(c: Colour): string[] {
  const u = undertone(c);
  return [lrvSentence(c, u), wallsSentence(c, u), LIGHT_COPY[lrvBand(c.lrv)][u.warmth](u.short)];
}

// --- Rooms (the "where it works" section) -----------------------------------------------------

type RoomMode = "light" | "mid" | "feature";
const modeOf = (c: Pick<Colour, "walls" | "lrv">): RoomMode => (c.walls === "feature" ? "feature" : lrvBand(c.lrv) === "light" ? "light" : "mid");

// What the room needs from a shade of this depth and walls advice. No finish is named here: the
// finish comes from the shade's own quote (finishClause), so the copy never promises a finish we
// do not quote.
const ROOM_WHY: Record<Room, Record<RoomMode, string>> = {
  "Living room": {
    light: "Keeps the busiest room open and lets furniture stand out",
    mid: "Hides handprints and dust better than a pale shade",
    feature: "One wall behind the sofa or TV as the focal point",
  },
  Bedroom: {
    light: "Keeps a small bedroom from feeling boxed in",
    mid: "Restful all the way round",
    feature: "Behind the bed as one feature wall",
  },
  Kitchen: {
    light: "Keeps a kitchen bright to cook in",
    mid: "Warm without showing every mark",
    feature: "On one wall away from the hob, such as the dining side",
  },
  "Kids room": {
    light: "Cheerful and easy to touch up as the child grows",
    mid: "Playful without being loud",
    feature: "One accent wall behind the bed or study desk",
  },
  "Pooja room": {
    light: "A calm backdrop for brass, flowers and diyas",
    mid: "A quiet colour for the alcove or the whole room",
    feature: "On the back panel behind the deities, framed by a lighter shade",
  },
  Exterior: {
    light: "Reflects the summer sun, so outside walls stay cooler",
    mid: "Hides dust better than white on outside walls",
    feature: "On gate pillars, a door or trim rather than whole walls, since strong colours fade faster in full sun",
  },
  Balcony: {
    light: "Makes a small balcony feel larger",
    mid: "Sits well with plants and hides dust",
    feature: "One balcony wall as a backdrop for plants or seating",
  },
  "Rental refresh": {
    light: "Easy to live with and quick to touch up between tenants",
    mid: "Hides marks better than bright white between tenants",
    feature: "Only for a single wall, so the rest stays plain for the next tenant",
  },
};

/**
 * The room's general line for this shade: ROOM_WHY, except where the undertone changes what is
 * true. A cool kitchen shade is not "warm"; and fading in full sun is a strong colour's problem, so
 * a near-neutral kept off whole outside walls is kept off them for a lighter, cooler house instead.
 */
function roomWhy(room: Room, mode: RoomMode, u: Undertone): string {
  if (room === "Kitchen" && mode === "mid") return `${u.warmth === "cool" ? "Fresh" : u.warmth === "neutral" ? "Calm" : "Warm"} without showing every mark`;
  if (room === "Exterior" && mode === "feature" && isNeutralish(u))
    return "On gate pillars, a door or trim rather than whole walls, so the main walls can take a lighter shade that keeps the house cooler in the sun";
  return ROOM_WHY[room][mode];
}

/** The finish we quote for this room, said only where it matters to the room (splashes, crayon, diya smoke, weather). */
function finishClause(c: Colour, room: Room): string {
  const f = roomFinish(c, room);
  if (f === "Exterior weatherproof")
    return room === "Balcony" ? "and it goes on in exterior weatherproof paint, since the wall is open to sun and rain" : "and it goes on in exterior weatherproof paint against dust and monsoon rain";
  const marks: Partial<Record<Room, string>> = { Kitchen: "cooking splashes", "Kids room": "crayon and hand marks", "Pooja room": "diya smoke" };
  const mark = marks[room];
  if (!mark) return "";
  if (f === "Washable") return `and the washable finish we quote lets ${mark} wipe off`;
  if (f === "Silk / sheen") return `and the silk / sheen finish we quote is easy to wipe clean of ${mark}`;
  return "";
}

// The paired shades are already named in the walls sentence, so the room cards draw on the
// palettes and the family neighbours instead; the order says which fact each room reaches for first.
// A ready palette for the room is the most specific fact, so most rooms try it first.
type DetailKind = "lighter" | "darker" | "palette";
const DETAIL_ORDER: Record<Room, Record<"all" | "feature", DetailKind[]>> = {
  "Living room": { all: ["palette", "darker", "lighter"], feature: ["palette", "lighter", "darker"] },
  Bedroom: { all: ["palette", "lighter", "darker"], feature: ["lighter", "palette", "darker"] },
  Kitchen: { all: ["darker", "palette", "lighter"], feature: ["lighter", "palette", "darker"] },
  "Kids room": { all: ["palette", "lighter", "darker"], feature: ["palette", "lighter", "darker"] },
  "Pooja room": { all: ["palette", "lighter", "darker"], feature: ["palette", "lighter", "darker"] },
  Exterior: { all: ["palette", "darker", "lighter"], feature: ["lighter", "palette", "darker"] },
  Balcony: { all: ["darker", "palette", "lighter"], feature: ["darker", "palette", "lighter"] },
  "Rental refresh": { all: ["palette", "darker", "lighter"], feature: ["palette", "lighter", "darker"] },
};

/**
 * What changes besides lightness on a step to a neighbour: for a white or grey its cast (by OKLab
 * b), for a colour how much colour it carries (by chroma).
 */
function stepChange(u: Undertone, x: Colour): string {
  const t = undertone(x);
  if (u.strength === "near-neutral") {
    const d = t.b - u.b;
    return d > CAST_STEP ? "and a little warmer" : d < -CAST_STEP ? "and a little cooler" : "with much the same cast";
  }
  const d = t.chroma - u.chroma;
  return d > 0.01 ? "with more colour in it" : d < -0.01 ? "with less colour in it" : "with about as much colour";
}

// How the undertone plays in a room, for a card the palettes and neighbours have not reached. Never
// used for the main room, whose undertone the line above the cards already covers.
const ROOM_TONE: Record<Room, Record<Warmth, (short: string) => string>> = {
  "Living room": {
    warm: (s) => `Its ${s} sits well with wood and brass.`,
    cool: (s) => `Its ${s} keeps a sunny living room feeling calm.`,
    neutral: () => "Neither warm nor cool, it lets cushions and art carry the colour.",
  },
  Bedroom: {
    warm: (s) => `Its ${s} stays gentle under a bedside lamp.`,
    cool: (s) => `Its ${s} keeps a bedroom feeling fresh on summer nights.`,
    neutral: () => "Neither warm nor cool, it leaves the colour to bedding and curtains.",
  },
  Kitchen: {
    warm: (s) => `Its ${s} sits well with wooden cabinets.`,
    cool: (s) => `Its ${s} looks clean next to steel and white tiles.`,
    neutral: () => "Neither warm nor cool, it goes with any counter or cabinet colour.",
  },
  "Kids room": {
    warm: (s) => `Its ${s} keeps the room cheerful.`,
    cool: (s) => `Its ${s} looks fresh beside bright toys and books.`,
    neutral: () => "Neither warm nor cool, it lets toys and posters bring the colour.",
  },
  "Pooja room": {
    warm: (s) => `Its ${s} glows in diya and lamp light.`,
    cool: (s) => `Its ${s} gives brass and marigolds a cool backdrop.`,
    neutral: () => "Neither warm nor cool, it lets brass and flowers stand out.",
  },
  Exterior: {
    warm: (s) => `Its ${s} suits brick and sandstone.`,
    cool: (s) => `Its ${s} stands out against brick and sandstone.`,
    neutral: () => "Neither warm nor cool, it sits with any trim colour.",
  },
  Balcony: {
    warm: (s) => `Its ${s} sits well with terracotta pots.`,
    cool: (s) => `Its ${s} sets off green plants.`,
    neutral: () => "Neither warm nor cool, it lets the plants bring the colour.",
  },
  "Rental refresh": {
    warm: (s) => `Its ${s} goes with most furniture a tenant brings.`,
    cool: (s) => `Its ${s} reads clean in an empty flat.`,
    neutral: () => "Neither warm nor cool, it goes with whatever furniture a tenant brings.",
  },
};

/**
 * One data-led line per room card, each from a different fact so no two cards on a page repeat:
 * a ready palette for that room, or the next lighter or deeper shade of its family and what else
 * changes on that step. A room the facts do not reach gets how its undertone plays there, unless
 * it is the main room.
 */
function roomDetails(c: Colour, u: Undertone): Map<Room, string> {
  const { lighter, darker } = neighbours(c);
  const noun = familySingular[c.family];
  const ps = palettesUsing(c.code);
  const mode = modeOf(c);
  const used = new Set<string>();
  const out = new Map<Room, string>();
  const render = (kind: DetailKind, room: Room): string | undefined => {
    const where = ROOM_SHORT[room];
    if (kind === "lighter") return lighter && `For a lighter ${where}, ${named(lighter)} is the next lighter ${noun}, at LRV ${lighter.lrv}, ${stepChange(u, lighter)}.`;
    if (kind === "darker")
      return darker && `For more depth ${isOutdoor(room) ? "on" : "in"} the ${where}, ${named(darker)} is the next deeper ${noun}, at LRV ${darker.lrv}, ${stepChange(u, darker)}.`;
    // a palette for this room, unless its role only repeats the card ("the back panel behind the deities")
    const base = roomWhy(room, mode, u).toLowerCase();
    const p = ps.find((x) => !used.has(x.slug) && x.rooms.includes(room) && !base.includes(paletteRole(x, c.code)!.replace(/^the /, "")));
    if (!p) return undefined;
    used.add(p.slug);
    return `In the “${p.name}” palette it is ${paletteRole(p, c.code)}.`;
  };
  c.rooms.forEach((room, i) => {
    for (const kind of DETAIL_ORDER[room][c.walls]) {
      if (kind !== "palette" && used.has(kind)) continue;
      const text = render(kind, room);
      if (!text) continue;
      used.add(kind);
      out.set(room, text);
      return;
    }
    if (i > 0) out.set(room, ROOM_TONE[room][u.warmth](u.short));
  });
  return out;
}

/** Each room the shade suits, with why: for its walls advice and depth, one fact of its own, and the finish we quote for that room where it matters. */
export function roomGuidance(c: Colour): { room: Room; why: string }[] {
  const mode = modeOf(c);
  const u = undertone(c);
  const details = roomDetails(c, u);
  return c.rooms.map((room) => {
    const finish = finishClause(c, room);
    const why = `${roomWhy(room, mode, u)}${finish ? `, ${finish}` : ""}.`;
    return { room, why: [why, details.get(room)].filter(Boolean).join(" ") };
  });
}

/** The line above the room cards: where it is at its best and why its undertone suits that room, then the other rooms. */
export function roomsLead(c: Colour): string {
  const [main, ...rest] = c.rooms;
  if (!main) return `${c.name} has no room listed yet; the inspector can advise on site.`;
  const u = undertone(c);
  const outdoor = isOutdoor(main);
  const where = outdoor
    ? c.walls === "all"
      ? "on the outside walls of a house"
      : "on a door, gate pillars or a boundary wall outside"
    : `${c.walls === "all" ? "on every wall of" : "as one wall of"} ${ROOM_NOUN[main]}`;
  const reason =
    u.warmth === "warm"
      ? outdoor
        ? `where its ${u.short} suits brick, sandstone and jaali`
        : `where its ${u.short} feels cosy under evening bulbs`
      : u.warmth === "cool"
        ? outdoor
          ? `where its ${u.short} stands out against warm brick and sandstone`
          : `where its ${u.short} keeps the room calm in the heat of an Agra summer`
        : `where its ${u.short} lets furniture, fabrics and art set the mood`;
  const also = rest.length ? `, and it also suits ${list(rest.map((r) => ROOM_NOUN[r]))}` : "";
  return `${c.name} is at its best ${where}, ${reason}${also}.`;
}

/** The finish line under the room cards. */
export const finishLine = (c: Pick<Colour, "finish" | "rooms" | "lrv">) =>
  `Finish we quote: ${finishSummary(c)}; the quotation names the exact brand, range and finish you approve.`;

// --- Brand matches ----------------------------------------------------------------------------

/** The minimum a brand match needs here, so this module stays client-safe (brands.ts is server-only). */
export type BrandMatchLike = { brandName: string; shades: { name: string; code: string; distance: number }[] };

const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Whether a brand shade's code is a real shade-card code. PaintDB fills a missing code with the
 * slug of the name ("greenery", "sassy-pink"); printing that as a code would pass it off as one, so
 * the brand sentence (and any list of brand matches) shows the name alone for these.
 */
export const hasShadeCardCode = (s: { name: string; code: string }) => s.code !== slugOf(s.name) && !/^[a-z-]+$/.test(s.code);

/** "The nearest brand shades on screen are Asian Paints Pepper Leaf (8386), …", from the closest shade of each brand. */
export function brandSentence(c: Pick<Colour, "name">, matches: readonly BrandMatchLike[]): string {
  const best = matches.filter((m) => m.shades.length > 0).map((m) => ({ ...m.shades[0], brandName: m.brandName }));
  if (!best.length) return "";
  const labels = best.map((s) => `${s.brandName} ${s.name}${hasShadeCardCode(s) ? ` (${s.code})` : ""}`);
  const closest = [...best].sort((x, y) => x.distance - y.distance)[0];
  const close =
    best.length > 1 && best.every((s) => s.distance < 0.02)
      ? `, all within a just-visible difference of ${c.name}`
      : best.length > 1
        ? `, with the ${closest.brandName} shade the closest`
        : "";
  return `The nearest brand shades on screen are ${list(labels)}${close}.`;
}

// --- The whole guide ----------------------------------------------------------------------------

/** Every part of a shade page's guidance, in page order. */
export function shadeGuide(c: Colour, brandMatches: readonly BrandMatchLike[] = []) {
  return {
    facts: colourFacts(c),
    light: lrvExplanation(c),
    roomsLead: roomsLead(c),
    rooms: roomGuidance(c),
    finish: finishLine(c),
    brands: brandSentence(c, brandMatches),
  };
}
export type ShadeGuide = ReturnType<typeof shadeGuide>;

/** The guidance as one list of paragraphs, in page order. */
export function guideParagraphs(g: ShadeGuide): string[] {
  return [...g.facts, ...g.light, g.roomsLead, ...g.rooms.map((r) => r.why), g.finish, g.brands].filter(Boolean);
}

// --- Links and labels -------------------------------------------------------------------------

export type ServiceSlug = "interior-painting" | "exterior-painting" | "rental-property-painting";

/** Service pages that fit the shade: interior painting for inside rooms, exterior for outside walls, rental painting for a rental refresh. */
export function serviceSlugsFor(c: Pick<Colour, "rooms">): ServiceSlug[] {
  const out: ServiceSlug[] = [];
  if (c.rooms.some((r) => !isOutdoor(r))) out.push("interior-painting");
  if (c.rooms.some((r) => isOutdoor(r))) out.push("exterior-painting");
  if (c.rooms.includes("Rental refresh")) out.push("rental-property-painting");
  return out;
}

/** How close a brand shade is, from its OKLab distance (about 0.02 is a just-visible difference). */
export function matchLabel(distance: number): string {
  if (distance < 0.02) return "Very close match";
  if (distance < 0.05) return "Close match";
  return "Nearest in this range";
}
