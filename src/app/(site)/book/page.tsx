import Link from "next/link";
import { BookPrefill } from "@/components/BookPrefill";
import { Emoji } from "@/components/Emoji";
import { PhotoCrop } from "@/components/PhotoCrop";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Blob } from "@/components/Decor";
import { images } from "@/config/images";
import { FaqList } from "@/components/FaqList";
import { Promises } from "@/components/Promises";
import { JsonLd } from "@/components/JsonLd";
import { bookingFaqs, bookingSteps, services, site } from "@/config/site";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Book Painters Online in ${site.city}: Free Estimate`,
  description: `Book house painters online in ${site.city} in about a minute. We call back to fix a site visit, measure your walls and send an itemised quote before any work.`,
  path: "/book",
});

const next = [
  { text: "We call you to confirm your requirements and inspection time.", tint: "bg-sunshine", emoji: "telephone-receiver" as const },
  { text: "Our inspector visits, measures the walls and checks their condition.", tint: "bg-pink", emoji: "magnifying-glass-tilted-left" as const },
  { text: "You receive an itemised quotation. Nothing is booked until you approve it.", tint: "bg-cobalt", emoji: "receipt" as const },
];

// Static page: ?service=, ?palette= and ?shade= are read in the browser by BookPrefill.
// The prerendered HTML is the plain booking form, which hydrates in place (no Suspense bailout).
// Service page slug -> the form's service choice; only this small map reaches the browser.
const serviceBySlug = Object.fromEntries(services.map((s) => [s.slug, s.leadService]));

export default function BookPage() {
  return (
    <div className="relative overflow-hidden">
      <Blob className="absolute -left-40 top-20 h-[28rem] w-[28rem] opacity-50" color="var(--pm-sand)" />
      <div className="container-page relative py-10 md:py-14">
        <JsonLd data={faqJsonLd(bookingFaqs)} />
        <Breadcrumbs items={[{ name: "Book painters online", path: "/book" }]} />
        <div className="mt-6 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h1 className="text-4xl font-normal leading-[1.05] md:text-6xl">
              Book painters online in <span className="text-gradient">{site.city}</span>
            </h1>
            <p className="mt-4 text-lg text-muted">
              Share a few details and book a free site inspection. We&apos;ll call you back to confirm a convenient time for the visit.
            </p>
            <div className="card mt-10 p-6 md:p-8">
              <BookPrefill serviceBySlug={serviceBySlug} />
            </div>
          </div>
          <aside className="space-y-6">
            <div className="relative mx-auto hidden w-full max-w-sm lg:block">
              <PhotoCrop image={images.swatchFan} shape="splat" backdrop="#f49bc7" sizes="380px" className="aspect-square w-full" />
              <Emoji name="artist-palette" size={80} className="absolute -left-4 bottom-4 animate-float [--r:-8deg]" />
            </div>
            <div className="card bg-cream-wash p-7">
              <h2 className="text-2xl font-normal">What happens next</h2>
              <ol className="mt-5 space-y-4">
                {next.map((n, i) => (
                  <li key={n.text} className="flex gap-4">
                    <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line ${n.tint}`}>
                      <Emoji name={n.emoji} size={30} />
                      <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink font-display text-[10px] font-normal text-on-ink">{i + 1}</span>
                    </span>
                    <span className="pt-1 leading-relaxed">{n.text}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-[1.75rem] border border-dashed border-line-strong p-6 text-sm">
              <p className="flex items-center gap-2 font-display text-lg font-bold"><Emoji name="mobile-phone" size={28} /> Prefer to talk?</p>
              {site.phone ? (
                <p className="mt-2 text-muted">Call <a className="font-bold text-tangerine-text" href={`tel:${site.phone}`}>{site.phoneDisplay || site.phone}</a>, {site.hoursDisplay.toLowerCase()}.</p>
              ) : (
                <p className="mt-2 text-muted">Leave your number in the form and we&apos;ll call you back, {site.hoursDisplay.toLowerCase()}.</p>
              )}
            </div>
          </aside>
        </div>

        <Promises className="mt-20 md:mt-24" />

        <section className="mt-20 md:mt-24" aria-labelledby="how-booking-works">
          <h2 id="how-booking-works" className="text-3xl font-normal md:text-5xl">
            How booking painters online <em>works</em>
          </h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bookingSteps.map((s, i) => (
              <li key={s.title} className="card p-6">
                <span className="font-display text-sm text-terracotta">0{i + 1}</span>
                <h3 className="mt-2 text-xl font-normal">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.6fr]" aria-labelledby="booking-faq">
          <div>
            <p className="eyebrow">Before you book</p>
            <h2 id="booking-faq" className="mt-3 text-3xl font-normal md:text-5xl">
              Booking <em>questions</em>
            </h2>
            <p className="mt-4 text-muted">
              More answers on the <Link href="/faq" className="font-bold text-ink underline">painting FAQ</Link>, or see the{" "}
              <Link href="/services/house-painting/agra#localities" className="font-bold text-ink underline">areas we serve in {site.city}</Link>.
            </p>
          </div>
          <FaqList faqs={bookingFaqs} />
        </section>
      </div>
    </div>
  );
}
