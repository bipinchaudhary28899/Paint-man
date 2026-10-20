import { Emoji } from "@/components/Emoji";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBanner } from "@/components/CtaBanner";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { accentCity, ServiceDetails } from "@/components/services/ServiceDetails";
import { cities, cityPath, serviceCityTitle, servicePath, services } from "@/config/site";
import { faqJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";

// The service hub (/services/interior-painting): how we do this work anywhere, with no city in the
// copy. Each city it is offered in has its own page (/services/interior-painting/agra) with the
// local intro, notes and questions; this page links to them and they link back here.

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) return {};
  return pageMetadata({ title: service.title, description: service.description, path: servicePath(service) });
}

const tints = ["bg-sky-wash", "bg-peach-wash", "bg-rose-wash"];
const shapes = ["arch", "blob", "scallop"] as const;
const emojis = ["house", "house-with-garden", "key"] as const;
const linkClass = "font-semibold underline decoration-terracotta decoration-2 underline-offset-4 hover:text-terracotta";

export default async function ServiceHubPage({ params }: Params) {
  const { slug } = await params;
  const index = services.findIndex((s) => s.slug === slug);
  const service = services[index];
  if (!service) notFound();
  const others = services.filter((s) => s.slug !== service.slug);
  const offeredIn = cities.filter((c) => c.slug in service.local);
  const lower = service.name.toLowerCase();

  return (
    <>
      {/* Hub FAQs are marked up here; each city's own questions are marked up on its city page. */}
      <JsonLd data={[serviceJsonLd(service), faqJsonLd(service.faqs)]} />
      <PageHero
        crumbs={[{ name: "Services", path: "/services" }, { name: service.name, path: servicePath(service) }]}
        title={accentCity(service.title)}
        intro={service.intro}
        image={service.image}
        shape={shapes[index % shapes.length]}
        emoji={emojis[index % emojis.length]}
        tint={tints[index % tints.length]}
      >
        <Link href={`/book?service=${service.slug}`} className="btn-primary mt-8">Book a site visit →</Link>
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
            <h2 className="text-2xl font-normal">Where we offer it</h2>
            <ul className="mt-3 space-y-1">
              {offeredIn.map((c) => (
                <li key={c.slug}>
                  <Link href={servicePath(service, c)} className="inline-flex min-h-11 items-center font-semibold text-on-ink underline decoration-golden decoration-2 underline-offset-4">
                    {serviceCityTitle(service, c)}
                  </Link>
                </li>
              ))}
            </ul>
            <a href="#book-inspection" className="btn-primary mt-6 w-full">Book a site visit</a>
          </div>
          <div className="card p-7">
            <h2 className="text-lg font-normal">Other services</h2>
            <ul className="mt-3 space-y-2">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={servicePath(o)} className="inline-flex min-h-11 items-center font-semibold underline decoration-tangerine decoration-2 underline-offset-4 hover:text-tangerine">
                    {o.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-7">
            <h2 className="text-lg font-normal">House painting by city</h2>
            <p className="mt-3 text-sm">
              {cities.map((c, i) => (
                <span key={c.slug}>
                  {i > 0 && <span aria-hidden className="mx-2 text-muted">·</span>}
                  <Link href={cityPath(c)} className={`inline-flex min-h-11 items-center ${linkClass}`}>House painting in {c.name}</Link>
                </span>
              ))}
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
              Book {lower} <em>online</em>
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
      <CtaBanner heading={<>Ready for {lower}? <em className="text-terracotta">Book a site visit.</em></>} />
    </>
  );
}
