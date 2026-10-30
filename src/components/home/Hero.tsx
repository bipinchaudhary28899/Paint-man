import Link from "next/link";
import { Tilt } from "@/components/Tilt";
import { illustrations } from "@/config/images";
import { LiveCityLinks } from "@/components/LiveCityLinks";
import { HeroImage } from "./HeroImage";

const facts = [["Payment", "Zero advance"], ["Estimate", "Full, before work starts"], ["Work", "Timed and documented"]] as const;

// The home hero: the h1 (eyebrow included, so it carries the keyword), the intro, the two actions,
// three facts and the paint-brands picture. One markup, three designs:
// - phones: one column; the buttons side by side, the facts as three small cards in a row, then the
//   picture in a framed panel;
// - tablets (tab:): the headline full width, the intro beside the two buttons stacked, then the
//   framed picture with the three fact cards riding its bottom edge (a grid; the cards' row overlaps
//   the panel by a negative margin);
// - desktop (desk:): the copy beside the picture, the buttons under the picture, the facts as a
//   hairline row under the intro.
// Below desktop the two column wrappers are `display: contents`, so their children are laid out by
// the section itself; from 1080px they are the two columns again.
export function Hero() {
  return (
    <section
      id="top"
      className="container-page relative z-[1] flex flex-col pb-10 pt-7 tab:grid tab:grid-cols-[minmax(0,1fr)_232px] tab:gap-x-9 tab:pb-14 tab:pt-11 desk:flex desk:flex-row desk:flex-wrap desk:items-stretch desk:gap-[72px] desk:pb-20 desk:pt-10"
    >
      <div className="contents min-w-0 flex-[1_1_500px] desk:block">
        {/* The eyebrow is part of the h1, so the heading carries the keyword and the city. On desktop
            its box matches the old eyebrow line (24px) and the tagline keeps its 28px gap below it. */}
        <h1 className="text-[42px] leading-[1.04] tracking-[-0.02em] tab:col-span-2 tab:max-w-[700px] tab:text-[62px] tab:leading-[1.02] desk:max-w-none desk:text-[clamp(48px,5.8vw,80px)]">
          <span className="eyebrow flex items-center font-sans leading-[1.5] max-tab:text-[11px] desk:h-6 desk:pt-[3px]">
            Book house painters online<span className="sr-only">: </span>
          </span>
          <span className="mt-4 block tab:mt-6 desk:mt-7">
            Your space, painted beautifully. Managed <em>completely.</em>
          </span>
        </h1>
        {/* On wider tablets the intro keeps a readable measure (about 70 characters) beside the buttons. */}
        <p className="mt-4 text-base leading-[1.6] text-muted tab:mt-7 tab:max-w-[560px] tab:self-end tab:text-[17px] tab:leading-[1.65] desk:max-w-[500px] desk:text-lg desk:leading-[1.65]">
          Ek deewar ho ya poora ghar: a single wall, a door, windows and grills, or the whole house, just tell us what needs paint. We inspect, quote line by line,
          bring genuine branded paint and a supervised crew, and hand back a spotless home. Now painting in <LiveCityLinks linkClassName="font-semibold text-ink underline" />.
        </p>
        {/* Phones and tablets: the buttons follow the intro (side by side on phones, stacked beside the
            intro on tablets). Desktop: they move under the hero picture. One copy is display:none. */}
        <HeroActions
          className="mt-6 grid grid-cols-2 gap-2.5 tab:mt-7 tab:flex tab:flex-col tab:gap-3 tab:self-end desk:hidden"
          buttonClassName="max-tab:min-h-[52px] max-tab:px-2 max-tab:text-[15px]"
        />
        <dl className="mt-5 grid grid-cols-3 gap-2 tab:col-span-2 tab:row-start-4 tab:mx-5 tab:-mt-11 tab:gap-3 tab:max-desk:relative tab:max-desk:z-[1] desk:mx-0 desk:mt-14 desk:flex desk:flex-wrap desk:gap-10 desk:border-t desk:border-line desk:pt-7">
          {facts.map(([k, v]) => (
            <div key={k} className="rounded-[14px] border border-line-soft bg-paper px-3 pb-3.5 pt-3 tab:rounded-[18px] tab:px-[18px] tab:py-4 desk:rounded-none desk:border-0 desk:bg-transparent desk:p-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted tab:text-[11px] desk:text-xs desk:font-normal">{k}</dt>
              <dd className="mt-1 text-[13px] font-semibold leading-[1.3] tab:mt-1.5 tab:text-[15px] tab:leading-[1.35] desk:text-base desk:font-medium desk:leading-normal">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      {/* Side by side (desktop): the brands picture, then the buttons (level with the end of the intro,
          where a reader is ready to act), share the column with even space above, between and below
          them (justify-evenly), beside the copy and never taller than the first screen under the header
          (86px) and the hero's top padding (40px), so both are in view on load. The picture's edges fade
          into the page (a CSS mask), so it sits on the canvas without a frame. Phones and tablets: the
          picture sits in a framed chalk panel (the frame is display:contents on desktop), its edges fading
          into the panel with the same mask. Its box keeps
          the picture's proportions, so nothing shifts. */}
      <div className="contents min-w-0 flex-[1_1_420px] flex-col [perspective:1600px] desk:flex desk:max-h-[calc(100svh-150px)] desk:justify-evenly">
        <div className="mt-5 rounded-[24px] border border-line-soft bg-cream-wash p-3 [perspective:1600px] tab:col-span-2 tab:row-start-3 tab:mt-10 tab:rounded-[28px] tab:px-6 tab:pb-14 tab:pt-6 desk:contents">
          <Tilt max={6} className="relative aspect-[1790/968] w-full">
            <HeroImage
              image={illustrations.paintBrands}
              className="object-contain [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent),linear-gradient(to_bottom,transparent,#000_8%,#000_90%,transparent)]"
            />
          </Tilt>
        </div>
        <HeroActions className="hidden justify-center desk:flex desk:flex-wrap desk:items-center desk:gap-4" />
      </div>
    </section>
  );
}

function HeroActions({ className, buttonClassName = "" }: { className: string; buttonClassName?: string }) {
  return (
    <div className={className}>
      <a href="#book-visit" className={`btn-primary btn-lg ${buttonClassName}`}>Book a site visit</a>
      <Link href="/colours" className={`btn-secondary btn-lg ${buttonClassName}`}>Explore colours</Link>
    </div>
  );
}
