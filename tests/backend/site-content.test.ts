import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { getPalette } from "@/config/palettes";
import { areaSlug, cities, cityPath, generalFaqs, getCity, getService, homeCity, jobDuration, jobSize, liveCities, serviceCityTitle, servicePath, services, servicesIn, site, type Service } from "@/config/site";
import { getBrandShade } from "@/lib/colours/brands";
import { crewEstimate, PAINT_AREA_PER_CARPET_SQFT, SQFT_PER_PAINTER_DAY } from "@/lib/leads/estimate";
import { serviceTypes } from "@/lib/leads/options";

// Integrity of the service and FAQ copy in src/config/site.ts (AGENTS.md rules 1 and 2).

const SUFFIX = " | Paint Saathi";
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

/** Every city section of a service: its intro, notes and FAQs. */
const localCopy = (s: Service) =>
  Object.values(s.local).flatMap((l) => [l.description, l.intro, ...l.notes.flatMap((n) => [n.title, n.body]), ...l.faqs.flatMap((f) => [f.q, f.a])]);
const allCopy = (s: Service) => [...specificCopy(s), s.title, s.description, ...s.faqs.flatMap((f) => [f.q, f.a]), ...localCopy(s)];

// Routes a link in site.ts may point to: every page in the real sitemap, plus the real pages kept
// out of it on purpose (noindex). A link to anything else dangles, so a renamed or removed route
// fails here instead of shipping a 404.
const unlistedRoutes = ["/thank-you"];
const knownRoutes = new Set([...sitemap().map((e) => e.url.replace(site.url, "") || "/"), ...unlistedRoutes]);

