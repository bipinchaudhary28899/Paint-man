import { describe, expect, it } from "vitest";
import { colours, curatedColours, finishes, rooms, type Colour } from "@/config/colours";
import { lrvBand } from "@/config/shades";
import { nearestBrandShades } from "@/lib/colours/brands";
import {
  brandSentence,
  colourFacts,
  familyPhrase,
  finishLine,
  finishSummary,
  guideParagraphs,
  hasShadeCardCode,
  lrvExplanation,
  lrvLabel,
  matchLabel,
  roomFinish,
  roomGuidance,
  roomsLead,
  serviceSlugsFor,
  shadeGuide,
  undertone,
  undertoneFacts,
} from "@/lib/colours/guide";
import { neighbours } from "@/lib/colours/search";

const shade = (code: string) => colours.find((c) => c.code === code)!;
const MATCH_BRANDS = ["asian-paints", "berger", "nerolac"];
const guideOf = (c: Colour) => shadeGuide(c, nearestBrandShades(c.hex, MATCH_BRANDS, 2));
const textOf = (c: Colour) => guideParagraphs(guideOf(c)).join(" ");
/** Everything a shade page says about the shade in our words: the guide (without the brand names, which are the brands' own), the fact box and the LRV label. */
const ownText = (c: Colour) =>
  [...guideParagraphs({ ...guideOf(c), brands: "" }), ...undertoneFacts(undertone(c)).map((f) => f.value), lrvLabel(c)].join(" ");

const ONE_WALL = /\b(one|feature|single) wall\b/i;
const ALL_WALLS = /\ball four walls\b|\bevery wall\b/i;
const FINISH_WORDS = /\b(matt|emulsion|washable|silk|sheen|weatherproof)\b/gi;
const neutralish = (c: Colour) => ["near-neutral", "muted"].includes(undertone(c).strength);

describe("LRV label", () => {
  it("labels the same bands the notes use", () => {
    expect(lrvLabel(88)).toBe("light, opens a room");
    expect(lrvLabel(56)).toBe("mid, easy to live with");
    expect(lrvLabel(35)).toBe("mid, easy to live with");
    expect(lrvLabel(34)).toBe("deep, feature wall");
  });

  it("follows the shade's walls advice, so a one-wall mid shade is never 'easy to live with'", () => {
    // Marigold's note says "One wall is plenty"; Gulabi's "one wall in a kids room"
    expect(lrvLabel(shade("PM-301"))).toBe("mid, one wall");
    expect(lrvLabel(shade("PM-701"))).toBe("mid, one wall");
    expect(lrvLabel(shade("PM-302"))).toBe("mid, one wall");
    expect(lrvLabel(shade("PM-502"))).toBe("mid, easy to live with");
    expect(lrvLabel(shade("PM-101"))).toBe("light, opens a room");
    expect(lrvLabel(shade("PM-205"))).toBe("deep, feature wall");
    expect(lrvLabel({ lrv: 70, walls: "feature" })).toBe("light, one wall");
    expect(lrvLabel({ lrv: 20, walls: "all" })).toBe("deep, needs good daylight");
    for (const c of colours) {
      const label = lrvLabel(c);
      expect(label.split(",")[0], c.code).toBe(lrvBand(c.lrv));
      if (c.walls === "feature") expect(label, c.code).toMatch(ONE_WALL);
      else expect(label, c.code).not.toMatch(ONE_WALL);
    }
  });
});

