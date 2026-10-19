import { describe, expect, it } from "vitest";
import { colours, curatedColours, wallUses } from "@/config/colours";
import { lrvBand } from "@/config/shades";

// Integrity of the curated shades' hand-written fields: the walls advice that drives every page's
// wall copy, and the one-sentence colour guide. Generated shades are covered in shades.test.ts.

const ONE_WALL = /\b(one|feature|single|bed) wall\b|one wall is plenty|never a whole room|only for a wall/i;

describe("curated walls advice", () => {
  it("sets walls on every shade, curated by hand, and every deep shade is a feature wall", () => {
    for (const c of colours) expect(wallUses, c.code).toContain(c.walls);
    for (const c of curatedColours) if (lrvBand(c.lrv) === "deep") expect(c.walls, `${c.code} LRV ${c.lrv}`).toBe("feature");
    // a mid-band shade can still be a one-wall colour when its note says so
    expect(curatedColours.find((c) => c.code === "PM-301")).toMatchObject({ lrv: 54, walls: "feature" });
    expect(curatedColours.find((c) => c.code === "PM-701")).toMatchObject({ lrv: 50, walls: "feature" });
    expect(curatedColours.find((c) => c.code === "PM-502")).toMatchObject({ walls: "all" });
  });

  it("agrees with the inspector's note", () => {
    for (const c of curatedColours) {
      if (c.walls === "all") expect(c.note, c.code).not.toMatch(ONE_WALL);
      else expect(c.note, c.code).not.toMatch(/all four walls|every wall/i);
    }
  });
});

describe("curated colour guide sentences", () => {
  it("gives every curated shade one sentence of its own, and generated shades none", () => {
    const guides = curatedColours.map((c) => c.guide ?? "");
    expect(new Set(guides).size).toBe(curatedColours.length);
    for (const c of curatedColours) {
      expect(c.guide, c.code).toMatch(/^[A-Z].*\.$/);
      expect(c.guide!.startsWith(c.name), c.code).toBe(true);
      expect(c.guide!.split(/(?<=\.)\s+(?=[A-Z])/), c.code).toHaveLength(1);
      expect(c.guide!.length, c.code).toBeLessThanOrEqual(200);
    }
    for (const c of colours.slice(curatedColours.length)) expect(c.guide, c.code).toBeUndefined();
  });

  it("describes the colour, never invented business claims", () => {
    for (const c of curatedColours) {
      expect(c.guide, c.code).not.toMatch(/customer|client|job|project|years|popular|most-requested|everyone|best-selling|₹|rs\.?\s?\d|rating|review/i);
      if (c.walls === "all") expect(c.guide, c.code).not.toMatch(ONE_WALL);
      else expect(c.guide, c.code).not.toMatch(/all four walls|every wall/i);
    }
  });

  it("names only shades that exist when it compares one with another", () => {
    const names = new Set(colours.map((c) => c.name));
    const compared = curatedColours.flatMap((c) => [...c.guide!.matchAll(/(?:than|of) ([A-Z][a-z]+(?: [A-Z][a-z]+)?)(?=[ ,.])/g)].map((m) => m[1]));
    for (const n of compared) if (!["Agra"].includes(n)) expect(names.has(n), n).toBe(true);
  });
});
