import Link from "next/link";
import { services, site } from "@/config/site";

const explore = [
  { href: "/services", label: "Services" },
  { href: "/#how", label: "How it works" },
  { href: "/colours", label: "Colour finder" },
  { href: "/palettes", label: "Colour palettes" },
  { href: "/visualizer", label: "Wall colour visualizer" },
  { href: "/about", label: "About us" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/book", label: "Get a free estimate" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink pb-[120px] text-on-ink-muted min-[721px]:pb-0">
      <div className="container-page grid gap-12 py-[72px] md:grid-cols-[1.3fr_1fr_1fr_1fr] md:pb-14">
        <div>
          <p className="font-display text-3xl tracking-[-0.01em] text-on-ink">PaintMan</p>
          <p className="mt-3 max-w-[300px] text-[15px] leading-relaxed">
            {site.tagline}. Interiors, exteriors and complete homes, inspected, quoted line by line and supervised.
          </p>
        </div>
        <div className="text-[15px] leading-[1.9]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-golden">Visit &amp; call</p>
          <address className="not-italic">
            {site.address.street ? <p>{site.address.street}, {site.city} {site.address.postalCode}</p> : <p>{site.city}, {site.region}</p>}
            {site.phone && <p><a href={`tel:${site.phone}`} className="hover:text-on-ink">{site.phoneDisplay || site.phone}</a></p>}
            {site.email && <p><a href={`mailto:${site.email}`} className="hover:text-on-ink">{site.email}</a></p>}
            <p>{site.hoursDisplay}</p>
          </address>
        </div>
        <div className="text-[15px]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-golden">Services</p>
          <ul className="space-y-1">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="block py-1.5 hover:text-on-ink">
                  {s.name} in {site.city}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <nav aria-label="Footer" className="flex flex-col text-[15px]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-golden">Explore</p>
          {explore.map((l) => (
            <Link key={l.href} href={l.href} className="py-1.5 hover:text-on-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="container-page flex flex-col gap-3 border-t border-on-ink/10 py-6 text-xs md:flex-row md:items-center md:justify-between">
        <p>Serving {site.areas.join(" · ")}</p>
        <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/privacy-policy" className="hover:text-on-ink">Privacy policy</Link>
          <Link href="/terms" className="hover:text-on-ink">Terms of service</Link>
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
