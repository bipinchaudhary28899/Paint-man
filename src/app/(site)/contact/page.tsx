import Link from "next/link";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { cityPath, liveCities, liveCityNames, servicePath, services, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Contact Our House Painters in ${site.city}`,
  description: `Contact ${site.name}'s house painters in ${site.city}. We call you back during working hours, then send an inspector and an itemised quotation in writing.`,
  path: "/contact",
});

const steps = [
  { title: "We call you back", text: `During working hours (${site.hoursDisplay}), to understand the job and fix a time for the site visit.` },
  { title: "An inspector visits", text: "They measure the walls, check for damp, cracks and peeling paint, and bring shade cards to your home." },
  { title: "You get an itemised quotation", text: "Scope, materials, inclusions, exclusions and the payment schedule in writing. Nothing is booked until you approve it." },
];

export default function ContactPage() {
  // Phone, WhatsApp, email and street address appear only once they are filled in src/config/site.ts.
  const rows = [
    site.phone && { label: "Phone", tint: "bg-sunshine", node: <a href={`tel:${site.phone}`} className="hover:text-tangerine">{site.phoneDisplay || site.phone}</a> },
    site.whatsapp && { label: "WhatsApp", tint: "bg-sky-wash", node: <a href={`https://wa.me/${site.whatsapp}`} rel="noopener" className="hover:text-tangerine">Chat on WhatsApp</a> },
    site.email && { label: "Email", tint: "bg-rose-wash", node: <a href={`mailto:${site.email}`} className="hover:text-tangerine">{site.email}</a> },
    site.address.street && {
      label: "Address",
      tint: "bg-peach-wash",
     
      node: (
        <address className="not-italic">
          {site.address.street}, {site.city}, {site.region} {site.address.postalCode}
        </address>
      ),
    },
    {
      label: "Service area",
      tint: "bg-cream-wash",
     
      // A 44px tall tap target on a 28px line: the 8px negative margins above and below keep the row's height.
      node: (
        <Link href="/services/house-painting/agra#localities" className="-my-2 inline-flex min-h-11 items-center hover:text-tangerine">
          {site.city}, {site.region}
        </Link>
      ),
    },
    { label: "Hours", tint: "bg-cream-wash", node: site.hoursDisplay },
  ].filter(Boolean) as { label: string; tint: string; node: React.ReactNode }[];

  return (
    <>
      <PageHero
        crumbs={[{ name: "Contact", path: "/contact" }]}
        title={<>Contact our house painters in <span className="text-gradient">{site.city}</span></>}
        intro={`Questions about painting your home in ${site.city}? Send a message or book an inspection, and we call you back during working hours, ${site.hoursDisplay}.`}
        tint="bg-rose-wash"
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/book" className="btn-primary">Book an inspection</Link>
          {site.phone ? (
            <a href={`tel:${site.phone}`} className="btn-secondary">Call {site.phoneDisplay || site.phone}</a>
          ) : site.whatsapp ? (
            <a href={`https://wa.me/${site.whatsapp}`} rel="noopener" className="btn-secondary">Chat on WhatsApp</a>
          ) : (
            <a href="#send-message" className="btn-secondary">Ask for a call back</a>
          )}
        </div>
      </PageHero>

      <div className="container-page mt-14 grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <dl className="space-y-4 lg:self-start">
          {rows.map((r) => (
            <div key={r.label} className={`reveal flex items-center gap-4 rounded-3xl border border-line p-5 ${r.tint}`}>
              <div>
                <dt className="text-xs font-bold uppercase tracking-widest text-ink/60">{r.label}</dt>
                <dd className="mt-1 font-display text-xl font-bold">{r.node}</dd>
              </div>
            </div>
          ))}
        </dl>
        {/* Not id="message": that is LeadForm's textarea, whose label a duplicate id would break. */}
        <div id="send-message" className="card scroll-mt-28 p-6 md:p-8">
          <h2 className="text-2xl font-normal">Send us a message</h2>
          <p className="mt-1 text-sm text-muted">
            Leave your mobile number and we call you back. Want a quote?{" "}
            <Link href="/book" className="font-bold text-tangerine-text underline">Book an inspection</Link> instead.
          </p>
          <div className="mt-6"><LeadForm type="contact" /></div>
        </div>
      </div>

      <section className="container-page mt-24 grid gap-12 lg:grid-cols-[1fr_1.3fr]" aria-labelledby="after-contact">
        <div>
          <p className="eyebrow">After you get in touch</p>
          <h2 id="after-contact" className="mt-3 text-3xl md:text-5xl">
            From first call to an itemised <em>quote</em>
          </h2>
          <p className="mt-4 max-w-md leading-[1.65] text-muted">
            The same steps for a single bedroom or a whole house, anywhere we work in {liveCityNames()}.
          </p>
        </div>
        <ol className="rule-list flex flex-col">
          {steps.map((s, i) => (
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

      <section className="container-page mt-24 grid gap-10 md:grid-cols-2" aria-label={`Where we work and what we paint in ${liveCityNames()}`}>
        <div className="card p-7 md:p-9">
          <h2 className="text-2xl md:text-3xl">Localities we cover</h2>
          {liveCities().map((c) => (
            <div key={c.slug} className="mt-4">
              <h3 className="font-sans text-sm font-semibold">{c.name}</h3>
              <p className="mt-1 leading-[1.65] text-muted">{c.areas.join(" · ")}</p>
              <Link href={`${cityPath(c)}#localities`} className="link-arrow min-h-11">Areas we serve in {c.name} <span aria-hidden>→</span></Link>
            </div>
          ))}
          <p className="mt-3 text-sm text-muted">Not on the list? Ask anyway. We&apos;ll tell you honestly whether we can supervise your job.</p>
        </div>
        <div className="card p-7 md:p-9">
          <h2 className="text-2xl md:text-3xl">What we paint</h2>
          <ul className="mt-3">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={servicePath(s)} className="link-arrow min-h-11">{s.name} <span aria-hidden>→</span></Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
