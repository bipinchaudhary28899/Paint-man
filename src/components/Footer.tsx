import Link from "next/link";
import { footerColumns } from "@/config/nav";
import { StackedLogo } from "./Logo";
import { promises, site } from "@/config/site";

// The footer is the site's link hub (as on the big painting sites): every service hub, every page
// for each live city, the cities, the colour tools and the company pages, from src/config/nav.ts.
export function Footer() {
  const year = new Date().getFullYear();
  const columns = footerColumns();
  return (
    <footer className="bg-ink pb-[120px] text-on-ink-muted min-[721px]:pb-0">
      <div className="container-page grid gap-12 py-[72px] md:pb-14 lg:grid-cols-[1.2fr_2.8fr]">
        <div>
          <p><StackedLogo /></p>
          <p className="mt-3 max-w-[320px] text-[15px] leading-relaxed">
            Managed house painting: inspected, quoted line by line and supervised. {promises[0].title}, a full estimate before work
            starts.
          </p>
          <address className="mt-6 text-[15px] not-italic leading-[1.9]">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-golden">Visit &amp; call</span>
            {site.address.street ? <span className="block">{site.address.street}, {site.city} {site.address.postalCode}</span> : <span className="block">{site.city}, {site.region}</span>}
            {site.phone && <a href={`tel:${site.phone}`} className="block hover:text-on-ink">{site.phoneDisplay || site.phone}</a>}
            {site.email && <a href={`mailto:${site.email}`} className="block hover:text-on-ink">{site.email}</a>}
            <span className="block">{site.hoursDisplay}</span>
          </address>
        </div>
        <nav aria-label="Footer" className="grid gap-10 text-[15px] sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {columns.map((col) => (
            <div key={col.heading}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-golden">{col.heading}</p>
              <ul>
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="flex min-h-11 items-center hover:text-on-ink md:block md:min-h-0 md:py-1.5">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="container-page flex flex-col gap-3 border-t border-on-ink/10 py-6 text-xs md:flex-row md:items-center md:justify-between">
        <p>Painting in {site.city}: {site.areas.join(" · ")}</p>
        {/* Legal links get a 44px tall tap target. On phones the 44px rows space the wrapped lines; on wider
            screens the negative margin keeps the row at the Staff login pill's 26px, so the strip keeps its height. */}
        <p className="flex flex-wrap items-center gap-x-5 md:-my-[9px]">
          <Link href="/privacy-policy" className="inline-flex min-h-11 items-center hover:text-on-ink">Privacy policy</Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-on-ink">Terms of service</Link>
          <span className="whitespace-nowrap">© {year} {site.legalName || site.name}</span>
          {/* Staff entry to the private leads page. nofollow keeps crawlers out; the page itself requires sign-in. */}
          <Link href="/admin" rel="nofollow" prefetch={false} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-on-ink/20 px-3 py-1 hover:border-golden hover:text-golden">
            <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Staff login
          </Link>
        </p>
      </div>
    </footer>
  );
}
