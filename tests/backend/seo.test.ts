import { afterEach, describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { colours, curatedColours } from "@/config/colours";
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
  it("brands every page title with ' | Paint Man' once", () => {
    expect(TITLE_SUFFIX).toBe(" | Paint Man");
    expect(fullTitle("Painting Services in Agra")).toBe("Painting Services in Agra | Paint Man");
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
      title: "Sage Mist",
      description: "d",
      path: "/colours/PM-502",
      image: { url: "/colours/PM-502/opengraph-image", alt: "Sage Mist swatch", width: 1200, height: 630 },
    });
    expect((own.openGraph as { images: Json[] }).images[0]).toEqual({
      url: `${site.url}/colours/PM-502/opengraph-image`,
      alt: "Sage Mist swatch",
      width: 1200,
      height: 630,
    });
    expect((own.twitter as { images: Json[] }).images[0]).toEqual({ url: `${site.url}/colours/PM-502/opengraph-image`, alt: "Sage Mist swatch" });

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
    expect(ALTERNATE_NAME).toBe("PaintMan");
    expect(ld).not.toHaveProperty("openingHours");
  });

  it("publishes a square, crawlable raster logo of at least 112px", () => {
    const logo = (localBusinessJsonLd() as Json).logo as Json;
    expect(logo["@type"]).toBe("ImageObject");
    expect(logo.url).toBe(`${site.url}${iconPath(512)}`);
    expect(logo.width).toBe(logo.height);
    expect(logo.width as number).toBeGreaterThanOrEqual(112);
    expect(ICON_SIZES).toContain(logo.width);
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

  it("serves one disambiguated Agra plus each locality inside it", () => {
    const areas = (localBusinessJsonLd() as Json).areaServed as Json[];
    expect(areas).toHaveLength(site.areas.length + 1);
    expect(areas[0]).toEqual(agraPlace());
    expect(areas[0]).toMatchObject({
      "@type": "City",
      "@id": `${site.url}/#agra`,
      sameAs: "https://en.wikipedia.org/wiki/Agra",
      containedInPlace: { "@type": "State", name: "Uttar Pradesh", containedInPlace: { "@type": "Country", name: "India" } },
    });
    for (const [i, name] of site.areas.entries()) {
      expect(areas[i + 1]).toEqual({ "@type": "Place", name: `${name}, ${site.city}`, containedInPlace: { "@id": `${site.url}/#agra` } });
    }
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

  it("gives each service a stable @id, its provider and the Agra area", () => {
    for (const service of services) {
      const ld = serviceJsonLd(service);
      expect(ld["@id"]).toBe(`${site.url}/services/${service.slug}#service`);
      expect(ld.url).toBe(`${site.url}/services/${service.slug}`);
      expect(ld.provider).toEqual({ "@id": `${site.url}/#business` });
      expect(ld.areaServed).toEqual(agraPlace());
    }
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
    const sections = { "/colours": "2026-01-02", "/colours/PM-101": "2026-03-04", "/": "2026-05-06" };
    expect(contentUpdated("/colours", sections)).toBe("2026-01-02");
    expect(contentUpdated("/colours/PM-502", sections)).toBe("2026-01-02");
    expect(contentUpdated("/colours/PM-101", sections)).toBe("2026-03-04");
    expect(contentUpdated("/coloursx", sections)).toBe(SITE_UPDATED);
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
      expect.arrayContaining(["/", "/book", "/services", "/areas", "/colours", "/palettes", "/visualizer", "/about", "/faq", "/contact", "/privacy-policy", "/terms"]),
    );
    for (const s of services) expect(urls).toContain(`/services/${s.slug}`);
    expect(urls.some((u) => u.startsWith("/admin") || u.startsWith("/api") || u === "/thank-you")).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
    for (const e of sitemap()) expect(e.url.startsWith(site.url)).toBe(true);
  });

  it("lists the curated shades only, never the generated ladder", () => {
    const urls = paths();
    for (const c of curatedColours) expect(urls).toContain(`/colours/${c.code}`);
    const curated = new Set(curatedColours.map((c) => c.code));
    const generated = colours.filter((c) => !curated.has(c.code));
    expect(generated.length).toBeGreaterThan(0);
    for (const c of generated) expect(urls).not.toContain(`/colours/${c.code}`);
    expect(urls.filter((u) => u.startsWith("/colours/"))).toHaveLength(curatedColours.length);
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
  it("offers the SVG mark plus 192 and 512 PNG icons, one of them maskable", () => {
    const m = manifest();
    const icons = m.icons ?? [];
    expect(icons).toContainEqual({ src: "/icon.svg", sizes: "any", type: "image/svg+xml" });
    for (const size of [192, 512] as const) {
      expect(icons).toContainEqual({ src: iconPath(size), sizes: `${size}x${size}`, type: "image/png", purpose: "any" });
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
