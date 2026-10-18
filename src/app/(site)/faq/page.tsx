import { CtaBanner } from "@/components/CtaBanner";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { generalFaqs, services, site } from "@/config/site";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `House Painting FAQs: Cost, Time and Process in ${site.city}`,
  description: `Answers to common questions about house painting in ${site.city}: how pricing works, how long it takes, paint brands, furniture protection and our service areas.`,
  path: "/faq",
});

export default function FaqPage() {
  const all = [...generalFaqs, ...services.flatMap((s) => s.faqs)];
  return (
    <>
      <JsonLd data={faqJsonLd(all)} />
      <PageHero
        crumbs={[{ name: "FAQ", path: "/faq" }]}
        title={<>Painting <span className="text-gradient">questions</span>, answered</>}
        intro="Can't find your answer? Book an inspection or contact us."
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
          </section>
        ))}
      </div>
      <CtaBanner />
    </>
  );
}
