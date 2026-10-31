import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as cardsGET } from "@/app/api/v1/colours/shade-cards/route";
import { GET as cardGET } from "@/app/api/v1/colours/shade-cards/[brand]/route";
import { GET as familyGET } from "@/app/api/v1/colours/shade-cards/[brand]/[family]/route";
import { publicCache } from "@/lib/api";
import { getBrandShade, shadeCount } from "@/lib/colours/brands";
import { FAMILY_PAGE_MIN, familyShades, SAMPLE_SIZE, shadeCard, shadeCards, toSwatch } from "@/lib/colours/shade-cards";

// The shade-card API: the same cards, counts and swatches the /shade-cards pages show.

const req = (path: string) => new NextRequest(`http://localhost:3000${path}`);
const card = (brand: string) => cardGET(req(`/api/v1/colours/shade-cards/${brand}`), { params: Promise.resolve({ brand }) });
const family = (brand: string, fam: string) => familyGET(req(`/api/v1/colours/shade-cards/${brand}/${fam}`), { params: Promise.resolve({ brand, family: fam }) });

const credit = { source: "https://paintdb.com", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", attribution: expect.stringContaining("PaintDB") };

describe("GET /api/v1/colours/shade-cards", () => {
  it("lists every brand's card with its families, counts and the licence, publicly cached", async () => {
    const res = cardsGET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(publicCache["Cache-Control"]);
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "shade-card", label: "4 brand shade cards, 8,539 shades in all" });
    expect(body.data.map((c: { slug: string }) => c.slug)).toEqual(["asian-paints", "berger", "nerolac", "nippon-paint"]);
    expect(body.meta).toMatchObject({ total: 4, shades: shadeCount(), catalogueSize: shadeCount(), familyPageMin: FAMILY_PAGE_MIN, sampleSize: SAMPLE_SIZE, ...credit });
    expect(body.meta.generatedAt).toEqual(expect.any(String));
    expect(body.links).toEqual({ self: "/api/v1/colours/shade-cards", html: "/shade-cards", search: "/api/v1/colours/paint" });

    const asian = body.data[0];
    const source = shadeCard("asian-paints")!;
    expect(asian).toMatchObject({ slug: "asian-paints", name: "Asian Paints", shortName: "Asian Paints", count: 2221, lrv: source.lrv });
    expect(asian.links).toEqual({ self: "/api/v1/colours/shade-cards/asian-paints", html: "/shade-cards/asian-paints" });
    expect(asian.families.map((f: { family: string }) => f.family)).toEqual(source.families.map((f) => f.family));
    // no swatches in the list: it stays small
    expect(asian.families.some((f: object) => "sample" in f)).toBe(false);

    const white = asian.families[0];
    const srcWhite = source.families[0];
    expect(white).toEqual({
      family: "white",
      label: "White",
      count: srcWhite.count,
      hasPage: true,
      lrv: srcWhite.lrv,
      lightest: { id: srcWhite.lightest.id, code: srcWhite.lightest.code, name: srcWhite.lightest.name, hex: srcWhite.lightest.hex, lrv: srcWhite.lightest.lrv },
      darkest: { id: srcWhite.darkest.id, code: srcWhite.darkest.code, name: srcWhite.darkest.name, hex: srcWhite.darkest.hex, lrv: srcWhite.darkest.lrv },
      undertones: srcWhite.undertones,
      swatch: srcWhite.sample[Math.floor(srcWhite.sample.length / 2)].hex,
      links: { html: "/shade-cards/asian-paints/white", self: "/api/v1/colours/shade-cards/asian-paints/white" },
    });
    // a family too small for a page links to its section of the brand page, and has no API page
    const black = asian.families.find((f: { family: string }) => f.family === "black");
    expect(black).toMatchObject({ hasPage: false, links: { html: "/shade-cards/asian-paints#black" } });
    expect(black.links.self).toBeUndefined();
  });
});

