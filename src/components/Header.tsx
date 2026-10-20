import Link from "next/link";
import { navMenus } from "@/config/nav";
import { site } from "@/config/site";
import { Wordmark } from "./Logo";
import { NavMenu } from "./NavMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-canvas/90 backdrop-blur-[14px]">
      <div className="container-page flex min-h-[72px] flex-wrap items-center justify-between gap-6 py-3 md:min-h-[86px]">
        <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label={`${site.name} home`}>
          <Wordmark eager />
          <span className="sr-only"> – painters in {site.city}</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-[15px] font-medium min-[721px]:flex lg:gap-9">
          {navMenus().map((m) => (
            <NavMenu key={m.label} menu={m} />
          ))}
          <Link href="/faq" className="inline-flex min-h-11 items-center text-ink transition hover:text-terracotta">FAQ</Link>
        </nav>
        <div className="hidden items-center gap-6 min-[721px]:flex">
          {site.phone && (
            <a href={`tel:${site.phone}`} className="hidden text-[15px] font-medium lg:inline">
              {site.phoneDisplay || site.phone}
            </a>
          )}
          <Link href="/book" className="btn-primary !min-h-[46px] !px-5 text-sm">
            Book site visit
          </Link>
        </div>
      </div>
    </header>
  );
}
