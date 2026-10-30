import Image from "next/image";
import type { GalleryGroup } from "@/config/gallery";

// One gallery group: its heading (an h2 with an anchor) and its photos in a masonry of columns, one
// on phones, two on tablets, three on desktop. Every frame reserves its space from the photo's
// proportions, and the photos load lazily (none of them is above the fold's LCP).
export function GalleryGrid({ group }: { group: GalleryGroup }) {
  return (
    <section aria-labelledby={`${group.id}-heading`} className="mt-14 first:mt-0">
      <h2 id={`${group.id}-heading`} className="text-[26px] leading-tight tab:text-[32px]">
        {group.title}
      </h2>
      <div className="mt-5 columns-1 gap-4 tab:columns-2 desk:columns-3 desk:gap-5">
        {group.photos.map((p) => (
          <figure key={p.src} className="mb-4 break-inside-avoid desk:mb-5">
            <Image
              src={p.src}
              alt={p.alt}
              width={p.width}
              height={p.height}
              sizes="(min-width: 1080px) 33vw, (min-width: 721px) 50vw, 100vw"
              className="h-auto w-full rounded-[20px] bg-sand"
            />
            <figcaption className="mt-2 text-sm text-muted">{p.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
