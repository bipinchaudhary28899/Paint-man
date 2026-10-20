import Image from "next/image";
import { illustrations } from "@/config/images";
import { LeadForm } from "./LeadForm";

// Paint Saathi's own booking form (LeadForm) with a heading and a short note, as on the service pages.
// Three layouts from one markup:
// - phones: one white card holds it all: the heading (narrow, with the paint can tucked into the card's
//   top-right corner), the text, a single-column form and, under the button, the `note`;
// - tablets: a narrow copy column (heading, text, note, paint can) beside the form card;
// - desktops: the same, with a wider copy column and a larger paint can.
// LeadForm's fields have fixed ids, so a page holds one of these at most.

type Props = {
  id?: string;
  /** the h2; give it one italic accent word */
  heading: React.ReactNode;
  text: React.ReactNode;
  /** a one-line reassurance (such as the zero-advance promise): under the text on tablets and desktops,
      under the submit button on phones */
  note?: React.ReactNode;
  /** "contact" for a request that is not a booking, such as the waitlist for a city we do not paint in yet */
  type?: "booking" | "contact";
  defaultMessage?: string;
  className?: string;
};

export function BookingSection({ id = "book-visit", heading, text, note, type = "booking", defaultMessage, className = "container-page mt-20" }: Props) {
  return (
    <section id={id} className={`${className} scroll-mt-28`} aria-labelledby={`${id}-heading`}>
      <div className="relative grid max-tab:rounded-pm-xl max-tab:border max-tab:border-line-soft max-tab:bg-paper max-tab:p-[22px] tab:grid-cols-[min(260px,calc(48.7vw_-_146px))_minmax(0,1fr)] tab:items-start tab:gap-8 desk:grid-cols-[1fr_1.4fr] desk:items-stretch desk:gap-10">
        <div>
          <h2 id={`${id}-heading`} className="max-w-[210px] text-[30px] leading-[1.08] tab:max-w-none tab:text-[40px] desk:text-[clamp(32px,4vw,48px)]">
            {heading}
          </h2>
          <div className="mt-3 max-w-md text-sm leading-[1.6] text-muted tab:mt-4 tab:text-[15px] desk:text-base desk:leading-relaxed">
            {text}
            {note && <p className="mt-3 max-tab:hidden desk:mt-4">{note}</p>}
          </div>
          <Image
            src={illustrations.paintCan.src}
            alt={illustrations.paintCan.alt}
            width={illustrations.paintCan.width}
            height={illustrations.paintCan.height}
            sizes="(min-width: 1080px) 360px, (min-width: 721px) 220px, 88px"
            className="absolute right-3.5 top-3.5 block h-auto w-[88px] tab:static tab:mt-6 tab:w-[220px] tab:max-w-full desk:mt-8 desk:w-[360px]"
          />
        </div>
        <div className="mt-5 tab:mt-0 tab:rounded-pm-lg tab:border tab:border-line-soft tab:bg-paper tab:p-7 desk:p-8">
          <LeadForm
            type={type}
            defaultMessage={defaultMessage}
            footnote={note ? <p className="text-center text-[13px] leading-normal text-muted tab:hidden">{note}</p> : undefined}
          />
        </div>
      </div>
    </section>
  );
}
