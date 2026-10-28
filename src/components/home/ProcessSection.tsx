import Image from "next/image";
import { images } from "@/config/images";
import { ServicesSwipeRow } from "./ServicesSwipeRow";

const steps = [
  { title: "Request an estimate", text: "Tell us about your home online or on the phone. It takes under a minute." },
  { title: "Inspection & measuring", text: "We measure walls, check for damp and cracks, and talk through colours and finishes." },
  { title: "Itemised quotation", text: "Brand, coats, prep, inclusions, exclusions and timeline, line by line." },
  { title: "Supervised painting", text: "A vetted crew paints while our supervisor checks quality and sends you photos." },
  { title: "Walkthrough & handover", text: "We clean up, walk every room with you and fix anything on the checklist." },
];

const photos = [
  { image: images.livingWarm, pos: "object-[center_60%]", caption: "Har coat, quote ke hisaab se: the finish you approved" },
  { image: images.coupleHome, pos: "", caption: "Apni roshni mein rang chuniye: shade cards come to your home" },
];

/**
 * "From enquiry to fresh walls in five steps" (deep sage band), with two photos from the job. One
 * list, three layouts: a swipe row of small cards on phones, a hairline table (number, title, text in
 * columns) on tablets, five columns on desktop. The photos sit two-up everywhere.
 */
export function ProcessSection() {
  return (
    <section id="how" className="relative z-[1] bg-sage-deep text-on-ink" aria-labelledby="process-heading">
      <div className="container-page py-14 tab:py-20 desk:py-[140px]">
        <div className="desk:flex desk:flex-wrap desk:items-end desk:justify-between desk:gap-7">
          <h2
            id="process-heading"
            className="text-[30px] leading-[1.08] tab:max-w-[600px] tab:text-[44px] tab:leading-[1.06] desk:max-w-[640px] desk:text-[clamp(36px,4vw,56px)]"
          >
            From enquiry to fresh walls in <em className="!text-golden">five steps.</em>
          </h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-on-sage tab:mt-4 tab:max-w-[420px] tab:text-[16px] tab:leading-[1.65] desk:mt-0 desk:max-w-[340px]">
            Ek team, ek quotation, ek hi contact: from the first call to the final walkthrough.
          </p>
        </div>
        <ServicesSwipeRow
          label="Five steps, swipe for more"
          className="swipe -mx-5 mt-6 scroll-px-5 px-5 focus-visible:outline-offset-[-3px] sm:-mx-8 sm:scroll-px-8 sm:px-8 tab:mx-0 tab:mt-10 tab:block tab:overflow-visible tab:scroll-px-0 tab:px-0 desk:mt-[88px]"
        >
          <ol className="flex gap-2.5 tab:block tab:border-b tab:border-canvas/30 desk:grid desk:grid-cols-5 desk:gap-x-8 desk:gap-y-12 desk:border-b-0">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="flex flex-col gap-2 max-tab:w-[248px] max-tab:shrink-0 max-tab:snap-start max-tab:rounded-[18px] max-tab:border max-tab:border-canvas/22 max-tab:bg-canvas/8 max-tab:p-4 tab:grid tab:grid-cols-[44px_210px_minmax(0,1fr)] tab:items-baseline tab:gap-4 tab:border-t tab:border-canvas/30 tab:py-5 desk:flex desk:items-stretch desk:pb-0 desk:pt-6"
              >
                <span className="font-display text-[15px] max-tab:text-golden tab:max-desk:leading-[normal]">0{i + 1}</span>
                <h3 className="font-sans text-[16px] font-semibold tracking-[-0.01em] max-desk:!font-sans max-desk:!font-semibold max-desk:!tracking-[-0.01em] tab:text-[18px] tab:max-desk:leading-[normal] desk:text-[19px]">{s.title}</h3>
                <p className="text-[14px] leading-[1.5] text-on-sage tab:text-[15px] tab:leading-[1.6]">{s.text}</p>
              </li>
            ))}
          </ol>
        </ServicesSwipeRow>
        <div className="mt-7 grid grid-cols-2 gap-2.5 tab:mt-12 tab:gap-4 desk:mt-24 desk:gap-6">
          {photos.map((p) => (
            <figure key={p.caption}>
              <div className="relative h-[210px] overflow-hidden rounded-[16px] tab:h-[300px] tab:rounded-[20px] desk:h-[420px]">
                <Image src={p.image.src} alt={p.image.alt} fill sizes="50vw" className={`object-cover ${p.pos}`} />
              </div>
              <figcaption className="mt-2 text-[12px] leading-[1.4] text-on-sage tab:mt-3 tab:text-[13px] tab:leading-normal desk:mt-3.5">
                {p.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
