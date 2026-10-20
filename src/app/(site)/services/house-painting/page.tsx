import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { Promises } from "@/components/Promises";
import { QuickVisitForm } from "@/components/QuickVisitForm";
import { bookingSteps, cities, cityPath, liveCities, servicePath, services, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

// The national house-painting hub (/services/house-painting): what the service is anywhere, every
// service hub, how booking works and the cities, live and coming. Each city's own page is
// /services/house-painting/<city>; that is where local search lands.

export const metadata = pageMetadata({
  title: "House Painting Services in India",
  description: `Managed house painting in India: book a site visit online, get an itemised quote and a supervised crew. Painting in ${liveCities().map((c) => c.name).join(", ")} now, more cities next.`,
  path: "/services/house-painting",
});

export default function HousePaintingHubPage() {
  const live = liveCities();
  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-cream-wash">
        <div className="container-page relative grid gap-10 py-12 md:py-16 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <div>
            <Breadcrumbs items={[{ name: "Services", path: "/services" }, { name: "House painting", path: "/services/house-painting" }]} />
            <h1 className="mt-5 text-[clamp(40px,5vw,68px)] leading-[1.04] tracking-[-0.02em]">
              House painting services, <em>managed</em>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-[1.65] text-muted">
              {site.name} paints homes, rented flats and small shops without you managing painters: an on-site inspection, a
              line-by-line quotation, branded paint and a supervised crew until the final walkthrough. We paint in{" "}
              {live.map((c, i) => (
                <span key={c.slug}>
                  {i > 0 && ", "}
                  <Link href={cityPath(c)} className="font-bold text-ink underline">{c.name}</Link>
                </span>
              ))}{" "}
              today, with {cities.filter((c) => c.status === "soon").map((c) => c.name).join(" and ")} next.
            </p>
          </div>
          <div className="card p-6 md:p-7">
            <QuickVisitForm />
          </div>
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24" aria-labelledby="hub-services">
        <p className="eyebrow">Services</p>
        <h2 id="hub-services" className="mt-3 text-3xl md:text-5xl">
          What we <em>paint</em>
        </h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {services.map((s) => (
            <li key={s.slug} className="card flex flex-col p-6">
              <h3 className="text-2xl">
                <Link href={servicePath(s)} className="hover:text-terracotta">{s.title}</Link>
              </h3>
              <p className="mt-2 flex-1 leading-[1.6] text-muted">{s.intro}</p>
              <p className="mt-3 text-sm text-muted">{s.suitableFor.slice(0, 3).join(" · ")}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="container-page mt-24">
        <Promises />
      </div>

      <section className="container-page mt-24 grid gap-12 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="hub-booking">
        <div>
          <p className="eyebrow">Book online</p>
          <h2 id="hub-booking" className="mt-3 text-3xl md:text-5xl">
            How booking <em>works</em>
          </h2>
          <p className="mt-4 max-w-md leading-[1.65] text-muted">
            The same four steps in every city. <Link href="/book" className="font-bold text-ink underline">Book painters online</Link> or
            use the form above.
          </p>
        </div>
        <ol className="rule-list flex flex-col">
          {bookingSteps.map((s, i) => (
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

      <section className="container-page mt-24" aria-labelledby="hub-cities">
        <p className="eyebrow">Cities</p>
        <h2 id="hub-cities" className="mt-3 text-3xl md:text-5xl">
          House painting by <em>city</em>
        </h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((c) => (
            <li key={c.slug} className="card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{c.region}</p>
              <h3 className="mt-1 text-2xl">
                <Link href={cityPath(c)} className="hover:text-terracotta">House painting in {c.name}</Link>
              </h3>
              <p className="mt-2 text-sm text-muted">
                {c.status === "live" ? `${c.areas.length} localities served. Book a site visit online.` : "Coming soon: join the waitlist."}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <CtaBanner heading={<>Ready to repaint? <em>Book a site visit.</em></>} />
    </>
  );
}