/** Why an internal href would not land on a page (or a locality on a city page); undefined when it does. */
function danglingReason(href: string): string | undefined {
  if (!href.startsWith("/") || href.startsWith("//")) return "not a root-relative internal link";
  const url = new URL(href, "http://site.test");
  if (!knownRoutes.has(url.pathname)) return `no page at ${url.pathname}`;
  const city = cities.find((c) => cityPath(c) === url.pathname);
  if (city && url.hash && url.hash !== "#localities" && !city.areas.some((a) => `#${areaSlug(a)}` === url.hash)) return `no locality ${url.hash} on ${url.pathname}`;
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
    for (const path of ["/", "/book", "/faq", "/contact", "/services/house-painting", "/services/house-painting/agra", ...services.flatMap((s) => [`/services/${s.slug}`, `/services/${s.slug}/agra`])]) {
      expect(knownRoutes.has(path), path).toBe(true);
    }
    for (const path of unlistedRoutes) {
      expect(existsSync(fileURLToPath(new URL(`../../src/app/(site)${path}/page.tsx`, import.meta.url))), path).toBe(true);
    }
  });

  it("accept query strings and locality anchors, and reject anything that dangles", () => {
    expect(danglingReason("/book?service=interior-painting")).toBeUndefined();
    expect(danglingReason(`/services/house-painting/agra#${areaSlug(site.areas[0])}`)).toBeUndefined();
    expect(danglingReason("/services/house-painting/agra#localities")).toBeUndefined();
    expect(danglingReason("/services/house-painting/agra#nowhere")).toBe("no locality #nowhere on /services/house-painting/agra");
    expect(danglingReason("/areas")).toBe("no page at /areas"); // retired: 308s to the Agra page
    // a city that is not live yet is a noindex waitlist page, kept out of the sitemap
    expect(danglingReason("/services/house-painting/bangalore")).toBe("no page at /services/house-painting/bangalore");
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

  it.each(services.map((s) => [s.slug, s] as const))("%s: the hub title names no city; every city title is '{Topic} in {City}' within 60 characters", (_slug, s) => {
    for (const c of cities) expect(s.title).not.toContain(c.name);
    expect((s.title + SUFFIX).length).toBeLessThanOrEqual(60);
    for (const c of cities) {
      expect(serviceCityTitle(s, c)).toBe(`${s.title} in ${c.name}`);
      expect((serviceCityTitle(s, c) + SUFFIX).length).toBeLessThanOrEqual(60);
    }
  });

  it.each(services.map((s) => [s.slug, s] as const))("%s: descriptions are 140-155 characters; the hub's names no city, each city's names its city", (_slug, s) => {
    expect(s.description.length).toBeGreaterThanOrEqual(140);
    expect(s.description.length).toBeLessThanOrEqual(155);
    for (const c of cities) expect(s.description).not.toContain(c.name);
    for (const [slug, local] of Object.entries(s.local)) {
      const city = getCity(slug)!;
      expect(city, slug).toBeDefined();
      expect(local.description.length, slug).toBeGreaterThanOrEqual(140);
      expect(local.description.length, slug).toBeLessThanOrEqual(155);
      expect(local.description).toContain(city.name);
      expect(local.intro).toContain(city.name);
      expect(local.notes.length).toBeGreaterThanOrEqual(2);
    }
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

  it("matching palettes and their brand shades all resolve", () => {
    for (const s of services) {
      expect(s.shades.palettes.length).toBeGreaterThan(0);
      for (const slug of s.shades.palettes) {
        const palette = getPalette(slug);
        expect(palette, `${s.slug} → ${slug}`).toBeDefined();
        for (const shade of palette!.shades) expect(getBrandShade(shade.id), `${slug} → ${shade.id}`).toBeDefined();
      }
    }
  });

  it("never promises shade pages of our own: shades open in the brand finder", () => {
    for (const s of services) expect(s.shades.intro, s.slug).not.toMatch(/open any shade for its|room photos|PM-\d/);
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
    expect(jobDuration(1)).toBe("about 1 working day");
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
    const interior = getService("interior-painting")!.local.agra.faqs.find((f) => f.q.startsWith("How long"))!;
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
  const all = [...generalFaqs, ...services.flatMap((s) => [...s.faqs, ...Object.values(s.local).flatMap((l) => l.faqs)])];

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
    const areas = generalFaqs.find((f) => f.q === `Do you have painters near me in ${site.city}?`)!;
    for (const a of site.areas) expect(areas.a).toContain(a);
    expect(new Set(site.areas).size).toBe(site.areas.length);
  });
});

describe("booking FAQs (/book)", () => {
  it("never repeat a general or service question, so each Q&A is marked up once site-wide", async () => {
    const { bookingFaqs } = await import("@/config/site");
    const others = new Set([...generalFaqs, ...services.flatMap((s) => s.faqs)].map((f) => f.q));
    for (const f of bookingFaqs) expect(others.has(f.q), f.q).toBe(false);
    expect(bookingFaqs.length).toBeGreaterThanOrEqual(3);
  });
});


describe("cities (city-scoped URLs: /services/<service>/<city>)", () => {
  it("have unique URL-safe slugs and names, and Agra is live", () => {
    expect(new Set(cities.map((c) => c.slug)).size).toBe(cities.length);
    expect(new Set(cities.map((c) => c.name)).size).toBe(cities.length);
    for (const c of cities) expect(c.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(homeCity.slug).toBe("agra");
    expect(homeCity.status).toBe("live");
    expect(cities.map((c) => c.slug)).toEqual(expect.arrayContaining(["agra", "delhi-ncr", "bangalore"]));
  });

  it("a live city has localities and every service written for it; a coming city has neither", () => {
    for (const c of cities) {
      expect(c.description.length, c.slug).toBeGreaterThanOrEqual(140);
      expect(c.description.length, c.slug).toBeLessThanOrEqual(155);
      if (c.status === "live") {
        expect(c.areas.length).toBeGreaterThan(0);
        expect(servicesIn(c).map((s) => s.slug)).toEqual(services.map((s) => s.slug));
      } else {
        expect(c.areas).toEqual([]);
        expect(servicesIn(c)).toEqual([]);
        for (const s of services) expect(c.slug in s.local, `${s.slug} in ${c.slug}`).toBe(false);
      }
    }
    expect(liveCities().every((c) => c.status === "live")).toBe(true);
  });

  it("builds the URLs every page, menu and sitemap entry uses", () => {
    const interior = getService("interior-painting")!;
    expect(servicePath(interior)).toBe("/services/interior-painting");
    expect(servicePath(interior, homeCity)).toBe("/services/interior-painting/agra");
    expect(cityPath(homeCity)).toBe("/services/house-painting/agra");
  });

  it("every city's weather links resolve", () => {
    for (const c of cities) for (const w of c.weather) if (w.link) expect(danglingReason(w.link.href), w.link.href).toBeUndefined();
  });
});

describe("header menus and footer link hub (src/config/nav.ts)", () => {
  it("every link lands on a real page; coming-soon cities link to their (noindex) waitlist page", async () => {
    const { navMenus, footerColumns, menuLinks } = await import("@/config/nav");
    const soonPaths = new Set(cities.filter((c) => c.status === "soon").map(cityPath));
    const links = [...navMenus().flatMap((m) => [{ href: m.href }, ...menuLinks(m)]), ...footerColumns().flatMap((c) => c.links)];
    expect(links.length).toBeGreaterThan(20);
    for (const { href } of links) {
      if (soonPaths.has(href)) continue;
      expect(danglingReason(href), href).toBeUndefined();
    }
  });

  it("names a menu and a footer column for every live city's services", async () => {
    const { footerColumns } = await import("@/config/nav");
    const agra = footerColumns().find((c) => c.heading === "Painting in Agra")!;
    for (const s of services) expect(agra.links.map((l) => l.href)).toContain(`/services/${s.slug}/agra`);
  });

  it("only offers shade cards for brands that are in the colour data", async () => {
    const { shadeCardBrands } = await import("@/config/nav");
    const { isBrand } = await import("@/lib/colours/brands");
    for (const b of shadeCardBrands) expect(isBrand(b.slug), b.slug).toBe(true);
  });
});
