import Image from "next/image";
import { images } from "@/config/images";
import { site } from "@/config/site";

// Example finishes (stock photos, see images.ts). No locality or "our job" claims until real,
// consented photos of our own jobs replace them.
// `bento` places each photo in the tablet layout: one tall frame, two small ones and one wide one.
const finishes = [
  { image: images.exteriorBlue, kind: "Exterior · grey-blue", bento: "tab:max-desk:col-start-2 tab:max-desk:row-start-1", sizes: "33vw" },
  { image: images.livingMoody, kind: "Living room · warm white", raised: true, bento: "tab:max-desk:col-start-1 tab:max-desk:row-span-2 tab:max-desk:row-start-1", sizes: "33vw" },
  { image: images.swatchSheet, kind: "Shade selection", bento: "tab:max-desk:col-start-3 tab:max-desk:row-start-1", sizes: "33vw" },
  { image: images.livingTeal, kind: "Open plan · teal accent", raised: true, bento: "tab:max-desk:col-span-2 tab:max-desk:col-start-2 tab:max-desk:row-start-2", sizes: "66vw" },
];

// "The finish we work to": four example finishes. Phones swipe through portrait frames, tablets get a
// bento of four with the captions as chips over the photos, desktop a row of four tall frames.
export function Finishes() {
  return (
    <section id="work" className="container-page relative z-[1] pb-14 tab:pb-[88px] desk:pb-40" aria-labelledby="work-heading">
      <div className="tab:flex tab:flex-wrap tab:items-end tab:justify-between tab:gap-6">
        <div>
          <p className="eyebrow max-tab:text-[11px]">Finishes</p>
          <h2 id="work-heading" className="mt-3 text-[30px] leading-[1.06] tab:mt-5 tab:text-[44px] desk:mt-6 desk:text-[clamp(36px,4vw,56px)]">
            The finish we <em>work to.</em>
          </h2>
        </div>
        <p className="mt-2.5 leading-[1.6] text-muted max-tab:text-[14px] max-tab:leading-[1.55] tab:mt-0 tab:max-desk:max-w-[300px] tab:max-desk:text-[15px] desk:max-w-[340px]">
          Example finishes. Photos of our own {site.city} jobs are added as each one is handed over.
        </p>
      </div>
      {/* Phones: a swipe row bleeding to the screen edges. From the tablet up the row becomes a grid. */}
      <div
        role="region"
        aria-label="Example finishes"
        tabIndex={0}
        className="swipe -mx-5 mt-5 gap-3 scroll-px-5 px-5 sm:-mx-8 sm:scroll-px-8 sm:px-8 tab:mx-0 tab:mt-8 tab:grid tab:overflow-visible tab:px-0 tab:max-desk:grid-cols-3 tab:max-desk:grid-rows-[210px_210px] desk:mt-14 desk:grid-cols-4 desk:gap-5"
      >
        {finishes.map((p) => (
          <figure key={p.kind} className={`w-[220px] tab:w-auto tab:max-desk:relative ${p.bento} ${p.raised ? "desk:mt-10" : ""}`}>
            <div className="relative h-[280px] overflow-hidden rounded-[18px] tab:max-desk:absolute tab:max-desk:inset-0 tab:max-desk:h-auto tab:max-desk:rounded-[20px] desk:h-[360px]">
              <Image
                src={p.image.src}
                alt={p.image.alt}
                fill
                sizes={`(min-width: 1080px) 25vw, (min-width: 721px) ${p.sizes}, 220px`}
                className="object-cover"
              />
            </div>
            <figcaption className="mt-2 text-[13px] text-muted-2 tab:max-desk:absolute tab:max-desk:bottom-3 tab:max-desk:left-3 tab:max-desk:mt-0 tab:max-desk:rounded-full tab:max-desk:bg-canvas/92 tab:max-desk:px-3 tab:max-desk:py-[7px] tab:max-desk:text-[12px] tab:max-desk:font-medium tab:max-desk:text-ink desk:mt-3">
              {p.kind}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
