import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { illustrations } from "@/config/images";
import { workFlow } from "@/config/site";

// How the work is done, from booking to handover, as one ordered list of numbered steps, drawn three
// ways from the same markup:
// - phone (under 721px): a vertical timeline, numbered dots joined by a hairline, the toolbox small
//   beside the heading and a full-width button under the list;
// - tablet (721px to 1079px): compact step tickets two across; with a `cta`, the slot after the last
//   step is a sand "Aap ready, hum ready." tile holding the button. The list is a subgrid of the wrapper
//   so the tile shares its rows without joining the list;
// - desktop (1080px up): four columns of steps and the button under them.
// A step with an `image` (the owner's PNGs of people painting) shows it above its text, in a box
// that reserves its space.

type Step = (typeof workFlow)[number];

export function WorkFlow({ steps = workFlow, cta, className = "" }: { steps?: Step[]; cta?: { href: string; label: string }; className?: string }) {
  // Tablet rows taken by the steps; with an odd count the tile fills the empty slot of the last one.
  const stepRows = Math.ceil(steps.length / 2);
  const tileInLastRow = steps.length % 2 === 1;
  return (
    <section aria-labelledby="work-flow-heading" className={className}>
      <div className="flex items-end justify-between gap-3 tab:gap-6 desk:flex-wrap">
        <div className="max-desk:min-w-0">
          <p className="eyebrow max-tab:flex max-tab:text-[11px]">From booking to handover</p>
          <h2 id="work-flow-heading" className="mt-2 text-[30px]/[1.06] tab:mt-3 tab:text-[44px]/[1.06] desk:text-5xl">
            How the work <em>gets done</em>
          </h2>
        </div>
        <Image
          src={illustrations.toolbox.src}
          alt={illustrations.toolbox.alt}
          width={illustrations.toolbox.width}
          height={illustrations.toolbox.height}
          sizes="(min-width: 1080px) 280px, (min-width: 721px) 170px, 104px"
          className="h-auto w-[104px] max-desk:shrink-0 tab:w-[170px] desk:w-[280px]"
        />
      </div>
      <div
        className="mt-6 tab:mt-7 tab:max-desk:grid tab:max-desk:grid-cols-2 tab:max-desk:gap-3 desk:mt-10"
        style={{ "--flow-rows": stepRows } as CSSProperties}
      >
        <ol className="tab:max-desk:col-span-full tab:max-desk:row-[1/span_var(--flow-rows)] tab:max-desk:grid tab:max-desk:grid-cols-subgrid tab:max-desk:grid-rows-subgrid desk:grid desk:grid-cols-4 desk:gap-x-8 desk:gap-y-10">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="group/step max-desk:grid max-desk:grid-cols-[32px_minmax(0,1fr)] max-desk:gap-x-3.5 tab:max-desk:grid-cols-[36px_minmax(0,1fr)] tab:max-desk:rounded-[18px] tab:max-desk:border tab:max-desk:border-line-soft tab:max-desk:bg-paper tab:max-desk:p-[18px]"
            >
              {s.image && (
                <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-[20px] bg-sand max-desk:col-start-2 max-desk:row-start-1 desk:mb-5">
                  <Image src={s.image.src} alt={s.image.alt} fill sizes="(min-width: 1080px) 25vw, (min-width: 721px) 40vw, 80vw" className="object-contain" />
                </div>
              )}
              <div className={`max-desk:col-start-1 max-desk:row-start-1 max-desk:flex max-desk:flex-col max-desk:items-center ${s.image ? "max-desk:row-span-2" : ""}`}>
                <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta font-display text-[15px] text-on-ink tab:h-9 tab:w-9 tab:text-[17px] desk:h-11 desk:w-11 desk:text-xl">
                  {i + 1}
                </span>
                {/* the timeline's rail down to the next step (phones only; none after the last) */}
                <span aria-hidden className="my-1.5 w-px flex-1 bg-line group-last/step:hidden tab:hidden" />
              </div>
              <div className="min-w-0 max-tab:pt-1 max-tab:pb-[22px] max-desk:col-start-2">
                <h3 className="text-[18px]/[1.2] tab:text-[19px]/[1.2] desk:mt-4 desk:text-xl">{s.title}</h3>
                <p className="mt-1 text-[14px]/[1.55] text-muted tab:text-[13.5px]/[1.55] desk:mt-1.5 desk:text-[15px] desk:leading-relaxed">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        {cta && (
          <div
            className={`max-tab:mt-1 tab:max-desk:flex tab:max-desk:flex-col tab:max-desk:items-start tab:max-desk:justify-center tab:max-desk:gap-3.5 tab:max-desk:rounded-[18px] tab:max-desk:bg-sand tab:max-desk:p-[22px] ${
              tileInLastRow ? "tab:max-desk:col-start-2 tab:max-desk:row-start-(--flow-rows)" : "tab:max-desk:col-span-full"
            }`}
          >
            <p className="hidden font-display text-[22px]/[1.2] tab:max-desk:block">Aap ready, hum ready.</p>
            <Link
              href={cta.href}
              className="btn-primary btn-lg max-tab:flex max-tab:w-full max-tab:min-h-[54px] tab:max-desk:min-h-[50px] tab:max-desk:px-6 tab:max-desk:text-[15px] desk:mt-10"
            >
              {cta.label}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
