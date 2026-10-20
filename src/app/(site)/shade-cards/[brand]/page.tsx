import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { BookingSection } from "@/components/BookingSection";
import { PaintDbCredit, ShadeSwatches } from "@/components/colours/ShadeSwatches";
import { paintdb } from "@/lib/colours/brands";
import { cardMeta, shadeCard, shadeCardPath, shadeCards, toSwatch } from "@/lib/colours/shade-cards";
import { pageMetadata } from "@/lib/seo";

// One brand's shade card (/shade-cards/asian-paints): every colour family light to dark, a spread of
// swatches from each with the code printed on the paper card, and a link to the family's full page.
// The copy is built from the data, so the counts and LRV ranges stay true after a PaintDB refresh.

type Params = { params: Promise<{ brand: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return shadeCards().map((c) => ({ brand: c.slug }));
}

export async function generateMetadata({ params }: Params) {
  const card = shadeCard((await params).brand);
  if (!card) return {};
  return pageMetadata({ ...cardMeta(card), path: shadeCardPath(card.slug) });
}

export default async function ShadeCardPage({ params }: Params) {
  const card = shadeCard((await params).brand);
  if (!card) notFound();
  const others = shadeCards().filter((c) => c.slug !== card.slug);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-cream-wash">
        <div className="container-page relative py-12 md:py-16">
          <div className="max-w-4xl">
            <Breadcrumbs
              items={[
                { name: "Colours", path: "/colours" },
                { name: "Shade cards", path: "/shade-cards" },
                { name: card.name, path: shadeCardPath(card.slug) },
              ]}
            />
            <h1 className="mt-5 text-[clamp(40px,5vw,68px)] leading-[1.04] tracking-[-0.02em]">
              {card.name} shade card with <em>colour codes</em>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-[1.65] text-muted">
              {card.count.toLocaleString("en-IN")} shades from the {card.name} shade card, in the order of the paper card:{" "}
              {card.families.length} colour families from white to black, each from light to dark. Every swatch carries the code to
              quote to a painter or a paint shop. Tap one to see it on a room wall in the colour finder.
            </p>
            <p className="mt-4 max-w-2xl leading-[1.65] text-muted">
              LRV (light reflectance value) runs from {card.lrv.min} to {card.lrv.max} on this card: the higher the number, the more
              light the wall gives back. A high LRV keeps a small or north-facing room bright; a low one suits a feature wall.
            </p>
            <nav aria-label={`${card.shortName} colour families`} className="mt-8 flex flex-wrap gap-2">
              {card.families.map((f) => (
                <a key={f.family} href={`#${f.family}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-paper px-4 text-sm font-semibold transition hover:bg-sand">
                  <span aria-hidden className="h-3 w-3 rounded-full border border-line" style={{ backgroundColor: f.sample[Math.floor(f.sample.length / 2)].hex }} />
                  {f.label} <span className="font-normal text-muted">{f.count}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {card.families.map((f) => (
        <section key={f.family} className="container-page mt-16 md:mt-20" aria-labelledby={f.family}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id={f.family} className="scroll-mt-28 text-3xl md:text-4xl">
                {card.shortName} <em>{f.family}</em> shades
              </h2>
              <p className="mt-2 max-w-2xl leading-[1.6] text-muted">
                {f.count} on the card, LRV {f.lrv.max} to {f.lrv.min}, mostly {f.undertones.join(" or ")} undertones.
                {f.hasPage ? ` ${f.sample.length} of them, lightest to darkest:` : ""}
              </p>
            </div>
            {f.hasPage && (
              <Link href={shadeCardPath(card.slug, f.family)} className="link-arrow min-h-11 text-[15px]">
                All {f.count} {f.family} shades <span aria-hidden>→</span>
              </Link>
            )}
          </div>
          <div className="mt-6">
            <ShadeSwatches shades={f.sample.map(toSwatch)} label={`${card.shortName} ${f.family} shades`} />
          </div>
        </section>
      ))}

      <section className="container-page mt-24 grid gap-10 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="other-cards">
        <div>
          <p className="eyebrow">Compare brands</p>
          <h2 id="other-cards" className="mt-3 text-3xl md:text-5xl">
            Other <em>shade cards</em>
          </h2>
        </div>
        <div>
          <ul className="grid gap-x-8 sm:grid-cols-2">
            {others.map((c) => (
              <li key={c.slug} className="border-b border-line py-3">
                <Link href={shadeCardPath(c.slug)} className="inline-flex min-h-11 items-center font-semibold hover:text-terracotta">
                  {c.name} shade card
                </Link>
                <p className="text-sm text-muted">{c.count.toLocaleString("en-IN")} shades</p>
              </li>
            ))}
            <li className="border-b border-line py-3">
              <Link href="/colours" className="inline-flex min-h-11 items-center font-semibold hover:text-terracotta">Colour finder</Link>
              <p className="text-sm text-muted">Search every card at once by code, name or hex</p>
            </li>
          </ul>
          <div className="mt-6">
            <PaintDbCredit source={paintdb.source} licenseUrl={paintdb.licenseUrl} note={paintdb.note} />
          </div>
        </div>
      </section>

      <BookingSection
        className="container-page mt-24"
        heading={<>See the real {card.shortName} card <em>at home</em></>}
        text={<p>Add the codes you like under “Add more details”. The inspector brings the {card.name} shade card to your site visit, so you see each shade in your own light. Zero advance payment.</p>}
      />

      <CtaBanner heading={<>Picked a few {card.shortName} codes? <em>Book the visit.</em></>} />
    </>
  );
}
