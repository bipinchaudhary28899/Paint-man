import Link from "next/link";
import { CtaBanner } from "@/components/CtaBanner";
import { GalleryGrid } from "@/components/GalleryGrid";
import { PageHero } from "@/components/PageHero";
import { galleryGroups } from "@/config/gallery";
import { liveCityNames, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Home Painting Ideas & Photos in ${site.city}`,
  description: `Painting ideas from Indian homes: living rooms, bedrooms, kitchens, doors and house fronts in real colours. Book a free site visit in ${site.city} to get started.`,
  path: "/gallery",
});

const linkClass = "font-semibold underline decoration-terracotta decoration-2 underline-offset-4 hover:text-terracotta";

// Ideas from Indian homes, grouped by room (src/config/gallery.ts). They are other people's homes,
// and the page says so plainly; our own job photos join as a group of their own when they come.
export default function GalleryPage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: "Gallery", path: "/gallery" }]}
        title={<>Home painting <em>ideas</em> from Indian homes</>}
        intro={
          <>
            Ghar ke liye rang chun rahe hain? Living rooms, bedrooms, kitchens, doors and house fronts from homes across India, to
            help you picture yours. Find any shade in the <Link href="/colours" className={linkClass}>colour finder</Link>, and our
            inspector brings the real shade cards to your home in {liveCityNames("or")}.
          </>
        }
        tint="bg-cream-wash"
      />
      <div className="container-page mt-10">
        <p className="max-w-3xl rounded-[18px] border border-line-soft bg-paper px-5 py-4 text-sm leading-relaxed text-muted">
          These are example homes for ideas, not our own jobs. Photos of homes we paint are added as each one is handed over, with
          the owner&apos;s permission.
        </p>
        <nav aria-label="Gallery sections" className="mt-6 flex flex-wrap gap-2">
          {galleryGroups.map((g) => (
            <a key={g.id} href={`#${g.id}-heading`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-sm font-medium hover:border-terracotta hover:text-terracotta">
              {g.title}
            </a>
          ))}
        </nav>
        <div className="mt-12">
          {galleryGroups.map((g) => (
            <GalleryGrid key={g.id} group={g} />
          ))}
        </div>
      </div>
      <CtaBanner heading={<>Seen a colour you like? <em>Let&apos;s paint it.</em></>} />
    </>
  );
}
