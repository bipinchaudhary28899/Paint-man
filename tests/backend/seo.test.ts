import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { services, site } from "@/config/site";
import { breadcrumbJsonLd, faqJsonLd, localBusinessJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";

describe("pageMetadata", () => {
  it("sets title, description, canonical and matching Open Graph tags", () => {
    const m = pageMetadata({ title: "Contact", description: "Reach us", path: "/contact" });
    expect(m.title).toBe("Contact");
    expect(m.alternates?.canonical).toBe("/contact");
    expect(m.openGraph).toMatchObject({ title: "Contact", description: "Reach us", url: "/contact", locale: "en_IN" });
    expect(m.robots).toBeUndefined();
  });

  it("supports absolute titles and noindex pages", () => {
    const m = pageMetadata({ title: "Home", description: "d", path: "/", absoluteTitle: true, noindex: true });
    expect(m.title).toEqual({ absolute: "Home" });
    expect(m.robots).toEqual({ index: false, follow: true });
  });
});

describe("structured data", () => {
  it("describes the business as a HousePainter serving its localities", () => {
    const ld = localBusinessJsonLd() as Record<string, unknown>;
    expect(ld["@type"]).toBe("HousePainter");
    expect((ld.areaServed as unknown[]).length).toBe(site.areas.length + 1);
  });

  it("omits empty contact fields instead of publishing blanks", () => {
    const ld = localBusinessJsonLd() as Record<string, unknown>;
    for (const key of ["telephone", "email", "legalName"] as const) {
      if (!site[key === "telephone" ? "phone" : key]) expect(ld).not.toHaveProperty(key);
    }
  });

  it("builds FAQ, service and breadcrumb schema", () => {
    expect(faqJsonLd([{ q: "Q?", a: "A." }]).mainEntity[0]).toMatchObject({ name: "Q?", acceptedAnswer: { text: "A." } });
    expect(serviceJsonLd(services[0]).url).toBe(`${site.url}/services/${services[0].slug}`);
    const crumbs = breadcrumbJsonLd([{ name: "FAQ", path: "/faq" }]).itemListElement;
    expect(crumbs.map((c) => c.position)).toEqual([1, 2]);
  });
});

describe("sitemap and robots", () => {
  it("lists every public page and no private ones", () => {
    const urls = sitemap().map((e) => e.url.replace(site.url, "") || "/");
    expect(urls).toEqual(expect.arrayContaining(["/", "/book", "/services", "/about", "/faq", "/contact"]));
    for (const s of services) expect(urls).toContain(`/services/${s.slug}`);
    expect(urls.some((u) => u.startsWith("/admin") || u.startsWith("/api") || u === "/thank-you")).toBe(false);
  });

  it("blocks all crawling on Vercel preview deployments", () => {
    process.env.VERCEL_ENV = "preview";
    try {
      expect(robots().rules).toEqual([{ userAgent: "*", disallow: "/" }]);
    } finally {
      delete process.env.VERCEL_ENV;
    }
  });

  it("blocks crawlers from the API and thank-you page", () => {
    const rules = robots().rules as { disallow: string[] }[];
    expect(rules[0].disallow).toEqual(expect.arrayContaining(["/api/", "/thank-you"]));
  });
});
