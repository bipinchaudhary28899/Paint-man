import type { Metadata } from "next";
import { SITE_UPDATED } from "@/config/seo-dates";
import { services, site, type Service } from "@/config/site";

/** Appended to every page title by the root layout's title template ("{Topic} in Agra | Paint Saathi"). */
export const TITLE_SUFFIX = ` | ${site.name}`;
/** Google shows about 60 characters of a title; AGENTS.md caps the full title there. */
export const MAX_TITLE_LENGTH = 60;
/** The full `<title>` a page gets once the root template adds the brand. */
export const fullTitle = (title: string) => `${title}${TITLE_SUFFIX}`;

const abs = (path: string) => `${site.url}${path === "/" ? "" : path}`;

export type OgImage = { url: string; alt: string; width?: number; height?: number; type?: string };

/** Root-relative paths ("/x") become absolute; full and protocol-relative ("//cdn…") URLs pass through. */
const absUrl = (url: string) => (url.startsWith("/") && !url.startsWith("//") ? abs(url) : url);

/**
 * The share card drawn by src/app/opengraph-image.tsx. Every page states it explicitly: Next
 * merges metadata shallowly, so a page's own `openGraph` object would otherwise drop the
 * file-based image. Keep `alt` in step with that file's `alt` export. The `?v=` is the content
 * date, so WhatsApp, Facebook and LinkedIn fetch the card again when the site copy changes.
 */
export const defaultOgImage = {
  url: abs(`/opengraph-image?v=${SITE_UPDATED}`),
  width: 1200,
  height: 630,
  type: "image/png",
  alt: `${site.name} – House painting services in ${site.city}`,
} satisfies OgImage;

type PageMeta = {
  /** The topic only, e.g. "Interior Wall Painting Services in Agra"; the layout adds TITLE_SUFFIX. */
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  /** Skip the " | Paint Saathi" title suffix (used on the home page, whose title already ends with it). */
  absoluteTitle?: boolean;
  /** A page-specific share image; a root-relative `url` is made absolute. Defaults to the site card. */
  image?: OgImage;
};

// Builds per-page metadata with a canonical URL, matching Open Graph/Twitter tags and a share image.
export function pageMetadata({ title, description, path, noindex, absoluteTitle, image }: PageMeta): Metadata {
  const url = path;
  const shareImage = image ? { ...image, url: absUrl(image.url) } : defaultOgImage;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: site.name,
      locale: site.locale,
      type: "website",
      images: [shareImage],
    },
    twitter: { card: "summary_large_image", title, description, images: [{ url: shareImage.url, alt: shareImage.alt }] },
    ...(noindex && { robots: { index: false, follow: true } }),
  };
}

/** Home-screen app icons from the brand pack (public/brand/05-app-icon): full-bleed squares for the manifest. */
export const ICON_SIZES = [192, 512] as const;
export type IconSize = (typeof ICON_SIZES)[number];
export const iconPath = (size: IconSize) => `/brand/05-app-icon/app-icon-light-${size}.png`;
/** The swatch-fan mark (no lettering) on a transparent background: the LocalBusiness logo Google shows. */
export const LOGO_PATH = "/brand/04-icon/paintman-icon-color-512.png";

/** The name written together ("PaintSaathi"), published as an alternate name of the same entity. */
export const ALTERNATE_NAME = "PaintSaathi";

// Optional business details site.ts may gain later (geo pin, an explicit alternate name).
// Read through optional chaining so nothing is published until real values exist.
type OptionalDetails = {
  alternateName?: string;
  geo?: { lat?: number; lng?: number; latitude?: number; longitude?: number } | null;
};
const extra = () => site as typeof site & OptionalDetails;

const BUSINESS_ID = `${site.url}/#business`;
const AGRA_ID = `${site.url}/#agra`;

/** The one Agra node every areaServed points at, disambiguated from Agra in Kansas or Oklahoma. */
export function agraPlace() {
  return {
    "@type": "City",
    "@id": AGRA_ID,
    name: site.city,
    sameAs: "https://en.wikipedia.org/wiki/Agra",
    containedInPlace: {
      "@type": "State",
      name: site.region,
      containedInPlace: { "@type": "Country", name: "India" },
    },
  };
}

const DAYS: Record<string, string> = {
  Mo: "Monday",
  Tu: "Tuesday",
  We: "Wednesday",
  Th: "Thursday",
  Fr: "Friday",
  Sa: "Saturday",
  Su: "Sunday",
};
const DAY_ORDER = Object.keys(DAYS);
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Turns schema.org text hours ("Mo-Sa 09:00-19:00", "Mo,We 10:00-14:00; Su 10:00-13:00") into
 * the OpeningHoursSpecification objects Google documents. Rules it cannot read are dropped
 * rather than guessed, so a typo never publishes wrong hours.
 */
