import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { ColourFinderFromUrl } from "@/components/colours/ColourFinder";
import { Emoji } from "@/components/Emoji";
import { JsonLd } from "@/components/JsonLd";
import { brandList, paintdb, shadeCount, shadeFamilies } from "@/lib/colours/brands";
import { BRAND_SHADES_ROUNDED } from "@/lib/colours/catalogue";
import { site } from "@/config/site";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

// Counts in the metadata stay modest on purpose ("50,000+", three named brands): the data has
// 50,762 shades from 25 brands, and tests/backend/colours-brands.test.ts keeps the rounding true.
export const metadata = pageMetadata({
  title: `Wall Colour Finder & Shade Codes in ${site.city}`,
  description: `Search ${BRAND_SHADES_ROUNDED} paint shades from Asian Paints, Berger, Nerolac and more by code and see each on a room wall. We bring the shade card to your ${site.city} home.`,
  path: "/colours",
});

const colourFaqs = [
  {
    q: "Can I search Asian Paints, Berger or Nerolac shade codes?",
    a: `Yes. Pick the brand and type the code from its shade card, for example Asian Paints 7982 or Berger 3P0050, or search all ${brandList().length} brands at once. On the quotation we write the exact brand, range and code you approve.`,
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

// Static: the page never reads searchParams on the server, so it is prerendered and served from
// the CDN. The finder reads ?brand, ?q, ?family and ?sort in the browser after it hydrates; the
// prerendered HTML crawlers read is the finder with no filters, which links every brand's card.
export default function ColoursPage() {
  const brands = brandList();
  const finderProps = {
    brands,
    brandFamilies: shadeFamilies(),
    brandTotal: shadeCount(),
    attribution: { text: paintdb.attribution, source: paintdb.source, licenseUrl: paintdb.licenseUrl },
  };
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
                Find a wall colour in {site.city} <span className="brush">by shade code</span>, brand or name
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                {shadeCount().toLocaleString("en-IN")} shades from Asian Paints, Berger, Nerolac and {brands.length - 3} more brands, searchable by the code on the shade card. Every one is shown on the same living room so you compare shade against shade.
                Pick one and we bring the real shade card to your home in {site.city}. Want to see a shade on your own room?{" "}
                <Link href="/visualizer" className="font-bold text-ink underline">Try the visualizer</Link>. Want combinations instead?{" "}
                <Link href="/palettes" className="font-bold text-ink underline">See ready palettes</Link>.
              </p>
            </div>
            <Emoji name="artist-palette" size={120} className="hidden animate-float md:block" />
          </div>
        </div>
      </section>

      <section className="container-page mt-12" aria-labelledby="finder-heading">
        <h2 id="finder-heading" className="sr-only">Search brand shades</h2>
        <ColourFinderFromUrl {...finderProps} />
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
