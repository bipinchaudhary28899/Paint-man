import { areaSlug, cities, cityPath, servicePath, services } from "./site";

// The header menus and the footer link hub, built from the services and cities in site.ts so a
// new city or service shows up everywhere at once. Like the big painting sites, every page links
// to the hubs and the city pages (crawlable links), but only to pages that exist and say true things.

export type NavLink = { href: string; label: string; note?: string };
export type NavGroup = { heading?: string; links: NavLink[] };
/** An entry that opens the next level beside it: a region, its cities, a city's localities. */
export type NavNode = { label: string; href?: string; note?: string; children?: NavNode[] };
/** A menu shows `groups` as columns of links, or, with a `tree`, cascading columns (Cities). */
export type NavMenu = { label: string; href: string; groups: NavGroup[]; tree?: NavNode[] };

/** Every link a menu holds, at every level. */
export function menuLinks(menu: NavMenu): NavLink[] {
  const walk = (nodes: NavNode[]): NavLink[] =>
    nodes.flatMap((n) => [...(n.href ? [{ href: n.href, label: n.label, note: n.note }] : []), ...walk(n.children ?? [])]);
  return [...menu.groups.flatMap((g) => g.links), ...walk(menu.tree ?? [])];
}

/**
 * The header entry for the section a page belongs to, so the header can mark where the visitor is:
 * the colour tools under Colours, a city's pages (/services/<service>/<city>) under Cities, the
 * other /services pages under Services, and the FAQ. Other pages (home, about, booking) have none.
 */
export function headerSection(pathname: string): "Services" | "Cities" | "Colours" | "FAQ" | undefined {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (/^\/(colours|palettes|shade-cards)(\/|$)/.test(path)) return "Colours";
  if (path === "/faq") return "FAQ";
  if (/^\/services\/[^/]+\/[^/]+$/.test(path)) return "Cities";
  if (/^\/services(\/|$)/.test(path)) return "Services";
  return undefined;
}

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
      groups: [],
      // region › city › localities; a city we do not paint in yet has no localities, only its waitlist page
      tree: regions().map((region) => ({
        label: region,
        children: cities
          .filter((c) => c.region === region)
          .map((c) => ({
            label: c.name,
            href: cityPath(c),
            note: c.status === "live" ? undefined : "Coming soon",
            children: c.status === "live" ? c.areas.map((a) => ({ label: a, href: `${cityPath(c)}#${areaSlug(a)}` })) : [],
          })),
      })),
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
