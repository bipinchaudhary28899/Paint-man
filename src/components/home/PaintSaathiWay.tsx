import Image from "next/image";
import { images } from "@/config/images";
import { site } from "@/config/site";

const promise = [
  { title: "One line-by-line quote", text: "Brand, coats, prep, inclusions, exclusions and timeline. Changes need your approval first." },
  { title: "A supervisor on site", text: "A vetted crew paints; our supervisor checks the work and sends you photos every day." },
  { title: "Your home, protected", text: "Furniture moved and covered, floors sheeted, every room cleaned before we leave." },
];

// "The Paint Saathi way": painting without the project management, three commitments beside a photo
// of a family at home (the point: they relax while we manage).
// Phones: a wide photo banner, then the copy and the list. Tablets: a narrow portrait beside the list.
// Desktop: a large photo beside the copy.
export function PaintSaathiWay() {
  return (
    <section className="container-page relative z-[1] py-14 tab:grid tab:grid-cols-[290px_minmax(0,1fr)] tab:items-stretch tab:gap-9 tab:py-[88px] desk:flex desk:flex-wrap desk:items-center desk:gap-[72px] desk:py-[140px]">
      <div className="frame-shadow relative h-[220px] min-w-0 overflow-hidden rounded-[22px] tab:h-auto tab:min-h-[560px] tab:rounded-3xl desk:h-[680px] desk:min-h-0 desk:flex-[1_1_380px]">
        <Image
          src={images.familyHome.src}
          alt={images.familyHome.alt}
          fill
          sizes="(min-width: 1080px) 560px, (min-width: 721px) 290px, 100vw"
          className="object-cover object-[center_30%] tab:object-center"
        />
      </div>
      <div className="mt-6 flex min-w-0 flex-col gap-5 tab:mt-0 tab:justify-center tab:gap-7 desk:flex-[1_1_440px] desk:gap-11">
        <div>
          <p className="eyebrow max-tab:text-[11px]">The {site.name} way</p>
          <h2 className="mt-3 text-[30px] leading-[1.08] tab:mt-5 tab:text-[40px] tab:leading-[1.06] desk:mt-6 desk:text-[clamp(36px,4vw,56px)]">
            Painting, <em>without</em> the project management.
          </h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-muted tab:mt-4 tab:text-[16px] tab:leading-[1.65] desk:mt-5 desk:max-w-[420px] desk:text-[17px]">
            Sab kuch ek hi jagah se. You deal with us, not with painters, paint shops and suppliers separately. We choose the crew and the materials from our
            network and own the result from the first visit to the final walkthrough.
          </p>
        </div>
        <ol className="rule-list flex flex-col">
          {promise.map((p, i) => (
            <li key={p.title} className="flex gap-4 py-[18px] tab:gap-5 tab:py-5 desk:gap-7 desk:py-[30px]">
              <span className="w-[22px] shrink-0 pt-0.5 font-display text-[14px] text-terracotta tab:w-6 tab:pt-[3px] tab:text-[15px] desk:w-7 desk:pt-1">
                0{i + 1}
              </span>
              <div>
                {/* Phones and tablets set the titles in Manrope as drawn; the base h3 rule (unlayered) needs the "!" to yield. */}
                <h3 className="font-sans text-[16px] font-semibold tracking-[-0.01em] max-desk:font-sans! max-desk:font-semibold! tab:text-[18px] desk:text-xl">
                  {p.title}
                </h3>
                <p className="mt-1 text-[14px] leading-[1.55] text-muted tab:mt-1.5 tab:text-[15px] tab:leading-[1.6] desk:mt-2 desk:text-[16px]">
                  {p.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
