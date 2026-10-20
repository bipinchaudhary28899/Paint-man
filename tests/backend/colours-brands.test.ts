import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import raw from "@/data/paintdb.json";
import { palettes } from "@/config/palettes";
import { brandList, decodeEntities, getBrandShade, hasShadeCardCode, isBrand, isShadeFamily, isShadeSort, matchLabel, nearestBrandShades, paintdb, searchBrandShades, shadeCardKey, shadeCount, shadeFamilies, splitBrand } from "@/lib/colours/brands";
import { BRAND_SHADES_ROUNDED, PAINTDB } from "@/lib/colours/catalogue";
import { hexToRgb, rgbToOklab } from "@/lib/colours/oklab";

describe("brand shade data (PaintDB, vendored)", () => {
  it("has every shade from the four Indian brands, with valid, unique entries", () => {
    expect(shadeCount()).toBe(8539);
    expect(brandList()).toHaveLength(4);
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

  it("shows brand shade names as text, with the HTML entities from PaintDB decoded", () => {
    const all = searchBrandShades({ perPage: 100_000 }).items;
    expect(all).toHaveLength(8539);
    const leaks = all.filter((s) => /&#|&amp;|&reg;|&quot;|&lt;|&gt;/.test(s.name)).map((s) => `${s.id}: ${s.name}`);
    expect(leaks).toEqual([]);
    expect(brandList().every((b) => !/&#|&amp;/.test(b.name))).toBe(true);
    expect(getBrandShade("nerolac:152")?.name).toBe("Dove's Wing-w"); // was "Dove&#039;s Wing-w" in the raw data
    expect(getBrandShade("nippon-paint:NP R 2336P")?.name).toBe("Annie’s Cap"); // "Annie&#8217;s Cap"
    // decoded names are still searchable by their words
    expect(searchBrandShades({ q: "Dove's Wing", brand: "nerolac" }).items[0].code).toBe("152");
  });

  it("decodes named, decimal and hex entities once, and leaves anything else alone", () => {
    expect(decodeEntities("Dove&#039;s Wing")).toBe("Dove's Wing");
    expect(decodeEntities("Annie&#8217;s Cap")).toBe("Annie’s Cap");
    expect(decodeEntities("Spick &amp; Span &lt;b&gt; &quot;x&quot; &apos;y&#39;")).toBe(`Spick & Span <b> "x" 'y'`);
    expect(decodeEntities("Crumb Cake&reg; &#x27;hex&#X27;")).toBe("Crumb Cake® 'hex'");
    expect(decodeEntities("&amp;#039;")).toBe("&#039;"); // one pass: an escaped entity stays as written
    expect(decodeEntities("&bogus; &#0; &#99999999; R&D & co")).toBe("&bogus; &#0; &#99999999; R&D & co");
    // names an object inherits are not entities
    expect(decodeEntities("A &constructor; B")).toBe("A &constructor; B");
    expect(decodeEntities("&CONSTRUCTOR; &toString; &valueOf; &hasOwnProperty; &isPrototypeOf;")).toBe("&CONSTRUCTOR; &toString; &valueOf; &hasOwnProperty; &isPrototypeOf;");
  });

  it("decodes the same way on import (scripts/import-paintdb.mjs)", () => {
    // Importing the script would run the import and rewrite src/data/paintdb.json, so lift its
    // entity table and decoder out of the source and run those.
    const script = readFileSync(new URL("../../scripts/import-paintdb.mjs", import.meta.url), "utf8");
    const table = /^const NAMED_ENTITIES = .+$/m.exec(script)![0];
    const fn = /^function decodeEntities\(s\) \{[\s\S]*?^\}$/m.exec(script)![0];
    const decode = new Function(`${table}\n${fn}\nreturn decodeEntities;`)() as (s: string) => string;
    for (const s of ["Dove&#039;s Wing", "Spick &amp; Span &lt;b&gt;", "Crumb Cake&reg; &#x27;hex&#X27;", "&amp;#039;", "&bogus; &#0; R&D", "A &constructor; B", "&toString; &valueOf;"])
      expect(decode(s), s).toBe(decodeEntities(s));
    expect(decode("A &constructor; B")).toBe("A &constructor; B");
  });

  it("carries the CC BY 4.0 attribution", () => {
    expect(paintdb).toMatchObject({ source: "https://paintdb.com", license: "CC BY 4.0", attribution: expect.stringContaining("PaintDB") });
    expect(paintdb.note).toMatch(/not affiliated/);
    // the client-side copy of the attribution links (the visualizer's picker) matches the data
    expect(PAINTDB).toEqual({ source: paintdb.source, licenseUrl: paintdb.licenseUrl });
  });

  it("keeps the rounded count in client copy true (\"8,500+ brand shades\")", () => {
    const floor = Number(BRAND_SHADES_ROUNDED.replace(/[^0-9]/g, ""));
    expect(BRAND_SHADES_ROUNDED).toMatch(/^\d{1,3}(,\d{3})*\+$/);
    expect(shadeCount()).toBeGreaterThanOrEqual(floor);
    expect(shadeCount() - floor).toBeLessThan(500); // still a fair round-down, not a stale one
  });

  it("lists the four Indian brands, biggest names first, with their counts", () => {
    expect(brandList()).toEqual([
      { slug: "asian-paints", name: "Asian Paints", count: 2221 },
      { slug: "berger", name: "Berger Paints", count: 1575 },
      { slug: "nerolac", name: "Kansai Nerolac", count: 2023 },
      { slug: "nippon-paint", name: "Nippon Paint", count: 2720 },
    ]);
    expect(isBrand("nippon-paint")).toBe(true);
    expect(isBrand("behr")).toBe(false); // only brands we can supply in India
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
    expect(getBrandShade("nippon-paint:npac3432a")?.name).toBe("Cosmic Navy"); // printed "NP AC 3432A"
    expect(getBrandShade("asian-paints:nope")).toBeUndefined();
    expect(getBrandShade("no-colon")).toBeUndefined();
    expect(getBrandShade("asian-paints:")).toBeUndefined();
  });

  it("reads a brand name typed in front of a code", () => {
    expect(splitBrand("Asian Paints 7982")).toEqual({ brand: "asian-paints", rest: "7982" });
    expect(splitBrand("asian 7982")).toEqual({ brand: "asian-paints", rest: "7982" });
    expect(splitBrand("Berger 3P0050")).toEqual({ brand: "berger", rest: "3p0050" });
    expect(splitBrand("nerolac")).toEqual({ brand: "nerolac", rest: "" });
    expect(splitBrand("Nippon Paint cosmic navy")).toEqual({ brand: "nippon-paint", rest: "cosmic navy" });
    expect(splitBrand("nippon NP AC 3432A")).toEqual({ brand: "nippon-paint", rest: "np ac 3432a" });
    expect(splitBrand("cosmic navy")).toEqual({ rest: "cosmic navy" });
  });

  it("ranks an exact code first, then names", () => {
    const r = searchBrandShades({ q: "Asian Paints 7982" });
    expect(r.brand).toBe("asian-paints");
    expect(r.items[0]).toMatchObject({ code: "7982", name: "Mecca Gold" });
    const byName = searchBrandShades({ q: "cosmic navy" });
    expect(byName.items[0].name.toLowerCase()).toBe("cosmic navy");
    expect(searchBrandShades({ q: "NP AC 3432A" }).items[0].name).toBe("Cosmic Navy");
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
    expect(all.total).toBe(8539);
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

describe("nearest brand shades to a palette shade", () => {
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

  it("finds a close Berger and Nerolac match for every palette shade, and the shade itself in Asian Paints", () => {
    for (const s of palettes.flatMap((p) => p.shades)) {
      const m = nearestBrandShades(s.hex, indian, 2);
      expect(m).toHaveLength(3);
      for (const b of m) expect(b.shades[0].distance, `${s.id} in ${b.brand}`).toBeLessThan(0.1);
      expect(m[0].shades[0]).toMatchObject({ hex: s.hex, distance: 0 });
    }
  });

  it("describes how close a match looks", () => {
    expect(matchLabel(0)).toBe("Very close match");
    expect(matchLabel(0.019)).toBe("Very close match");
    expect(matchLabel(0.02)).toBe("Close match");
    expect(matchLabel(0.049)).toBe("Close match");
    expect(matchLabel(0.05)).toBe("Nearest in this range");
  });

  it("tells a real shade-card code from the name slug PaintDB fills in for a missing one", () => {
    expect(hasShadeCardCode({ name: "Pepper Leaf", code: "8386" })).toBe(true);
    expect(hasShadeCardCode({ name: "Dhoop-i", code: "X166" })).toBe(true);
    expect(hasShadeCardCode({ name: "Greenery", code: "greenery" })).toBe(false);
    expect(hasShadeCardCode({ name: "Sassy Pink!", code: "sassy-pink" })).toBe(false);
    expect(hasShadeCardCode({ name: "Something else", code: "lower-case-only" })).toBe(false);
  });

  it("skips unknown brands and keeps n between 1 and 10", () => {
    expect(nearestBrandShades("#ffffff", ["acme", "berger"], 2).map((m) => m.brand)).toEqual(["berger"]);
    expect(nearestBrandShades("#ffffff", ["berger"], 0)[0].shades).toHaveLength(1);
    expect(nearestBrandShades("#ffffff", ["berger"], 50)[0].shades).toHaveLength(10);
  });
});
