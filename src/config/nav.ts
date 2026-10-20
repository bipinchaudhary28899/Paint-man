import { areaSlug, cities, cityPath, servicePath, services } from "./site";

// The header menus and the footer link hub, built from the services and cities in site.ts so a
// new city or service shows up everywhere at once. Like the big painting sites, every page links
// to the hubs and the city pages (crawlable links), but only to pages that exist and say true things.

export type NavLink = { href: string; label: string; note?: string };
/** `wide`: the group spans the whole menu and lays its links out in columns (a city's localities). */
export type NavGroup = { heading?: string; links: NavLink[]; wide?: boolean };
export type NavMenu = { label: string; href: string; groups: NavGroup[] };

/** The brand shade cards (/shade-cards/<slug>): the major brands sold in India, the ones we supply. */
export const shadeCardBrands = [
  { slug: "asian-paints", name: "Asian Paints" },
  { slug: "berger", name: "Berger Paints" },
  { slug: "nerolac", name: "Kansai Nerolac" },
  { slug: "nippon-paint", name: "Nippon Paint" },
] as const;

export const shadeCardHref = (slug: string) => `/shade-cards/${slug}`;

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
      groups: [
        ...regions().map((region) => ({
          heading: region,
          links: cities
            .filter((c) => c.region === region)
            .map((c) => ({ href: cityPath(c), label: `House painting in ${c.name}`, note: c.status === "live" ? undefined : "Coming soon" })),
        })),
        // each live city's localities, linking to their entries on the city page
        ...cities
          .filter((c) => c.status === "live" && c.areas.length > 0)
          .map((c) => ({ heading: `Localities in ${c.name}`, wide: true, links: c.areas.map((a) => ({ href: `${cityPath(c)}#${areaSlug(a)}`, label: a })) })),
      ],
    },
    {
      label: "Colours",
      href: "/colours",
      groups: [
        {
          heading: "Find a shade",
          links: [
            { href: "/colours", label: "Colour finder", note: "8,500+ shades by code, name or hex" },
            { href: "/palettes", label: "Colour combinations" },
          ],
        },
        {
          heading: "Shade cards",
          links: [
            ...shadeCardBrands.map((b) => ({ href: shadeCardHref(b.slug), label: `${b.name} shade card` })),
            { href: "/shade-cards", label: "All shade cards" },
          ],
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
        ...shadeCardBrands.map((b) => ({ href: shadeCardHref(b.slug), label: `${b.name} shade card` })),
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
