import { describe, expect, it } from "vitest";
import { colours, curatedColours, finishes, rooms, type Colour } from "@/config/colours";
import { nearestBrandShades } from "@/lib/colours/brands";
import {
  brandSentence,
  colourFacts,
  familyPhrase,
  finishLine,
  finishSummary,
  guideParagraphs,
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

const ONE_WALL = /\b(one|feature|single) wall\b/i;
const ALL_WALLS = /\ball four walls\b|\bevery wall\b/i;
const FINISH_WORDS = /\b(matt|emulsion|washable|silk|sheen|weatherproof)\b/gi;

describe("LRV label", () => {
  it("labels the same bands the notes use", () => {
    expect(lrvLabel(88)).toBe("light, opens a room");
    expect(lrvLabel(56)).toBe("mid, easy to live with");
    expect(lrvLabel(35)).toBe("mid, easy to live with");
    expect(lrvLabel(34)).toBe("deep, feature wall");
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
    expect(undertoneFacts(undertone(shade("PM-303")))[2]).toEqual({ label: "Leans to", value: "No lean" });
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
  });

  it("advises walls from the curated walls field, with the shade's own pairings", () => {
    const [, sage] = lrvExplanation(shade("PM-502"));
    expect(sage).toBe("It shows real colour yet stays light enough for all four walls of a bedroom with a decent window, with Chalk on the ceiling, and Jute makes the contrast on a niche or door.");
    expect(lrvExplanation(shade("PM-101"))[1]).toMatch(/all four walls of a living room and on the ceiling/);
    // Marigold is mid-band but curated as one wall: the band copy no longer says "all four walls"
    const marigold = lrvExplanation(shade("PM-301"))[1];
    expect(marigold).toMatch(/one wall of a pooja room carries it, with Taj White on the walls around it/);
    expect(marigold).not.toMatch(ALL_WALLS);
    expect(lrvExplanation(shade("PM-205"))[1]).toMatch(/^Keep it to one wall of a living room that gets daylight.*tinted primer and two finish coats/);
    expect(lrvExplanation(shade("PM-401"))[1]).toMatch(/^Outside, keep Terracotta to a door, gate pillars.*soaks up about 82% of the light/);
    expect(lrvExplanation(shade("PM-201"))[1]).toMatch(/^Outside, Agra Stone is light enough for the whole of the house walls, with Taj White on the trim/);
    expect(lrvExplanation({ ...shade("PM-201"), pairsWith: [] })[1]).toBe("Outside, Agra Stone is light enough for the whole of the house walls.");
    expect(lrvExplanation({ ...shade("PM-301"), pairsWith: [] })[1]).toBe("Its colour is strong enough that one wall of a pooja room carries it.");
  });

  it("describes the light for the band and the undertone", () => {
    expect(lrvExplanation(shade("PM-101"))[2]).toMatch(/^Midday sun.*warm, creamy cast back/);
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
      const text = `${c.note} ${textOf(c)}`.replace(/“[^”]*”/g, "“palette”");
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

  it("adds one fact of the shade's own to each card: a neighbour or a palette for that room", () => {
    const sage = roomGuidance(shade("PM-502"));
    expect(sage[0].why).toMatch(/For a softer bedroom, Mint \(PM-2003\) is a step lighter at LRV 68\./);
    expect(sage[1].why).toMatch(/If you want more colour in the living room, Sage Green \(PM-2005\) is a step deeper/);
    expect(sage[2].why).toBe("Warm without showing every mark."); // facts used up: the general line only
    expect(roomGuidance(shade("PM-101")).find((n) => n.room === "Rental refresh")!.why).toMatch(/In the “Rental refresh” palette it is the walls throughout\./);
    // a palette role that only repeats the card is skipped (Kesar's back panel)
    expect(roomGuidance(shade("PM-302"))[0].why).not.toMatch(/palette/);
    expect(roomGuidance(shade("PM-401")).find((n) => n.room === "Balcony")!.why).toMatch(/more colour on the balcony/);
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

  it("compares a white or grey's cast with the other curated shades of its family", () => {
    expect(colourFacts(shade("PM-101"))[1]).toMatch(/cooler than Morning Milk and warmer than Cotton/);
    expect(colourFacts(shade("PM-103"))[1]).toMatch(/the warmest of the curated whites, with Taj White the next cooler/);
    expect(colourFacts(shade("PM-205"))[1]).toMatch(/the coolest of the curated greys, with Dove the next warmer/);
    expect(colourFacts(shade("PM-1001"))).toHaveLength(2); // generated: no guide sentence
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
});

describe("curated pages say something of their own", () => {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // the reviewer's check: swap out the shade's own name, code, hex and LRV, then compare
  const normalise = (c: Colour, s: string) =>
    s
      .replace(new RegExp(esc(c.name), "g"), "{name}")
      .replace(new RegExp(esc(c.code), "g"), "{code}")
      .replace(new RegExp(esc(c.hex), "gi"), "{hex}")
      .replace(new RegExp(`\\b${c.lrv}\\b`, "g"), "{lrv}");
  const sentences = (c: Colour) => new Set(guideParagraphs(guideOf(c)).flatMap((p) => p.split(/(?<=[.!?])\s+(?=[A-Z“])/)).map((s) => normalise(c, s)));

  it("shares fewer than 40% of its guide sentences with any other curated page", () => {
    const sets = curatedColours.map((c) => ({ code: c.code, s: sentences(c) }));
    let worst = { ratio: 0, pair: "" };
    for (let i = 0; i < sets.length; i++)
      for (let j = i + 1; j < sets.length; j++) {
        const [a, b] = [sets[i].s, sets[j].s];
        const shared = [...a].filter((x) => b.has(x)).length;
        const ratio = shared / Math.min(a.size, b.size);
        if (ratio > worst.ratio) worst = { ratio, pair: `${sets[i].code}/${sets[j].code}` };
      }
    expect(worst.ratio, worst.pair).toBeLessThan(0.4);
  });

  it("gives no two curated pages the same rooms block", () => {
    const blocks = curatedColours.map((c) => {
      const g = guideOf(c);
      return normalise(c, [g.roomsLead, ...g.rooms.map((r) => `${r.room}: ${r.why}`), g.finish].join("\n"));
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
});
