import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// Vercel preview deployments must never be indexed (duplicate content hurts SEO).
const isPreview = Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production";

// Content Security Policy. 'unsafe-inline' for scripts is needed by Next.js's
// inline bootstrap scripts on statically generated pages (a nonce would force
// every page to render dynamically, which is slower and worse for SEO).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "worker-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://images.pexels.com",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const privateHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "no-store, max-age=0" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Placeholder stock photos from Pexels (free licence). Replace with your own project photos.
    remotePatterns: [{ protocol: "https", hostname: "images.pexels.com", pathname: "/photos/**" }],
    formats: ["image/avif", "image/webp"],
    // No 3840 variant: no image box is wider than 1200 CSS px, so 2048 covers a 2x retina
    // screen, and every extra width is another slow first-request resize of a multi-MB
    // original.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Keep optimised variants for 30 days (default 4 hours) so photos are not re-encoded
    // after every short upstream max-age; the photo URLs change whenever the photo does.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // experimental.inlineCss was measured and left off: the stylesheet (~12 KB brotli) is fetched
  // once on the page's own connection and cached for every later page, while inlining copied it
  // three times into every HTML document and every RSC prefetch (/faq: 8.8 KB -> 22 KB brotli).
  // The photo visualizer was retired: old links (including ?shade=…) land on the colour finder,
  // where every shade is previewed on the room photo.
  async redirects() {
    return [{ source: "/visualizer", destination: "/colours", permanent: true }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...(isPreview ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : []),
      { source: "/admin/:path*", headers: privateHeaders },
      { source: "/admin", headers: privateHeaders },
      { source: "/api/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
