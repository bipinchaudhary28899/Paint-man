import Image from "next/image";
import Link from "next/link";
import { CtaBanner } from "@/components/CtaBanner";
import { PageHero } from "@/components/PageHero";
import { images } from "@/config/images";
import { services, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Painting Services in ${site.city}: Interior, Exterior and Rental`,
  description: `Interior wall painting, exterior house painting and rental property repainting in ${site.city}. Inspection, itemised quotation and supervised painters for every job.`,
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: "Services", path: "/services" }]}
        title={<>Painting services in <span className="text-gradient">{site.city}</span></>}
        intro="Every job follows the same process: site inspection, itemised quote, supervised painting and a final walkthrough with you."
        image={images.muralBuckets}
        shape="blob"
        backdrop="#ff6538"
        emoji="paintbrush"
        tint="bg-cream-wash"
      />
      <div className="container-page mt-16 space-y-10">
        {services.map((s, i) => (
          <article key={s.slug} className="reveal card grid overflow-hidden md:grid-cols-2">
            <div className={`relative min-h-72 border-b border-line md:border-b-0 ${i % 2 ? "md:order-2 md:border-l" : "md:border-r"}`}>
              <Image src={s.image.src} alt={s.image.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition duration-700 hover:scale-105" />
              <span className={`sticker absolute left-5 top-5 ${s.accent}`}>{s.shortName}</span>
            </div>
            <div className="p-8 md:p-10">
              <h2 className="text-3xl font-normal">
                <Link href={`/services/${s.slug}`} className="hover:text-tangerine-text">{s.title}</Link>
              </h2>
              <p className="mt-4 leading-relaxed text-muted">{s.intro}</p>
              <ul className="mt-6 grid gap-2.5 text-sm font-semibold sm:grid-cols-2">
                {s.includes.slice(0, 4).map((inc) => (
                  <li key={inc} className="flex gap-2"><span className="text-success">✓</span>{inc}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/book?service=${s.slug}`} className="btn-primary">Book inspection</Link>
                <Link href={`/services/${s.slug}`} className="btn-secondary">Details</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      <CtaBanner />
    </>
  );
}
