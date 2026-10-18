import { describe, expect, it } from "vitest";
import { colours, rooms, type Colour } from "@/config/colours";
import { familyPhrase, finishSummary, lrvExplanation, lrvLabel, matchLabel, roomGuidance, serviceSlugsFor } from "@/lib/colours/guide";
import { getColour } from "@/lib/colours/search";

const shade = (code: string) => getColour(code)!;

describe("LRV guidance", () => {
  it("labels the same bands the notes use", () => {
    expect(lrvLabel(88)).toBe("light, opens a room");
    expect(lrvLabel(56)).toBe("mid, easy to live with");
    expect(lrvLabel(35)).toBe("mid, easy to live with");
    expect(lrvLabel(34)).toBe("deep, feature wall");
  });

  it("explains the shade's own LRV and what it means for the room", () => {
    const sage = lrvExplanation(shade("PM-502"));
    expect(sage).toHaveLength(3);
    expect(sage[0]).toContain("Sage Mist has an LRV of 56");
    expect(sage[0]).toContain("roughly 56%");
    expect(sage[1]).toMatch(/mid band/);
    expect(lrvExplanation(shade("PM-101"))[1]).toMatch(/light band/);
    const slate = lrvExplanation(shade("PM-205"));
    expect(slate[1]).toMatch(/deep band.*feature wall.*tinted primer/);
    expect(slate[2]).toMatch(/test patch/);
    // light shades talk about Agra's sun
    expect(lrvExplanation(shade("PM-101"))[2]).toMatch(/Agra/);
  });
});

describe("rooms and finishes", () => {
  it("gives a reason for every room a shade suits, for its depth", () => {
    for (const c of colours) {
      const notes = roomGuidance(c);
      expect(notes.map((n) => n.room)).toEqual(c.rooms);
      for (const n of notes) expect(n.why.length).toBeGreaterThan(30);
    }
    // every room has copy for every depth
    for (const room of rooms) for (const lrv of [80, 50, 10]) expect(roomGuidance({ rooms: [room], lrv })[0].why).toMatch(/\.$/);
    expect(roomGuidance(shade("PM-205"))[0].why).toMatch(/feature wall/); // Slate in a living room: one wall
    expect(roomGuidance(shade("PM-201")).find((n) => n.room === "Exterior")!.why).toMatch(/weatherproof/);
  });

  it("states both finishes when a shade suits inside and outside walls", () => {
    expect(finishSummary(shade("PM-502"))).toBe("Matt emulsion"); // inside only
    expect(finishSummary(shade("PM-404"))).toBe("Exterior weatherproof"); // outside only
    expect(finishSummary(shade("PM-201"))).toBe("Exterior weatherproof outside, matt emulsion indoors");
    expect(finishSummary(shade("PM-401"))).toBe("Exterior weatherproof outside, silk / sheen indoors");
    expect(finishSummary(shade("PM-203"))).toBe("Matt emulsion indoors, exterior weatherproof outside");
    const wheat = getColour("PM-1205")!;
    expect(finishSummary(wheat)).toMatch(/indoors, exterior weatherproof outside$/);
  });

  it("links the service that fits", () => {
    expect(serviceSlugsFor(shade("PM-502"))).toEqual(["interior-painting"]);
    expect(serviceSlugsFor(shade("PM-404"))).toEqual(["exterior-painting"]);
    expect(serviceSlugsFor(shade("PM-201"))).toEqual(["interior-painting", "exterior-painting"]);
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
});
