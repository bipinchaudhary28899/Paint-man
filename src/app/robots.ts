import type { MetadataRoute } from "next";
import { site } from "@/config/site";

// Only the JSON API is blocked. Pages that must stay out of the index (/thank-you, /admin)
// carry `noindex` instead: a robots.txt block would stop Google from ever reading it, and a
// blocked URL that gets linked can still be indexed without its content.
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
