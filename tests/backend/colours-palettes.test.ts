import { describe, expect, it } from "vitest";
import { getPalette, palettes } from "@/config/palettes";
import { paletteRole, paletteRoles, palettesForRoom, palettesUsing, resolvePalettes } from "@/lib/colours/palettes";

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

  it("names a shade's place in an inside palette: the bed or feature wall, the rest, the accent", () => {
    const calm = getPalette("calm-bedroom")!; // Sage Mist, Taj White, Jute
    expect(paletteRole(calm, "PM-502")).toBe("the wall behind the bed");
    expect(paletteRole(calm, "101")).toBe("the other walls and ceiling");
    expect(paletteRole(calm, "PM-204")).toBe("the accent (niche, door or wardrobe wall)");
    expect(paletteRole(calm, "PM-603")).toBeUndefined();
    expect(paletteRole(calm, "PM-999")).toBeUndefined();
    expect(paletteRoles(getPalette("dramatic-feature-wall")!)).toEqual(["the feature wall", "the other walls and ceiling", "the accent (door, niche or trim)"]);
  });

  it("words the roles for colour on the main walls with a deeper feature wall", () => {
    // Butter on the long walls, Chalk ceiling, one Peacock wall
    expect(paletteRoles(getPalette("sunny-living-room")!)).toEqual(["the main walls", "the ceiling", "the feature wall"]);
    expect(paletteRole(getPalette("earthy-living-room")!, "PM-401")).toBe("the feature wall");
    // Pista on three walls, Chalk ceiling, Monsoon Sky on the study wall
    expect(paletteRoles(getPalette("kids-room-pista")!)).toEqual(["the main walls", "the ceiling", "the wall behind the bed or desk"]);
  });

  it("words outside, rental and pooja palettes for what they are", () => {
    const exteriors = palettes.filter((p) => p.scene === "House exterior");
    expect(exteriors.length).toBeGreaterThan(0);
    for (const p of exteriors) {
      expect(paletteRoles(p)).toEqual(["the main walls", "the trim and boundary", "the door, gate or pillars"]);
      for (const role of paletteRoles(p)) expect(role).not.toMatch(/ceiling|feature wall|bed/);
    }
    expect(paletteRole(getPalette("blue-door-exterior")!, "PM-101")).toBe("the main walls");
    expect(paletteRole(getPalette("agra-stone-exterior")!, "PM-101")).toBe("the trim and boundary");
    expect(paletteRole(getPalette("blue-door-exterior")!, "PM-604")).toBe("the door, gate or pillars");
    expect(paletteRoles(getPalette("rental-refresh")!)).toEqual(["the walls throughout", "the ceilings", "the kitchen and bathroom walls"]);
    expect(paletteRoles(getPalette("pooja-corner")!)).toEqual(["the alcove walls", "the walls around the alcove", "the back panel behind the deities"]);
    // Taj White is never "the feature wall" of a palette
    for (const p of palettesUsing("PM-101")) expect(paletteRole(p, "PM-101")).not.toBe("the feature wall");
    // a palette naming an unknown shade still gets roles from its kind
    expect(paletteRoles({ scene: "Bedroom", rooms: ["Bedroom"], codes: ["PM-999", "PM-101", "PM-998"] })).toEqual(paletteRoles(getPalette("calm-bedroom")!));
  });

  it("gives every shade in every palette a distinct role", () => {
    for (const p of palettes) {
      const roles = p.codes.map((code) => paletteRole(p, code));
      expect(roles.every(Boolean), p.slug).toBe(true);
      expect(new Set(roles).size, p.slug).toBe(3);
    }
  });

  it("looks a palette up by slug", () => {
    expect(getPalette("calm-bedroom")?.name).toBe("Calm bedroom");
    expect(getPalette("nope")).toBeUndefined();
  });
});
