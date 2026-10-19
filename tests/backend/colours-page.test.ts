import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ColoursPage, { metadata as finderMetadata } from "@/app/(site)/colours/page";
import PalettesPage from "@/app/(site)/palettes/page";
import { palettes } from "@/config/palettes";
import { decodeEntities, getBrandShade, hasShadeCardCode, nearestBrandShades } from "@/lib/colours/brands";

// The routes themselves sit outside the coverage gate; these check the behaviour that matters for
// search and for customers: /colours is static and brand-only, there are no shade pages of our own
// any more, and /palettes names each shade by brand and code with the closest Berger and Nerolac
// shades and the PaintDB attribution.

const textOf = (markup: string) => decodeEntities(markup.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const hrefs = (markup: string) => [...markup.matchAll(/href="([^"]*)"/g)].map((m) => decodeEntities(m[1]));

describe("/colours", () => {
  it("is static: the page reads no searchParams on the server", () => {
    expect(ColoursPage.length).toBe(0);
    expect(ColoursPage.constructor.name).toBe("Function"); // not an async page
  });

  it("uses the local finder title and a measured description", () => {
    expect(finderMetadata.title).toBe("Wall Colour Finder & Shade Codes in Agra");
    expect(`${finderMetadata.title} | Paint Man`.length).toBeLessThanOrEqual(60);
    const description = String(finderMetadata.description);
    expect(description).toBe("Search 50,000+ paint shades from Asian Paints, Berger, Nerolac and more by code and see each on a room wall. We bring the shade card to your Agra home.");
    expect(description.length).toBeGreaterThanOrEqual(140);
    expect(description.length).toBeLessThanOrEqual(155);
    expect(finderMetadata.alternates?.canonical).toBe("/colours");
  });

  it("prerenders a link to every brand's shade card and no Paint Man shade", () => {
    const html = renderToStaticMarkup(ColoursPage());
    const links = hrefs(html);
    for (const slug of ["asian-paints", "berger", "nerolac", "sherwin-williams"]) expect(links).toContain(`/colours?brand=${slug}`);
    expect(links.filter((h) => h.startsWith("/colours?brand=")).length).toBe(25);
    expect(links.some((h) => /^\/colours\/./.test(h))).toBe(false);
    const text = textOf(html);
    expect(text).not.toMatch(/Paint Man shades|PM codes|PM-\d/);
    expect(text).toContain("50,762 shades from Asian Paints, Berger, Nerolac and 22 more brands");
    expect(text).toMatch(/PaintDB.*CC BY 4\.0/);
  });

  it("has no shade pages of its own: old /colours/<code> URLs are answered by src/proxy.ts", () => {
    expect(existsSync(new URL("../../src/app/(site)/colours/[code]", import.meta.url))).toBe(false);
  });
});

describe("/palettes", () => {
  const html = renderToStaticMarkup(PalettesPage());
  const text = textOf(html);
  const links = hrefs(html);

  it("names every shade by brand, code, name, hex and finish, with links to find it, try it and book the palette", () => {
    for (const p of palettes) {
      expect(text).toContain(p.description);
      expect(links).toContain(`/book?palette=${p.slug}`);
      for (const s of p.shades) {
        expect(text, s.id).toContain(`${s.name} ${s.brandName} ${s.code}`);
        expect(text, s.id).toContain(`${s.hex.toUpperCase()} · LRV ${getBrandShade(s.id)!.lrv} · ${s.finish}`);
        expect(links, s.id).toContain(`/colours?brand=${s.brand}&q=${s.code}`);
        expect(links, s.id).toContain(`/visualizer?shade=${encodeURIComponent(s.id)}`);
      }
    }
  });

  it("shows the closest Berger and Nerolac shade to each one, with its real code only", () => {
    for (const s of palettes.flatMap((p) => p.shades)) {
      for (const m of nearestBrandShades(s.hex, ["berger", "nerolac"], 1)) {
        const best = m.shades[0];
        expect(text, `${s.id} → ${best.id}`).toContain(`${best.brandName} ${best.name}${hasShadeCardCode(best) ? ` ${best.code}` : ""} (`);
      }
    }
  });

  it("credits PaintDB under CC BY 4.0 and has one h1 with headings in order", () => {
    expect(text).toMatch(/Brand shades: PaintDB , licensed CC BY 4\.0/);
    expect(links).toEqual(expect.arrayContaining(["https://paintdb.com", "https://creativecommons.org/licenses/by/4.0/"]));
    const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    expect(text).not.toMatch(/PM-\d|Paint Man shade/);
  });
});
