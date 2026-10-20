import Image from "next/image";
import Link from "next/link";
import { CtaBanner } from "@/components/CtaBanner";
import { OutlineMarquee } from "@/components/Decor";
import { FaqList } from "@/components/FaqList";
import { AreaLinks } from "@/components/home/AreaLinks";
import { ColourExplorer } from "@/components/home/ColourExplorer";
import { HeroImage } from "@/components/home/HeroImage";
import { ParallaxChips } from "@/components/home/ParallaxChips";
import { PinnedReveal } from "@/components/home/PinnedReveal";
import { Promises } from "@/components/Promises";
import { BookingSection } from "@/components/BookingSection";
import { Tilt } from "@/components/Tilt";
import { WorkFlow } from "@/components/WorkFlow";
import { illustrations, images } from "@/config/images";
import { cityPath, generalFaqs, homeCity, promises, services, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Book House Painters Online in India | ${site.name}`,
  absoluteTitle: true,
  description: `Book painters online for one wall, a door, windows or the whole house: zero advance payment and a full estimate before work starts. Now painting in ${homeCity.name}.`,
  path: "/",
});

const promise = [
  { title: "One line-by-line quote", text: "Brand, coats, prep, inclusions, exclusions and timeline. Changes need your approval first." },
  { title: "A supervisor on site", text: "A vetted crew paints; our supervisor checks the work and sends you photos every day." },
  { title: "Your home, protected", text: "Furniture moved and covered, floors sheeted, every room cleaned before we leave." },
];

const steps = [
  { title: "Request an estimate", text: "Tell us about your home online or on the phone. It takes under a minute." },
  { title: "Inspection & measuring", text: "We measure walls, check for damp and cracks, and talk through colours and finishes." },
  { title: "Itemised quotation", text: "Brand, coats, prep, inclusions, exclusions and timeline, line by line." },
  { title: "Supervised painting", text: "A vetted crew paints while our supervisor checks quality and sends you photos." },
  { title: "Walkthrough & handover", text: "We clean up, walk every room with you and fix anything on the checklist." },
];

const serviceLook: Record<string, { label: string; chip: string; pos?: string }> = {
  "interior-painting": { label: "Interior", chip: "bg-terracotta text-on-ink" },
  "exterior-painting": { label: "Exterior", chip: "bg-sage-deep text-on-ink", pos: "center 70%" },
  "rental-property-painting": { label: "Complete home", chip: "bg-golden text-ink" },
};
const serviceImage: Record<string, (typeof images)[keyof typeof images]> = {
  "interior-painting": images.livingTeal,
  "exterior-painting": images.exteriorTerracotta,
  "rental-property-painting": images.livingWhite,
};

// Example finishes (stock photos, see images.ts). No locality or "our job" claims until real,
// consented photos of our own jobs replace them.
const finishes = [
  { image: images.exteriorBlue, kind: "Exterior · grey-blue" },
  { image: images.livingMoody, kind: "Living room · warm white", raised: true },
  { image: images.swatchSheet, kind: "Shade selection" },
  { image: images.livingTeal, kind: "Open plan · teal accent", raised: true },
];

const diagnostics = ["Moisture reading", "Crack mapping", "Old-paint adhesion", "Wall measurement"];

export default function HomePage() {
  return (
    <div className="relative overflow-x-clip">
      {/* General FAQs are marked up once site-wide, on /faq; this page only shows them. */}
      <ParallaxChips />

      {/* ---------- Hero ---------- */}
      <section id="top" className="container-page relative z-[1] flex flex-wrap items-center gap-10 pb-16 pt-8 md:pb-20 md:pt-10 min-[1080px]:items-stretch lg:gap-[72px]">
        <div className="min-w-0 flex-[1_1_500px]">
          {/* The eyebrow is part of the h1, so the heading carries the keyword and the city. Its box
              matches the old eyebrow line (24px) and the tagline keeps its 28px gap below it. */}
          <h1 className="text-[clamp(48px,5.8vw,80px)] leading-[1.02] tracking-[-0.02em]">
            <span className="eyebrow flex h-6 items-center pt-[3px] font-sans leading-[1.5]">
              Book house painters online<span className="sr-only">: </span>
            </span>
            <span className="mt-7 block">
              Your space, painted beautifully. Managed <em>completely.</em>
            </span>
          </h1>
          <p className="mt-7 max-w-[500px] text-lg leading-[1.65] text-muted">
            A single wall, a door, windows and grills, or the whole house: tell us what needs paint. We inspect, quote line by line,
            bring genuine branded paint and a supervised crew, and hand back a spotless home. Now painting in <Link href={cityPath(homeCity)} className="font-semibold text-ink underline">{homeCity.name}</Link>.
          </p>
          {/* Stacked (phones, tablets) the buttons follow the intro; side by side (from 1080px, where the
              columns sit together) they move into the empty space above the hero image. One copy is display:none. */}
          <HeroActions className="mt-10 flex min-[1080px]:hidden" />
          <dl className="mt-14 flex flex-wrap gap-10 border-t border-line pt-7">
            {[["Payment", "Zero advance"], ["Estimate", "Full, before work starts"], ["Work", "Timed and documented"]].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-[0.12em] text-muted">{k}</dt>
                <dd className="mt-1.5 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        {/* Side by side: the buttons and the brands picture share the column with even space above, between
            and below them (justify-evenly), beside the copy and
            never taller than the first screen under the header (86px) and the hero's top padding (40px),
            so both are in view on load. The picture's edges fade into the page (a CSS mask), so it sits on
            the canvas without a frame; its box keeps the picture's proportions, so nothing shifts. */}
        <div className="flex min-w-0 flex-[1_1_420px] flex-col justify-center [perspective:1600px] min-[1080px]:max-h-[calc(100svh-150px)] min-[1080px]:justify-evenly">
          <HeroActions className="hidden justify-center min-[1080px]:flex" />
          <Tilt max={6} className="relative aspect-[1790/968] w-full">
            <HeroImage
              image={illustrations.paintBrands}
              className="object-contain [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent),linear-gradient(to_bottom,transparent,#000_8%,#000_90%,transparent)]"
            />
          </Tilt>
        </div>
      </section>

      {/* ---------- Book a site visit: our booking form, first thing after the hero ---------- */}
      <BookingSection
        className="container-page relative z-[1] mt-0 mb-16 md:mb-24"
        heading={<>Book a site visit <em>online</em></>}
        text={
          <>
            <p>
              Share a few details and we call you back during working hours ({site.hoursDisplay}) to fix the visit. The inspector
              measures your walls, brings shade cards and sends an itemised quotation.
            </p>
            <p className="mt-4">{promises[0].title}, and nothing is booked until you approve the estimate.</p>
          </>
        }
      />

      {/* ---------- Word strip ---------- */}
      <div className="relative z-[1] border-y border-line-soft">
        <OutlineMarquee words={["Texture", "Shine", "Colour", "Finish"]} />
      </div>

      <div className="relative z-[1]">
        <PinnedReveal />
      </div>

      {/* ---------- Promises ---------- */}
      <div className="container-page relative z-[1] mt-16 md:mt-[120px]">
        <Promises />
      </div>

      {/* ---------- How the work gets done ---------- */}
      <WorkFlow className="container-page relative z-[1] mt-16 md:mt-[120px]" cta={{ href: "#book-visit", label: "Book a site visit" }} />

      {/* ---------- We diagnose first ---------- */}
      <section aria-label="We diagnose first" className="relative z-[1] mt-16 px-5 md:mt-[120px] md:px-8">
        <div className="relative mx-auto h-[620px] max-w-[1200px] overflow-hidden rounded-[28px] bg-sand md:h-[760px]">
          <Image src={images.painterWindow.src} alt={images.painterWindow.alt} fill sizes="(min-width: 1264px) 1200px, 100vw" className="object-cover object-[70%_center]" />
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(100deg,rgba(248,245,239,0.96)_0%,rgba(248,245,239,0.82)_38%,rgba(248,245,239,0)_68%)]" />
          <div className="relative max-w-[560px] p-6 pt-10 md:p-16 md:pt-[72px]">
            <p className="text-[22px] text-muted">We don&apos;t just paint.</p>
            <h2 className="mt-1.5 text-[clamp(44px,5.4vw,76px)] leading-none tracking-[-0.02em]">We diagnose first.</h2>
            <p className="mt-7 max-w-[420px] text-[17px] leading-[1.65] text-ink-soft">
              Before anyone opens a tin, our inspector reads the wall: moisture, hairline cracks, flaking and old paint that won&apos;t
              hold. What we find goes on your quotation as separate lines, so you pay for repairs you can see, and never for surprises.
            </p>
            <Link href="/book" className="link-arrow mt-7">
              Book a free inspection <Arrow />
            </Link>
          </div>
          <ul className="absolute inset-x-5 bottom-6 m-0 flex list-none flex-wrap gap-2.5 p-0 md:inset-x-16 md:bottom-10">
            {diagnostics.map((d) => <li key={d} className="pill">{d}</li>)}
          </ul>
        </div>
      </section>

      {/* ---------- The promise ---------- */}
      <section className="container-page relative z-[1] flex flex-wrap items-center gap-12 py-20 md:py-[140px] lg:gap-[72px]">
        <div className="frame-shadow relative h-[380px] min-w-0 flex-[1_1_380px] overflow-hidden rounded-3xl md:h-[680px]">
          <Image src={images.heroPainter.src} alt="Painter rolling a fresh coat onto a taped wall" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
        </div>
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-11">
          <div>
            <p className="eyebrow">The {site.name} way</p>
            <h2 className="mt-6 text-[clamp(36px,4vw,56px)] leading-[1.06]">
              Painting, <em>without</em> the project management.
            </h2>
            <p className="mt-5 max-w-[420px] text-[17px] leading-[1.65] text-muted">
              You deal with us, not with painters, paint shops and suppliers separately. We choose the crew and the materials from our
              network and own the result from the first visit to the final walkthrough.
            </p>
          </div>
          <ol className="rule-list flex flex-col">
            {promise.map((p, i) => (
              <li key={p.title} className="flex gap-7 py-[30px]">
                <span className="w-7 shrink-0 pt-1 font-display text-[15px] text-terracotta">0{i + 1}</span>
                <div>
                  <h3 className="font-sans text-xl font-semibold tracking-[-0.01em]">{p.title}</h3>
                  <p className="mt-2 leading-[1.6] text-muted">{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Services ---------- */}
      <section id="services" className="container-page relative z-[1] pb-24 md:pb-40" aria-labelledby="services-heading">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">What we paint</p>
            <h2 id="services-heading" className="mt-6 text-[clamp(36px,4vw,56px)] leading-[1.06]">Every wall in the house.</h2>
            <p className="mt-5 max-w-[460px] text-[17px] leading-[1.65] text-muted">
              House painting inside and out, and quick repaints of rental homes, each starting with an on-site inspection and an
              itemised quote.
            </p>
          </div>
          <Link href="/services" className="link-arrow">All services <Arrow /></Link>
        </div>
        <div className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3">
          {services.map((s) => {
            const look = serviceLook[s.slug] ?? { label: s.shortName, chip: "bg-terracotta text-on-ink" };
            const img = serviceImage[s.slug] ?? s.image;
            return (
              <Link key={s.slug} href={`/services/${s.slug}`} className="card card-hover flex flex-col overflow-hidden text-ink">
                <div className="relative h-[200px] overflow-hidden md:h-[300px]">
                  <Image src={img.src} alt={img.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" style={look.pos ? { objectPosition: look.pos } : undefined} />
                  <span className={`sticker absolute left-5 top-5 !backdrop-blur-none ${look.chip}`}>{look.label}</span>
                </div>
                <div className="p-7 pb-8">
                  <h3 className="font-sans text-[22px] font-semibold tracking-[-0.01em]">{s.name}</h3>
                  <p className="mt-2.5 leading-[1.6] text-muted">{s.intro}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------- Process (deep sage) ---------- */}
      <section id="how" className="relative z-[1] bg-sage-deep text-on-ink" aria-labelledby="process-heading">
        <div className="container-page py-[72px] md:py-[140px]">
          <div className="flex flex-wrap items-end justify-between gap-7">
            <h2 id="process-heading" className="max-w-[640px] text-[clamp(36px,4vw,56px)] leading-[1.06]">
              From enquiry to fresh walls in <em className="!text-golden">five steps.</em>
            </h2>
            <p className="max-w-[340px] leading-[1.65] text-on-sage">
              One team, one quotation and one point of contact, from the first call to the final walkthrough.
            </p>
          </div>
          <ol className="mt-12 grid gap-8 md:mt-[88px] md:grid-cols-5 md:gap-x-8 md:gap-y-12">
            {steps.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-4 border-t border-canvas/30 pt-6">
                <span className="font-display text-[15px]">0{i + 1}</span>
                <h3 className="font-sans text-[19px] font-semibold tracking-[-0.01em]">{s.title}</h3>
                <p className="text-[15px] leading-[1.6] text-on-sage">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-16 grid gap-6 md:mt-24 md:grid-cols-2">
            <figure>
              <div className="relative h-[300px] overflow-hidden rounded-[20px] md:h-[420px]">
                <Image src={images.trays.src} alt={images.trays.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover object-[center_40%]" />
              </div>
              <figcaption className="mt-3.5 text-[13px] text-on-sage">On site: the brand and finish you approved</figcaption>
            </figure>
            <figure>
              <div className="relative h-[300px] overflow-hidden rounded-[20px] md:h-[420px]">
                <Image src={images.swatchFan.src} alt={images.swatchFan.alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              </div>
              <figcaption className="mt-3.5 text-[13px] text-on-sage">Shade cards brought to your home at the inspection</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <div className="relative z-[1]">
        <ColourExplorer />
      </div>

      {/* ---------- Projects ---------- */}
      <section id="work" className="container-page relative z-[1] pb-24 md:pb-40" aria-labelledby="work-heading">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Finishes</p>
            <h2 id="work-heading" className="mt-6 text-[clamp(36px,4vw,56px)] leading-[1.06]">
              The finish we <em>work to.</em>
            </h2>
          </div>
          <p className="max-w-[340px] leading-[1.6] text-muted">Example finishes. Photos of our own {site.city} jobs are added as each one is handed over.</p>
        </div>
        <div className="mt-14 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {finishes.map((p) => (
            <figure key={p.kind} className={p.raised ? "lg:mt-10" : ""}>
              <div className="relative h-[220px] overflow-hidden rounded-[18px] md:h-[360px]">
                <Image src={p.image.src} alt={p.image.alt} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
              </div>
              <figcaption className="mt-3 text-[13px] text-muted-2">{p.kind}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------- Areas ---------- */}
      <section className="container-page relative z-[1] pb-24 md:pb-40" aria-labelledby="areas-heading">
        <div className="flex flex-wrap items-start gap-12 border-t border-line pt-14">
          <div className="flex-[1_1_300px]">
            <h2 id="areas-heading" className="text-[34px] leading-[1.1]">Painting homes across {site.city}</h2>
            <p className="mt-3 max-w-[360px] leading-[1.6] text-muted">
              Need painters in {site.city} outside these localities? Ask. We&apos;ll tell you honestly if we can supervise your job.
            </p>
          </div>
          <AreaLinks areas={site.areas} />
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="container-page relative z-[1] flex flex-wrap gap-12 pb-24 md:pb-40 lg:gap-[72px]" aria-labelledby="faq-heading">
        <div className="flex-[1_1_320px]">
          <h2 id="faq-heading" className="text-[clamp(36px,4vw,52px)] leading-[1.06]">
            Good <em>questions.</em>
          </h2>
          <p className="mt-4 max-w-[320px] leading-[1.6] text-muted">Anything else? Our inspector answers it on the site visit.</p>
        </div>
        <div className="flex-[2_1_560px]">
          <FaqList faqs={generalFaqs} openFirst />
        </div>
      </section>

      <div className="relative z-[1]">
        <CtaBanner />
      </div>
    </div>
  );
}

function HeroActions({ className }: { className: string }) {
  return (
    <div className={`flex-wrap items-center gap-4 ${className}`}>
      <a href="#book-visit" className="btn-primary btn-lg">Book a site visit</a>
      <Link href="/colours" className="btn-secondary btn-lg">Explore colours</Link>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
