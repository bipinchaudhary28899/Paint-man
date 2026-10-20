import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ShadeCardFamilyPage, { generateMetadata as familyMetadata, generateStaticParams as familyParams } from "@/app/(site)/shade-cards/[brand]/[family]/page";
import ShadeCardPage, { generateMetadata as cardMetadata, generateStaticParams as cardParams } from "@/app/(site)/shade-cards/[brand]/page";
import ShadeCardsPage, { metadata as indexMetadata } from "@/app/(site)/shade-cards/page";
import sitemap from "@/app/sitemap";
import { shadeCardBrands, shadeCardHref } from "@/config/nav";
import { site } from "@/config/site";
import { brandList, decodeEntities, getBrandShade, shadeCount, shadeFamilies } from "@/lib/colours/brands";
import {
  cardMeta,
  FAMILY_PAGE_MIN,
  familyMeta,
  familyShades,
  fitDescription,
  fitTitle,
  indexMeta,
  SAMPLE_SIZE,
  shadeCard,
  shadeCardFamily,
  shadeCardPath,
  shadeCardPaths,
  shadeCards,
  spread,
  toSwatch,
} from "@/lib/colours/shade-cards";
import { fullTitle } from "@/lib/seo";

// the pages hold the quick site-visit form, which needs the app router
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

const textOf = (markup: string) => decodeEntities(markup.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const hrefs = (markup: string) => [...markup.matchAll(/href="([^"]*)"/g)].map((m) => decodeEntities(m[1]));
const headings = (markup: string) => [...markup.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));