describe("GET /api/v1/colours/shade-cards/{brand}", () => {
  it("returns one card with each family's swatches, as the brand page shows them", async () => {
    const res = await card("asian-paints");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(publicCache["Cache-Control"]);
    const body = await res.json();
    const source = shadeCard("asian-paints")!;
    const swatches = source.families.reduce((n, f) => n + f.sample.length, 0);
    expect(body).toMatchObject({ apiVersion: "v1", kind: "shade-card" });
    expect(body.label).toBe(`The Asian Paints shade card: 2,221 shades in ${source.families.length} colour families, ${swatches} swatches shown`);
    expect(body.meta).toMatchObject({ total: 2221, swatches, familyPageMin: FAMILY_PAGE_MIN, sampleSize: SAMPLE_SIZE, ...credit });
    expect(body.links).toEqual({
      self: "/api/v1/colours/shade-cards/asian-paints",
      html: "/shade-cards/asian-paints",
      cards: "/api/v1/colours/shade-cards",
      search: "/api/v1/colours/paint?brand=asian-paints",
    });
    expect(body.data).toMatchObject({ slug: "asian-paints", name: "Asian Paints", count: 2221 });
    const white = body.data.families[0];
    expect(white.sample).toEqual(source.families[0].sample.map(toSwatch));
    expect(white.sample).toHaveLength(SAMPLE_SIZE);
    // a family without a page is shown whole
    const black = body.data.families.find((f: { family: string }) => f.family === "black");
    expect(black.sample).toHaveLength(black.count);
  });

  it("prints no code for a shade without a real shade-card code", async () => {
    const body = await (await card("nerolac")).json();
    const all = body.data.families.flatMap((f: { sample: { code: string | null; query: string; name: string }[] }) => f.sample);
    for (const s of all) expect(s.query).toBe(s.code ?? s.name);
    expect(toSwatch(getBrandShade("nerolac:absicon")!).code).toBeNull();
  });

  it("answers 404 not_found for an unknown brand, listing the brands", async () => {
    const res = await card("acme");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "error", error: { code: "not_found", details: shadeCards().map((c) => c.slug) } });
    expect(body.label).toBe('No shade card for brand "acme".');
    // a long segment is not echoed whole
    const long = await (await card("x".repeat(200))).json();
    expect(long.error.message).toBe(`No shade card for brand "${"x".repeat(40)}".`);
  });
});

describe("GET /api/v1/colours/shade-cards/{brand}/{family}", () => {
  it("returns every shade of a family light to dark, with the family's facts", async () => {
    const res = await family("asian-paints", "blue");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(publicCache["Cache-Control"]);
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "shade-card-family", label: "346 Asian Paints blue shades from the Asian Paints card, light to dark" });
    expect(body.data).toMatchObject({ brand: "asian-paints", brandName: "Asian Paints", shortName: "Asian Paints", family: "blue", label: "Blue", count: 346, hasPage: true });
    expect(body.data.shades).toEqual(familyShades("asian-paints", "blue").map(toSwatch));
    expect(body.meta).toMatchObject({ total: 346, ...credit });
    expect(body.links).toEqual({
      self: "/api/v1/colours/shade-cards/asian-paints/blue",
      html: "/shade-cards/asian-paints/blue",
      card: "/api/v1/colours/shade-cards/asian-paints",
      search: "/api/v1/colours/paint?brand=asian-paints&family=blue",
    });
  });

  it("answers 404 not_found for an unknown brand", async () => {
    const res = await family("acme", "blue");
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatchObject({ code: "not_found", details: shadeCards().map((c) => c.slug) });
  });

  it("answers 404 not_found for an unknown family or one without a page, listing the families with pages", async () => {
    const withPages = shadeCard("asian-paints")!.families.filter((f) => f.hasPage).map((f) => f.family);
    for (const fam of ["plaid", "black"]) {
      const res = await family("asian-paints", fam);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toMatchObject({ code: "not_found", message: `The Asian Paints card has no "${fam}" family page.`, details: withPages });
    }
  });
});
