import type { MetadataRoute } from "next";
import { contentUpdated } from "@/config/seo-dates";
import { cityPath, liveCities, servicePath, services, servicesIn, site } from "@/config/site";
import { shadeCardPaths } from "@/lib/colours/shade-cards";

// Every indexable page, with the date its content last changed (src/config/seo-dates.ts).
// There are no /colours/<code> pages: the old Paint Man shade URLs 308 to the finder (src/proxy.ts).
// City pages are listed only for live cities: "soon" cities are waitlist pages, noindexed.
// changefreq and priority are left out because Google ignores them.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/services",
    "/services/house-painting",
    ...services.map((s) => servicePath(s)),
    ...liveCities().flatMap((c) => [cityPath(c), ...servicesIn(c).map((s) => servicePath(s, c))]),
    "/colours",
    ...shadeCardPaths(),
    "/palettes",
    "/gallery",
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
