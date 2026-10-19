import { describe, expect, it } from "vitest";
import { finishes, getPalette, isRoom, paletteBrands, palettes, palettesForRoom, rooms } from "@/config/palettes";
import { services } from "@/config/site";
import { getBrandShade } from "@/lib/colours/brands";

// Integrity of src/config/palettes.ts (AGENTS.md rule 2): every shade is a real brand shade, copied
// exactly from the catalogue, and every palette's words agree with its shades.

const allShades = palettes.flatMap((p) => p.shades.map((s) => ({ palette: p, shade: s })));

describe("palettes", () => {
  it("have unique slugs and names, valid rooms and scenes, and three shades each", () => {
    expect(palettes.length).toBeGreaterThanOrEqual(10);
    expect(new Set(palettes.map((p) => p.slug)).size).toBe(palettes.length);
    expect(new Set(palettes.map((p) => p.name)).size).toBe(palettes.length);
    for (const p of palettes) {
      expect(p.slug, p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(p.rooms.length, p.slug).toBeGreaterThan(0);
      for (const r of p.rooms) expect(isRoom(r), `${p.slug}: ${r}`).toBe(true);
      expect(["Living room", "Bedroom", "House exterior"]).toContain(p.scene);
      expect(p.shades).toHaveLength(3);
      expect(new Set(p.shades.map((s) => s.id)).size, p.slug).toBe(3);
      for (const text of [p.name, p.mood, p.description, p.tip]) expect(text.trim(), p.slug).not.toBe("");
    }
  });

  it("use only real brand shades, with id, brand, code, name and hex exactly as in the catalogue", () => {
    for (const { palette, shade } of allShades) {
      const real = getBrandShade(shade.id);
      expect(real, `${palette.slug}: ${shade.id}`).toBeDefined();
      expect({ id: shade.id, brand: shade.brand, brandName: shade.brandName, code: shade.code, name: shade.name, hex: shade.hex }, `${palette.slug}: ${shade.id}`).toEqual({
        id: real!.id,
        brand: real!.brand,
        brandName: real!.brandName,
        code: real!.code,
        name: real!.name,
        hex: real!.hex,
      });
      expect(shade.id).toBe(`${shade.brand}:${shade.code}`);
      expect(finishes, `${palette.slug}: ${shade.id}`).toContain(shade.finish);
    }
  });

  it("name every one of their shades, with its shade-card code, in the description", () => {
    for (const p of palettes) {
      for (const s of p.shades) {
        expect(p.description, `${p.slug}: ${s.name}`).toContain(`${s.name} (`);
        expect(p.description, `${p.slug}: ${s.code}`).toContain(s.code);
      }
      // the first shade carries the brand, so the description reads on its own
      expect(p.description, p.slug).toContain(`${p.shades[0].name} (${p.shades[0].brandName} ${p.shades[0].code})`);
    }
  });

  it("quote weatherproof paint outside and an interior finish inside, as their tips say", () => {
    for (const p of palettes) {
      const outside = p.scene === "House exterior";
      expect(outside, p.slug).toBe(p.rooms.includes("Exterior"));
      for (const s of p.shades) {
        if (outside) expect(s.finish, `${p.slug}: ${s.name}`).toBe("Exterior weatherproof");
        else expect(s.finish, `${p.slug}: ${s.name}`).not.toBe("Exterior weatherproof");
      }
      if (/washable finish throughout/i.test(p.tip)) for (const s of p.shades) expect(s.finish, `${p.slug}: ${s.name}`).toBe("Washable");
    }
    expect(getPalette("pooja-corner")!.shades[0].finish).toBe("Washable"); // "Quote the alcove in washable finish"
    expect(getPalette("dramatic-feature-wall")!.shades[0].finish).toBe("Silk / sheen"); // "on one wall in sheen finish"
  });

  it("are looked up by slug, filtered by room and know their brands", () => {
    expect(getPalette("calm-bedroom")?.name).toBe("Calm bedroom");
    expect(getPalette("nope")).toBeUndefined();
    expect(palettesForRoom()).toBe(palettes);
    expect(palettesForRoom("Exterior").map((p) => p.slug)).toEqual(["agra-stone-exterior", "blue-door-exterior"]);
    expect(palettesForRoom("Kitchen")).toEqual([]);
    expect(paletteBrands(palettes[0])).toEqual(["Asian Paints"]);
    expect(paletteBrands({ shades: [{ brandName: "A" }, { brandName: "B" }, { brandName: "A" }] as never })).toEqual(["A", "B"]);
  });

  it("know the rooms, and nothing else", () => {
    expect(new Set(rooms).size).toBe(rooms.length);
    expect(isRoom("Bedroom")).toBe(true);
    for (const bad of ["Garage", "bedroom", "", undefined, 3]) expect(isRoom(bad)).toBe(false);
  });

  it("include every palette a service page suggests", () => {
    for (const s of services) for (const slug of s.shades.palettes) expect(getPalette(slug), `${s.slug} → ${slug}`).toBeDefined();
  });
});
