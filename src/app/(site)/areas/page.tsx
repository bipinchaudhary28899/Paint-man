import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { Emoji, type EmojiName } from "@/components/Emoji";
import { services, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

// One hub for the localities in site.areas, not a page per locality: each gets an anchored
// section here, and the shared process and Agra-specific advice are written once. Per-locality
// pages should wait until there is real local content for them (jobs, photos) from the owner.

export const metadata = pageMetadata({
  title: `Painters in ${site.city}: Areas We Serve`,
  description: `House painters in ${site.areas.length} localities of ${site.city}, one process in each: an on-site inspection, an itemised quotation and a supervised crew. Book a slot online.`,
  path: "/areas",
});

/** "Kamla Nagar" → "kamla-nagar": the anchor of each locality's section. */
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const steps = [
  {
    title: "Book a slot",
    text: `Fill in the booking form with your locality and a preferred date. We call you back during working hours (${site.hoursDisplay}) to confirm the visit.`,
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
    text: "The crew works to the approved quotation. Any change in scope is priced and approved first, and the job closes with a quality check and a walkthrough with you.",
  },
];

const climate: { title: string; emoji: EmojiName; text: string; link?: { href: string; label: string } }[] = [
  {
    title: "Summer heat and dust",
    emoji: "sun",
    text:
      "Summers in Agra are long, hot and dusty. Walls are cleaned before primer goes on, and a washable finish is worth it in living rooms, kitchens and kids' rooms, where dust and hand marks get wiped off often. Very dark exterior shades take in more heat and fade faster in strong sun.",
    link: { href: "/colours", label: "Find light, washable shades" },
  },
  {
    title: "Monsoon damp",
    emoji: "cloud-with-rain",
    text:
      "Paint applied over a damp wall blisters and peels. The inspector checks for seepage from the roof, bathrooms and plumbing; the cause should be fixed and the wall dried and primed before any finish coat. Repairs found at the inspection are listed separately in your quotation.",
  },
  {
    title: "Exterior walls",
    emoji: "house-with-garden",
    text:
      "Outer walls need cracks filled, an exterior primer and weather-resistant finish coats. Dry months, roughly October to March, are the best time; exterior paint is not applied in heavy rain because moisture affects adhesion and finish.",
    link: { href: "/services/exterior-painting", label: `Exterior painting in ${site.city}` },
  },
];

const plan = [
  { href: "/colours", title: "Colour finder", text: "Search shades by code, name or mood, including brand shade-card codes." },
  { href: "/palettes", title: "Wall colour combinations", text: "A feature wall, its matching white and an accent, shown on a room." },
  { href: "/visualizer", title: "Wall colour visualizer", text: "Try a shade on a photo of your own room. The photo stays on your device." },
];

export default function AreasPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-cream-wash">
        <div className="container-page relative py-12 md:py-16">
          <Breadcrumbs items={[{ name: "Areas we serve", path: "/areas" }]} />
          <div className="mt-5 max-w-3xl">
            <h1 className="text-[clamp(40px,5vw,68px)] leading-[1.04] tracking-[-0.02em]">
              House painters in <em>{site.city}</em>: the areas we serve
            </h1>
            <p className="mt-5 text-lg leading-[1.65] text-muted">
              We paint homes in the {site.areas.length} localities below, a list kept short so a supervisor can reach every site.
              Each one gets the same process: an on-site inspection, an itemised quotation and a supervised crew. Not on the list?{" "}
              <Link href="/book" className="font-bold text-tangerine-text underline">Book anyway</Link> and we&apos;ll tell you honestly
              whether we can take the job.
            </p>
          </div>
          <nav aria-label="Jump to a locality" className="mt-8 flex flex-wrap gap-2">
            {site.areas.map((a) => (
              <a key={a} href={`#${slug(a)}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-sm font-semibold transition hover:bg-sand">
                {a}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="container-page mt-16 md:mt-24" aria-labelledby="localities">
        <p className="eyebrow">Localities</p>
        <h2 id="localities" className="mt-3 text-3xl md:text-5xl">
          Where we <em>paint</em> in {site.city}
        </h2>
        <div className="mt-8 grid border-t border-line sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
          {site.areas.map((a) => (
            <section key={a} id={slug(a)} aria-labelledby={`${slug(a)}-name`} className="scroll-mt-28 border-b border-line pb-3 pt-5">
              <h3 id={`${slug(a)}-name`} className="text-2xl">{a}</h3>
              <p className="mt-1 text-[15px] leading-[1.6] text-muted">
                An on-site inspection, an itemised quotation and the same supervised crew as anywhere else in {site.city}.
              </p>
              <Link href="/book" className="link-arrow min-h-11 text-[15px]">
                Book a slot <span className="sr-only">in {a}</span> <span aria-hidden>→</span>
              </Link>
            </section>
          ))}
        </div>
      </section>

      <section className="container-page mt-24 grid gap-12 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="visit">
        <div>
          <p className="eyebrow">One process everywhere</p>
          <h2 id="visit" className="mt-3 text-3xl md:text-5xl">
            What the inspection visit <em>involves</em>
          </h2>
          <p className="mt-4 max-w-md leading-[1.65] text-muted">
            The same steps whether you live in {site.areas[0]} or {site.areas[site.areas.length - 1]}, for a single bedroom or a
            whole house.
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

      <section className="container-page mt-24" aria-labelledby="climate">
        <p className="eyebrow">Painting in {site.city}</p>
        <h2 id="climate" className="mt-3 max-w-3xl text-3xl md:text-5xl">
          What {site.city}&apos;s weather means for your <em>walls</em>
        </h2>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {climate.map((c) => (
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
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="text-xl">Colours</h3>
            <ul className="mt-2">
              {plan.map((p) => (
                <li key={p.href} className="border-b border-line py-3">
                  <Link href={p.href} className="inline-flex min-h-11 items-center font-semibold hover:text-terracotta">{p.title}</Link>
                  <p className="text-sm leading-[1.6] text-muted">{p.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xl">Services</h3>
            <ul className="mt-2">
              {services.map((s) => (
                <li key={s.slug} className="border-b border-line py-3">
                  <Link href={`/services/${s.slug}`} className="inline-flex min-h-11 items-center font-semibold hover:text-terracotta">
                    {s.name} in {site.city}
                  </Link>
                  <p className="text-sm leading-[1.6] text-muted">{s.suitableFor.slice(0, 3).join(" · ")}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CtaBanner heading={<>Painting a home in {site.city}? <em>Book the visit.</em></>} />
    </>
  );
}
