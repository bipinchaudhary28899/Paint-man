import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { site } from "@/config/site";
import { TITLE_SUFFIX } from "@/lib/seo";
import "./globals.css";

// Editorial pairing from the PaintMan design: DM Serif Display (with its italic) for every
// heading, Manrope for reading text and UI. Both self-hosted by next/font, so no layout shift.
// Manrope is one variable file: a single @font-face per subset instead of one per weight,
// which keeps the (inlined) CSS small. The page uses weights 400–700.
const body = Manrope({ subsets: ["latin"], weight: "variable", variable: "--font-manrope", display: "swap" });
const display = DM_Serif_Display({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-dm-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  // Pages pass "{Topic} in Agra"; the template adds " | Paint Man" (full title <= 60 chars).
  title: {
    default: `House Painting Services in ${site.city}${TITLE_SUFFIX}`,
    template: `%s${TITLE_SUFFIX}`,
  },
  description: `Managed house painting in ${site.city}: site inspection, itemised quotation, genuine branded paint and supervised painters. Book an inspection online.`,
  applicationName: site.name,
  authors: [{ name: site.name }],
  creator: site.name,
  publisher: site.name,
  category: "Home Services",
  formatDetection: { telephone: true, address: true, email: true },
  // No root canonical: every indexable page sets its own through pageMetadata(), and a root
  // "/" would leak onto 404s and private pages and point them at the home page.
  openGraph: {
    siteName: site.name,
    locale: site.locale,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  other: {
    "geo.region": site.regionCode,
    "geo.placename": site.city,
  },
};

export const viewport: Viewport = {
  themeColor: "#242522",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth" className={`${body.variable} ${display.variable}`}>
      <body className="font-sans antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-paper focus:p-2">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
