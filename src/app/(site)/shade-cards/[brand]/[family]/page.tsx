import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { BookingSection } from "@/components/BookingSection";
import { PaintDbCredit, ShadeSwatches } from "@/components/colours/ShadeSwatches";
import { paintdb } from "@/lib/colours/brands";
import { familyMeta, familyShades, shadeCardFamily, shadeCardPath, shadeCards, toSwatch } from "@/lib/colours/shade-cards";
import { pageMetadata } from "@/lib/seo";

// One colour family of a brand's shade card (/shade-cards/asian-paints/blue): every shade in it,
// light to dark, with the code printed on the paper card. Families too small for a page of their
// own (black has two or three shades) are shown in full on the brand page instead.

type Params = { params: Promise<{ brand: string; family: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return shadeCards().flatMap((c) => c.families.filter((f) => f.hasPage).map((f) => ({ brand: c.slug, family: f.family })));
}

export async function generateMetadata({ params }: Params) {
  const { brand, family } = await params;
  const found = shadeCardFamily(brand, family);
  if (!found) return {};
  return pageMetadata({ ...familyMeta(found.card, found.family), path: shadeCardPath(brand, family) });
}

export default async function ShadeCardFamilyPage({ params }: Params) {
  const { brand, family } = await params;
  const found = shadeCardFamily(brand, family);
  if (!found) notFound();
  const { card, family: f } = found;
  const shades = familyShades(card.slug, f.family).map(toSwatch);
  const sameFamily = shadeCards().filter((c) => c.slug !== card.slug && c.families.some((x) => x.family === f.family && x.hasPage));

  return (
    <>
      <section className="border-b border-line bg-cream-wash">
        <div className="container-page py-12 md:py-16">
          <div className="max-w-4xl">
            <Breadcrumbs
              items={[
                { name: "Colours", path: "/colours" },
                { name: "Shade cards", path: "/shade-cards" },
                { name: card.name, path: shadeCardPath(card.slug) },
                { name: f.label, path: shadeCardPath(card.slug, f.family) },
              ]}
            />
            <h1 className="mt-5 text-[clamp(40px,5vw,68px)] leading-[1.04] tracking-[-0.02em]">
              {card.shortName} <em>{f.family}</em> shades with colour codes
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-[1.65] text-muted">
              All {f.count} {f.family} shades on the {card.name} card, from light to dark. LRV runs from {f.lrv.max} ({f.lightest.name})
              down to {f.lrv.min} ({f.darkest.name}); most have a {f.undertones.join(" or ")} undertone. Each swatch shows the code to
              quote to a painter or a paint shop. Tap one to see it on a room wall.
            </p>
            <nav aria-label={`Other ${card.shortName} colour families`} className="mt-8 flex flex-wrap gap-2">
              {card.families.map((x) =>
                x.family === f.family ? (
                  <span key={x.family} aria-current="page" className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-on-ink">
                    {x.label}
                  </span>
                ) : (
                  <Link
                    key={x.family}
                    href={x.hasPage ? shadeCardPath(card.slug, x.family) : `${shadeCardPath(card.slug)}#${x.family}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-sm font-semibold transition hover:bg-sand"
                  >
                    {x.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
        </div>
      </section>

      <section className="container-page mt-12" aria-labelledby="all-shades">
        <h2 id="all-shades" className="text-3xl md:text-4xl">
          {f.count} {card.shortName} <em>{f.family}</em> shades, light to dark
        </h2>
        <div className="mt-6">
          <ShadeSwatches shades={shades} label={`${card.shortName} ${f.family} shades`} />
        </div>
      </section>

      <section className="container-page mt-24 grid gap-10 lg:grid-cols-[1fr_1.4fr]" aria-labelledby="compare">
        <div>
          <p className="eyebrow">Compare brands</p>
          <h2 id="compare" className="mt-3 text-3xl md:text-5xl">
            {f.label} shades from <em>other brands</em>
          </h2>
        </div>
        <div>
          <ul className="grid gap-x-8 sm:grid-cols-2">
            {sameFamily.map((c) => (
              <li key={c.slug} className="border-b border-line py-3">
                <Link href={shadeCardPath(c.slug, f.family)} className="inline-flex min-h-11 items-center font-semibold hover:text-terracotta">
                  {c.shortName} {f.family} shades
                </Link>
                <p className="text-sm text-muted">{c.families.find((x) => x.family === f.family)!.count} on the {c.name} card</p>
              </li>
            ))}
            <li className="border-b border-line py-3">
              <Link href={shadeCardPath(card.slug)} className="inline-flex min-h-11 items-center font-semibold hover:text-terracotta">
                The whole {card.name} card
              </Link>
              <p className="text-sm text-muted">{card.count.toLocaleString("en-IN")} shades in {card.families.length} families</p>
            </li>
          </ul>
          <div className="mt-6">
            <PaintDbCredit source={paintdb.source} licenseUrl={paintdb.licenseUrl} note={paintdb.note} />
          </div>
        </div>
      </section>

      <BookingSection
        className="container-page mt-24"
        heading={<>See {card.shortName} {f.family}s <em>on your wall</em></>}
        text={<p>Note the codes you like in the form. The inspector brings the {card.name} shade card to your site visit, so you see each shade in your own light. Zero advance payment.</p>}
        defaultMessage={`Please bring the ${card.name} shade card (${f.family} shades). Codes I like: `}
      />

      <CtaBanner heading={<>Narrowed it down? <em>See it on your wall.</em></>} />
    </>
  );
}