describe("undertone, read from the hex", () => {
  it("reads a greyed green's lean and warmth", () => {
    const sage = undertone(shade("PM-502"));
    expect(sage).toMatchObject({ strength: "greyed", lean: "yellow", warmth: "warm", phrase: "a greyed green with a slight yellow lean" });
    expect(sage.b).toBeGreaterThan(0);
    expect(sage.a).toBeLessThan(0);
    expect(undertone(shade("PM-504"))).toMatchObject({ strength: "rich", lean: "blue", warmth: "cool" });
  });

  it("gives whites and greys a cast instead of a lean", () => {
    expect(undertone(shade("PM-205"))).toMatchObject({ strength: "near-neutral", warmth: "cool", cast: "cool, blue", phrase: "a grey with a faint cool, blue cast" });
    expect(undertone(shade("PM-103")).phrase).toBe("a white with a clear warm, creamy cast");
    expect(undertone(shade("PM-102"))).toMatchObject({ warmth: "neutral", cast: "none", phrase: "a white with almost no colour cast" });
    expect(undertone({ hex: "#f0e0dc", family: "Whites" })).toMatchObject({ warmth: "warm", cast: "pink-beige" });
    expect(undertone({ hex: "#c8d4d4", family: "Greys" })).toMatchObject({ warmth: "cool", cast: "green-grey" });
  });

  it("calls a white creamy only when its yellow cast is clear, and a warm grey greige", () => {
    // Cotton's note: "A grey-white for people who find cream too yellow"
    expect(undertone(shade("PM-104"))).toMatchObject({ warmth: "warm", cast: "warm", phrase: "a white with a faint warm cast", short: "warm cast" });
    expect(undertone(shade("PM-101"))).toMatchObject({ cast: "warm", phrase: "a white with a faint warm cast" });
    expect(undertone(shade("PM-103"))).toMatchObject({ cast: "warm, creamy", short: "warm, creamy cast" });
    // Dove ("a faint yellow cast") and Pebble ("a hint of brown")
    expect(undertone(shade("PM-202"))).toMatchObject({ cast: "warm, greige", phrase: "a grey with a faint warm, greige cast" });
    expect(undertone(shade("PM-203"))).toMatchObject({ cast: "warm, greige", phrase: "a grey with a faint warm, greige cast" });
    expect(undertone({ hex: "#d9cfc0", family: "Greys" }).phrase).toBe("a grey with a clear warm, greige cast");
    for (const c of colours) {
      const u = undertone(c);
      if (u.cast !== "warm, creamy") continue;
      expect(c.family, c.code).toBe("Whites");
      expect(u.b, c.code).toBeGreaterThan(0.018);
    }
  });

  it("gives a colour family no cast: with almost no colour it is muted", () => {
    expect(undertone(shade("PM-1501"))).toMatchObject({ strength: "muted", warmth: "warm", phrase: "a muted red, so pale it reads as a tinted white", short: "hint of red" });
    expect(undertone(shade("PM-1701"))).toMatchObject({ strength: "muted", warmth: "cool", phrase: "a muted purple, so pale it reads as a tinted white" });
    expect(undertone({ hex: "#8a8580", family: "Browns" })).toMatchObject({ strength: "muted", phrase: "a muted, greyed brown" });
    expect(undertone(shade("PM-1501")).cast).toBeUndefined();
    expect(undertoneFacts(undertone(shade("PM-1501")))).toEqual([
      { label: "Undertone", value: "Warm" },
      { label: "Colour", value: "Muted" },
      { label: "Leans to", value: "No lean" },
    ]);
    expect(colourFacts(shade("PM-1501"))[0]).toBe("Read from its hex, #FFEDEB, Rose Water is a muted red, so pale it reads as a tinted white, on the warm side.");
    for (const c of colours) {
      if (c.family === "Whites" || c.family === "Greys") continue;
      expect(undertone(c).cast, c.code).toBeUndefined();
      // our own copy, leaving out the curated guide sentence (Jute's says "a clear yellow-brown cast" in its own words)
      const own = guideParagraphs({ ...guideOf(c), facts: colourFacts(c).filter((p) => p !== c.guide), brands: "" }).join(" ");
      expect(own, c.code).not.toMatch(/\bcast\b/);
    }
  });

  it("says which way a shade leans from the middle of its family, and how strongly", () => {
    expect(undertone(shade("PM-702"))).toMatchObject({ strength: "pastel", lean: "peach", phrase: "a pastel pink that leans to peach" });
    expect(undertone(shade("PM-703")).lean).toBe("pink");
    expect(undertone(shade("PM-804")).lean).toBe("red"); // a deep plum reads red, not pink
    expect(undertone(shade("PM-801")).strength).toBe("strong");
    expect(undertone(shade("PM-303")).lean).toBeUndefined();
    expect(undertone({ hex: "#7a7ab8", family: "Purples" })).toMatchObject({ lean: "blue", warmth: "cool", phrase: "a rich purple with a slight blue lean" });
  });

  it("summarises the undertone for the fact box", () => {
    expect(undertoneFacts(undertone(shade("PM-502")))).toEqual([
      { label: "Undertone", value: "Warm" },
      { label: "Colour", value: "Greyed" },
      { label: "Leans to", value: "Yellow" },
    ]);
    expect(undertoneFacts(undertone(shade("PM-205")))[2]).toEqual({ label: "Cast", value: "Cool, blue" });
    expect(undertoneFacts(undertone(shade("PM-104")))[2]).toEqual({ label: "Cast", value: "Warm" });
    expect(undertoneFacts(undertone(shade("PM-303")))[2]).toEqual({ label: "Leans to", value: "No lean" });
  });
});

describe("no page calls a shade creamy against its own copy", () => {
  it("never calls a shade creamy when its note or guide speaks against cream, and never a grey", () => {
    const againstCream = /cream too yellow|never tips into cream/i;
    const checked = colours.filter((c) => againstCream.test(`${c.note} ${c.guide ?? ""}`));
    expect(checked.map((c) => c.code)).toContain("PM-104");
    for (const c of checked) expect(ownText(c), c.code).not.toMatch(/creamy/i);
    for (const c of colours.filter((x) => x.family === "Greys")) expect(ownText(c), c.code).not.toMatch(/creamy/i);
  });

  it("keeps 'creamy' for a clear cream cast: today only Morning Milk", () => {
    expect(colours.filter((c) => /creamy/i.test(ownText(c))).map((c) => c.code)).toEqual(["PM-103"]);
    const cotton = ownText(shade("PM-104"));
    expect(cotton).toContain("Cotton is a white with a faint warm cast");
    expect(cotton).toContain("warm evening bulbs bring its warm cast back");
    expect(cotton).toContain("where its warm cast feels cosy under evening bulbs");
  });
});

