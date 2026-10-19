import Link from "next/link";
import { site } from "@/config/site";
import { Logo } from "./Logo";

const nav = [
  { href: "/services", label: "Services" },
  { href: "/#how", label: "How it works" },
  { href: "/colours", label: "Colours" },
  // The home page's example finishes (stock photos, not our jobs), so not "Projects".
  { href: "/#work", label: "Finishes" },
  { href: "/faq", label: "FAQ" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-canvas/90 backdrop-blur-[14px]">
      <div className="container-page flex min-h-[72px] flex-wrap items-center justify-between gap-6 py-3 md:min-h-[86px]">
        <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label={`${site.name} home`}>
          <Logo />
          <span className="font-display text-2xl tracking-[-0.01em]">PaintMan</span>
          <span className="sr-only"> – painters in {site.city}</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-9 text-[15px] font-medium min-[721px]:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-ink transition hover:text-terracotta">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-6 min-[721px]:flex">
          {site.phone && (
            <a href={`tel:${site.phone}`} className="hidden text-[15px] font-medium lg:inline">
              {site.phoneDisplay || site.phone}
            </a>
          )}
          <Link href="/book" className="btn-primary !min-h-[46px] !px-5 text-sm">
            Get a free estimate
          </Link>
        </div>
      </div>
    </header>
  );
}
