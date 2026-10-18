import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// Vercel preview deployments must never be indexed (duplicate content hurts SEO).
const isPreview = Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production";

// Content Security Policy. 'unsafe-inline' for scripts is needed by Next.js's
// inline bootstrap scripts on statically generated pages (a nonce would force
// every page to render dynamically, which is slower and worse for SEO).
const csp = [
  "default-src 'self'",
  // The wall visualizer runs its segmentation model in-browser: ONNX Runtime WebAssembly inside
  // a Web Worker ('wasm-unsafe-eval'; its loader module comes from jsDelivr) and a 4 MB model
  // from Hugging Face, both cached by the browser. Photos never leave the device.
  // blob: because ONNX Runtime imports its loader module from a Blob URL inside the worker.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net${isDev ? " 'unsafe-eval'" : ""}`,
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.pexels.com",
  "font-src 'self'",
  // Hugging Face serves model files from rotating CDN hosts under hf.co / huggingface.co.
  `connect-src 'self' https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co https://*.hf.co${isDev ? " ws: wss:" : ""}`,
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
    // No 2048/3840 variants: no image box is wider than 1200 CSS px, and every extra width is
    // another slow first-request resize of a multi-MB original. 1080 must stay: the visualizer
    // requests /_next/image at w=1080.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Keep optimised variants for 30 days (default 4 hours) so photos are not re-encoded
    // after every short upstream max-age; the photo URLs change whenever the photo does.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    // Inline the (small, Tailwind) CSS into the HTML so first paint no longer waits on a
    // render-blocking stylesheet request (docs: 05-config/01-next-config-js/inlineCss.md,
    // experimental in Next 16; production builds only).
    inlineCss: true,
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
