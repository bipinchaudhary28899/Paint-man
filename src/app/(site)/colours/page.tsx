import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { ColourFinder } from "@/components/colours/ColourFinder";
import { Emoji } from "@/components/Emoji";
import { JsonLd } from "@/components/JsonLd";
import { colours } from "@/config/colours";
import { site } from "@/config/site";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Wall Colour Finder: Paint Shades with Codes for Homes in ${site.city}`,
  description: `Search ${colours.length} wall paint colours by name, code or mood and see every shade on the same plain room wall. Book a free shade-card visit in ${site.city}.`,
  path: "/colours",
});

const colourFaqs = [
  {
    q: "Are these the same codes as Asian Paints or Berger?",
    a: "No. PM codes are Paint Man's own catalogue so you and our inspector talk about the same shade. On the quotation we map your pick to the exact brand and range you approve, with its code.",
  },
  {
    q: "Will the wall look like the screen?",
    a: "Close, not identical. Daylight, tube lights and the finish (matt or sheen) all shift a shade. That is why the inspector brings physical shade cards and paints a test patch on your wall first.",
  },
  {
    q: "How do I choose a colour for a small room?",
    a: "Look at the LRV number on each shade. Above 60 reflects light and makes a small room feel bigger; below 35 is best for one feature wall with white around it.",
  },
];

export default async function ColoursPage({ searchParams }: { searchParams: Promise<{ q?: string; family?: string; room?: string }> }) {
  const { q, family, room } = await searchParams;
  return (
    <>
      <JsonLd data={faqJsonLd(colourFaqs)} />
      <section className="relative overflow-hidden border-b border-line bg-sky-wash">
        <div className="glow -right-24 -top-24 h-80 w-80 bg-pink opacity-60" />
        <div className="glow -bottom-32 left-1/4 h-72 w-72 bg-sunshine opacity-50" />
        <div className="container-page relative py-12 md:py-16">
          <Breadcrumbs items={[{ name: "Colours", path: "/colours" }]} />
          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-normal leading-[1.05] md:text-6xl">
                Find a wall colour <span className="brush">by code</span>, name or mood
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                {colours.length} shades from pale whites to deep feature-wall colours, every one shown on the same plain living room so you compare shade against shade.
                Pick one and we bring the real shade card to your home in {site.city}. Want to see a shade on your own room?{" "}
                <Link href="/visualizer" className="font-bold text-cobalt-text underline">Try the visualizer</Link>. Want combinations instead?{" "}
                <Link href="/palettes" className="font-bold text-cobalt-text underline">See ready palettes</Link>.
              </p>
            </div>
            <Emoji name="artist-palette" size={120} className="hidden animate-float md:block" />
          </div>
        </div>
      </section>

      <section className="container-page mt-12" aria-labelledby="finder-heading">
        <h2 id="finder-heading" className="sr-only">Search shades</h2>
        <ColourFinder initialQuery={q} initialFamily={family} initialRoom={room} />
      </section>

      <section className="container-page mt-24 grid gap-10 lg:grid-cols-[1fr_1.6fr]" aria-labelledby="colour-faq-heading">
        <div>
          <p className="eyebrow">Before you pick</p>
          <h2 id="colour-faq-heading" className="mt-3 text-3xl font-normal md:text-5xl">Colour questions</h2>
        </div>
        <div className="space-y-3">
          {colourFaqs.map((f) => (
            <details key={f.q} className="group rounded-3xl border border-line bg-paper p-5 open:bg-cream-wash md:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <h3 className="text-lg font-bold">{f.q}</h3>
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xl text-on-ink transition group-open:rotate-45 group-open:bg-tangerine group-open:text-on-tangerine">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <CtaBanner heading={`Found a shade? See it on your own wall in ${site.city}.`} />
    </>
  );
}
