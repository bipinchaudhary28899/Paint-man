import { describe, expect, it } from "vitest";
import { colourFamilies, colours, curatedColours } from "@/config/colours";
import { generateShades } from "@/config/shades";
import { getColour } from "@/lib/colours/search";
import { colourDescription, colourTitle, finderDescription, finderTitle, indexableColours, isIndexableShade, TITLE_MAX, TITLE_SUFFIX } from "@/lib/colours/seo";

const plurals = colourFamilies.map((f) => f.toLowerCase()).join("|");

describe("shade page titles", () => {
  it("names the shade and its code and fits the ' | Paint Man' template in 60 characters", () => {
    expect(TITLE_SUFFIX).toBe(" | Paint Man");
    expect(colourTitle(getColour("PM-502")!)).toBe("Sage Mist (PM-502) Wall Paint Colour");
    for (const c of colours) {
      const t = colourTitle(c);
      expect(t.startsWith(`${c.name} (${c.code})`)).toBe(true);
      expect((t + TITLE_SUFFIX).length).toBeLessThanOrEqual(TITLE_MAX);
    }
  });

  it("drops words for a long name and refuses a name that cannot fit", () => {
    expect(colourTitle({ name: "Extraordinarily Long Hue", code: "PM-9999" })).toBe("Extraordinarily Long Hue (PM-9999) Paint Colour");
    expect(colourTitle({ name: "An Extraordinarily Long Shade", code: "PM-9999" })).toBe("An Extraordinarily Long Shade (PM-9999)");
    expect(() => colourTitle({ name: "A".repeat(60), code: "PM-9999" })).toThrow(/No title/);
  });
});

describe("shade page descriptions", () => {
  it("lands every shade in 140-155 characters, with a singular family and only what the page shows", () => {
    for (const c of colours) {
      const d = colourDescription(c);
      expect(d.length, `${c.code}: ${d}`).toBeGreaterThanOrEqual(140);
      expect(d.length, `${c.code}: ${d}`).toBeLessThanOrEqual(155);
      expect(d.endsWith(".")).toBe(true);
      expect(d.startsWith(`${c.name} (${c.code}) is a`)).toBe(true);
      expect(d).not.toMatch(new RegExp(`\\b(${plurals}) wall`, "i")); // "a greens wall colour"
      expect(d).not.toMatch(/house front|free|rental refresh/i);
      expect(d).toMatch(/shade card/i); // the proof: we bring the real card
      expect(d).toMatch(/living room wall|room wall/); // the benefit: the one preview the page shows
      expect(d).toContain("Agra");
    }
  });

  it("uses 'an' before a vowel and names up to three rooms", () => {
    const olive = colours.find((c) => c.family === "Olives")!;
    expect(colourDescription(olive)).toContain("is an olive green wall paint colour");
    const orange = colours.find((c) => c.family === "Oranges")!;
    expect(colourDescription(orange)).toContain("is an orange wall paint colour");
    expect(colourDescription(getColour("PM-502")!)).toContain("is a green wall paint colour");
    expect(colourDescription(getColour("PM-501")!)).toMatch(/for kitchen, balcony and pooja room walls/);
  });

  it("copes with a shade with no rooms, a different city, and throws rather than cutting a sentence", () => {
    const sage = getColour("PM-502")!;
    const bare = colourDescription({ ...sage, name: "Sage Mist Extra Soft", rooms: [] });
    expect(bare).not.toContain(" for ");
    expect(bare.length).toBeGreaterThanOrEqual(140);
    expect(colourDescription(sage, "Mathura")).toContain("Mathura");
    expect(() => colourDescription({ ...sage, name: "X".repeat(120) })).toThrow(/No 140-155/);
  });
});

describe("which shade pages are indexed", () => {
  it("indexes the 32 curated shades and keeps the generated ladder noindex", () => {
    expect(indexableColours()).toEqual(curatedColours);
    expect(indexableColours()).toHaveLength(32);
    expect(isIndexableShade("PM-502")).toBe(true);
    for (const s of generateShades()) expect(isIndexableShade(s.code)).toBe(false);
    expect(isIndexableShade("pm-502")).toBe(false); // canonical codes only
  });
});

describe("the /colours finder", () => {
  it("has a short local title and a description that does not overstate the brands", () => {
    expect(finderTitle()).toBe("Wall Colour Finder & Shade Codes in Agra");
    expect((finderTitle() + TITLE_SUFFIX).length).toBeLessThanOrEqual(TITLE_MAX);
    const d = finderDescription(colours.length);
    expect(d.length).toBeGreaterThanOrEqual(140);
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d).toContain(`${colours.length} Paint Man shades`);
    expect(d).toContain("50,000+ brand shades incl. Asian Paints, Berger and Nerolac");
    expect(d).toContain("shade card");
    expect(d).not.toMatch(/free/i);
    expect(finderTitle("Mathura")).toContain("Mathura");
  });
});
