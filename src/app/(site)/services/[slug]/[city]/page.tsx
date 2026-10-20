import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBanner } from "@/components/CtaBanner";
import { Emoji } from "@/components/Emoji";
import { FaqList } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { accentCity } from "@/components/services/ServiceDetails";
import { areaSlug, cities, cityPath, getCity, serviceCityTitle, servicePath, services, servicesIn, site } from "@/config/site";
import { faqJsonLd, pageMetadata, serviceJsonLd } from "@/lib/seo";

// A service in one city (/services/interior-painting/agra): the local intro, what is different
// about this work there, the localities we cover and the city's own questions, with the booking
// form. How the work is done everywhere lives on the hub (/services/interior-painting), linked here.

type Params = { params: Promise<{ slug: string; city: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return services.flatMap((s) => cities.filter((c) => c.slug in s.local).map((c) => ({ slug: s.slug, city: c.slug })));
}

function find(slug: string, citySlug: string) {
  const service = services.find((s) => s.slug === slug);
  const city = getCity(citySlug);
  const local = service && city ? service.local[city.slug] : undefined;
  return service && city && local ? { service, city, local } : undefined;
}

export async function generateMetadata({ params }: Params) {
  const { slug, city } = await params;
  const found = find(slug, city);
  if (!found) return {};
  return pageMetadata({
    title: serviceCityTitle(found.service, found.city),
    description: found.local.description,
    path: servicePath(found.service, found.city),
  });
}

const tints = ["bg-sky-wash", "bg-peach-wash", "bg-rose-wash"];
const shapes = ["arch", "blob", "scallop"] as const;
const emojis = ["house", "house-with-garden", "key"] as const;
const linkClass = "font-semibold underline decoration-terracotta decoration-2 underline-offset-4 hover:text-terracotta";

export default async function ServiceCityPage({ params }: Params) {
  const { slug, city: citySlug } = await params;
  const found = find(slug, citySlug);
  if (!found) notFound();
  const { service, city, local } = found;
  const index = services.indexOf(service);
  const others = servicesIn(city).filter((s) => s.slug !== service.slug);
  const lower = service.name.toLowerCase();
  const title = serviceCityTitle(service, city);

  return (
    <>
      {/* This city's own questions are marked up here and nowhere else. */}
      <JsonLd data={[serviceJsonLd(service, city), faqJsonLd(local.faqs)]} />
      <PageHero
        crumbs={[
          { name: "Services", path: "/services" },
          { name: service.name, path: servicePath(service) },
          { name: city.name, path: servicePath(service, city) },
        ]}
        title={accentCity(title, city.name)}
        intro={local.intro}
        image={service.image}
        shape={shapes[index % shapes.length]}
        emoji={emojis[index % emojis.length]}
        tint={tints[index % tints.length]}
      >
        <Link href={`/book?service=${service.slug}`} className="btn-primary mt-8">Book a site visit in {city.name} →</Link>
      </PageHero>

      <div className="container-page mt-16 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="text-3xl font-normal">What&apos;s <span className="text-gradient-warm">included</span></h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {service.includes.map((inc) => (
              <li key={inc} className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-4 font-semibold">
                <Emoji name="check-mark-button" size={28} className="shrink-0" />
                {inc}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            How each step is done, the paint system layer by layer and what moves the price:{" "}
            <Link href={servicePath(service)} className={linkClass}>how we do {lower}</Link>.
          </p>

          <h2 className="mt-14 text-3xl font-normal">
            {service.name} in {city.name}: <em>what to know</em>
          </h2>
          <div className="mt-6 grid gap-4">
            {local.notes.map((n) => (
              <div key={n.title} className="card p-6">
                <h3 className="text-xl font-normal">{n.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{n.body}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-14 text-3xl font-normal">
            Where we paint in <em>{city.name}</em>
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2">
            {city.areas.map((a) => (
              <li key={a}>
                <Link href={`${cityPath(city)}#${areaSlug(a)}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-sm font-semibold hover:bg-sand">
                  {a}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">
            Not on the list? <Link href={`/book?service=${service.slug}`} className={linkClass}>Book anyway</Link> and we&apos;ll tell you whether we can take the job.
          </p>

          {local.faqs.length > 0 && (
            <>
              <h2 className="mt-14 text-3xl font-normal">
                {service.name} in {city.name}: <em>questions</em>
              </h2>
              <div className="mt-6"><FaqList faqs={local.faqs} /></div>
            </>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div className="card bg-ink p-7 text-on-ink">
            <h2 className="text-2xl font-normal">Get an itemised quote</h2>
            <p className="mt-2 text-on-ink/70">Book a free site visit anywhere in our {city.name} service area. We call back {site.hoursDisplay}.</p>
            <a href="#book-inspection" className="btn-primary mt-6 w-full">Book a site visit</a>
          </div>
          {others.length > 0 && (
            <div className="card p-7">
              <h2 className="text-lg font-normal">More in {city.name}</h2>
              <ul className="mt-3 space-y-2">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link href={servicePath(o, city)} className="inline-flex min-h-11 items-center font-semibold underline decoration-tangerine decoration-2 underline-offset-4 hover:text-tangerine">
                      {serviceCityTitle(o, city)}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={cityPath(city)} className="inline-flex min-h-11 items-center font-semibold underline decoration-tangerine decoration-2 underline-offset-4 hover:text-tangerine">
                    House painting in {city.name}
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </aside>
      </div>

      <section id="book-inspection" className="container-page mt-20 scroll-mt-28" aria-labelledby="book-inspection-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="book-inspection-heading" className="text-[clamp(32px,4vw,48px)] leading-[1.08]">
              Book {lower} in <em>{city.name}</em>
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted">
              Share a few details and we&apos;ll call to fix a time for the inspection. The inspector measures your walls, brings shade cards and sends an itemised quotation. Nothing is booked until you approve it.
            </p>
          </div>
          <div className="card p-6 md:p-8">
            <LeadForm type="booking" defaultService={service.leadService} />
          </div>
        </div>
      </section>
      <CtaBanner heading={<>Ready for {lower} in <em className="text-terracotta">{city.name}?</em></>} />
    </>
  );
}