describe("light and depth", () => {
  it("states the shade's own LRV against its lighter and darker neighbours by name", () => {
    const sage = shade("PM-502");
    const [first] = lrvExplanation(sage);
    const { lighter, darker } = neighbours(sage);
    expect(first).toContain("At LRV 56, Sage Mist reflects roughly 56%");
    expect(first).toContain(`${lighter!.name} (${lighter!.code}) at LRV ${lighter!.lrv}, the next step lighter among the greens`);
    expect(first).toContain(`${darker!.name} (${darker!.code}) at LRV ${darker!.lrv}, the next step darker`);
    expect(first).toMatch(/less colour than either/);
    expect(lrvExplanation(shade("PM-102"))[0]).toMatch(/the most of any of the whites; Snow \(PM-1001\) at LRV 88 is the next step darker/);
    const darkest = colours.filter((c) => c.family === "Greys").sort((a, b) => a.lrv - b.lrv)[0];
    expect(lrvExplanation(darkest)[0]).toMatch(/the least of any of the greys; .* is the next step lighter/);
    expect(lrvExplanation(shade("PM-401"))[0]).toMatch(/more colour than either/);
    // with one neighbour, the comparison names it
    expect(lrvExplanation(shade("PM-1501"))[0]).toMatch(/Coral Blush \(PM-1502\) at LRV 77 is the next step darker, and it carries less colour than Coral Blush\.$/);
  });

  it("says whether a white or grey gets warmer or cooler a step lighter or darker", () => {
    expect(lrvExplanation(shade("PM-101"))[0]).toMatch(/; it is warmer than the lighter step and cooler than the darker one\.$/);
    expect(lrvExplanation(shade("PM-104"))[0]).toMatch(/; it is cooler than the lighter step and close in cast to the darker one\.$/);
    expect(lrvExplanation(shade("PM-103"))[0]).toMatch(/, and it is warmer than either\.$/);
    expect(lrvExplanation(shade("PM-1103"))[0]).toMatch(/, and it is cooler than either\.$/);
    expect(lrvExplanation(shade("PM-1107"))[0]).toMatch(/, with much the same cast as both\.$/);
    expect(lrvExplanation(shade("PM-102"))[0]).toMatch(/is the next step darker, with much the same cast\.$/);
    expect(lrvExplanation(shade("PM-1004"))[0]).toMatch(/is the next step lighter, and Rice is the warmer of the two\.$/);
  });

  it("advises walls from the curated walls field, with the shade's own pairings", () => {
    const [, sage] = lrvExplanation(shade("PM-502"));
    expect(sage).toBe("It shows real colour yet stays light enough for all four walls of a bedroom with a decent window, with Chalk on the ceiling, and Jute, a mid beige, makes the contrast on a niche or door.");
    // a near-neutral grey does not "show real colour"
    expect(lrvExplanation(shade("PM-202"))[1]).toMatch(/^It reads as a soft neutral rather than a colour, and stays light enough for all four walls of a bedroom/);
    expect(lrvExplanation(shade("PM-101"))[1]).toMatch(/all four walls of a living room and on the ceiling/);
    // Marigold is mid-band but curated as one wall: the band copy no longer says "all four walls"
    const marigold = lrvExplanation(shade("PM-301"))[1];
    expect(marigold).toBe("Its colour is strong enough that one wall of a pooja room carries it, with Taj White on the walls around it and the ceiling and Slate, a deep grey, as a small accent.");
    expect(marigold).not.toMatch(ALL_WALLS);
    expect(lrvExplanation(shade("PM-205"))[1]).toMatch(/^Keep it to one wall of a living room that gets daylight.*tinted primer and two finish coats/);
    expect(lrvExplanation(shade("PM-401"))[1]).toMatch(/^Outside, keep Terracotta to a door, gate pillars.*soaks up about 82% of the light/);
    expect(lrvExplanation(shade("PM-201"))[1]).toBe(
      "On a house front, Agra Stone is light enough for all the outside walls, with Taj White on the trim and parapet and Rose Brick, a deep brown, on the gate or pillars.",
    );
    expect(lrvExplanation({ ...shade("PM-201"), pairsWith: [] })[1]).toBe("On a house front, Agra Stone is light enough for all the outside walls.");
    expect(lrvExplanation({ ...shade("PM-301"), pairsWith: [] })[1]).toBe("Its colour is strong enough that one wall of a pooja room carries it.");
    for (const c of colours) expect(lrvExplanation(c)[1], c.code).not.toMatch(/whole of the house/);
  });

  it("leaves out a pale accent on a one-wall scheme, and says what each paired shade is", () => {
    // Tulsi and Jaggery pair with Taj White and Morning Milk: Morning Milk is no accent beside Taj White
    for (const code of ["PM-501", "PM-402"]) {
      const walls = lrvExplanation(shade(code))[1];
      expect(walls, code).toMatch(/with Taj White on the walls around it and the ceiling; as a deep shade/);
      expect(walls, code).not.toMatch(/Morning Milk|small accent/);
    }
    expect(lrvExplanation(shade("PM-203"))[1]).not.toMatch(/Blush/);
    expect(lrvExplanation(shade("PM-603"))[1]).toMatch(/and Marigold, a mid yellow, as a small accent/);
    for (const c of colours) {
      const accent = /and ([A-Z][A-Za-z ]+), an? [a-z ]+, as a small accent/.exec(lrvExplanation(c)[1]);
      if (accent) expect(lrvBand(colours.find((x) => x.name === accent[1])!.lrv), c.code).not.toBe("light");
    }
    // a white is described against the shade it sits with
    expect(lrvExplanation(shade("PM-1004"))[1]).toMatch(/and Snow, a lighter white, makes the contrast/);
    expect(lrvExplanation(shade("PM-1001"))[1]).toMatch(/and Rice, a deeper white, makes the contrast/);
    // a generated near-white takes Taj White as its ceiling and its own family's shade as the accent
    expect(lrvExplanation(shade("PM-1501"))[1]).toMatch(/with Taj White on the ceiling, and Coral, a mid red, makes the contrast/);
  });

  it("describes the light for the band and the undertone", () => {
    expect(lrvExplanation(shade("PM-101"))[2]).toBe("Midday sun bleaches it towards white; warm evening bulbs bring its warm cast back.");
    expect(lrvExplanation(shade("PM-103"))[2]).toMatch(/warm, creamy cast back/);
    expect(lrvExplanation(shade("PM-1501"))[2]).toMatch(/bring its hint of red back/);
    expect(lrvExplanation(shade("PM-102"))[2]).toMatch(/shifts little under bulbs/);
    expect(lrvExplanation(shade("PM-601"))[2]).toMatch(/push its soft colour cooler/);
    expect(lrvExplanation(shade("PM-603"))[2]).toMatch(/nearly black by evening; tube lights deepen its violet lean/);
    for (const c of colours) expect(lrvExplanation(c).every((p) => p.endsWith(".") && !p.includes("undefined"))).toBe(true);
  });
});

