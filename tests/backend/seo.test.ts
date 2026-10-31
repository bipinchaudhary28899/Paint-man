import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { contentUpdated, sectionUpdated, SITE_UPDATED } from "@/config/seo-dates";
import { services, site } from "@/config/site";
import {
  agraPlace,
  ALTERNATE_NAME,
  breadcrumbJsonLd,
  defaultOgImage,
  faqJsonLd,
  fullTitle,
  ICON_SIZES,
  iconPath,
  LOGO_PATH,
  localBusinessJsonLd,
  MAX_TITLE_LENGTH,
  openingHoursSpecification,
  pageMetadata,
  serviceJsonLd,
  siteVerification,
  TITLE_SUFFIX,
  websiteJsonLd,
} from "@/lib/seo";

type Json = Record<string, unknown>;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("titles", () => {
  it("brands every page title with ' | Paint Saathi' once", () => {
    expect(TITLE_SUFFIX).toBe(" | Paint Saathi");
    expect(fullTitle("Painting Services in Agra")).toBe("Painting Services in Agra | Paint Saathi");
  });

  it("keeps the default home title within the length cap", () => {
    const home = fullTitle(`House Painting Services in ${site.city}`);
    expect(home.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(home.match(/Agra/g)).toHaveLength(1);
  });
});

describe("pageMetadata", () => {
  it("sets title, description, canonical and matching Open Graph tags", () => {
    const m = pageMetadata({ title: "Contact", description: "Reach us", path: "/contact" });
    expect(m.title).toBe("Contact");
    expect(m.alternates?.canonical).toBe("/contact");
    expect(m.openGraph).toMatchObject({ title: "Contact", description: "Reach us", url: "/contact", locale: "en_IN", siteName: site.name });
    expect(m.robots).toBeUndefined();
  });

  it("gives every page the 1200x630 share card for Open Graph and Twitter", () => {
    const m = pageMetadata({ title: "Contact", description: "Reach us", path: "/contact" });
    const og = (m.openGraph as { images: Json[] }).images;
    expect(og).toHaveLength(1);
    // versioned by the content date so share caches refetch the card when the copy changes
    expect(og[0]).toMatchObject({ url: `${site.url}/opengraph-image?v=${SITE_UPDATED}`, width: 1200, height: 630, type: "image/png" });
    expect(String(og[0].alt).length).toBeGreaterThan(10);
    const twitter = m.twitter as { card: string; images: Json[] };
    expect(twitter.card).toBe("summary_large_image");
    expect(twitter.images).toEqual([{ url: defaultOgImage.url, alt: defaultOgImage.alt }]);
  });

  it("lets a page supply its own share image, made absolute when root-relative", () => {
    const own = pageMetadata({
      title: "Calm bedroom",
      description: "d",
      path: "/palettes",
      image: { url: "/palettes/opengraph-image", alt: "Calm bedroom palette swatches", width: 1200, height: 630 },
    });
    expect((own.openGraph as { images: Json[] }).images[0]).toEqual({
      url: `${site.url}/palettes/opengraph-image`,
      alt: "Calm bedroom palette swatches",
      width: 1200,
      height: 630,
    });
    expect((own.twitter as { images: Json[] }).images[0]).toEqual({ url: `${site.url}/palettes/opengraph-image`, alt: "Calm bedroom palette swatches" });

    const remote = pageMetadata({ title: "t", description: "d", path: "/x", image: { url: "https://cdn.example.com/a.jpg", alt: "A room" } });
    expect((remote.openGraph as { images: Json[] }).images[0].url).toBe("https://cdn.example.com/a.jpg");
    // protocol-relative URLs are already absolute: never glue the site origin onto them
    const cdn = pageMetadata({ title: "t", description: "d", path: "/x", image: { url: "//cdn.example.com/b.jpg", alt: "A hall" } });
    expect((cdn.openGraph as { images: Json[] }).images[0].url).toBe("//cdn.example.com/b.jpg");
  });

  it("supports absolute titles and noindex pages", () => {
    const m = pageMetadata({ title: "Home", description: "d", path: "/", absoluteTitle: true, noindex: true });
    expect(m.title).toEqual({ absolute: "Home" });
    expect(m.robots).toEqual({ index: false, follow: true });
  });
});

describe("business structured data", () => {
  it("describes the business as a HousePainter with its wordmark as an alternate name", () => {
    const ld = localBusinessJsonLd() as Json;
    expect(ld["@type"]).toBe("HousePainter");
    expect(ld["@id"]).toBe(`${site.url}/#business`);
    expect(ld.name).toBe(site.name);
    expect(ld.alternateName).toBe(ALTERNATE_NAME);
    expect(ALTERNATE_NAME).toBe("PaintSaathi");
    expect(ld).not.toHaveProperty("openingHours");
  });

  it("publishes a square, crawlable raster logo of at least 112px", () => {
    const logo = (localBusinessJsonLd() as Json).logo as Json;
    expect(logo["@type"]).toBe("ImageObject");
    expect(logo.url).toBe(`${site.url}${LOGO_PATH}`);
    expect(logo.width).toBe(logo.height);
    expect(logo.width as number).toBeGreaterThanOrEqual(112);
    // the file exists in the brand pack at the size the schema states
    const file = join(process.cwd(), "public", LOGO_PATH);
    expect(existsSync(file)).toBe(true);
    const png = readFileSync(file);
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([logo.width, logo.height]);
  });

  it("states opening hours as OpeningHoursSpecification from site.hours", () => {
    const spec = (localBusinessJsonLd() as Json).openingHoursSpecification as Json[];
    expect(spec).toEqual(openingHoursSpecification(site.hours));
    expect(spec.length).toBeGreaterThan(0);
    for (const rule of spec) {
      expect(rule["@type"]).toBe("OpeningHoursSpecification");
      expect(rule.opens as string < (rule.closes as string)).toBe(true);
    }
  });

  it("serves each live city, disambiguated, with every locality inside it pointing at its city", async () => {
    const { liveCities } = await import("@/config/site");
    const areas = (localBusinessJsonLd() as Json).areaServed as Json[];
    const live = liveCities();
    expect(live.map((c) => c.slug)).toEqual(expect.arrayContaining(["agra", "mathura", "vrindavan"]));
    expect(areas).toHaveLength(live.reduce((n, c) => n + c.areas.length + 1, 0));
    let i = 0;
    for (const c of live) {
      expect(areas[i]).toMatchObject({
        "@type": "City",
        "@id": `${site.url}/#${c.slug}`,
        name: c.name,
        sameAs: `https://en.wikipedia.org/wiki/${c.name}`,
        containedInPlace: { "@type": "State", name: "Uttar Pradesh", containedInPlace: { "@type": "Country", name: "India" } },
      });
      for (const name of c.areas) expect(areas[++i]).toEqual({ "@type": "Place", name: `${name}, ${c.name}`, containedInPlace: { "@id": `${site.url}/#${c.slug}` } });
      i++;
    }
    expect(areas[0]).toEqual(agraPlace());
  });

  it("lists every service in an offer catalogue that matches the service pages' schema", () => {
    const catalog = (localBusinessJsonLd() as Json).hasOfferCatalog as { "@type": string; itemListElement: { itemOffered: Json }[] };
    expect(catalog["@type"]).toBe("OfferCatalog");
    expect(catalog.itemListElement).toHaveLength(services.length);
    for (const [i, service] of services.entries()) {
      const offered = catalog.itemListElement[i].itemOffered;
      const ld = serviceJsonLd(service);
      expect(offered["@id"]).toBe(ld["@id"]);
      expect(offered.url).toBe(ld.url);
      // one entity, one name: the catalogue and the service page's own schema agree
      expect(offered.name).toBe(ld.name);
    }
  });

  it("omits empty contact fields instead of publishing blanks", () => {
    const ld = localBusinessJsonLd() as Json;
    for (const key of ["telephone", "email", "legalName"] as const) {
      if (!site[key === "telephone" ? "phone" : key]) expect(ld).not.toHaveProperty(key);
    }
    if (!site.social.length) expect(ld).not.toHaveProperty("sameAs");
    const address = ld.address as Json;
    expect(address).toMatchObject({ addressLocality: site.address.locality, addressRegion: site.region, addressCountry: site.country });
    if (!site.address.street) expect(address).not.toHaveProperty("streetAddress");
  });
});

describe("optional business details", () => {
  // site.ts may gain these later; the schema must publish them only when they hold real values.
  const details = site as unknown as { geo?: unknown; alternateName?: string; address: { street: string } };
  const originalStreet = site.address.street;
  afterEach(() => {
    delete details.geo;
    delete details.alternateName;
    details.address.street = originalStreet;
  });

  it("leaves geo out until coordinates exist", () => {
    expect(localBusinessJsonLd()).not.toHaveProperty("geo");
  });

  it("publishes a geo pin only alongside a street address", () => {
    details.geo = { lat: 27.17667, lng: 78.00807 };
    details.address.street = "";
    expect(localBusinessJsonLd()).not.toHaveProperty("geo");
    details.address.street = "1 Example Road";
    expect((localBusinessJsonLd() as Json).geo).toEqual({ "@type": "GeoCoordinates", latitude: 27.17667, longitude: 78.00807 });
  });

  it("accepts latitude/longitude keys and rejects out-of-range values", () => {
    details.address.street = "1 Example Road";
    details.geo = { latitude: 27.2, longitude: 78.0 };
    expect((localBusinessJsonLd() as Json).geo).toMatchObject({ latitude: 27.2, longitude: 78.0 });
    details.geo = { lat: 127.2, lng: 78.0 };
    expect(localBusinessJsonLd()).not.toHaveProperty("geo");
    details.geo = { lat: 27.2 };
    expect(localBusinessJsonLd()).not.toHaveProperty("geo");
  });

  it("prefers an alternate name set in site.ts", () => {
    details.alternateName = "Paint-Man";
    expect((localBusinessJsonLd() as Json).alternateName).toBe("Paint-Man");
    expect(websiteJsonLd().alternateName).toBe("Paint-Man");
  });
});

describe("openingHoursSpecification", () => {
  it("expands day ranges into full day names", () => {
    expect(openingHoursSpecification("Mo-Sa 09:00-19:00")).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "19:00",
      },
    ]);
  });

  it("reads several rules and comma-separated days", () => {
    expect(openingHoursSpecification("Mo,We-Th 10:00-14:00; Su 10:00-13:00")).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Wednesday", "Thursday"], opens: "10:00", closes: "14:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday"], opens: "10:00", closes: "13:00" },
    ]);
  });

  it("drops rules it cannot read instead of guessing", () => {
    for (const bad of ["", "Mo-Sa", "Xx 09:00-19:00", "Sa-Mo 09:00-19:00", "Mo 19:00-09:00", "Mo 25:00-26:00", "Mo 9am-7pm"]) {
      expect(openingHoursSpecification(bad)).toEqual([]);
    }
    expect(openingHoursSpecification("Mo 09:00-12:00; nonsense")).toHaveLength(1);
  });
});

