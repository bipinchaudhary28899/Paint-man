import type { MetadataRoute } from "next";
import { colours } from "@/config/colours";
import { services, site } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly") => ({
    url: `${site.url}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    page("", 1, "weekly"),
    page("/book", 0.9),
    page("/services", 0.9),
    ...services.map((s) => page(`/services/${s.slug}`, 0.8)),
    page("/colours", 0.8, "weekly"),
    page("/palettes", 0.8, "weekly"),
    page("/visualizer", 0.8, "weekly"),
    ...colours.map((c) => page(`/colours/${c.code}`, 0.5)),
    page("/about", 0.6),
    page("/faq", 0.6),
    page("/contact", 0.7),
    page("/privacy-policy", 0.2, "yearly"),
    page("/terms", 0.2, "yearly"),
  ];
}