describe("shade cards (src/lib/colours/shade-cards.ts)", () => {
  it("has a card for each of the four Indian brands, families light to dark, every shade counted once", () => {
    expect(shadeCards().map((c) => c.slug)).toEqual(["asian-paints", "berger", "nerolac", "nippon-paint"]);
    expect(shadeCards().map((c) => c.shortName)).toEqual(["Asian Paints", "Berger", "Nerolac", "Nippon Paint"]);
    expect(shadeCards().reduce((n, c) => n + c.count, 0)).toBe(shadeCount());
    for (const c of shadeCards()) {
      expect(c.families.reduce((n, f) => n + f.count, 0), c.slug).toBe(c.count);
      const order = shadeFamilies();
      expect(c.families.map((f) => order.indexOf(f.family))).toEqual([...c.families.map((f) => order.indexOf(f.family))].sort((a, b) => a - b));
      expect(c.lrv.min).toBe(Math.min(...c.families.map((f) => f.lrv.min)));
      expect(c.lrv.max).toBe(Math.max(...c.families.map((f) => f.lrv.max)));
    }
    expect(shadeCard("acme")).toBeUndefined();
    expect(shadeCard("berger")).toBe(shadeCard("berger")); // computed once
  });

  it("describes each family from its shades: count, LRV range, lightest and darkest, undertones", () => {
    const blue = shadeCard("asian-paints")!.families.find((f) => f.family === "blue")!;
    expect(blue).toMatchObject({ label: "Blue", count: 346, hasPage: true });
    const all = familyShades("asian-paints", "blue");
    expect(all).toHaveLength(346);
    expect(all.every((s) => s.brand === "asian-paints" && s.family === "blue")).toBe(true);
    expect(blue.lightest.lrv).toBe(blue.lrv.max);
    expect(blue.darkest.lrv).toBe(blue.lrv.min);
    expect(blue.lrv.max).toBe(Math.max(...all.map((s) => s.lrv)));
    expect(blue.undertones.length).toBeGreaterThan(0);
    expect(blue.undertones.length).toBeLessThanOrEqual(2);
    for (const u of blue.undertones) expect(u).toBe(u.toLowerCase());
    // the sample runs the whole family in card order, first to last
    expect(blue.sample).toHaveLength(SAMPLE_SIZE);
    expect(blue.sample[0]).toBe(all[0]);
    expect(blue.sample.at(-1)).toBe(all.at(-1));
  });

  it("gives a small family no page and shows all of it on the brand page instead", () => {
    const black = shadeCard("asian-paints")!.families.find((f) => f.family === "black")!;
    expect(black.count).toBeLessThan(FAMILY_PAGE_MIN);
    expect(black.hasPage).toBe(false);
    expect(black.sample).toHaveLength(black.count);
    expect(shadeCardFamily("asian-paints", "black")).toBeUndefined();
    expect(shadeCardFamily("asian-paints", "plaid")).toBeUndefined();
    expect(shadeCardFamily("acme", "blue")).toBeUndefined();
    expect(shadeCardFamily("nerolac", "blue")).toMatchObject({ card: { slug: "nerolac" }, family: { family: "blue", hasPage: true } });
    expect(shadeCard("nerolac")!.families.some((f) => f.family === "black")).toBe(false); // no black shades on that card at all
  });

  it("spreads a sample evenly from first to last", () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    expect(spread(items, 12)).toHaveLength(12);
    expect(spread(items, 12)[0]).toBe(0);
    expect(spread(items, 12).at(-1)).toBe(99);
    expect(new Set(spread(items, 12)).size).toBe(12);
    expect(spread([1, 2, 3], 12)).toEqual([1, 2, 3]);
  });

  it("prints a code only when it is a real shade-card code, and searches the finder by name otherwise", () => {
    expect(toSwatch(getBrandShade("asian-paints:7982")!)).toEqual({ id: "asian-paints:7982", brand: "asian-paints", code: "7982", query: "7982", name: "Mecca Gold", hex: "#e7975b", lrv: expect.any(Number) });
    const noCode = getBrandShade("nerolac:absicon")!;
    expect(toSwatch(noCode)).toMatchObject({ code: null, query: "Absicon", name: "Absicon" });
  });

  it("lists every page: the hub, each brand and each family with a page", () => {
    const paths = shadeCardPaths();
    expect(paths[0]).toBe("/shade-cards");
    expect(new Set(paths).size).toBe(paths.length);
    for (const c of shadeCards()) {
      expect(paths).toContain(shadeCardPath(c.slug));
      for (const f of c.families) expect(paths.includes(shadeCardPath(c.slug, f.family))).toBe(f.hasPage);
    }
    expect(paths).toHaveLength(1 + 4 + 40);
    const inSitemap = sitemap().map((e) => e.url.replace(site.url, ""));
    for (const p of paths) expect(inSitemap).toContain(p);
  });

  it("keeps every title within 60 characters and every description at 140–155, all different", () => {
    const metas = [indexMeta(), ...shadeCards().flatMap((c) => [cardMeta(c), ...c.families.filter((f) => f.hasPage).map((f) => familyMeta(c, f))])];
    for (const m of metas) {
      expect(fullTitle(m.title).length, m.title).toBeLessThanOrEqual(60);
      expect(m.description.length, m.description).toBeGreaterThanOrEqual(140);
      expect(m.description.length, m.description).toBeLessThanOrEqual(155);
      expect(m.title).not.toMatch(/Paint Saathi/);
    }
    expect(new Set(metas.map((m) => m.title)).size).toBe(metas.length);
    expect(new Set(metas.map((m) => m.description)).size).toBe(metas.length);
    expect(cardMeta(shadeCard("asian-paints")!).title).toBe("Asian Paints Shade Card: 2,221 Colour Codes");
    expect(familyMeta(shadeCard("berger")!, shadeCard("berger")!.families.find((f) => f.family === "blue")!).title).toBe("Berger Blue Shades: 377 Colour Codes");
  });

  it("falls back to the next title or description when one does not fit", () => {
    const long = "x".repeat(60);
    expect(fitTitle(long, "Short")).toBe("Short");
    expect(fitTitle(long, long)).toBe(long);
    const ok = "y".repeat(150);
    expect(fitDescription("too short", ok)).toBe(ok);
    expect(fitDescription("too short", "also short")).toBe("too short");
  });
});

