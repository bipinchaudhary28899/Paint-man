import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { rooms } from "@/config/colours";
import { getPalette } from "@/config/palettes";
import { areaSlug, generalFaqs, getService, jobDuration, jobSize, services, site, type Service } from "@/config/site";
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

// Routes a link in site.ts may point to: every page in the real sitemap, plus the real pages kept
// out of it on purpose (noindex). A link to anything else dangles, so a renamed or removed route
// fails here instead of shipping a 404.
const unlistedRoutes = ["/thank-you"];
const knownRoutes = new Set([...sitemap().map((e) => e.url.replace(site.url, "") || "/"), ...unlistedRoutes]);

/** Why an internal href would not land on a page (or a locality on /areas); undefined when it does. */
function danglingReason(href: string): string | undefined {
  if (!href.startsWith("/") || href.startsWith("//")) return "not a root-relative internal link";
  const url = new URL(href, "http://site.test");
  if (!knownRoutes.has(url.pathname)) return `no page at ${url.pathname}`;
  if (url.pathname === "/areas" && url.hash && !site.areas.some((a) => `#${areaSlug(a)}` === url.hash)) return `no locality ${url.hash} on /areas`;
  return undefined;
}

describe("areas", () => {
  it("are unique, and each has its own valid anchor slug (the id on /areas)", () => {
    expect(new Set(site.areas).size).toBe(site.areas.length);
    const slugs = site.areas.map(areaSlug);
    expect(new Set(slugs).size).toBe(site.areas.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("slugs are the lower-cased name with each run of other characters as one hyphen", () => {
    expect(areaSlug("Kamla Nagar")).toBe("kamla-nagar");
    expect(areaSlug("Dayalbagh")).toBe("dayalbagh");
    expect(areaSlug("  M.G. Road & Civil Lines ")).toBe("m-g-road-civil-lines");
  });
});

describe("known routes", () => {
  it("come from the sitemap, plus unlisted pages that exist", () => {
    for (const path of ["/", "/book", "/areas", "/faq", "/contact", ...services.map((s) => `/services/${s.slug}`)]) {
      expect(knownRoutes.has(path), path).toBe(true);
    }
    for (const path of unlistedRoutes) {
      expect(existsSync(fileURLToPath(new URL(`../../src/app/(site)${path}/page.tsx`, import.meta.url))), path).toBe(true);
    }
  });

  it("accept query strings and locality anchors, and reject anything that dangles", () => {
    expect(danglingReason("/book?service=interior-painting")).toBeUndefined();
    expect(danglingReason(`/areas#${areaSlug(site.areas[0])}`)).toBeUndefined();
    expect(danglingReason("/areas#nowhere")).toBe("no locality #nowhere on /areas");
    expect(danglingReason("/areas/kamla-nagar")).toBe("no page at /areas/kamla-nagar");
    expect(danglingReason("/projects")).toBe("no page at /projects");
    expect(danglingReason("https://example.com/")).toBe("not a root-relative internal link");
  });
});

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
    const crew = crewEstimate(j.paintArea);
    expect(j).toEqual({ carpetArea: 900, paintArea: j.paintArea, ...crew, duration: jobDuration(crew.days) });
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
      expect(j.duration, e.home).toBe("about a week");
    }
    // exterior area is measured on site, never estimated from carpet area
    expect(getService("exterior-painting")?.sizeExamples).toBeUndefined();
  });

  it("names a day count only for a job the crew rule cannot fit into about a week", () => {
    for (const days of [5, 6, 7, 8]) expect(jobDuration(days)).toBe("about a week");
    expect(jobDuration(4)).toBe("about 4 working days");
    expect(jobDuration(12)).toBe("about 12 working days");
    // a small flat bottoms out at the minimum crew of two; a very large floor tops out at eight
    expect(jobSize(200).duration).toBe(`about ${jobSize(200).days} working days`);
    expect(jobSize(4000).painters).toBe(8);
    expect(jobSize(4000).duration).toBe(`about ${jobSize(4000).days} working days`);
  });
});

describe("job lengths", () => {
  const copy = [...services.flatMap(allCopy), ...generalFaqs.flatMap((f) => [f.q, f.a])];

  it("say one thing everywhere: a crew sized to the home, for about a week", () => {
    const j = jobSize(900);
    const interior = getService("interior-painting")!.faqs.find((f) => f.q.startsWith("How long"))!;
    expect(interior.a).toContain(`takes ${j.duration} with a crew sized to the job, usually ${j.painters} painters`);
    expect(interior.a).toContain("less when the walls need little putty work");
    const price = generalFaqs.find((f) => f.q === "How is the price calculated?")!;
    expect(price.a).toContain(`crew of ${j.painters} for ${j.duration}`);
    expect(getService("interior-painting")!.timeline.join(" ")).toContain("about a week");
  });

  it("never gives a range of days or a day count that disagrees with the crew rule", () => {
    for (const text of copy) {
      expect(text).not.toMatch(/\d+\s*(to|-|–)\s*\d+\s*(working\s+)?days/i);
      expect(text).not.toMatch(/\d+\s+working days/i);
    }
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
      expect(danglingReason(href), href).toBeUndefined();
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
