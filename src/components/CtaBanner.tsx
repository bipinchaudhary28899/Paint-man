import Image from "next/image";
import Link from "next/link";
import { illustrations } from "@/config/images";
import { liveCityNames, site } from "@/config/site";
import { whatsappHref } from "@/config/contact";

// Closes every page: eyebrow, serif headline with an italic accent and two actions, beside the
// Paint Saathi painter, straight on the page (no panel) and standing on the footer.
// Phone: copy, two full-width stacked buttons, then the painter (300px) on the footer.
// Tablet: the copy and buttons beside a 300px painter column. Desktop (desk:) is the original layout.
// Below desktop the FAQ's bottom padding is the only gap above it on the home page (the banner's wrapper
// follows #faq there), as in the design; other pages keep the banner's own top margin.
/**
 * `href`: where "Book a free site visit" goes: the booking page, or the page's own booking form
 * ("#book-visit"), so every button of that name on a page goes to the same place.
 */
export function CtaBanner({ heading, href = "/book" }: { heading?: React.ReactNode; href?: string }) {
  return (
    <section id="book" className="container-page reveal mt-16 tab:mt-24 desk:mt-40 max-tab:in-[#faq+*]:mt-0 tab:max-desk:in-[#faq+*]:mt-0">
      <div className="grid items-end tab:grid-cols-[minmax(0,1fr)_300px] tab:gap-5 desk:grid-cols-[1.1fr_1fr] desk:gap-10">
        <div className="pb-4 tab:pb-14 desk:pb-24">
          <p className="eyebrow text-[11px] max-desk:leading-none tab:text-xs">Free estimate</p>
          <h2 className="mt-3.5 max-w-[620px] text-[38px] leading-[1.04] tracking-[-0.02em] tab:mt-5 tab:text-[52px] desk:mt-6 desk:text-[clamp(40px,5vw,72px)]">
            {heading ?? (
              <>
                Let&apos;s give your home a <em className="text-terracotta">fresh coat.</em>
              </>
            )}
          </h2>
          <p className="mt-3.5 max-w-[500px] text-[15px] leading-[1.6] text-ink-soft tab:mt-5 tab:text-base tab:leading-[1.65] desk:mt-6 desk:text-[17px]">
            Chaliye, shuru karte hain. We&apos;ll inspect, advise on colours and send an itemised quote for your home in {liveCityNames("or")}. You decide from there.
          </p>
          <div className="mt-6 flex flex-col gap-2.5 tab:mt-8 tab:flex-row tab:flex-wrap tab:gap-3 desk:mt-11 desk:gap-4">
            <Link href={href} className="btn-primary btn-lg max-tab:min-h-[54px] max-tab:w-full tab:max-desk:px-[30px]">Book a free site visit</Link>
            {site.whatsapp ? (
              <a href={whatsappHref()} rel="noopener" className="btn-secondary btn-lg max-tab:min-h-[54px] max-tab:w-full tab:max-desk:px-[30px]">Chat on WhatsApp</a>
            ) : (
              <Link href="/contact" className="btn-secondary btn-lg max-tab:min-h-[54px] max-tab:w-full tab:max-desk:px-[30px]">Talk to us</Link>
            )}
          </div>
        </div>
        <Image
          src={illustrations.painter.src}
          alt={illustrations.painter.alt}
          width={illustrations.painter.width}
          height={illustrations.painter.height}
          sizes="(min-width: 1080px) 560px, 300px"
          className="mx-auto block h-auto w-full max-w-[300px] desk:max-w-[560px]"
        />
      </div>
    </section>
  );
}
