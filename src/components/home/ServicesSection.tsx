import Image from "next/image";
import Link from "next/link";
import { images } from "@/config/images";
import { services } from "@/config/site";
import { Arrow } from "./Arrow";

const serviceLook: Record<string, { label: string; chip: string; pos?: string }> = {
  "interior-painting": { label: "Interior", chip: "bg-terracotta text-on-ink" },
  "exterior-painting": { label: "Exterior", chip: "bg-sage-deep text-on-ink", pos: "center 70%" },
  "door-window-painting": { label: "Doors & windows", chip: "bg-terracotta text-on-ink" },
  "rental-property-painting": { label: "Complete home", chip: "bg-golden text-ink" },
};
const serviceImage: Record<string, (typeof images)[keyof typeof images]> = {
  "interior-painting": images.livingRoom,
  "exterior-painting": images.houseFront,
  "rental-property-painting": images.rentalFlat,
};

/**
 * "Every wall in the house": a card per service, each linking to its hub. Three layouts from one
 * markup: phones get compact rows (square thumbnail, tag, name, two clamped lines, arrow) with
 * "All services" under the list; tablets get side-image cards two by two with "All services" beside
 * the intro; desktop keeps the tall photo cards three across. The tag sits beside the name on phones
 * and tablets and over the photo on desktop (the second copy is display:none where it is not used).
 */
export function ServicesSection() {
  return (
    <section
      id="services"
      className="container-page relative z-[1] flex flex-col pb-14 tab:grid tab:grid-cols-[minmax(0,1fr)_auto] tab:items-end tab:gap-x-6 tab:pb-[88px] desk:pb-40"
      aria-labelledby="services-heading"
    >
      <div className="tab:col-start-1 tab:row-start-1">
        <p className="eyebrow max-tab:text-[11px]">What we paint</p>
        <h2
          id="services-heading"
          className="mt-3 text-[30px] leading-[1.06] tab:mt-5 tab:text-[44px] desk:mt-6 desk:text-[clamp(36px,4vw,56px)]"
        >
          Every wall in the house.
        </h2>
        <p className="mt-3 max-w-[460px] text-[15px] leading-[1.6] text-muted tab:mt-3.5 tab:text-[16px] tab:leading-[1.65] desk:mt-5 desk:text-[17px]">
          Andar ho ya bahar: house painting inside and out, and quick repaints of rental homes, each starting with an on-site inspection and an
          itemised quote.
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-2.5 tab:col-span-2 tab:row-start-2 tab:mt-8 tab:grid tab:grid-cols-2 tab:gap-3.5 desk:mt-16 desk:grid-cols-3 desk:gap-6">
        {services.map((s) => {
          const look = serviceLook[s.slug] ?? { label: s.shortName, chip: "bg-terracotta text-on-ink" };
          const img = serviceImage[s.slug] ?? s.image;
          return (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="card card-hover flex overflow-hidden text-ink max-tab:items-center max-tab:gap-3.5 max-tab:rounded-[18px] max-tab:py-2.5 max-tab:pl-2.5 max-tab:pr-3.5 tab:max-desk:min-h-[190px] tab:max-desk:rounded-[20px] desk:flex-col"
            >
              <div className="relative shrink-0 overflow-hidden max-tab:size-[92px] max-tab:rounded-[13px] tab:max-desk:w-[120px] desk:h-[300px]">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(min-width: 1080px) 33vw, (min-width: 721px) 300px, 140px"
                  className="object-cover"
                  style={look.pos ? { objectPosition: look.pos } : undefined}
                />
                <span className={`sticker absolute left-5 top-5 hidden !backdrop-blur-none desk:inline-flex ${look.chip}`}>{look.label}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1 tab:gap-2 tab:max-desk:px-4 tab:max-desk:pb-[18px] tab:max-desk:pt-4 desk:block desk:p-7 desk:pb-8">
                <span
                  className={`sticker self-start !backdrop-blur-none max-tab:px-2 max-tab:py-[5px] max-tab:text-[9px] tab:px-2.5 tab:py-1.5 tab:text-[10px] desk:hidden ${look.chip}`}
                >
                  {look.label}
                </span>
                <h3 className="font-sans text-[16px] font-semibold leading-[1.25] tracking-[-0.01em] max-desk:!font-sans max-desk:!font-semibold max-desk:!tracking-[-0.01em] max-tab:![text-wrap:wrap] tab:text-[17px] desk:text-[22px] desk:leading-[inherit]">
                  {s.name}
                </h3>
                <p className="text-[13px] leading-[1.45] text-muted max-tab:line-clamp-2 tab:text-[13.5px] tab:leading-[1.5] tab:max-desk:line-clamp-4 desk:mt-2.5 desk:text-[16px] desk:leading-[1.6]">
                  {s.intro}
                </p>
              </div>
              <span className="shrink-0 text-terracotta tab:hidden">
                <Arrow />
              </span>
            </Link>
          );
        })}
      </div>
      <Link
        href="/services"
        className="link-arrow mt-2 min-h-11 self-start tab:col-start-2 tab:row-start-1 tab:mt-0 tab:self-auto desk:min-h-0"
      >
        All services <Arrow />
      </Link>
    </section>
  );
}
