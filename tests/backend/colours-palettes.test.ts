import { describe, expect, it } from "vitest";
import { getPalette, palettes } from "@/config/palettes";
import { paletteRole, palettesForRoom, palettesUsing, resolvePalettes } from "@/lib/colours/palettes";

describe("palettes", () => {
  it("every palette resolves all three shades and has a unique slug", () => {
    const resolved = resolvePalettes();
    expect(resolved).toHaveLength(palettes.length);
    expect(new Set(palettes.map((p) => p.slug)).size).toBe(palettes.length);
    for (const p of resolved) {
      expect(p.colours).toHaveLength(3);
      expect(p.colours.map((c) => c.code)).toEqual(p.codes);
    }
  });

  it("drops a palette that names a code the catalogue does not have", () => {
    const broken = { ...palettes[0], slug: "broken", codes: ["PM-999", "PM-101", "PM-102"] as [string, string, string] };
    expect(resolvePalettes([broken, palettes[1]]).map((p) => p.slug)).toEqual([palettes[1].slug]);
  });

  it("filters by room and finds palettes using a shade", () => {
    expect(palettesForRoom("Bedroom").every((p) => p.rooms.includes("Bedroom"))).toBe(true);
    expect(palettesForRoom()).toHaveLength(palettes.length);
    const using = palettesUsing("101");
    expect(using.length).toBeGreaterThan(2);
    expect(using.every((p) => p.codes.includes("PM-101"))).toBe(true);
    expect(palettesUsing("PM-999")).toEqual([]);
  });

  it("names a shade's place in a palette: feature wall, other walls or accent", () => {
    const calm = getPalette("calm-bedroom")!; // Sage Mist, Taj White, Jute
    expect(paletteRole(calm, "PM-502")).toBe("the feature wall");
    expect(paletteRole(calm, "101")).toBe("the other walls and ceiling");
    expect(paletteRole(calm, "PM-204")).toBe("the accent (door, niche or trim)");
    expect(paletteRole(calm, "PM-603")).toBeUndefined();
    expect(paletteRole(calm, "PM-999")).toBeUndefined();
  });

  it("looks a palette up by slug", () => {
    expect(getPalette("calm-bedroom")?.name).toBe("Calm bedroom");
    expect(getPalette("nope")).toBeUndefined();
  });
});