describe("website, service, FAQ and breadcrumb schema", () => {
  it("names the website with the same alternate name and links it to the business", () => {
    const ld = websiteJsonLd();
    expect(ld).toMatchObject({ "@type": "WebSite", name: site.name, alternateName: ALTERNATE_NAME, publisher: { "@id": `${site.url}/#business` } });
  });

  it("gives each service hub a stable @id, its provider and every live city", () => {
    for (const service of services) {
      const ld = serviceJsonLd(service);
      expect(ld["@id"]).toBe(`${site.url}/services/${service.slug}#service`);
      expect(ld.url).toBe(`${site.url}/services/${service.slug}`);
      expect(ld.provider).toEqual({ "@id": `${site.url}/#business` });
      // every live city, and not Delhi NCR or Bangalore, which are not live yet
      expect((ld.areaServed as { name: string }[]).map((p) => p.name)).toEqual(["Agra", "Mathura", "Vrindavan"]);
    }
  });

  it("gives a service in a city its own @id, name, description and city", async () => {
    const { getCity } = await import("@/config/site");
    const agra = getCity("agra")!;
    for (const service of services) {
      const ld = serviceJsonLd(service, agra);
      expect(ld["@id"]).toBe(`${site.url}/services/${service.slug}/agra#service`);
      expect(ld.name).toBe(`${service.title} in Agra`);
      expect(ld.description).toBe(service.local.agra.description);
      expect(ld.areaServed).toEqual(agraPlace());
      expect(ld.provider).toEqual({ "@id": `${site.url}/#business` });
    }
    // a city without written copy falls back to the hub description and a plain City node
    const soon = getCity("bangalore")!;
    const ld = serviceJsonLd(services[0], soon);
    expect(ld.description).toBe(services[0].description);
    expect(ld.areaServed).toEqual({ "@type": "City", name: "Bangalore" });
  });

  it("builds FAQ and breadcrumb schema", () => {
    expect(faqJsonLd([{ q: "Q?", a: "A." }]).mainEntity[0]).toMatchObject({ name: "Q?", acceptedAnswer: { text: "A." } });
    const crumbs = breadcrumbJsonLd([{ name: "FAQ", path: "/faq" }]).itemListElement;
    expect(crumbs.map((c) => c.position)).toEqual([1, 2]);
    expect(crumbs.map((c) => c.item)).toEqual([site.url, `${site.url}/faq`]);
  });
});

