import { describe, expect, it } from "vitest";
import { colourFamilies, colours, curatedColours } from "@/config/colours";
import { familySingular, familySpecs, finishFor, generateShades, interiorFinishFor, isOutdoor, lrvBand, lrvOf, oklchToHex, outdoorRooms } from "@/config/shades";

describe("shade ladder", () => {
  const shades = generateShades();

  it("covers every family with a light-to-dark ladder of unique, valid hex codes", () => {
    expect(new Set(shades.map((s) => s.family))).toEqual(new Set(colourFamilies));
    expect(new Set(shades.map((s) => s.code)).size).toBe(shades.length);
    expect(new Set(colours.map((c) => c.name)).size).toBe(colours.length);
    for (const s of shades) {
      expect(s.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(s.code).toMatch(/^PM-\d{4}$/);
      expect(s.lrv).toBeGreaterThanOrEqual(3);
      expect(s.lrv).toBeLessThanOrEqual(92);
      expect(s.rooms.length).toBeGreaterThan(0);
      expect(s.note).toContain(`LRV ${s.lrv}`);
    }
  });

  it("gets darker step by step within each family, and whites stay pale", () => {
    for (const spec of familySpecs) {
      const ladder = shades.filter((s) => s.family === spec.family);
      expect(ladder.length).toBe(spec.steps ?? 11);
      for (let i = 1; i < ladder.length; i++) expect(ladder[i].lrv).toBeLessThan(ladder[i - 1].lrv);
      expect(ladder[0].name).toBe(spec.names[0]);
    }
    const whites = shades.filter((s) => s.family === "Whites");
    expect(whites.every((s) => s.lrv >= 50)).toBe(true);
    const greys = shades.filter((s) => s.family === "Greys");
    expect(greys[greys.length - 1].lrv).toBeLessThan(10);
  });

  it("names, finishes and rooms follow the depth of the shade", () => {
    const pale = shades.find((s) => s.lrv >= 70)!;
    const deep = shades.find((s) => s.lrv < 25)!;
    expect(pale.finish).toBe("Washable");
    expect(pale.rooms).toContain("Rental refresh");
    expect(deep.finish).toBe("Silk / sheen");
    expect(deep.note).toMatch(/feature wall/);
    expect(deep.tags).toContain("dark");
    // a deep brown is still good outside, but its headline finish is the indoor one
    const exteriorDeep = shades.find((s) => s.family === "Browns" && s.lrv < 25)!;
    expect(exteriorDeep.rooms).toContain("Exterior");
    expect(exteriorDeep.finish).toBe("Silk / sheen");
    expect(exteriorDeep.note).toContain("gate pillars");
  });

  it("uses one set of LRV bands for notes, tags and rooms, so a page never contradicts itself", () => {
    expect([lrvBand(60), lrvBand(59), lrvBand(35), lrvBand(34)]).toEqual(["light", "mid", "mid", "deep"]);
    for (const s of shades) {
      const band = lrvBand(s.lrv);
      if (band === "light") {
        expect(s.note).toMatch(/^A pale /);
        expect(s.tags).toContain("light");
        expect(s.rooms).toContain("Rental refresh");
      } else if (band === "mid") {
        expect(s.note).toContain("all four walls");
        expect(s.tags).toContain("medium");
      } else {
        expect(s.note).toContain("feature wall");
        expect(s.note).not.toContain("all four walls");
        expect(s.tags).toContain("dark");
        expect(s.rooms).not.toContain("Rental refresh");
        expect(s.rooms).not.toContain("Kids room");
      }
      expect(s.note).toContain(familySingular[s.family]);
    }
  });

  it("never quotes an exterior finish for a shade whose main room is inside", () => {
    expect(finishFor(40, ["Exterior", "Living room"])).toBe("Exterior weatherproof");
    expect(finishFor(40, ["Living room", "Exterior"])).toBe("Matt emulsion");
    expect(finishFor(80, [])).toBe("Washable");
    expect([interiorFinishFor(75), interiorFinishFor(50), interiorFinishFor(20)]).toEqual(["Washable", "Matt emulsion", "Silk / sheen"]);
    expect(outdoorRooms).toEqual(["Exterior", "Balcony"]);
    for (const s of shades) {
      expect(s.finish).toBe(finishFor(s.lrv, s.rooms));
      expect(s.finish).not.toBe("Exterior weatherproof"); // every generated shade lists an indoor room first
    }
    // the whole catalogue, curated shades included: weatherproof exactly when the main room is outside
    for (const c of colours) {
      expect(c.finish === "Exterior weatherproof").toBe(isOutdoor(c.rooms[0]));
      if (c.finish === "Exterior weatherproof") expect(c.note).not.toMatch(/all four walls|small room|bedroom|kitchen/i);
    }
  });

  it("pairings resolve inside the catalogue and the curated shades come first", () => {
    const codes = new Set(colours.map((c) => c.code));
    for (const s of shades) for (const p of s.pairsWith) expect(codes.has(p)).toBe(true);
    expect(colours.slice(0, curatedColours.length)).toEqual(curatedColours);
    expect(colours.length).toBe(curatedColours.length + shades.length);
  });

  it("converts OKLCH to sRGB and clips out-of-gamut chroma", () => {
    expect(oklchToHex(1, 0, 0)).toBe("#ffffff");
    expect(oklchToHex(0, 0, 0)).toBe("#000000");
    expect(oklchToHex(0.7, 0.5, 30)).toMatch(/^#[0-9a-f]{6}$/); // far outside sRGB, still a valid hex
    expect(lrvOf("#ffffff")).toBe(100);
    expect(lrvOf("#000000")).toBe(0);
    expect(lrvOf("#808080")).toBe(22);
  });
});
