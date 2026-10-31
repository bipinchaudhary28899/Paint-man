import Link from "next/link";
import { navMenus } from "@/config/nav";
import { liveCityNames, site } from "@/config/site";
import { AccountLink } from "./account/AccountLink";
import { Wordmark } from "./Logo";
import { HeaderLink, NavMenu } from "./NavMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-canvas/90 backdrop-blur-[14px]">
      <div className="container-page flex min-h-[72px] flex-wrap items-center justify-between gap-4 py-3 md:min-h-[86px] md:gap-6">
        <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label={`${site.name} home`}>
          <Wordmark eager />
          <span className="sr-only"> – painters in {liveCityNames()}</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-5 text-[15px] font-medium min-[721px]:flex md:gap-7 lg:gap-9">
          {navMenus().map((m) => (
            <NavMenu key={m.label} menu={m} />
          ))}
          <HeaderLink href="/faq" label="FAQ" />
        </nav>
        <div className="flex items-center gap-3 md:gap-5">
          {site.phone && (
            <a href={`tel:${site.phone}`} className="hidden text-[15px] font-medium xl:inline">
              {site.phoneDisplay || site.phone}
            </a>
          )}
          {/* "Log in" or "My account", chosen in the browser so the page stays static, at one fixed width for both.
              Phones and from 900px up; on narrower tablets the row is full (the footer and the thank-you page link it). */}
          <AccountLink className="btn-secondary !min-h-11 w-[7.25rem] !px-0 text-sm min-[721px]:!min-h-[46px] min-[721px]:max-[899px]:hidden" />
          <Link href="/book" className="btn-primary hidden !min-h-[46px] !px-5 text-sm min-[721px]:inline-flex">
            Book site visit
          </Link>
        </div>
      </div>
    </header>
  );
}
