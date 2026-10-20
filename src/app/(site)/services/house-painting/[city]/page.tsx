import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { Emoji } from "@/components/Emoji";
import { Promises } from "@/components/Promises";
import { BookingSection } from "@/components/BookingSection";
import { areaSlug, cities, cityPath, getCity, homeCity, serviceCityTitle, servicePath, services, servicesIn, site, type City } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

// A city's main painting page (/services/house-painting/agra): every service in the city, the
// localities we cover (each with an anchor the home page and service pages link to), how the
// visit works and what the local weather means for walls, with our booking form (BookingSection) after
// the heading. A city that is not live yet gets a waitlist page instead, kept out of search.

type Params = { params: Promise<{ city: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return cities.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: Params) {
  const city = getCity((await params).city);
  if (!city) return {};
  return pageMetadata({
    title: city.status === "live" ? `House Painting Services in ${city.name}` : `House Painting in ${city.name}: Coming Soon`,
    description: city.description,
    path: cityPath(city),
    noindex: city.status !== "live",
  });
}

const steps = (city: City) => [
  {
    title: "Book a site visit",
    text: `Fill in the form with your number and locality. We call you back during working hours (${site.hoursDisplay}) to confirm the visit.`,
  },
  {
    title: "The inspector visits",
    text: "They measure the walls and ceilings, check for damp, cracks and peeling paint, and bring shade cards so you see colours in your own light.",
  },
  {
    title: "You get an itemised quotation",
    text: "Scope, paint brand and range, inclusions, exclusions and the payment schedule, in writing. Nothing is booked until you approve it.",
  },
  {
    title: "Supervised painting, then a walkthrough",
    text: `The crew works to the approved quotation anywhere in ${city.name}. Any change in scope is priced and approved first, and the job closes with a quality check and a walkthrough with you.`,
  },
];

export default async function CityPage({ params }: Params) {
  const city = getCity((await params).city);
  if (!city) notFound();
  if (city.status !== "live") return <ComingSoon city={city} />;
  const offered = servicesIn(city);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-cream-wash">
        <div className="container-page relative py-12 md:py-16">
          <div className="max-w-3xl">
            <Breadcrumbs
              items={[
                { name: "Services", path: "/services" },
                { name: "House painting", path: "/services/house-painting" },
                { name: city.name, path: cityPath(city) },
              ]}
            />
            <h1 className="mt-5 text-[clamp(40px,5vw,68px)] leading-[1.04] tracking-[-0.02em]">
              House painting services in <em>{city.name}</em>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-[1.65] text-muted">{city.intro}</p>
            <nav aria-label={`Jump to a locality in ${city.name}`} className="mt-8 flex flex-wrap gap-2">
              {city.areas.map((a) => (
                <a key={a} href={`#${areaSlug(a)}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-sm font-semibold transition hover:bg-sand">
                  {a}
                </a>
              ))}
            </nav>
            <a href="#book-visit" className="btn-primary btn-lg mt-8">Book a site visit</a>
          </div>
        </div>
      </section>

      <BookingSection
        heading={<>Book a site visit in <em>{city.name}</em></>}
        text={
          <p>
            Share a few details and we call you back during working hours ({site.hoursDisplay}) to fix the visit. The inspector
            measures your walls, brings shade cards and sends an itemised quotation. Nothing is booked until you approve it.
          </p>
        }
      />

      <section className="container-page mt-16 md:mt-24" aria-labelledby="city-services">
        <p className="eyebrow">Services</p>
        <h2 id="city-services" className="mt-3 text-3xl md:text-5xl">
          Painting services in <em>{city.name}</em>
        </h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {offered.map((s) => (
            <li key={s.slug} className="card flex flex-col p-6">
              <h3 className="text-2xl">
                <Link href={servicePath(s, city)} className="hover:text-terracotta">{serviceCityTitle(s, city)}</Link>
              </h3>
              <p className="mt-2 flex-1 leading-[1.6] text-muted">{s.local[city.slug].intro}</p>
              <Link href={servicePath(s, city)} className="link-arrow mt-4 min-h-11 text-[15px]">
                {s.name} in {city.name} <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="container-page mt-24">
        <Promises />
      </div>

      <section className="container-page mt-24" aria-labelledby="localities">
        <p className="eyebrow">Localities</p>
        <h2 id="localities" className="mt-3 scroll-mt-28 text-3xl md:text-5xl">
          Where we <em>paint</em> in {city.name}
        </h2>
        <p className="mt-4 max-w-2xl leading-[1.65] text-muted">
          Every locality gets the same process: an on-site inspection, an itemised quotation and the same supervised crew as anywhere
          else in {city.name}. Not on the list? <Link href="/book" className="font-bold text-ink underline">Book anyway</Link> and
          we&apos;ll tell you honestly whether we can take the job.
        </p>
        <ul className="mt-8 grid border-t border-line sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
          {city.areas.map((a) => (
            <li key={a} id={areaSlug(a)} className="flex scroll-mt-28 flex-wrap items-center justify-between gap-x-4 border-b border-line py-3">
              <h3 className="text-2xl">{a}</h3>
              <Link href="/book" className="link-arrow min-h-11 text-[15px]">
                Book a slot <span className="sr-only">in {a}</span> <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page mt-24 grid gap-12 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="visit">
        <div>
          <p className="eyebrow">One process everywhere</p>
          <h2 id="visit" className="mt-3 text-3xl md:text-5xl">
            What the site visit <em>involves</em>
          </h2>
          <p className="mt-4 max-w-md leading-[1.65] text-muted">
            The same steps whether you live in {city.areas[0]} or {city.areas[city.areas.length - 1]}, for a single bedroom or a whole
            house.
          </p>
        </div>
        <ol className="rule-list flex flex-col">
          {steps(city).map((s, i) => (
            <li key={s.title} className="flex gap-5 py-6">
              <span className="font-display text-3xl text-terracotta" aria-hidden>{i + 1}</span>
              <div>
                <h3 className="text-xl">{s.title}</h3>
                <p className="mt-1 leading-[1.65] text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {city.weather.length > 0 && (
        <section className="container-page mt-24" aria-labelledby="climate">
          <p className="eyebrow">Painting in {city.name}</p>
          <h2 id="climate" className="mt-3 max-w-3xl text-3xl md:text-5xl">
            What {city.name}&apos;s weather means for your <em>walls</em>
          </h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {city.weather.map((c) => (
              <div key={c.title} className="card p-6 md:p-8">
                <Emoji name={c.emoji} size={48} />
                <h3 className="mt-3 text-2xl">{c.title}</h3>
                <p className="mt-2 leading-[1.65] text-muted">{c.text}</p>
                {c.link && (
                  <Link href={c.link.href} className="link-arrow mt-2 min-h-11 text-[15px]">
                    {c.link.label} <span aria-hidden>→</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container-page mt-24 grid gap-12 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="plan">
        <div>
          <p className="eyebrow">Before the visit</p>
          <h2 id="plan" className="mt-3 text-3xl md:text-5xl">
            Plan the job and the <em>colours</em>
          </h2>
          <p className="mt-4 max-w-md leading-[1.65] text-muted">
            Shortlist shades before the inspector comes, so the shade cards they bring are the ones you want to see.
          </p>
        </div>
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {[
            { href: "/colours", title: "Colour finder", text: "Search the shade cards of Asian Paints, Berger, Nerolac and Nippon Paint by code, name or hex." },
            { href: "/palettes", title: "Wall colour combinations", text: "A feature wall, its matching white and an accent, shown on a room." },
            { href: "/services/house-painting", title: "How we paint homes", text: "Every service, the process and what moves the price, in any city." },
            { href: "/faq", title: "Painting FAQs", text: "Booking, pricing, timelines and what happens during the job." },
          ].map((p) => (
            <li key={p.href} className="border-b border-line py-3">
              <Link href={p.href} className="inline-flex min-h-11 items-center font-semibold hover:text-terracotta">{p.title}</Link>
              <p className="text-sm leading-[1.6] text-muted">{p.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <CtaBanner heading={<>Painting a home in {city.name}? <em>Book the visit.</em></>} />
    </>
  );
}

/** A city we are preparing to open: what is coming, the waitlist form and where we paint today. Not indexed. */
function ComingSoon({ city }: { city: City }) {
  return (
    <>
    <section className="relative overflow-hidden bg-cream-wash">
      <div className="container-page relative py-12 md:py-20">
        <div className="max-w-3xl">
          <Breadcrumbs
            items={[
              { name: "Services", path: "/services" },
              { name: "House painting", path: "/services/house-painting" },
              { name: city.name, path: cityPath(city) },
            ]}
          />
          <p className="eyebrow mt-6">Coming soon</p>
          <h1 className="mt-3 text-[clamp(40px,5vw,68px)] leading-[1.04] tracking-[-0.02em]">
            House painting in <em>{city.name}</em> is coming soon
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-[1.65] text-muted">{city.intro}</p>
          <p className="mt-6 max-w-2xl leading-[1.65] text-muted">
            Today we paint in{" "}
            <Link href={cityPath(homeCity)} className="font-bold text-ink underline">{homeCity.name}</Link>. See how the work is done:{" "}
            {services.map((s, i) => (
              <span key={s.slug}>
                {i > 0 && ", "}
                <Link href={servicePath(s)} className="font-bold text-ink underline">{s.name.toLowerCase()}</Link>
              </span>
            ))}
            .
          </p>
        </div>
      </div>
    </section>
    <BookingSection
      id="waitlist"
      type="contact"
      defaultMessage={`Please call me when you start painting in ${city.name}.`}
      heading={<>Join the <em>{city.name}</em> waitlist</>}
      text={
        <p>
          We&apos;re not painting in {city.name} yet. Leave your number and we&apos;ll call you when bookings open there.
        </p>
      }
    />
    </>
  );
}
