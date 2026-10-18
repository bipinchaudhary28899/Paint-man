import { describe, expect, it } from "vitest";
import raw from "@/data/paintdb.json";
import { brandList, getBrandShade, isBrand, isShadeFamily, paintdb, searchBrandShades, shadeCount, shadeFamilies, splitBrand } from "@/lib/colours/brands";

describe("brand shade data (PaintDB, vendored)", () => {
  it("has every shade from all 25 brands, with valid, unique entries", () => {
    expect(shadeCount()).toBe(50762);
    expect(brandList()).toHaveLength(25);
    const d = raw as unknown as { shades: [number, string, string, string, number, number, number, number][]; brands: unknown[]; families: string[] };
    const ids = new Set<string>();
    for (const [b, code, name, hex, lrv, f] of d.shades) {
      expect(b).toBeLessThan(d.brands.length);
      expect(code.trim()).not.toBe("");
      expect(name.trim()).not.toBe("");
      expect(hex).toMatch(/^[0-9a-f]{6}$/);
      expect(lrv).toBeGreaterThanOrEqual(0);
      expect(lrv).toBeLessThanOrEqual(100);
      expect(f).toBeLessThan(d.families.length);
      ids.add(`${b}:${code.toLowerCase()}`);
    }
    expect(ids.size).toBe(d.shades.length);
  });

  it("carries the CC BY 4.0 attribution", () => {
    expect(paintdb).toMatchObject({ source: "https://paintdb.com", license: "CC BY 4.0", attribution: expect.stringContaining("PaintDB") });
    expect(paintdb.note).toMatch(/not affiliated/);
  });

  it("lists Indian brands first with their counts", () => {
    expect(brandList().slice(0, 3)).toEqual([
      { slug: "asian-paints", name: "Asian Paints", count: 2221 },
      { slug: "berger", name: "Berger Paints", count: 1575 },
      { slug: "nerolac", name: "Kansai Nerolac", count: 2023 },
    ]);
    expect(isBrand("behr")).toBe(true);
    expect(isBrand("acme")).toBe(false);
  });

  it("orders families light to dark and knows them", () => {
    expect(shadeFamilies()[0]).toBe("white");
    expect(shadeFamilies().at(-1)).toBe("black");
    expect(isShadeFamily("blue")).toBe(true);
    expect(isShadeFamily("plaid")).toBe(false);
  });
});

describe("finding brand shades", () => {
  it("looks a shade up by brand and code, ignoring spaces and case", () => {
    expect(getBrandShade("asian-paints:7982")).toMatchObject({ name: "Mecca Gold", hex: "#e7975b", brandName: "Asian Paints" });
    expect(getBrandShade("sherwin-williams:sw7005")?.name).toBe("Pure White");
    expect(getBrandShade("asian-paints:nope")).toBeUndefined();
    expect(getBrandShade("no-colon")).toBeUndefined();
    expect(getBrandShade("asian-paints:")).toBeUndefined();
  });

  it("reads a brand name typed in front of a code", () => {
    expect(splitBrand("Asian Paints 7982")).toEqual({ brand: "asian-paints", rest: "7982" });
    expect(splitBrand("asian 7982")).toEqual({ brand: "asian-paints", rest: "7982" });
    expect(splitBrand("Berger 3P0050")).toEqual({ brand: "berger", rest: "3p0050" });
    expect(splitBrand("nerolac")).toEqual({ brand: "nerolac", rest: "" });
    expect(splitBrand("Dulux Australia white")).toEqual({ brand: "dulux-australia", rest: "white" });
    expect(splitBrand("hale navy")).toEqual({ rest: "hale navy" });
  });

  it("ranks an exact code first, then names", () => {
    const r = searchBrandShades({ q: "Asian Paints 7982" });
    expect(r.brand).toBe("asian-paints");
    expect(r.items[0]).toMatchObject({ code: "7982", name: "Mecca Gold" });
    const byName = searchBrandShades({ q: "hale navy" });
    expect(byName.items[0].name.toLowerCase()).toBe("hale navy");
    expect(searchBrandShades({ q: "SW 7005" }).items[0].name).toBe("Pure White");
  });

  it("finds the nearest shades to a hex", () => {
    const r = searchBrandShades({ q: "#e7975b", brand: "asian-paints", perPage: 3 });
    expect(r.items[0].code).toBe("7982");
    expect(searchBrandShades({ q: "e7975b", brand: "asian-paints" }).items[0].code).toBe("7982");
  });

  it("filters by brand and family, keeps brand order with no query, and pages", () => {
    const blues = searchBrandShades({ brand: "asian-paints", family: "blue", perPage: 48 });
    expect(blues.total).toBe(346);
    expect(blues.pages).toBe(8);
    expect(blues.items.every((s) => s.brand === "asian-paints" && s.family === "blue")).toBe(true);
    const all = searchBrandShades({ perPage: 2 });
    expect(all.total).toBe(50762);
    expect(all.items[0].brand).toBe("asian-paints");
    expect(searchBrandShades({ brand: "asian-paints", family: "blue", perPage: 48, page: 99 }).page).toBe(8);
    expect(searchBrandShades({ q: "zzzzqqqq" }).total).toBe(0);
  });
});