describe("one advice per page: walls never contradict the note", () => {
  it("never says one or feature wall and all four walls on the same page, across the whole catalogue", () => {
    for (const c of colours) {
      // palette names (“Dramatic feature wall”) are names, not advice
      const text = `${c.note} ${textOf(c)} ${lrvLabel(c)}`.replace(/“[^”]*”/g, "“palette”");
      expect(ONE_WALL.test(text) && /all four walls/i.test(text), `${c.code}: ${text}`).toBe(false);
      if (c.walls === "feature") expect(text, c.code).not.toMatch(ALL_WALLS);
      else expect(text, c.code).not.toMatch(ONE_WALL);
    }
  });

  it("keeps the reviewer's examples consistent with their notes", () => {
    for (const code of ["PM-301", "PM-701"]) {
      const text = textOf(shade(code));
      expect(text).toMatch(/one wall/);
      expect(text).not.toMatch(/all four walls/);
      expect(lrvLabel(shade(code))).not.toMatch(/easy to live with/);
    }
  });
});

describe("rooms", () => {
  it("gives a reason for every room a shade suits, in its order", () => {
    for (const c of colours) {
      const notes = roomGuidance(c);
      expect(notes.map((n) => n.room)).toEqual(c.rooms);
      for (const n of notes) {
        expect(n.why.length, `${c.code} ${n.room}`).toBeGreaterThan(20);
        expect(n.why).toMatch(/\.$/);
        expect(n.why).not.toContain("undefined");
      }
      // each card's own fact is used once per page
      const details = notes.map((n) => n.why.split(". ").slice(1).join(". ")).filter(Boolean);
      expect(new Set(details).size, c.code).toBe(details.length);
    }
  });

  it("never names a finish other than the one we quote for that room", () => {
    for (const c of colours) {
      for (const { room, why } of roomGuidance(c)) {
        const quoted = roomFinish(c, room).toLowerCase();
        for (const word of why.match(FINISH_WORDS) ?? []) expect(quoted, `${c.code} ${room}: ${why}`).toContain(word.toLowerCase());
        for (const word of why.match(FINISH_WORDS) ?? []) expect(finishSummary(c).toLowerCase()).toContain(word.toLowerCase());
      }
    }
    // the reviewer's examples: matt-quoted shades no longer promise a washable kitchen
    for (const code of ["PM-502", "PM-202"]) expect(roomGuidance(shade(code)).find((n) => n.room === "Kitchen")!.why).not.toMatch(/washable/i);
    expect(roomGuidance(shade("PM-303")).find((n) => n.room === "Kitchen")!.why).toMatch(/washable finish we quote lets cooking splashes wipe off/);
    expect(roomGuidance(shade("PM-604")).find((n) => n.room === "Kids room")!.why).toMatch(/silk \/ sheen finish we quote/);
    expect(roomGuidance(shade("PM-201")).find((n) => n.room === "Exterior")!.why).toMatch(/exterior weatherproof paint/);
    expect(roomGuidance(shade("PM-301")).find((n) => n.room === "Balcony")!.why).toMatch(/exterior weatherproof paint, since the wall is open/);
  });

  it("adds one fact of the shade's own to each card: a palette for that room, or a neighbour and what else changes on that step", () => {
    const sage = roomGuidance(shade("PM-502"));
    expect(sage[0].why).toBe("Restful all the way round. In the “Calm bedroom” palette it is the wall behind the bed.");
    expect(sage[1].why).toMatch(/For more depth in the living room, Sage Green \(PM-2005\) is the next deeper green, at LRV 43, with more colour in it\./);
    expect(sage[2].why).toBe("Warm without showing every mark. For a lighter kitchen, Mint (PM-2003) is the next lighter green, at LRV 68, with more colour in it.");
    expect(roomGuidance(shade("PM-101")).find((n) => n.room === "Rental refresh")!.why).toMatch(/In the “Rental refresh” palette it is the walls throughout\./);
    // a white or grey changes its cast, not its colour, on a step
    expect(roomGuidance(shade("PM-104")).find((n) => n.room === "Rental refresh")!.why).toMatch(/Morning Milk \(PM-103\) is the next lighter white, at LRV 84, and a little warmer\.$/);
    expect(roomGuidance(shade("PM-202")).find((n) => n.room === "Living room")!.why).toMatch(/is the next deeper grey, at LRV 53, and a little cooler\.$/);
    expect(roomGuidance(shade("PM-102"))[0].why).toMatch(/Snow \(PM-1001\) is the next deeper white, at LRV 88, with much the same cast\.$/);
    // a palette role that only repeats the card is skipped (Kesar's back panel)
    expect(roomGuidance(shade("PM-302"))[0].why).not.toMatch(/palette/);
    expect(roomGuidance(shade("PM-401")).find((n) => n.room === "Balcony")!.why).toMatch(/more depth on the balcony, Toffee \(PM-2208\) is the next deeper brown, at LRV 14, with less colour in it/);
    expect(roomGuidance(shade("PM-301")).find((n) => n.room === "Kids room")!.why).toMatch(/with about as much colour\.$/);
  });

  it("tells a room the facts did not reach how the undertone plays there, never on the main room", () => {
    expect(roomGuidance(shade("PM-102")).find((n) => n.room === "Bedroom")!.why).toBe(
      "Keeps a small bedroom from feeling boxed in. Neither warm nor cool, it leaves the colour to bedding and curtains.",
    );
    expect(roomGuidance(shade("PM-303")).find((n) => n.room === "Bedroom")!.why).toMatch(/Its soft colour stays gentle under a bedside lamp\.$/);
    expect(roomGuidance(shade("PM-202")).find((n) => n.room === "Kitchen")!.why).toMatch(/Its warm, greige cast sits well with wooden cabinets\.$/);
    expect(roomGuidance(shade("PM-1104")).find((n) => n.room === "Kitchen")!.why).toMatch(/Its cool, blue cast looks clean next to steel and white tiles\.$/);
    expect(roomGuidance(shade("PM-604")).find((n) => n.room === "Kids room")!.why).toMatch(/Its strong colour looks fresh beside bright toys and books\.$/);
    for (const c of colours) {
      const [main] = roomGuidance(c);
      if (!main) continue;
      expect(main.why, c.code).not.toContain(`Its ${undertone(c).short} `);
      expect(main.why, c.code).not.toContain("Neither warm nor cool");
    }
  });

  it("does not call a cool or neutral kitchen shade warm", () => {
    expect(roomGuidance(shade("PM-1104")).find((n) => n.room === "Kitchen")!.why).toMatch(/^Fresh without showing every mark/);
    expect(roomGuidance({ ...shade("PM-202"), hex: "#c6c6c6" }).find((n) => n.room === "Kitchen")!.why).toMatch(/^Calm without showing every mark/);
    for (const c of colours) {
      const kitchen = roomGuidance(c).find((n) => n.room === "Kitchen");
      if (kitchen && /^Warm without/.test(kitchen.why)) expect(undertone(c).warmth, c.code).toBe("warm");
    }
  });

  it("gives fading in full sun as the reason only for a shade with real colour", () => {
    const pebble = roomGuidance(shade("PM-203")).find((n) => n.room === "Exterior")!.why;
    expect(pebble).toMatch(/^On gate pillars, a door or trim rather than whole walls, so the main walls can take a lighter shade that keeps the house cooler in the sun/);
    expect(roomGuidance(shade("PM-401")).find((n) => n.room === "Exterior")!.why).toMatch(/since strong colours fade faster in full sun/);
    for (const c of colours.filter(neutralish))
      for (const { why } of roomGuidance(c)) expect(why, c.code).not.toMatch(/strong colours fade/);
  });

  it("leads with the main room, why the undertone suits it, and the other rooms", () => {
    expect(roomsLead(shade("PM-502"))).toBe("Sage Mist is at its best on every wall of a bedroom, where its yellow lean feels cosy under evening bulbs, and it also suits a living room and a kitchen.");
    expect(roomsLead(shade("PM-205"))).toMatch(/as one wall of a living room, where its cool, blue cast keeps the room calm in the heat of an Agra summer/);
    expect(roomsLead(shade("PM-102"))).toMatch(/lets furniture, fabrics and art set the mood/);
    expect(roomsLead(shade("PM-201"))).toMatch(/^Agra Stone is at its best on the outside walls of a house, where its yellow lean suits brick/);
    expect(roomsLead(shade("PM-604"))).toMatch(/on a door, gate pillars or a boundary wall outside, where its strong colour stands out against warm brick/);
    expect(roomsLead(shade("PM-404"))).not.toMatch(/also suits a living/);
    expect(roomsLead(shade("PM-804"))).toBe("Aubergine is at its best as one wall of a bedroom, where its red lean feels cosy under evening bulbs.");
    expect(roomsLead({ ...shade("PM-502"), rooms: [] })).toMatch(/no room listed yet/);
  });

  it("states both finishes when a shade suits inside and outside walls", () => {
    expect(finishSummary(shade("PM-502"))).toBe("Matt emulsion"); // inside only
    expect(finishSummary(shade("PM-404"))).toBe("Exterior weatherproof"); // outside only
    expect(finishSummary(shade("PM-201"))).toBe("Exterior weatherproof outside, matt emulsion indoors");
    expect(finishSummary(shade("PM-401"))).toBe("Exterior weatherproof outside, silk / sheen indoors");
    expect(finishSummary(shade("PM-203"))).toBe("Matt emulsion indoors, exterior weatherproof outside");
    expect(finishSummary(shade("PM-1205"))).toMatch(/indoors, exterior weatherproof outside$/);
    expect(roomFinish(shade("PM-401"), "Living room")).toBe("Silk / sheen");
    expect(roomFinish(shade("PM-203"), "Exterior")).toBe("Exterior weatherproof");
    expect(finishLine(shade("PM-502"))).toBe("Finish we quote: Matt emulsion; the quotation names the exact brand, range and finish you approve.");
    for (const c of colours) expect(finishes).toContain(roomFinish(c, c.rooms[0]));
  });

  it("links the service pages that fit, rental painting included", () => {
    expect(serviceSlugsFor(shade("PM-502"))).toEqual(["interior-painting"]);
    expect(serviceSlugsFor(shade("PM-404"))).toEqual(["exterior-painting"]);
    expect(serviceSlugsFor(shade("PM-201"))).toEqual(["interior-painting", "exterior-painting"]);
    expect(serviceSlugsFor(shade("PM-101"))).toEqual(["interior-painting", "rental-property-painting"]);
    for (const c of colours) expect(serviceSlugsFor(c).includes("rental-property-painting")).toBe(c.rooms.includes("Rental refresh"));
  });
});

