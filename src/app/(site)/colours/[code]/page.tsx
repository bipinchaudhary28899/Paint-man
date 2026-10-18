import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { WallPreview } from "@/components/colours/WallPreview";
import { colours } from "@/config/colours";
import { site } from "@/config/site";
import { palettesUsing } from "@/lib/colours/palettes";
import { getColour, pairings, similar } from "@/lib/colours/search";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return colours.map((c) => ({ code: c.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const colour = getColour((await params).code);
  if (!colour) return { title: "Colour not found" };
  return pageMetadata({
    title: `${colour.name} (${colour.code}) Wall Paint Colour`,
    description: `${colour.name} is a ${colour.family.toLowerCase()} wall colour (${colour.hex}, LRV ${colour.lrv}) for ${colour.rooms.slice(0, 3).join(", ").toLowerCase()}. See it on a room and a house front, then book a shade-card visit in ${site.city}.`,
    path: `/colours/${colour.code}`,
  });
}

function Swatch({ code, name, hex }: { code: string; name: string; hex: string }) {
  return (
    <Link href={`/colours/${code}`} className="group flex items-center gap-3 rounded-2xl border border-line bg-paper p-2 pr-4 transition hover:-translate-y-0.5">
      <span className="h-12 w-12 shrink-0 rounded-xl border border-line" style={{ background: hex }} />
      <span>
        <span className="block font-display font-normal leading-tight">{name}</span>
        <span className="text-xs font-semibold text-muted">{code}</span>
      </span>
    </Link>
  );
}

export default async function ColourPage({ params }: { params: Promise<{ code: string }> }) {
  const colour = getColour((await params).code);
  if (!colour) notFound();

  const goesWith = pairings(colour);
  const alike = similar(colour);
  const inPalettes = palettesUsing(colour.code);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line" style={{ background: colour.hex }}>
        <div className="container-page relative py-12 md:py-16">
          <div className="inline-block rounded-2xl bg-paper/90 px-4 py-3 backdrop-blur">
            <Breadcrumbs items={[{ name: "Colours", path: "/colours" }, { name: colour.name, path: `/colours/${colour.code}` }]} />
          </div>
          <div className="mt-8 max-w-2xl rounded-[2rem] border border-line bg-paper p-6 md:p-10">
            <p className="eyebrow">{colour.family} · {colour.code}</p>
            <h1 className="mt-3 text-4xl font-normal leading-[1.05] md:text-6xl">{colour.name}</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink">{colour.note}</p>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              <div><dt className="font-bold text-muted">Hex</dt><dd className="font-semibold">{colour.hex.toUpperCase()}</dd></div>
              <div><dt className="font-bold text-muted">LRV</dt><dd className="font-semibold">{colour.lrv} ({colour.lrv >= 60 ? "light, opens a room" : colour.lrv >= 35 ? "mid, easy to live with" : "deep, feature wall"})</dd></div>
              <div><dt className="font-bold text-muted">Finish we quote</dt><dd className="font-semibold">{colour.finish}</dd></div>
              <div><dt className="font-bold text-muted">Good for</dt><dd className="font-semibold">{colour.rooms.join(", ")}</dd></div>
            </dl>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/book?colour=${colour.code}`} className="btn-primary">Book an inspection with {colour.name}</Link>
              <Link href={`/visualizer?colour=${colour.code}`} className="btn-secondary">Try it on your wall</Link>
              <Link href="/colours" className="btn-secondary">All colours</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page mt-16" aria-labelledby="scenes-heading">
        <p className="eyebrow">On the wall</p>
        <h2 id="scenes-heading" className="mt-3 text-3xl font-normal md:text-5xl">
          {colour.name} in an ordinary home
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          The same ordinary living room for every shade, with only the wall colour changed, so you compare shade against shade and
          not room against room. The inspector paints a real test patch before you commit.
        </p>
        <WallPreview colour={colour} className="mt-8 max-w-3xl" priority />
      </section>

      {goesWith.length > 0 && (
        <section className="container-page mt-20" aria-labelledby="pairs-heading">
          <p className="eyebrow">Pairs with</p>
          <h2 id="pairs-heading" className="mt-3 text-3xl font-normal">Ceiling, trim and accent</h2>
          <div className="mt-6 flex flex-wrap gap-4">
            {goesWith.map((c) => <Swatch key={c.code} {...c} />)}
          </div>
        </section>
      )}

      {alike.length > 0 && (
        <section className="container-page mt-16" aria-labelledby="similar-heading">
          <p className="eyebrow">Close by</p>
          <h2 id="similar-heading" className="mt-3 text-3xl font-normal">More {colour.family.toLowerCase()}</h2>
          <div className="mt-6 flex flex-wrap gap-4">
            {alike.map((c) => <Swatch key={c.code} {...c} />)}
          </div>
        </section>
      )}

      {inPalettes.length > 0 && (
        <section className="container-page mt-16" aria-labelledby="palettes-heading">
          <p className="eyebrow">Ready palettes</p>
          <h2 id="palettes-heading" className="mt-3 text-3xl font-normal">Palettes that use {colour.name}</h2>
          <ul className="mt-6 flex flex-wrap gap-4">
            {inPalettes.map((p) => (
              <li key={p.slug}>
                <Link href={`/palettes#${p.slug}`} className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-2 pr-4 transition hover:-translate-y-0.5">
                  <span className="flex h-12 w-16 overflow-hidden rounded-xl border border-line" aria-hidden>
                    {p.colours.map((c) => <span key={c.code} className="flex-1" style={{ background: c.hex }} />)}
                  </span>
                  <span><span className="block font-display font-normal leading-tight">{p.name}</span><span className="text-xs font-semibold text-muted">{p.rooms.join(", ")}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CtaBanner heading={`Want to see ${colour.name} on your own wall?`} />
    </>
  );
}
