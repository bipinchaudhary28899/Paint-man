import { cities, cityPath, servicePath, services } from "./site";

// The header menus and the footer link hub, built from the services and cities in site.ts so a
// new city or service shows up everywhere at once. Like the big painting sites, every page links
// to the hubs and the city pages (crawlable links), but only to pages that exist and say true things.

export type NavLink = { href: string; label: string; note?: string };
export type NavGroup = { heading?: string; links: NavLink[] };
export type NavMenu = { label: string; href: string; groups: NavGroup[] };

/** Brand shade cards opened in the colour finder (the Indian brands customers ask for by code). */
export const shadeCardBrands = [
  { slug: "asian-paints", name: "Asian Paints" },
  { slug: "berger", name: "Berger Paints" },
  { slug: "nerolac", name: "Kansai Nerolac" },
] as const;

const regions = () => [...new Set(cities.map((c) => c.region))];

export function navMenus(): NavMenu[] {
  return [
    {
      label: "Services",
      href: "/services",
      groups: [
        {
          links: [
            { href: "/services/house-painting", label: "House painting", note: "Every service, how it works, cities" },
            ...services.map((s) => ({ href: servicePath(s), label: s.name })),
          ],
        },
      ],
    },
    {
      label: "Cities",
      href: "/services/house-painting",
      groups: regions().map((region) => ({
        heading: region,
        links: cities
          .filter((c) => c.region === region)
          .map((c) => ({ href: cityPath(c), label: `House painting in ${c.name}`, note: c.status === "live" ? undefined : "Coming soon" })),
      })),
    },
    {
      label: "Colours",
      href: "/colours",
      groups: [
        {
          heading: "Find a shade",
          links: [
            { href: "/colours", label: "Colour finder", note: "50,000+ shades by code, name or hex" },
            { href: "/palettes", label: "Colour combinations" },
          ],
        },
        {
          heading: "Shade cards",
          links: shadeCardBrands.map((b) => ({ href: `/colours?brand=${b.slug}`, label: `${b.name} shade card` })),
        },
      ],
    },
  ];
}

/** The footer's link columns: services, painting in each live city, cities, colours and the company pages. */
export function footerColumns(): { heading: string; links: NavLink[] }[] {
  const live = cities.filter((c) => c.status === "live");
  return [
    {
      heading: "Services",
      links: [{ href: "/services/house-painting", label: "House painting services" }, ...services.map((s) => ({ href: servicePath(s), label: s.title }))],
    },
    ...live.map((c) => ({
      heading: `Painting in ${c.name}`,
      links: [
        { href: cityPath(c), label: `House painting in ${c.name}` },
        ...services.filter((s) => c.slug in s.local).map((s) => ({ href: servicePath(s, c), label: `${s.name} in ${c.name}` })),
        { href: `${cityPath(c)}#localities`, label: `Areas we serve in ${c.name}` },
      ],
    })),
    {
      heading: "Cities",
      links: cities.map((c) => ({ href: cityPath(c), label: c.status === "live" ? `Painters in ${c.name}` : `${c.name} (coming soon)` })),
    },
    {
      heading: "Colours",
      links: [
        { href: "/colours", label: "Colour finder" },
        ...shadeCardBrands.map((b) => ({ href: `/colours?brand=${b.slug}`, label: `${b.name} shade card` })),
        { href: "/palettes", label: "Colour combinations" },
      ],
    },
    {
      heading: "Company",
      links: [
        { href: "/book", label: "Book painters online" },
        { href: "/about", label: "About us" },
        { href: "/faq", label: "FAQs" },
        { href: "/contact", label: "Contact" },
      ],
    },
  ];
}