describe("content dates", () => {
  it("stores valid ISO dates that are not in the future", () => {
    // Dates are written on the business's calendar (Agra, IST), so compare against today there.
    const todayInAgra = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    for (const date of [SITE_UPDATED, ...Object.values(sectionUpdated)]) {
      expect(date).toMatch(ISO_DATE);
      expect(Number.isNaN(Date.parse(date))).toBe(false);
      expect(date <= todayInAgra).toBe(true);
    }
  });

  it("uses the most specific section date and falls back to the site date", () => {
    const sections = { "/services": "2026-01-02", "/services/exterior-painting": "2026-03-04", "/": "2026-05-06" };
    expect(contentUpdated("/services", sections)).toBe("2026-01-02");
    expect(contentUpdated("/services/interior-painting", sections)).toBe("2026-01-02");
    expect(contentUpdated("/services/exterior-painting", sections)).toBe("2026-03-04");
    expect(contentUpdated("/servicesx", sections)).toBe(SITE_UPDATED);
    expect(contentUpdated("/", sections)).toBe("2026-05-06");
    expect(contentUpdated("/faq", sections)).toBe(SITE_UPDATED);
    expect(contentUpdated("/terms")).toBe(sectionUpdated["/terms"]);
  });
});

describe("sitemap", () => {
  const paths = () => sitemap().map((e) => e.url.replace(site.url, "") || "/");

  it("lists every public page and no private ones", () => {
    const urls = paths();
    expect(urls).toEqual(
      expect.arrayContaining(["/", "/book", "/services", "/services/house-painting", "/services/house-painting/agra", "/colours", "/palettes", "/about", "/faq", "/contact", "/privacy-policy", "/terms"]),
    );
    for (const s of services) {
      expect(urls).toContain(`/services/${s.slug}`); // the hub
      expect(urls).toContain(`/services/${s.slug}/agra`); // the live city's page
    }
    // /areas became the Agra page; cities that are not live yet stay out of the sitemap
    expect(urls).not.toContain("/areas");
    expect(urls.some((u) => u.includes("delhi-ncr") || u.includes("bangalore"))).toBe(false);
    expect(urls.some((u) => u.startsWith("/admin") || u.startsWith("/api") || u === "/thank-you")).toBe(false);
    // the customer's login and account pages are noindex and never listed
    expect(urls.some((u) => u === "/login" || u.startsWith("/account"))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
    for (const e of sitemap()) expect(e.url.startsWith(site.url)).toBe(true);
    // the photo visualizer was retired; /visualizer now redirects to the colour finder
    expect(sitemap().map((e) => new URL(e.url).pathname)).not.toContain("/visualizer");
  });

  it("lists the colour finder and no /colours/<code> pages (the old shade URLs redirect)", () => {
    const urls = paths();
    expect(urls).toContain("/colours");
    expect(urls.filter((u) => u.startsWith("/colours/"))).toEqual([]);
  });

  it("dates entries from config, not from the build clock", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
      const first = sitemap();
      vi.setSystemTime(new Date("2031-06-15T12:00:00Z"));
      expect(sitemap()).toEqual(first);
    } finally {
      vi.useRealTimers();
    }
    for (const e of sitemap()) {
      expect(String(e.lastModified)).toMatch(ISO_DATE);
      expect(e.lastModified).toBe(contentUpdated(e.url.replace(site.url, "") || "/"));
      expect(e).not.toHaveProperty("priority");
      expect(e).not.toHaveProperty("changeFrequency");
    }
  });
});

