import { describe, expect, it } from "vitest";
import { rooms } from "@/config/colours";
import { getPalette } from "@/config/palettes";
import { generalFaqs, getService, jobSize, services, site, type Service } from "@/config/site";
import { getColour } from "@/lib/colours/search";
import { crewEstimate, PAINT_AREA_PER_CARPET_SQFT, SQFT_PER_PAINTER_DAY } from "@/lib/leads/estimate";
import { serviceTypes } from "@/lib/leads/options";

// Integrity of the service and FAQ copy in src/config/site.ts (AGENTS.md rules 1 and 2).

const SUFFIX = " | Paint Man";
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Every field of copy written for this service alone (FAQs excluded: /faq shows them too). */
function specificCopy(s: Service): string[] {
  return [
    s.intro,
    ...s.includes,
    ...s.suitableFor,
    ...s.process.flatMap((p) => [p.step, p.detail]),
    ...s.paintSystem.flatMap((p) => [p.title, p.body]),
    ...s.costFactors.flatMap((c) => [c.title, c.body]),
    ...s.timeline,
    ...s.aftercare,
    s.shades.intro,
  ];
}

const allCopy = (s: Service) => [...specificCopy(s), s.title, s.description, ...s.faqs.flatMap((f) => [f.q, f.a])];

// Routes a FAQ link may point to. /areas is the locality hub added alongside this change.
const linkableRoutes = new Set(["/", "/book", "/contact", "/about", "/faq", "/services", "/colours", "/palettes", "/visualizer", "/areas"]);