describe("facts about the colour", () => {
  it("leads with the curated guide sentence, then the undertone and the palettes", () => {
    const [guide, tone, palettes] = colourFacts(shade("PM-502"));
    expect(guide).toBe(shade("PM-502").guide);
    expect(tone).toBe("Read from its hex, #B8C7B0, Sage Mist is a greyed green with a slight yellow lean, on the warm side.");
    expect(palettes).toBe("In the ready palettes it is the wall behind the bed in “Calm bedroom”.");
    expect(colourFacts(shade("PM-101"))[2]).toMatch(/the other walls and ceiling in “Calm bedroom” and “Dramatic feature wall”; .*; and the walls throughout in “Rental refresh”\.$/);
    expect(colourFacts(shade("PM-201"))[2]).toBe("In the ready palettes it is the main walls in “Agra stone exterior” and the trim and boundary in “White house, blue door”.");
    expect(colourFacts(shade("PM-205"))[2]).toBe("It is not in one of the ready palettes; the shades listed with it are Taj White (PM-101) and Marigold (PM-301).");
    expect(colourFacts({ ...shade("PM-205"), pairsWith: [] })[2]).toBe("It is not in one of the ready palettes.");
  });

  it("ranks a curated white or grey's cast among the curated shades of its family", () => {
    expect(colourFacts(shade("PM-101"))[1]).toMatch(/a faint warm cast, the second warmest of the curated whites: cooler than Morning Milk and warmer than Cotton\.$/);
    expect(colourFacts(shade("PM-104"))[1]).toMatch(/a faint warm cast, the second coolest of the curated whites: cooler than Taj White and warmer than Chalk\.$/);
    expect(colourFacts(shade("PM-103"))[1]).toMatch(/the warmest of the curated whites, with Taj White the next cooler/);
    expect(colourFacts(shade("PM-205"))[1]).toMatch(/the coolest of the curated greys, with Dove the next warmer/);
    expect(colourFacts(shade("PM-1001"))).toHaveLength(2); // generated: no guide sentence
  });

  it("places a generated white or grey against the curated ones without calling it curated", () => {
    expect(colourFacts(shade("PM-1103"))[0]).toMatch(/a faint cool, blue cast: cooler than Dove and warmer than Slate\.$/);
    expect(colourFacts(shade("PM-1104"))[0]).toMatch(/a faint cool, blue cast, much like Slate's\.$/);
    expect(colourFacts(shade("PM-1001"))[0]).toMatch(/almost no colour cast, much like Chalk's\.$/);
    // off the ends of the curated range (a made-up code, so it is not one of the curated shades)
    const cooler = colourFacts({ ...shade("PM-1104"), code: "PM-1199", hex: "#55607a" })[0];
    expect(cooler).toMatch(/, cooler than any of the curated greys, with Slate the nearest\.$/);
    const warmer = colourFacts({ ...shade("PM-1104"), code: "PM-1199", hex: "#a8987f" })[0];
    expect(warmer).toMatch(/, warmer than any of the curated greys, with Pebble the nearest\.$/);
    for (const c of colours.filter((x) => !x.guide)) expect(colourFacts(c).join(" "), c.code).not.toMatch(/\b(warmest|coolest) of the curated/);
  });

  it("names the nearest Asian Paints, Berger and Nerolac shades in a sentence", () => {
    const close = [
      { brandName: "Asian Paints", shades: [{ name: "Pepper Leaf", code: "8386", distance: 0.006 }] },
      { brandName: "Berger Paints", shades: [{ name: "Garden Walkway", code: "7T1508", distance: 0.012 }] },
    ];
    expect(brandSentence({ name: "Sage Mist" }, close)).toBe(
      "The nearest brand shades on screen are Asian Paints Pepper Leaf (8386) and Berger Paints Garden Walkway (7T1508), all within a just-visible difference of Sage Mist.",
    );
    const far = [close[0], { brandName: "Kansai Nerolac", shades: [{ name: "Far", code: "1", distance: 0.04 }] }];
    expect(brandSentence({ name: "X" }, far)).toMatch(/with the Asian Paints shade the closest\.$/);
    expect(brandSentence({ name: "X" }, [close[0]])).toBe("The nearest brand shades on screen are Asian Paints Pepper Leaf (8386).");
    expect(brandSentence({ name: "X" }, [{ brandName: "None", shades: [] }])).toBe("");
    expect(guideOf(shade("PM-104")).brands).toContain("Kansai Nerolac Dove's Wing-w (152)");
  });

  it("does not print PaintDB's slug fallback as if it were a brand's shade code", () => {
    const slugged = [
      { brandName: "Kansai Nerolac", shades: [{ name: "Greenery", code: "greenery", distance: 0.01 }] },
      { brandName: "Kansai Nerolac", shades: [{ name: "Cool Canteloupe", code: "cool-canteloupe", distance: 0.01 }] },
      { brandName: "Kansai Nerolac", shades: [{ name: "Sassy Pink!", code: "sassy-pink", distance: 0.01 }] },
      { brandName: "Somebrand", shades: [{ name: "Odd", code: "abc", distance: 0.01 }] },
      { brandName: "Sherwin-Williams", shades: [{ name: "Pure White", code: "SW 7005", distance: 0.01 }] },
    ];
    expect(brandSentence({ name: "X" }, slugged)).toBe(
      "The nearest brand shades on screen are Kansai Nerolac Greenery, Kansai Nerolac Cool Canteloupe, Kansai Nerolac Sassy Pink!, Somebrand Odd and Sherwin-Williams Pure White (SW 7005), all within a just-visible difference of X.",
    );
    expect(hasShadeCardCode({ name: "Botany", code: "botany" })).toBe(false);
    expect(hasShadeCardCode({ name: "Mecca Gold", code: "7982" })).toBe(true);
    expect(hasShadeCardCode({ name: "Pure White", code: "SW 7005" })).toBe(true);
    // the reviewer's examples, on the real pages
    expect(guideOf(shade("PM-501")).brands).toContain("Kansai Nerolac Greenery");
    expect(guideOf(shade("PM-503")).brands).toContain("Kansai Nerolac Botany,");
    expect(guideOf(shade("PM-702")).brands).toContain("Kansai Nerolac Cool Canteloupe,");
    expect(guideOf(shade("PM-404")).brands).toContain("Kansai Nerolac Sassy Pink,");
    for (const c of colours) expect(guideOf(c).brands, c.code).not.toMatch(/\([a-z-]+\)/);
  });
});

describe("curated pages say something of their own", () => {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Blank out every shade name and code in the catalogue (longest names first, so "Dove Grey" goes
  // before "Dove"), every hex and every number, so two pages that differ only in which shades and
  // numbers they quote compare as the same sentence.
  const names = [...new Set(colours.map((c) => c.name))].sort((a, b) => b.length - a.length);
  const anyName = new RegExp(`\\b(?:${names.map(esc).join("|")})\\b`, "g");
  const blank = (s: string) =>
    s
      .replace(/#[0-9a-f]{6}\b/gi, "{hex}")
      .replace(/\bPM-\d{3,4}\b/g, "{code}")
      .replace(anyName, "{name}")
      .replace(/\d+/g, "{n}");
  const sentences = (c: Colour) => new Set(guideParagraphs(guideOf(c)).flatMap((p) => p.split(/(?<=[.!?])\s+(?=[A-Z“])/)).map(blank));

  it("blanks every catalogue name, code and number", () => {
    expect(blank("Dove Grey (PM-1104) at LRV 53, next to Dove (PM-202) and #C9C6C1")).toBe("{name} ({code}) at LRV {n}, next to {name} ({code}) and {hex}");
  });

  // Measured maximum: 0.333 (PM-101/PM-104, 5 of 15 sentences: the light line, three general room
  // lines and the finish line, which every light, warm, matt white with those rooms shares).
  it("shares under 35% of its guide sentences with any other curated page, all shade names and numbers blanked", () => {
    const sets = curatedColours.map((c) => ({ code: c.code, s: sentences(c) }));
    let worst = { ratio: 0, pair: "" };
    for (let i = 0; i < sets.length; i++)
      for (let j = i + 1; j < sets.length; j++) {
        const [a, b] = [sets[i].s, sets[j].s];
        const shared = [...a].filter((x) => b.has(x)).length;
        const ratio = shared / Math.min(a.size, b.size);
        if (ratio > worst.ratio) worst = { ratio, pair: `${sets[i].code}/${sets[j].code}` };
      }
    expect(worst.ratio, worst.pair).toBeLessThan(0.35);
  });

  it("never renders the same room card for two curated shades, even with the same rooms and band", () => {
    const seen = new Map<string, string>();
    for (const c of curatedColours)
      for (const { room, why } of roomGuidance(c)) {
        const key = `${room}: ${blank(why)}`;
        expect(seen.get(key), `${c.code} ${key}`).toBeUndefined();
        seen.set(key, c.code);
      }
    // the reviewer's pairs: same rooms, same band
    for (const [x, y] of [["PM-502", "PM-202"], ["PM-101", "PM-104"]]) {
      const [a, b] = [roomGuidance(shade(x)), roomGuidance(shade(y))];
      for (const card of a) {
        const other = b.find((r) => r.room === card.room);
        if (other) expect(blank(card.why), `${x}/${y} ${card.room}`).not.toBe(blank(other.why));
      }
    }
  });

  it("gives no two curated pages the same rooms block", () => {
    const blocks = curatedColours.map((c) => {
      const g = guideOf(c);
      return blank([g.roomsLead, ...g.rooms.map((r) => `${r.room}: ${r.why}`), g.finish].join("\n"));
    });
    expect(new Set(blocks).size).toBe(curatedColours.length);
  });

  it("puts the pieces in page order", () => {
    const g = guideOf(shade("PM-502"));
    expect(guideParagraphs(g)).toEqual([...g.facts, ...g.light, g.roomsLead, ...g.rooms.map((r) => r.why), g.finish, g.brands]);
    expect(guideParagraphs(shadeGuide(shade("PM-502")))).not.toContain("");
  });
});

describe("wording helpers", () => {
  it("puts the right article before the family", () => {
    const of = (family: Colour["family"]) => familyPhrase({ family });
    expect(of("Greens")).toBe("a green");
    expect(of("Olives")).toBe("an olive green");
    expect(of("Oranges")).toBe("an orange");
    expect(of("Whites")).toBe("a white");
  });

  it("describes how close a brand match is", () => {
    expect(matchLabel(0.006)).toBe("Very close match");
    expect(matchLabel(0.03)).toBe("Close match");
    expect(matchLabel(0.08)).toBe("Nearest in this range");
  });

  it("covers every room and depth with copy", () => {
    for (const room of rooms)
      for (const [lrv, walls] of [[80, "all"], [50, "all"], [50, "feature"], [10, "feature"]] as const) {
        const c = { ...shade("PM-502"), rooms: [room], lrv, walls };
        expect(roomGuidance(c)[0].why, `${room} ${lrv} ${walls}`).toMatch(/^[A-Z].*\.$/);
      }
  });

  it("has an undertone line for every room and warmth", () => {
    // a second room the palettes and neighbours cannot reach (no neighbours: a made-up family member far off the ladder)
    for (const room of rooms)
      for (const hex of ["#c9a27a", "#7a9ac9", "#b0b0b0"]) {
        const c = { ...shade("PM-202"), code: "PM-1199", hex, lrv: 101, rooms: [room === "Bedroom" ? ("Kitchen" as const) : ("Bedroom" as const), room], pairsWith: [] };
        const card = roomGuidance(c).at(-1)!.why;
        expect(card, `${room} ${hex}`).toMatch(/\. (Its |Neither warm nor cool)[^.]+\.$/);
      }
  });
});