describe("shade-card links in the menus", () => {
  it("covers every brand in the colour data and points at its shade-card page", () => {
    expect(shadeCardBrands.map((b) => b.slug)).toEqual(brandList().map((b) => b.slug));
    for (const b of shadeCardBrands) expect(shadeCardHref(b.slug)).toBe(shadeCardPath(b.slug));
  });
});

describe("shade-card pages", () => {
  it("prerenders one page per brand and per family with a page, and nothing else", () => {
    expect(cardParams()).toEqual(shadeCards().map((c) => ({ brand: c.slug })));
    expect(familyParams()).toHaveLength(40);
    expect(familyParams()).toContainEqual({ brand: "nippon-paint", family: "blue" });
    expect(familyParams()).not.toContainEqual({ brand: "asian-paints", family: "black" });
  });

  it("the hub: one h1, a link to every card and every family page, and the PaintDB credit", () => {
    expect(indexMetadata.alternates?.canonical).toBe("/shade-cards");
    const html = renderToStaticMarkup(ShadeCardsPage());
    expect(headings(html).filter((h) => h === 1)).toHaveLength(1);
    const links = hrefs(html);
    for (const p of shadeCardPaths().slice(1)) expect(links).toContain(p);
    const text = textOf(html);
    expect(text).toContain("Paint shade cards from India's major brands");
    expect(text).toContain(`${shadeCount().toLocaleString("en-IN")} shades from Asian Paints, Berger Paints, Kansai Nerolac and Nippon Paint`);
    expect(links).toContain("https://paintdb.com");
    expect(text).toMatch(/CC BY 4\.0/);
  });

  it("a brand page: its h1, every family, swatches that open the finder, and links to the other cards", async () => {
    const params = Promise.resolve({ brand: "asian-paints" });
    const meta = await cardMetadata({ params });
    expect(meta.alternates?.canonical).toBe("/shade-cards/asian-paints");
    expect(meta.title).toBe("Asian Paints Shade Card: 2,221 Colour Codes");
    const html = renderToStaticMarkup(await ShadeCardPage({ params }));
    expect(headings(html).filter((h) => h === 1)).toHaveLength(1);
    expect(headings(html)[0]).toBe(1);
    const text = textOf(html);
    expect(text).toContain("Asian Paints shade card with colour codes");
    expect(text).toContain("2,221 shades from the Asian Paints shade card");
    const links = hrefs(html);
    expect(links).toContain("/colours?brand=asian-paints&q=7982".replace("7982", shadeCard("asian-paints")!.families[0].sample[0].code));
    expect(links).toContain("/shade-cards/asian-paints/blue");
    expect(links).not.toContain("/shade-cards/asian-paints/black");
    for (const other of ["berger", "nerolac", "nippon-paint"]) expect(links).toContain(`/shade-cards/${other}`);
    expect(links).toContain("https://paintdb.com");
    expect(await cardMetadata({ params: Promise.resolve({ brand: "acme" }) })).toEqual({});
  });

  it("a family page: every shade in it, the brand's other families and the same family on other cards", async () => {
    const params = Promise.resolve({ brand: "berger", family: "blue" });
    const meta = await familyMetadata({ params });
    expect(meta.alternates?.canonical).toBe("/shade-cards/berger/blue");
    const html = renderToStaticMarkup(await ShadeCardFamilyPage({ params }));
    expect(headings(html).filter((h) => h === 1)).toHaveLength(1);
    const text = textOf(html);
    expect(text).toContain("Berger blue shades with colour codes");
    expect(text).toContain("All 377 blue shades on the Berger Paints card");
    const links = hrefs(html);
    expect(links.filter((h) => h.startsWith("/colours?brand=berger&q="))).toHaveLength(377);
    expect(links).toContain("/shade-cards/berger/green");
    expect(links).toContain("/shade-cards/berger#black"); // too small for a page: its section on the brand page
    for (const other of ["asian-paints", "nerolac", "nippon-paint"]) expect(links).toContain(`/shade-cards/${other}/blue`);
    expect(html).toContain('aria-current="page"');
    expect(await familyMetadata({ params: Promise.resolve({ brand: "berger", family: "black" }) })).toEqual({});
  });
});