describe("robots", () => {
  it("blocks all crawling on Vercel preview deployments", () => {
    process.env.VERCEL_ENV = "preview";
    try {
      expect(robots().rules).toEqual([{ userAgent: "*", disallow: "/" }]);
    } finally {
      delete process.env.VERCEL_ENV;
    }
  });

  it("blocks only the API so noindex pages stay readable, and points at the sitemap", () => {
    const r = robots();
    const rules = r.rules as { allow: string; disallow: string[] }[];
    expect(rules[0].disallow).toEqual(["/api/"]);
    expect(rules[0].disallow).not.toContain("/thank-you");
    expect(r).not.toHaveProperty("host");
    expect(r.sitemap).toBe(`${site.url}/sitemap.xml`);
  });
});

describe("web manifest", () => {
  it("offers the brand pack's 192 and 512 app icons, one of them maskable", () => {
    const m = manifest();
    const icons = m.icons ?? [];
    for (const size of ICON_SIZES) {
      expect(icons).toContainEqual({ src: iconPath(size), sizes: `${size}x${size}`, type: "image/png", purpose: "any" });
      const png = readFileSync(join(process.cwd(), "public", iconPath(size)));
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([size, size]);
    }
    expect(icons).toContainEqual({ src: iconPath(512), sizes: "512x512", type: "image/png", purpose: "maskable" });
    expect(m.background_color).toBe("#f8f5ef");
  });
});

