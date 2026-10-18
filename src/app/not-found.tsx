import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileCtaBar } from "@/components/MobileCtaBar";
import { TITLE_SUFFIX } from "@/lib/seo";

// Next adds `noindex` to every 404 response; this robots value agrees with it (and keeps the
// links followable) instead of inheriting the root layout's "index, follow".
export const metadata: Metadata = {
  title: { absolute: `Page not found${TITLE_SUFFIX}` },
  robots: { index: false, follow: true },
};

const links = [
  { href: "/services", label: "Painting services" },
  { href: "/colours", label: "Colour finder" },
  { href: "/faq", label: "Questions and answers" },
  { href: "/contact", label: "Contact us" },
];

// The root 404 sits above the (site) layout, so it brings the site's own header, footer and
// mobile bar to give a lost visitor (or crawler) the full navigation.
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main">
        <div className="container-page max-w-2xl py-24 text-center">
          <h1 className="text-[clamp(40px,5vw,60px)] leading-[1.05] tracking-[-0.02em]">
            Page not <em>found.</em>
          </h1>
          <p className="mt-5 text-lg leading-[1.65] text-muted">
            The page you&apos;re looking for doesn&apos;t exist or has moved. These pages are a good place to pick up again.
          </p>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-1 text-[15px] font-medium">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 items-center underline decoration-line-strong underline-offset-4 hover:text-terracotta">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn-secondary">Back to home</Link>
            <Link href="/book" className="btn-primary">Book an inspection</Link>
          </div>
        </div>
      </main>
      <Footer />
      <MobileCtaBar />
    </>
  );
}
