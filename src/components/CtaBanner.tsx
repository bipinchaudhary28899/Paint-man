import Image from "next/image";
import Link from "next/link";
import { illustrations } from "@/config/images";
import { site } from "@/config/site";

// Closes every page: eyebrow, serif headline with an italic accent and two actions, beside the
// Paint Saathi painter, straight on the page (no panel) and standing on the footer.
export function CtaBanner({ heading }: { heading?: React.ReactNode }) {
  return (
    <section id="book" className="container-page reveal mt-24 md:mt-40">
      <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="pb-4 lg:pb-24">
          <p className="eyebrow">Free estimate</p>
          <h2 className="mt-6 max-w-[620px] text-[clamp(40px,5vw,72px)] leading-[1.04] tracking-[-0.02em]">
            {heading ?? (
              <>
                Let&apos;s give your home a <em className="text-terracotta">fresh coat.</em>
              </>
            )}
          </h2>
          <p className="mt-6 max-w-[500px] text-[17px] leading-[1.65] text-ink-soft">
            We&apos;ll inspect, advise on colours and send an itemised quote for your home in {site.city}. You decide from there.
          </p>
          <div className="mt-11 flex flex-wrap gap-4">
            <Link href="/book" className="btn-primary btn-lg">Get a free estimate</Link>
            {site.whatsapp ? (
              <a href={`https://wa.me/${site.whatsapp}`} rel="noopener" className="btn-secondary btn-lg">Chat on WhatsApp</a>
            ) : (
              <Link href="/contact" className="btn-secondary btn-lg">Talk to us</Link>
            )}
          </div>
        </div>
        <Image
          src={illustrations.painter.src}
          alt={illustrations.painter.alt}
          width={illustrations.painter.width}
          height={illustrations.painter.height}
          sizes="(min-width: 1024px) 560px, 100vw"
          className="mx-auto block h-auto w-full max-w-[560px]"
        />
      </div>
    </section>
  );
}