describe("siteVerification", () => {
  it("publishes nothing until a console code is set", () => {
    expect(siteVerification({})).toBeUndefined();
    expect(siteVerification({ NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: "  ", NEXT_PUBLIC_BING_SITE_VERIFICATION: "" })).toBeUndefined();
  });

  it("emits Google's tag and Bing's msvalidate.01 tag from their own env vars", () => {
    expect(siteVerification({ NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: " g-code " })).toEqual({ google: "g-code" });
    expect(siteVerification({ NEXT_PUBLIC_BING_SITE_VERIFICATION: "B1NG" })).toEqual({ other: { "msvalidate.01": "B1NG" } });
    expect(siteVerification({ NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: "g", NEXT_PUBLIC_BING_SITE_VERIFICATION: "b" })).toEqual({
      google: "g",
      other: { "msvalidate.01": "b" },
    });
  });

  it("reads process.env by default", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION", "from-env");
    vi.stubEnv("NEXT_PUBLIC_BING_SITE_VERIFICATION", "");
    expect(siteVerification()).toEqual({ google: "from-env" });
    vi.unstubAllEnvs();
  });
});

describe("booking action (book painters online)", () => {
  it("points the business at its online booking page as a ReserveAction", async () => {
    const { bookingAction } = await import("@/lib/seo");
    const action = bookingAction();
    expect(action["@type"]).toBe("ReserveAction");
    expect(action.name).toBe(`Book painters online in ${site.city}`);
    expect(action.target.urlTemplate).toBe(`${site.url}/book`);
    expect(action.target.actionPlatform).toContain("https://schema.org/MobileWebPlatform");
    expect((localBusinessJsonLd() as Json).potentialAction).toEqual(action);
  });
});
