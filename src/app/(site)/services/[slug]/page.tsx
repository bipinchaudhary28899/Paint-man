import { Emoji } from "@/components/Emoji";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBanner } from "@/components/CtaBanner";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { accentCity, ServiceDetails } from "@/components/services/ServiceDetails";
import { services, site } from "@/config/site";
import { faqJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) return {};
  return pageMetadata({ title: service.title, description: service.description, path: `/services/${service.slug}` });
}

const tints = ["bg-sky-wash", "bg-peach-wash", "bg-rose-wash"];
const shapes = ["arch", "blob", "scallop"] as const;
const emojis = ["house", "house-with-garden", "key"] as const;
const linkClass = "font-semibold underline decoration-terracotta decoration-2 underline-offset-4 hover:text-terracotta";

export default async function ServicePage({ params }: Params) {
  const { slug } = await params;
  const index = services.findIndex((s) => s.slug === slug);
  const service = services[index];
  if (!service) notFound();
  const others = services.filter((s) => s.slug !== service.slug);
  const lower = service.name.toLowerCase();

  return (
    <>
      {/* Service FAQs are marked up here, on the page that owns them; /faq marks up only the general ones. */}
      <JsonLd data={[serviceJsonLd(service), faqJsonLd(service.faqs)]} />
      <PageHero
        crumbs={[{ name: "Services", path: "/services" }, { name: service.name, path: `/services/${service.slug}` }]}
        title={accentCity(service.title)}
        intro={service.intro}
        image={service.image}
        shape={shapes[index % shapes.length]}
        emoji={emojis[index % emojis.length]}
        tint={tints[index % tints.length]}
      >
        <Link href={`/book?service=${service.slug}`} className="btn-primary mt-8">Book an inspection →</Link>
      </PageHero>

      <div className="container-page mt-16 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="text-3xl font-normal">What&apos;s <span className="text-gradient-warm">included</span></h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {service.includes.map((inc) => (
              <li key={inc} className="reveal flex items-center gap-3 rounded-2xl border border-line bg-paper p-4 font-semibold">
                <Emoji name="check-mark-button" size={28} className="shrink-0" />
                {inc}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">The exact scope for your property is written in your quotation.</p>

          <ServiceDetails service={service} />

          <h2 className="mt-14 text-3xl font-normal">Suitable <em>for</em></h2>
          <ul className="mt-5 flex flex-wrap gap-3">
            {service.suitableFor.map((s) => (
              <li key={s} className="rounded-full bg-cream-wash px-4 py-2 text-sm font-bold">{s}</li>
            ))}
          </ul>

          <h2 className="mt-14 text-3xl font-normal">{service.name} <em>FAQs</em></h2>
          <div className="mt-6"><FaqList faqs={service.faqs} /></div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div className="card bg-ink p-7 text-on-ink">
            <h2 className="text-2xl font-normal">Get an itemised quote</h2>
            <p className="mt-2 text-on-ink/70">Book a site inspection anywhere in our {site.city} service area.</p>
            <a href="#book-inspection" className="btn-primary mt-6 w-full">Book inspection</a>
          </div>
          <div className="card p-7">
            <h2 className="text-lg font-normal">Other services</h2>
            <ul className="mt-3 space-y-2">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={`/services/${o.slug}`} className="inline-flex min-h-11 items-center font-semibold underline decoration-tangerine decoration-2 underline-offset-4 hover:text-tangerine">
                    {o.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-7">
            <h2 className="text-lg font-normal">Painting across {site.city}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{site.areas.join(", ")}.</p>
            <p className="mt-3 text-sm">
              <Link href="/areas" className={`inline-flex min-h-11 items-center ${linkClass}`}>Areas we serve</Link>
              <span aria-hidden className="mx-2 text-muted">·</span>
              <Link href="/faq" className={`inline-flex min-h-11 items-center ${linkClass}`}>Painting FAQs</Link>
            </p>
          </div>
        </aside>
      </div>

      <section id="book-inspection" className="container-page mt-20 scroll-mt-28" aria-labelledby="book-inspection-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="book-inspection-heading" className="text-[clamp(32px,4vw,48px)] leading-[1.08]">
              Book {lower} in <em>{site.city}</em>
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
              Share a few details and we&apos;ll call to fix a time for the inspection. The inspector measures your walls, brings shade cards and sends an itemised quotation. Nothing is booked until you approve it.
            </p>
            <p className="mt-4 text-sm text-muted">
              Prefer the full booking page?{" "}
              <Link href={`/book?service=${service.slug}`} className={linkClass}>Open it here</Link>.
            </p>
          </div>
          <div className="card p-6 md:p-8">
            <LeadForm type="booking" defaultService={service.leadService} />
          </div>
        </div>
      </section>
      <CtaBanner heading={<>Ready for {lower} in <em className="text-terracotta">{site.city}?</em></>} />
    </>
  );
}
