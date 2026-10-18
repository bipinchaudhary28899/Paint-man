import Link from "next/link";
import { CtaBanner } from "@/components/CtaBanner";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { generalFaqs, services, site } from "@/config/site";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `House Painting FAQs in ${site.city}`,
  description: `Answers on house painting in ${site.city}: how the price is worked out, how long a 2 BHK takes, paint brands and prep. Every job starts with an on-site inspection.`,
  path: "/faq",
});

const linkClass = "font-semibold underline decoration-terracotta decoration-2 underline-offset-4 hover:text-terracotta";

export default function FaqPage() {
  return (
    <>
      {/* Each Q&A is marked up once site-wide: service FAQs carry FAQPage markup on their own service page. */}
      <JsonLd data={faqJsonLd(generalFaqs)} />
      <PageHero
        crumbs={[{ name: "FAQ", path: "/faq" }]}
        title={<>House painting <span className="text-gradient">questions</span> in {site.city}, answered</>}
        intro={
          <>
            Can&apos;t find your answer? <Link href="/book" className={linkClass}>Book an inspection</Link> or{" "}
            <Link href="/contact" className={linkClass}>contact us</Link>.
          </>
        }
        tint="bg-cream-wash"
        emoji="light-bulb"
      />
      <div className="container-page mt-14 max-w-3xl">
        <h2 className="text-2xl font-normal">General</h2>
        <div className="mt-5"><FaqList faqs={generalFaqs} /></div>
        {services.map((s) => (
          <section key={s.slug}>
            <h2 className="mt-12 text-2xl font-normal">{s.name}</h2>
            <div className="mt-5"><FaqList faqs={s.faqs} /></div>
            <p className="mt-4 text-sm">
              <Link href={`/services/${s.slug}`} className={`inline-flex min-h-11 items-center ${linkClass}`}>
                How {s.name.toLowerCase()} works in {site.city} →
              </Link>
            </p>
          </section>
        ))}
        <section>
          <h2 className="mt-12 text-2xl font-normal">Choosing colours</h2>
          <p className="mt-4 leading-relaxed text-muted">
            Browse <Link href="/palettes" className={linkClass}>ready colour combinations</Link> for bedrooms, living rooms and exteriors, search{" "}
            <Link href="/colours" className={linkClass}>wall colour shades by code</Link>, or see a shade on a photo of your own room in the{" "}
            <Link href="/visualizer" className={linkClass}>wall colour visualizer</Link>.
          </p>
        </section>
      </div>
      <CtaBanner />
    </>
  );
}