export function openingHoursSpecification(hours: string) {
  return hours
    .split(/[;\n]/)
    .map((rule) => rule.trim().match(/^([A-Za-z,\-\s]+?)\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/))
    .flatMap((m) => {
      if (!m) return [];
      const [, dayPart, opens, closes] = m;
      if (!TIME.test(opens) || !TIME.test(closes) || opens >= closes) return [];
      const days: string[] = [];
      for (const token of dayPart.split(",").map((t) => t.trim())) {
        const [from, to = from] = token.split("-").map((d) => d.trim());
        const start = DAY_ORDER.indexOf(from);
        const end = DAY_ORDER.indexOf(to);
        if (start < 0 || end < start) return [];
        days.push(...DAY_ORDER.slice(start, end + 1).map((d) => DAYS[d]));
      }
      return [{ "@type": "OpeningHoursSpecification", dayOfWeek: days, opens, closes }];
    });
}

/**
 * GeoCoordinates only together with a published street address. A service-area business (no
 * public address, as Google Business Profile allows) must not leak its base through a map pin,
 * so setting site.geo without site.address.street publishes nothing.
 */
function businessGeo() {
  const geo = extra().geo;
  const latitude = geo?.lat ?? geo?.latitude;
  const longitude = geo?.lng ?? geo?.longitude;
  const valid =
    typeof latitude === "number" && Math.abs(latitude) <= 90 && typeof longitude === "number" && Math.abs(longitude) <= 180;
  return valid && site.address.street ? { "@type": "GeoCoordinates", latitude, longitude } : undefined;
}

const serviceUrl = (service: Service) => abs(`/services/${service.slug}`);
const serviceId = (service: Service) => `${serviceUrl(service)}#service`;

const compact = <T extends Record<string, unknown>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && !(Array.isArray(v) && !v.length)));

export function localBusinessJsonLd() {
  return compact({
    "@context": "https://schema.org",
    "@type": "HousePainter",
    "@id": BUSINESS_ID,
    name: site.name,
    alternateName: extra().alternateName || ALTERNATE_NAME,
    legalName: site.legalName,
    description: `${site.tagline}. Site inspection, itemised quotations and supervised painting for homes and rental properties in ${site.city}.`,
    url: site.url,
    logo: {
      "@type": "ImageObject",
      "@id": `${site.url}/#logo`,
      url: abs(LOGO_PATH),
      contentUrl: abs(LOGO_PATH),
      width: 512,
      height: 512,
      caption: site.name,
    },
    image: defaultOgImage.url,
    telephone: site.phone,
    email: site.email,
    priceRange: "₹₹",
    openingHoursSpecification: openingHoursSpecification(site.hours),
    address: compact({
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      postalCode: site.address.postalCode,
      addressRegion: site.region,
      addressCountry: site.country,
    }),
    geo: businessGeo(),
    areaServed: [
      agraPlace(),
      ...site.areas.map((name) => ({ "@type": "Place", name: `${name}, ${site.city}`, containedInPlace: { "@id": AGRA_ID } })),
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `House painting services in ${site.city}`,
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        // same name as serviceJsonLd(), so the merged graph gives each service one name
        itemOffered: { "@type": "Service", "@id": serviceId(s), name: s.title, url: serviceUrl(s) },
      })),
    },
    sameAs: [...site.social],
  });
}

type VerificationEnv = { NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?: string; NEXT_PUBLIC_BING_SITE_VERIFICATION?: string; [key: string]: string | undefined };

/**
 * Search-engine ownership tags for the root layout: Google Search Console's
 * `google-site-verification` and Bing Webmaster Tools' `msvalidate.01`, each only when its env
 * var holds the code from that console (the `content` value of the tag they show you).
 */
export function siteVerification(env: VerificationEnv = process.env): Metadata["verification"] {
  const google = env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const bing = env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();
  if (!google && !bing) return undefined;
  return { ...(google && { google }), ...(bing && { other: { "msvalidate.01": bing } }) };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    alternateName: extra().alternateName || ALTERNATE_NAME,
    url: site.url,
    inLanguage: "en-IN",
    publisher: { "@id": BUSINESS_ID },
  };
}

export function serviceJsonLd(service: Service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": serviceId(service),
    name: service.title,
    serviceType: service.name,
    description: service.description,
    url: serviceUrl(service),
    provider: { "@id": BUSINESS_ID },
    areaServed: agraPlace(),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: abs(item.path),
    })),
  };
}
