import type { Metadata } from "next";
import { site, type Service } from "@/config/site";

type PageMeta = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  /** Skip the "| Brand City" title suffix (used on the home page). */
  absoluteTitle?: boolean;
};

// Builds per-page metadata with a canonical URL and matching Open Graph/Twitter tags.
export function pageMetadata({ title, description, path, noindex, absoluteTitle }: PageMeta): Metadata {
  const url = path;
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
    },
    twitter: { card: "summary_large_image", title, description },
    ...(noindex && { robots: { index: false, follow: true } }),
  };
}

const abs = (path: string) => `${site.url}${path === "/" ? "" : path}`;

const compact = <T extends Record<string, unknown>>(obj: T) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && !(Array.isArray(v) && !v.length)));

export function localBusinessJsonLd() {
  return compact({
    "@context": "https://schema.org",
    "@type": "HousePainter",
    "@id": `${site.url}/#business`,
    name: site.name,
    legalName: site.legalName,
    description: `${site.tagline}. Site inspection, itemised quotations and supervised painting for homes and rental properties in ${site.city}.`,
    url: site.url,
    image: `${site.url}/opengraph-image`,
    telephone: site.phone,
    email: site.email,
    priceRange: "₹₹",
    openingHours: site.hours,
    address: compact({
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      postalCode: site.address.postalCode,
      addressRegion: site.region,
      addressCountry: site.country,
    }),
    areaServed: [
      { "@type": "City", name: site.city },
      ...site.areas.map((name) => ({ "@type": "Place", name: `${name}, ${site.city}` })),
    ],
    sameAs: [...site.social],
  });
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    url: site.url,
    inLanguage: "en-IN",
    publisher: { "@id": `${site.url}/#business` },
  };
}

export function serviceJsonLd(service: Service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    serviceType: service.name,
    description: service.description,
    url: abs(`/services/${service.slug}`),
    provider: { "@id": `${site.url}/#business` },
    areaServed: { "@type": "City", name: site.city },
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
