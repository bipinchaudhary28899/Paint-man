import Link from "next/link";
import { site } from "@/config/site";

// Sand panel that closes every page: eyebrow, serif headline with an italic accent, two actions.
export function CtaBanner({ heading }: { heading?: React.ReactNode }) {
  return (
    <section id="book" className="container-page reveal mt-24 md:mt-40">
      <div className="rounded-t-[28px] bg-sand px-6 py-[72px] text-center text-ink md:rounded-t-[32px] md:px-14 md:py-32">
        <p className="eyebrow justify-center">Free estimate</p>
        <h2 className="mx-auto mt-6 max-w-[820px] text-[clamp(40px,5vw,72px)] leading-[1.04] tracking-[-0.02em]">
          {heading ?? (
            <>
              Let&apos;s give your home a <em className="text-terracotta">fresh coat.</em>
            </>
          )}
        </h2>
        <p className="mx-auto mt-6 max-w-[500px] text-[17px] leading-[1.65] text-ink-soft">
          We&apos;ll inspect, advise on colours and send an itemised quote for your home in {site.city}. You decide from there.
        </p>
        <div className="mt-11 flex flex-wrap justify-center gap-4">
          <Link href="/book" className="btn-primary btn-lg">Get a free estimate</Link>
          {site.whatsapp ? (
            <a href={`https://wa.me/${site.whatsapp}`} rel="noopener" className="btn-secondary btn-lg">Chat on WhatsApp</a>
          ) : (
            <Link href="/contact" className="btn-secondary btn-lg">Talk to us</Link>
          )}
        </div>
      </div>
    </section>
  );
}
