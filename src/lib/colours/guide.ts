import type { Colour, Room } from "@/config/colours";
import { familySingular, interiorFinishFor, isOutdoor, lrvBand, type LrvBand } from "@/config/shades";

// Plain-language guidance for a shade's page and the finder's preview panel, built from the
// shade's own numbers (LRV band, rooms, finish) so every page says something specific to it.
// Client-safe: config only, no server data.

const LRV_LABELS: Record<LrvBand, string> = {
  light: "light, opens a room",
  mid: "mid, easy to live with",
  deep: "deep, feature wall",
};

/** Short label next to the LRV number, from the same bands as the notes and tags. */
export const lrvLabel = (lrv: number) => LRV_LABELS[lrvBand(lrv)];

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

const BAND_COPY: Record<LrvBand, { use: string; light: string }> = {
  light: {
    use: "That puts it in the light band: it bounces daylight back into the room, so a small room or one with a single window feels larger, and it is comfortable on all four walls.",
    light: "Under Agra's strong midday sun a pale wall can look almost white, and warmer under evening bulbs.",
  },
  mid: {
    use: "That puts it in the mid band: deep enough to show real colour, light enough for all four walls of a room with a decent window. In a small or dim room, keep it to one or two walls with a lighter shade on the rest.",
    light: "Agra's harsh afternoon sun lifts it on a sunlit wall, while cool tube lights flatten it at night.",
  },
  deep: {
    use: "That puts it in the deep band: it absorbs most of the light, so it reads richer and darker on a shaded wall than on the swatch. Use it on one feature wall that gets daylight, with a light shade on the other walls and the ceiling. Deep shades need a tinted primer and two finish coats, which we list on the quotation.",
    light: "On a wall that gets little light it can look close to black by evening, so warm bulbs help.",
  },
};

/** What the shade's LRV means for a room, in three short paragraphs. */
export function lrvExplanation(c: Pick<Colour, "name" | "lrv">): string[] {
  const band = BAND_COPY[lrvBand(c.lrv)];
  return [
    `LRV (light reflectance value) runs from 0 for black to 100 for pure white and tells you how much light a painted wall bounces back. ${c.name} has an LRV of ${c.lrv}, so it reflects roughly ${c.lrv}% of the light that falls on it.`,
    band.use,
    `${band.light} The inspector paints a test patch so you judge it in your own room's light before you decide.`,
  ];
}

const ROOM_WHY: Record<Room, Record<LrvBand, string>> = {
  "Living room": {
    light: "The room you use from morning to night; a light shade keeps it open and lets furniture and art stand out.",
    mid: "Colour you can live with on every wall, and it hides everyday handprints and dust better than a pale shade.",
    deep: "One feature wall behind the sofa or TV gives the room a focal point without making it feel smaller.",
  },
  Bedroom: {
    light: "Fresh in the morning light and calm at night, and it keeps a small bedroom from feeling boxed in.",
    mid: "A restful backdrop on all four walls; warm bulbs make it feel cosy in the evening.",
    deep: "Behind the bed as one feature wall, where it reads cosy under lamp light.",
  },
  Kitchen: {
    light: "Keeps a kitchen bright to cook in; ask for a washable finish so splashes wipe off.",
    mid: "Enough colour to feel warm without showing every mark; a washable finish copes with steam and splashes.",
    deep: "On one wall away from the hob, such as the dining side or behind open shelves, in a washable finish.",
  },
  "Kids room": {
    light: "Bright and cheerful, and easy to touch up as the room changes with the child.",
    mid: "Playful without being loud; a washable finish lets crayon and hand marks wipe off.",
    deep: "One accent wall behind the bed or study desk, with lighter walls around it.",
  },
  "Pooja room": {
    light: "A calm, light backdrop that lets brass, flowers and diyas stand out.",
    mid: "A warm, quiet colour for the alcove or the whole pooja room.",
    deep: "On the back panel behind the deities, framed by a lighter shade; a washable finish lets diya smoke wipe off.",
  },
  Exterior: {
    light: "Reflects the summer sun, so outside walls stay cooler; painted in exterior weatherproof paint against dust and monsoon rain.",
    mid: "Hides Agra's dust better than white on outside walls; we use exterior weatherproof paint, not interior emulsion.",
    deep: "Best on gate pillars, a front door, a boundary-wall cap or trim rather than whole outside walls, since deep shades absorb heat and fade faster in strong sun.",
  },
  Balcony: {
    light: "Makes a small balcony feel larger and stays cooler in the afternoon sun.",
    mid: "Sits well next to plants and hides dust on a wall that is half outdoors.",
    deep: "One balcony wall as a backdrop for plants or seating, with lighter walls beside it.",
  },
  "Rental refresh": {
    light: "A neutral that suits most tenants' furniture and is quick to touch up between tenancies.",
    mid: "Neutral enough for most tenants, and it hides marks better than bright white.",
    deep: "Only for a single wall in a rental, so the rest stays neutral for the next tenant.",
  },
};

/** Each room the shade suits, with why, for its depth. */
export function roomGuidance(c: Pick<Colour, "rooms" | "lrv">): { room: Room; why: string }[] {
  const band = lrvBand(c.lrv);
  return c.rooms.map((room) => ({ room, why: ROOM_WHY[room][band] }));
}

/** "a green", "an olive green", "an orange": the family as a singular adjective with its article. */
export function familyPhrase(c: Pick<Colour, "family">): string {
  const adj = familySingular[c.family];
  return `${/^[aeiou]/.test(adj) ? "an" : "a"} ${adj}`;
}

/** Service pages that fit the shade: interior painting for inside rooms, exterior painting for outside walls. */
export function serviceSlugsFor(c: Pick<Colour, "rooms">): ("interior-painting" | "exterior-painting")[] {
  const out: ("interior-painting" | "exterior-painting")[] = [];
  if (c.rooms.some((r) => !isOutdoor(r))) out.push("interior-painting");
  if (c.rooms.some((r) => isOutdoor(r))) out.push("exterior-painting");
  return out;
}

/** How close a brand shade is, from its OKLab distance (about 0.02 is a just-visible difference). */
export function matchLabel(distance: number): string {
  if (distance < 0.02) return "Very close match";
  if (distance < 0.05) return "Close match";
  return "Nearest in this range";
}
