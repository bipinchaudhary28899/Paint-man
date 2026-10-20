import Link from "next/link";
import { ColourTools } from "@/components/ColourTools";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { BookingSection } from "@/components/BookingSection";
import { PaintDbCredit } from "@/components/colours/ShadeSwatches";
import { paintdb, shadeCount } from "@/lib/colours/brands";
import { indexMeta, shadeCardPath, shadeCards } from "@/lib/colours/shade-cards";
import { pageMetadata } from "@/lib/seo";

// The shade-card hub (/shade-cards): the cards of the major brands sold in India, the ones we
// supply and apply, each with its colour families. Every brand and family page links back here.

export const metadata = pageMetadata({ ...indexMeta(), path: "/shade-cards" });

export default function ShadeCardsPage() {
  const cards = shadeCards();
  return (
    <>
      <section className="border-b border-line bg-cream-wash">
        <div className="container-page py-12 md:py-16">
          <div className="max-w-4xl">
            <Breadcrumbs items={[{ name: "Colours", path: "/colours" }, { name: "Shade cards", path: "/shade-cards" }]} />
            <h1 className="mt-5 text-[clamp(40px,5vw,68px)] leading-[1.04] tracking-[-0.02em]">
              Paint shade cards from India&apos;s <em>major brands</em>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-[1.65] text-muted">
              {shadeCount().toLocaleString("en-IN")} shades from {cards.map((c) => c.name).join(", ").replace(/, ([^,]*)$/, " and $1")}, the
              brands we supply and apply. Each card lists every shade with the code printed on the paper card, grouped by colour family
              and ordered light to dark, so you can shortlist before the site visit and quote exact codes.
            </p>
          </div>
          <ColourTools current="shade-cards" className="mt-8 md:mt-10" />
        </div>
      </section>

      <section className="container-page mt-16 md:mt-20" aria-labelledby="cards">
        <h2 id="cards" className="text-3xl md:text-5xl">
          Choose a <em>shade card</em>
        </h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {cards.map((c) => (
            <li key={c.slug} className="card flex flex-col overflow-hidden">
              <span aria-hidden className="flex h-16">
                {c.families.map((f) => (
                  <span key={f.family} className="flex-1" style={{ backgroundColor: f.sample[Math.floor(f.sample.length / 2)].hex }} />
                ))}
              </span>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-2xl">
                  <Link href={shadeCardPath(c.slug)} className="hover:text-terracotta">{c.name} shade card</Link>
                </h3>
                <p className="mt-1 text-muted">
                  {c.count.toLocaleString("en-IN")} shades in {c.families.length} colour families, LRV {c.lrv.min} to {c.lrv.max}.
                </p>
                <ul className="mt-4 flex flex-wrap gap-x-4" aria-label={`${c.shortName} colour families`}>
                  {c.families.filter((f) => f.hasPage).map((f) => (
                    <li key={f.family}>
                      <Link href={shadeCardPath(c.slug, f.family)} className="inline-flex min-h-11 items-center text-[15px] font-semibold hover:text-terracotta">
                        {f.label} <span className="ml-1 font-normal text-muted">{f.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8 max-w-3xl">
          <PaintDbCredit source={paintdb.source} licenseUrl={paintdb.licenseUrl} note={paintdb.note} />
        </div>
      </section>

      <BookingSection
        className="container-page mt-24"
        heading={<>Shortlisted a few codes? <em>Book the visit</em></>}
        text={<p>Add the codes you like under “Add more details”. The inspector brings the brand&apos;s shade card to your site visit, so you see each shade in your own light. Zero advance payment.</p>}
      />

      <CtaBanner heading={<>Shortlisted a few codes? <em>Book the visit.</em></>} />
    </>
  );
}
