import Image from "next/image";
import Link from "next/link";
import { CtaBanner } from "@/components/CtaBanner";
import { PageHero } from "@/components/PageHero";
import { images } from "@/config/images";
import { cities, cityPath, homeCity, serviceCityTitle, servicePath, services, servicesIn } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Interior & Exterior Painting Services",
  description: "Interior, exterior and rental property painting, managed from start to finish. Every job starts with an on-site inspection and a full itemised quote.",
  path: "/services",
});

const linkClass = "font-semibold underline decoration-terracotta decoration-2 underline-offset-4 hover:text-terracotta";

export default function ServicesPage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: "Services", path: "/services" }]}
        title={<>Painting <em>services</em></>}
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
                <Link href={servicePath(s)} className="hover:text-tangerine-text">{s.title}</Link>
              </h2>
              <p className="mt-4 leading-relaxed text-muted">{s.intro}</p>
              <ul className="mt-6 grid gap-2.5 text-sm font-semibold sm:grid-cols-2">
                {s.includes.slice(0, 4).map((inc) => (
                  <li key={inc} className="flex gap-2"><span className="text-success">✓</span>{inc}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/book?service=${s.slug}`} className="btn-primary">Book site visit</Link>
                <Link href={servicePath(s)} className="btn-secondary">Details</Link>
              </div>
              <p className="mt-5 text-sm text-muted">
                In your city:{" "}
                {cities.filter((c) => servicesIn(c).includes(s)).map((c, j) => (
                  <span key={c.slug}>
                    {j > 0 && " · "}
                    <Link href={servicePath(s, c)} className={linkClass}>{serviceCityTitle(s, c)}</Link>
                  </span>
                ))}
              </p>
            </div>
          </article>
        ))}
      </div>

      <section className="container-page mt-20 grid gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-2xl font-normal">Choosing <em>colours</em></h2>
          <p className="mt-3 leading-relaxed text-muted">
            Start from <Link href="/palettes" className={linkClass}>ready colour combinations</Link>, or search{" "}
            <Link href="/colours" className={linkClass}>wall colour shades by code</Link>. The inspector brings the shade cards to your home.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-normal">Price and <em>timing</em></h2>
          <p className="mt-3 leading-relaxed text-muted">
            How the price is worked out, how long a 2 BHK takes and how brands are chosen: see the{" "}
            <Link href="/faq" className={linkClass}>house painting FAQs</Link>.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-normal">Where we <em>work</em></h2>
          <p className="mt-3 leading-relaxed text-muted">
            Homes, rental flats and shops across {homeCity.name}, including {homeCity.areas.slice(0, 4).join(", ")} and more, with{" "}
            {cities.filter((c) => c.status === "soon").map((c) => c.name).join(" and ")} coming next.{" "}
            <Link href={cityPath(homeCity)} className={linkClass}>House painting in {homeCity.name}</Link>.
          </p>
        </div>
      </section>
      <CtaBanner />
    </>
  );
}
