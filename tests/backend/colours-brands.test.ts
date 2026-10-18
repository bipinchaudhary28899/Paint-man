import { describe, expect, it } from "vitest";
import raw from "@/data/paintdb.json";
import { curatedColours } from "@/config/colours";
import { brandList, getBrandShade, isBrand, isShadeFamily, isShadeSort, nearestBrandShades, paintdb, searchBrandShades, shadeCardKey, shadeCount, shadeFamilies, splitBrand } from "@/lib/colours/brands";
import { hexToRgb, rgbToOklab } from "@/lib/visualizer/recolour";

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


describe("browse order", () => {
  const all = (opts: Parameters<typeof searchBrandShades>[0]) => searchBrandShades({ ...opts, perPage: 5000 }).items;

  it("shade-card order keeps similar colours together, each hue band light to dark", () => {
    const browns = all({ brand: "asian-paints", family: "brown" });
    expect(browns).toHaveLength(130);
    const keys = browns.map((s) => shadeCardKey(s.hex));
    for (let i = 1; i < keys.length; i++) {
      const [band, negL] = keys[i], [pBand, pNegL] = keys[i - 1];
      expect(band >= pBand).toBe(true); // bands never go backwards
      if (band === pBand) expect(negL >= pNegL).toBe(true); // within a band: light → dark
    }
  });

  it("puts near-neutrals first and runs through the families in order across a whole brand", () => {
    expect(shadeCardKey("#808080")[0]).toBe(-1);
    expect(shadeCardKey("#c4473f")[0]).toBeGreaterThanOrEqual(0);
    const fams = all({ brand: "berger" }).map((s) => s.family);
    const order = shadeFamilies();
    for (let i = 1; i < fams.length; i++) expect(order.indexOf(fams[i]) >= order.indexOf(fams[i - 1])).toBe(true);
  });

  it("sorts by shade code numerically, or by name", () => {
    const codes = all({ brand: "asian-paints", sort: "code" }).map((s) => s.code);
    const nums = codes.filter((c) => /^\d+$/.test(c)).map(Number);
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
    const names = all({ brand: "nerolac", sort: "name" }).map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(isShadeSort("code")).toBe(true);
    expect(isShadeSort("random")).toBe(false);
  });

  it("keeps ranking by best match when searching, whatever the sort", () => {
    expect(searchBrandShades({ q: "7982", brand: "asian-paints", sort: "name" }).items[0].code).toBe("7982");
  });
});

describe("nearest brand shades to a Paint Man shade", () => {
  const indian = ["asian-paints", "berger", "nerolac"];
  const oklabDistance = (x: string, y: string) => {
    const [a, b] = [rgbToOklab(...hexToRgb(x)), rgbToOklab(...hexToRgb(y))];
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  };

  it("returns each brand in the order asked, closest shades first", () => {
    const m = nearestBrandShades("#b8c7b0", indian, 2);
    expect(m.map((x) => x.brand)).toEqual(indian);
    expect(m.map((x) => x.brandName)).toEqual(["Asian Paints", "Berger Paints", "Kansai Nerolac"]);
    for (const { brand, shades } of m) {
      expect(shades).toHaveLength(2);
      expect(shades.every((s) => s.brand === brand)).toBe(true);
      expect(shades[0].distance).toBeLessThanOrEqual(shades[1].distance);
    }
  });

  it("finds the true nearest shade by OKLab distance, and an exact hex at distance 0", () => {
    const all = searchBrandShades({ brand: "berger", perPage: 5000 }).items;
    const target = "#c2623f";
    const best = Math.min(...all.map((s) => oklabDistance(s.hex, target)));
    const [match] = nearestBrandShades(target, ["berger"], 1);
    expect(match.shades[0].distance).toBeCloseTo(best, 3);
    // a brand shade's own hex finds a shade with that hex
    expect(nearestBrandShades("#e7975b", ["asian-paints"], 1)[0].shades[0]).toMatchObject({ hex: "#e7975b", distance: 0 });
  });

  it("finds a close match for every curated shade in each Indian brand", () => {
    for (const c of curatedColours) {
      const m = nearestBrandShades(c.hex, indian, 2);
      expect(m).toHaveLength(3);
      for (const b of m) expect(b.shades[0].distance).toBeLessThan(0.1);
    }
  });

  it("skips unknown brands and keeps n between 1 and 10", () => {
    expect(nearestBrandShades("#ffffff", ["acme", "berger"], 2).map((m) => m.brand)).toEqual(["berger"]);
    expect(nearestBrandShades("#ffffff", ["berger"], 0)[0].shades).toHaveLength(1);
    expect(nearestBrandShades("#ffffff", ["berger"], 50)[0].shades).toHaveLength(10);
  });
});