describe("services", () => {
  it("have unique slugs, names and lead form service types", () => {
    expect(services.length).toBeGreaterThanOrEqual(3);
    expect(new Set(services.map((s) => s.slug)).size).toBe(services.length);
    expect(new Set(services.map((s) => s.name)).size).toBe(services.length);
    expect(new Set(services.map((s) => s.leadService)).size).toBe(services.length);
    for (const s of services) {
      expect(s.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(serviceTypes).toContain(s.leadService);
    }
  });

  it.each(services.map((s) => [s.slug, s] as const))("%s: title is '{Topic} in Agra' and fits 60 characters with the suffix", (_slug, s) => {
    expect(s.title.endsWith(` in ${site.city}`)).toBe(true);
    expect((s.title + SUFFIX).length).toBeLessThanOrEqual(60);
  });

  it.each(services.map((s) => [s.slug, s] as const))("%s: description is 140-155 characters and names the city", (_slug, s) => {
    expect(s.description.length).toBeGreaterThanOrEqual(140);
    expect(s.description.length).toBeLessThanOrEqual(155);
    expect(s.description).toContain(site.city);
  });

  it.each(services.map((s) => [s.slug, s] as const))("%s: has 300+ words of its own copy, not counting FAQs", (_slug, s) => {
    expect(words(specificCopy(s).join(" "))).toBeGreaterThanOrEqual(300);
  });

  it.each(services.map((s) => [s.slug, s] as const))("%s: covers process, paint system, cost, timing, aftercare and shades", (_slug, s) => {
    expect(s.process.length).toBeGreaterThanOrEqual(5);
    expect(s.paintSystem.length).toBeGreaterThanOrEqual(3);
    expect(s.costFactors.length).toBeGreaterThanOrEqual(4);
    expect(s.timeline.length).toBeGreaterThanOrEqual(1);
    expect(s.aftercare.length).toBeGreaterThanOrEqual(3);
    expect(s.faqs.length).toBeGreaterThanOrEqual(3);
    for (const list of [s.process.map((p) => p.step), s.paintSystem.map((p) => p.title), s.costFactors.map((c) => c.title), s.aftercare, s.timeline]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("each page's copy is its own: no paragraph is shared between services", () => {
    const seen = new Map<string, string>();
    for (const s of services) {
      for (const text of specificCopy(s).filter((t) => words(t) >= 8)) {
        expect(seen.get(text), `"${text}" repeated on ${s.slug}`).toBeUndefined();
        seen.set(text, s.slug);
      }
    }
  });

  it("matching palettes, their shades and the shade-finder room all resolve", () => {
    for (const s of services) {
      expect(s.shades.palettes.length).toBeGreaterThan(0);
      for (const slug of s.shades.palettes) {
        const palette = getPalette(slug);
        expect(palette, `${s.slug} → ${slug}`).toBeDefined();
        for (const code of palette!.codes) expect(getColour(code)).toBeDefined();
      }
      if (s.shades.room) expect(rooms).toContain(s.shades.room);
    }
  });

  it("never states a price: no rupee figures or per-sq-ft rates in any copy", () => {
    for (const text of [...services.flatMap(allCopy), ...generalFaqs.flatMap((f) => [f.q, f.a])]) {
      expect(text).not.toMatch(/₹|\bRs\.?\s?\d|\bINR\b|per sq\.? ?ft|\/sq\.? ?ft|rupee/i);
    }
  });

  it("looks a service up by slug", () => {
    expect(getService("interior-painting")?.leadService).toBe("Interior Painting");
    expect(getService("rental-property-painting")?.leadService).toBe("Rental Property");
    expect(getService("roofing")).toBeUndefined();
  });
});

describe("job sizing examples", () => {
  it("uses the booking form's rule of thumb", () => {
    const j = jobSize(900);
    expect(j.paintArea).toBe(Math.round((900 * PAINT_AREA_PER_CARPET_SQFT) / 10) * 10);
    expect(j).toEqual({ carpetArea: 900, paintArea: j.paintArea, ...crewEstimate(j.paintArea) });
    expect(j.painterDays).toBe(Math.ceil(j.paintArea / SQFT_PER_PAINTER_DAY));
  });

  it("every worked example plans a sensible crew for about a week", () => {
    const examples = services.flatMap((s) => s.sizeExamples ?? []);
    expect(examples.length).toBeGreaterThan(0);
    for (const e of examples) {
      const j = jobSize(e.carpetArea);
      expect(j.painters).toBeGreaterThanOrEqual(2);
      expect(j.painters).toBeLessThanOrEqual(8);
      expect(j.days).toBeLessThanOrEqual(10);
    }
    // exterior area is measured on site, never estimated from carpet area
    expect(getService("exterior-painting")?.sizeExamples).toBeUndefined();
  });
});

describe("FAQs", () => {
  const all = [...generalFaqs, ...services.flatMap((s) => s.faqs)];

  it("every question is unique across the general and service FAQs", () => {
    expect(new Set(all.map((f) => f.q)).size).toBe(all.length);
    for (const f of all) {
      expect(f.q.trim().endsWith("?")).toBe(true);
      expect(words(f.a)).toBeGreaterThanOrEqual(8);
    }
  });

  it("links point only to known site routes", () => {
    const links = all.flatMap((f) => (f.link ? [f.link] : []));
    expect(links.length).toBeGreaterThan(0);
    for (const { href, label } of links) {
      expect(linkableRoutes.has(href), href).toBe(true);
      expect(label.length).toBeGreaterThan(3);
    }
  });

  it("the price answer explains the paint-area rule and crew sizing without figures in rupees", () => {
    const price = generalFaqs.find((f) => f.q === "How is the price calculated?")!;
    const j = jobSize(900);
    expect(price.a).toContain("3 to 3.5 times");
    expect(price.a).toContain(`${j.paintArea.toLocaleString("en-IN")} sq ft`);
    expect(price.a).toContain(`${j.painterDays} painter-days`);
    expect(price.a).toContain(`crew of ${j.painters}`);
    expect(price.a).toContain(`${SQFT_PER_PAINTER_DAY} sq ft a day`);
  });

  it("the areas answer lists every served locality", () => {
    const areas = generalFaqs.find((f) => f.q.startsWith("Which areas"))!;
    for (const a of site.areas) expect(areas.a).toContain(a);
    expect(new Set(site.areas).size).toBe(site.areas.length);
  });
});
