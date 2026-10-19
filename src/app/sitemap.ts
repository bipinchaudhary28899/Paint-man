import type { MetadataRoute } from "next";
import { contentUpdated } from "@/config/seo-dates";
import { services, site } from "@/config/site";

// Every indexable page, with the date its content last changed (src/config/seo-dates.ts).
// There are no /colours/<code> pages: the old Paint Man shade URLs 308 to the finder (src/proxy.ts).
// changefreq and priority are left out because Google ignores them.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/services",
    ...services.map((s) => `/services/${s.slug}`),
    "/areas",
    "/colours",
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
