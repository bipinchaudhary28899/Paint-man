import Image from "next/image";
import { illustrations } from "@/config/images";
import { LeadForm } from "./LeadForm";

// Paint Saathi's own booking form (LeadForm) with a heading and a short note beside it, as on the
// service pages. LeadForm's fields have fixed ids, so a page holds one of these at most.

type Props = {
  id?: string;
  /** the h2; give it one italic accent word */
  heading: React.ReactNode;
  text: React.ReactNode;
  /** "contact" for a request that is not a booking, such as the waitlist for a city we do not paint in yet */
  type?: "booking" | "contact";
  defaultMessage?: string;
  className?: string;
};

export function BookingSection({ id = "book-visit", heading, text, type = "booking", defaultMessage, className = "container-page mt-20" }: Props) {
  return (
    <section id={id} className={`${className} scroll-mt-28`} aria-labelledby={`${id}-heading`}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 id={`${id}-heading`} className="text-[clamp(32px,4vw,48px)] leading-[1.08]">
            {heading}
          </h2>
          <div className="mt-4 max-w-md leading-relaxed text-muted">{text}</div>
          <Image
            src={illustrations.paintCan.src}
            alt={illustrations.paintCan.alt}
            width={illustrations.paintCan.width}
            height={illustrations.paintCan.height}
            sizes="(min-width: 1024px) 360px, 240px"
            className="mt-8 hidden h-auto w-60 sm:block lg:w-[360px]"
          />
        </div>
        <div className="card p-6 md:p-8">
          <LeadForm type={type} defaultMessage={defaultMessage} />
        </div>
      </div>
    </section>
  );
}
