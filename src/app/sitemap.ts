import type { MetadataRoute } from "next";
import { curatedColours } from "@/config/colours";
import { contentUpdated } from "@/config/seo-dates";
import { services, site } from "@/config/site";

// Every indexable page, with the date its content last changed (src/config/seo-dates.ts).
// Only the curated shades get /colours/[code] entries: the generated shade ladder is noindex.
// changefreq and priority are left out because Google ignores them.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/services",
    ...services.map((s) => `/services/${s.slug}`),
    "/areas",
    "/colours",
    ...curatedColours.map((c) => `/colours/${c.code}`),
    "/palettes",
    "/visualizer",
    "/book",
    "/about",
    "/faq",
    "/contact",
    "/privacy-policy",
    "/terms",
  ];
  return paths.map((path) => ({
    url: `${site.url}${path === "/" ? "" : path}`,
    lastModified: contentUpdated(path),
  }));
}
