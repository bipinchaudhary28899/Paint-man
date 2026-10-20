import Link from "next/link";
import { footerColumns } from "@/config/nav";
import { CtaFooterNav } from "./CtaFooterNav";
import { StackedLogo } from "./Logo";
import { promises, site } from "@/config/site";

// The footer is the site's link hub (as on the big painting sites): every service hub, every page
// for each live city, the cities, the colour tools and the company pages, from src/config/nav.ts.
// Phone: each link column is a tap row (native details/summary; the links stay in the HTML for crawlers).
// The rows are rendered open, so from tablet up (where the summary is hidden and the plain column label
// shows) every link is visible in any browser, with or without JS; CtaFooterNav closes them on phones.
// Tablets: two columns beside the brand block. Desktop: the original grid.
export function Footer() {
  const year = new Date().getFullYear();
  const columns = footerColumns();
  return (
    <footer className="bg-ink pb-[120px] text-on-ink-muted min-[721px]:pb-0">
      <div className="container-page grid gap-6 pt-10 tab:grid-cols-[260px_minmax(0,1fr)] tab:gap-10 tab:pt-14 tab:pb-10 desk:grid-cols-[1.2fr_2.8fr] desk:gap-12 desk:pt-[72px] desk:pb-14">
        <div>
          <p><StackedLogo className="h-16 w-auto tab:h-20 desk:h-24" /></p>
          <p className="mt-3.5 text-sm leading-[1.6] desk:mt-3 desk:max-w-[320px] desk:text-[15px] desk:leading-relaxed">
            Walls, doors, windows and grills, one wall or the whole house: inspected, quoted line by line and supervised. {promises[0].title}, a full estimate before work
            starts.
          </p>
          <address className="mt-5 text-sm not-italic leading-[1.9] desk:mt-6 desk:text-[15px]">
            <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-golden desk:mb-1 desk:text-xs">Visit &amp; call</span>
            {site.address.street ? <span className="block">{site.address.street}, {site.city} {site.address.postalCode}</span> : <span className="block">{site.city}, {site.region}</span>}
            {site.phone && <a href={`tel:${site.phone}`} className="block hover:text-on-ink">{site.phoneDisplay || site.phone}</a>}
            {site.email && <a href={`mailto:${site.email}`} className="block hover:text-on-ink">{site.email}</a>}
            <span className="block">{site.hoursDisplay}</span>
          </address>
        </div>
        <CtaFooterNav aria-label="Footer" className="border-t border-on-ink/12 text-[15px] tab:grid tab:grid-cols-2 tab:gap-x-6 tab:gap-y-7 tab:border-t-0 tab:max-desk:text-sm desk:grid-cols-3 desk:gap-10 xl:grid-cols-5">
          {columns.map((col) => (
            <details key={col.heading} open className="group border-b border-on-ink/12 tab:border-b-0">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 font-medium text-on-ink tab:hidden [&::-webkit-details-marker]:hidden">
                {col.heading}
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0 text-golden transition-transform group-open:rotate-180 motion-reduce:transition-none">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <p className="mb-1.5 hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-golden tab:block desk:mb-2 desk:text-xs">{col.heading}</p>
              <ul className="pb-3 tab:pb-0">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="flex min-h-11 items-center hover:text-on-ink tab:block tab:min-h-0 tab:py-1 desk:py-1.5">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </CtaFooterNav>
      </div>
      <div className="container-page flex flex-col gap-1 pt-5 text-xs tab:gap-2 tab:pb-7 tab:max-desk:relative tab:max-desk:before:absolute tab:max-desk:before:inset-x-8 tab:max-desk:before:top-0 tab:max-desk:before:border-t tab:max-desk:before:border-on-ink/10 desk:border-t desk:border-on-ink/10 desk:flex-row desk:items-center desk:justify-between desk:gap-3 desk:py-6">
        <p className="max-tab:leading-[1.6]">Painting in {site.city}: {site.areas.join(" · ")}</p>
        {/* Legal links get a 44px tall tap target. On phones and tablets the 44px rows space the wrapped lines; on
            desktop the negative margin keeps the row at the Staff login pill's 26px, so the strip keeps its height. */}
        <p className="flex flex-wrap items-center gap-x-5 tab:gap-y-1 desk:-my-[9px] desk:gap-y-0">
          <Link href="/privacy-policy" className="inline-flex min-h-11 items-center hover:text-on-ink">Privacy policy</Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-on-ink">Terms of service</Link>
          <span className="whitespace-nowrap">© {year} {site.legalName || site.name}</span>
          {/* Staff entry to the private leads page. nofollow keeps crawlers out; the page itself requires sign-in. */}
          {/* The link is a 44px tall hit area around the 26px pill; on desktop its negative margin keeps the strip at the height it had with the bare pill. */}
          <Link href="/admin" rel="nofollow" prefetch={false} className="group/staff inline-flex min-h-11 shrink-0 items-center whitespace-nowrap desk:-my-[9px]">
            <span className="rounded-full border border-on-ink/20 px-3 py-1 group-hover/staff:border-golden group-hover/staff:text-golden">Staff login</span>
          </Link>
        </p>
      </div>
    </footer>
  );
}
