import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ColourPage, { generateMetadata, generateStaticParams } from "@/app/(site)/colours/[code]/page";
import ColoursPage, { metadata as finderMetadata } from "@/app/(site)/colours/page";
import { colours, curatedColours, type Colour } from "@/config/colours";
import { palettes } from "@/config/palettes";
import { decodeEntities } from "@/lib/colours/brands";

// The routes themselves sit outside the coverage gate; these check the behaviour that matters
// for search: one canonical URL per shade, noindex on the generated ladder, static /colours, and
// what the rendered shade page says (one h1, headings in order, no contradictions).

const params = (code: string) => ({ params: Promise.resolve({ code }) });
const digestOf = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as { digest?: string }).digest;
  }
  return undefined;
};

const html = new Map<string, string>();
const render = async (code: string) => {
  if (!html.has(code)) html.set(code, renderToStaticMarkup(await ColourPage(params(code))));
  return html.get(code)!;
};
const textOf = (markup: string) => decodeEntities(markup.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
// palette names ("Dramatic feature wall") are names, not advice about this shade
const withoutPaletteNames = (s: string) => palettes.reduce((t, p) => t.split(p.name).join("[palette]"), s);

describe("/colours/[code]", () => {
  it("prerenders every canonical code", () => {
    expect(generateStaticParams()).toEqual(colours.map((c) => ({ code: c.code })));
  });

  it("still redirects case and short-form variants permanently if one reaches the page", async () => {
    // src/proxy.ts answers case variants before the page; the page keeps this as a fallback
    for (const code of ["pm-502", "Pm-502", "502", "pm502"]) {
      expect(await digestOf(ColourPage(params(code)))).toBe("NEXT_REDIRECT;replace;/colours/PM-502;308;");
    }
  });

  it("renders the canonical code and 404s an unknown one", async () => {
    expect(await digestOf(ColourPage(params("PM-502")))).toBeUndefined();
    expect(await digestOf(ColourPage(params("PM-9999")))).toMatch(/^NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it("indexes curated shades and keeps generated ones noindex, follow", async () => {
    const sage = await generateMetadata(params("PM-502"));
    expect(sage.title).toBe("Sage Mist (PM-502) Wall Paint Colour");
    expect(sage.alternates?.canonical).toBe("/colours/PM-502");
    expect(sage.robots).toBeUndefined();
    expect(String(sage.description)).toMatch(/^Sage Mist \(PM-502\) is a green wall paint colour/);
    const wheat = await generateMetadata(params("PM-1205"));
    expect(wheat.robots).toEqual({ index: false, follow: true });
    expect(wheat.alternates?.canonical).toBe("/colours/PM-1205");
    expect((await generateMetadata(params("nope"))).title).toBe("Colour not found");
    for (const c of curatedColours) expect((await generateMetadata(params(c.code))).robots, c.code).toBeUndefined();
  });

  it("has one h1 naming the shade, and headings that never skip a level", async () => {
    for (const c of colours) {
      const page = await render(c.code);
      const levels = [...page.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
      expect(levels.filter((l) => l === 1), c.code).toHaveLength(1);
      expect(levels[0]).toBe(1);
      for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], `${c.code} h${levels[i - 1]}→h${levels[i]}`).toBeLessThanOrEqual(1);
      const h1 = textOf(/<h1[\s\S]*?<\/h1>/.exec(page)![0]).trim();
      expect(h1).toBe(`${c.name} (${c.code}) wall paint colour`);
    }
  });

  it("shows the colour facts, the brand matches as plain text and the curated guide sentence", async () => {
    const sage = textOf(await render("PM-502"));
    expect(sage).toContain("What colour Sage Mist is");
    expect(sage).toContain(curatedColours.find((c) => c.code === "PM-502")!.guide!);
    expect(sage).toContain("Read from its hex, #B8C7B0, Sage Mist is a greyed green");
    expect(sage).toMatch(/Undertone Warm Colour Greyed Leans to Yellow/);
    expect(sage).toContain("The nearest brand shades on screen are Asian Paints");
    const cotton = textOf(await render("PM-104"));
    expect(cotton).toContain("Dove's Wing-w"); // was "Dove&#039;s Wing-w"
    for (const c of curatedColours) expect(textOf(await render(c.code)), c.code).not.toMatch(/&#|&amp;|&reg;/);
  });

  it("never tells a page to use one wall and all four walls, across the whole catalogue", async () => {
    for (const c of colours) {
      const text = withoutPaletteNames(textOf(await render(c.code)));
      const one = /\b(one|feature|single) wall\b/i.test(text);
      const all = /\ball four walls\b/i.test(text);
      expect(one && all, `${c.code}: ${text.slice(0, 400)}`).toBe(false);
      if (c.walls === "feature") expect(text, c.code).not.toMatch(/all four walls|every wall/i);
    }
  });

  it("gives no two curated pages the same rooms section", async () => {
    const roomsOf = async (c: Colour) => {
      const page = await render(c.code);
      const section = /<section aria-labelledby="rooms-heading">([\s\S]*?)<\/section>/.exec(page)![1];
      return textOf(section).split(c.name).join("{name}").split(c.code).join("{code}");
    };
    const blocks = await Promise.all(curatedColours.map(roomsOf));
    expect(new Set(blocks).size).toBe(curatedColours.length);
  });

  it("links the rental painting service from a shade for rentals", async () => {
    const taj = await render("PM-101");
    expect(taj).toContain('href="/services/rental-property-painting"');
    expect(taj).toContain('href="/services/interior-painting"');
    expect(await render("PM-502")).not.toContain('href="/services/rental-property-painting"');
  });
});

describe("/colours", () => {
  it("is static: the page reads no searchParams on the server", () => {
    expect(ColoursPage.length).toBe(0);
    expect(ColoursPage.constructor.name).toBe("Function"); // not an async page
  });

  it("uses the local finder title and the measured description", () => {
    expect(finderMetadata.title).toBe("Wall Colour Finder & Shade Codes in Agra");
    expect(String(finderMetadata.description)).toContain("50,000+ brand shades incl. Asian Paints, Berger and Nerolac");
    expect(finderMetadata.alternates?.canonical).toBe("/colours");
  });
});
