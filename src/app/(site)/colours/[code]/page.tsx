import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { WallPreview } from "@/components/colours/WallPreview";
import { colours } from "@/config/colours";
import { services } from "@/config/site";
import { nearestBrandShades, paintdb } from "@/lib/colours/brands";
import { finishSummary, hasShadeCardCode, lrvLabel, matchLabel, serviceSlugsFor, shadeGuide, undertone, undertoneFacts } from "@/lib/colours/guide";
import { paletteRole, palettesUsing } from "@/lib/colours/palettes";
import { getColour, pairings, similar } from "@/lib/colours/search";
import { colourDescription, colourTitle, isIndexableShade } from "@/lib/colours/seo";
import { pageMetadata } from "@/lib/seo";

/** The brands our customers ask for by code, nearest shades first. */
const MATCH_BRANDS = ["asian-paints", "berger", "nerolac"];

export function generateStaticParams() {
  return colours.map((c) => ({ code: c.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const colour = getColour((await params).code);
  if (!colour) return { title: "Colour not found" };
  return pageMetadata({
    title: colourTitle(colour),
    description: colourDescription(colour),
    path: `/colours/${colour.code}`,
    // the 32 curated shades are indexed; the generated ladder stays reachable but noindex, follow
    noindex: !isIndexableShade(colour.code),
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
  const { code } = await params;
  const colour = getColour(code);
  if (!colour) notFound();
  // One URL per shade. src/proxy.ts sends case variants (/colours/pm-502) to /colours/PM-502 with a
  // 308 before the route cache sees them; this catches the short forms the proxy leaves alone
  // (/colours/502, /colours/pm502), whose cache keys cannot collide with the canonical page.
  if (code !== colour.code) permanentRedirect(`/colours/${colour.code}`);

  const goesWith = pairings(colour);
  const alike = similar(colour);
  const inPalettes = palettesUsing(colour.code);
  const brandMatches = nearestBrandShades(colour.hex, MATCH_BRANDS, 2);
  const guide = shadeGuide(colour, brandMatches);
  const tone = undertone(colour);
  const serviceLinks = serviceSlugsFor(colour).flatMap((slug) => services.filter((s) => s.slug === slug));

  return (
    <>
      <section className="relative overflow-hidden border-b border-line" style={{ background: colour.hex }}>
        <div className="container-page relative py-12 md:py-16">
          <div className="inline-block rounded-2xl bg-paper/90 px-4 py-3 backdrop-blur">
            <Breadcrumbs items={[{ name: "Colours", path: "/colours" }, { name: colour.name, path: `/colours/${colour.code}` }]} />
          </div>
          <div className="mt-8 max-w-2xl rounded-[2rem] border border-line bg-paper p-6 md:p-10">
            <p className="eyebrow">{colour.family} · Paint Man shade</p>
            <h1 className="mt-3 text-4xl font-normal leading-[1.05] md:text-6xl">
              {colour.name}{" "}
              <span className="mt-2 block text-xl leading-snug text-muted md:text-3xl">({colour.code}) wall paint <em>colour</em></span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink">{colour.note}</p>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              <div><dt className="font-bold text-muted">Hex</dt><dd className="font-semibold">{colour.hex.toUpperCase()}</dd></div>
              <div><dt className="font-bold text-muted">LRV</dt><dd className="font-semibold">{colour.lrv} ({lrvLabel(colour)})</dd></div>
              <div><dt className="font-bold text-muted">Finish we quote</dt><dd className="font-semibold">{finishSummary(colour)}</dd></div>
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
          {colour.name} in an ordinary <em>home</em>
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          {colour.name} on the same ordinary living room we show for every shade, with only the wall colour changed, so you compare
          shade against shade. The inspector paints a real test patch before you commit.
        </p>
        {/* below the fold: lazy-loaded, no preload */}
        <WallPreview colour={colour} className="mt-8 max-w-3xl" sizes="(min-width: 768px) 560px, 100vw" />
      </section>

      <section className="container-page mt-20" aria-labelledby="about-heading">
        <p className="eyebrow">The colour</p>
        <h2 id="about-heading" className="mt-3 text-3xl font-normal md:text-5xl">
          What colour {colour.name} <em>is</em>
        </h2>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
          <div className="max-w-2xl">
            {guide.facts.map((para) => (
              <p key={para} className="mt-4 leading-relaxed text-muted first:mt-0">{para}</p>
            ))}
          </div>
          <dl className="grid h-fit grid-cols-3 gap-4 rounded-3xl border border-line bg-paper p-5 text-sm lg:grid-cols-1">
            {undertoneFacts(tone).map((f) => (
              <div key={f.label}><dt className="font-bold text-muted">{f.label}</dt><dd className="font-semibold">{f.value}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <div className="container-page mt-20 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <section aria-labelledby="lrv-heading">
          <p className="eyebrow">Light and depth</p>
          <h2 id="lrv-heading" className="mt-3 text-3xl font-normal">How light {colour.name} <em>reads</em></h2>
          <p className="mt-4 max-w-xl text-sm text-muted">LRV (light reflectance value) runs from 0 for black to 100 for pure white.</p>
          {guide.light.map((para) => (
            <p key={para} className="mt-4 max-w-xl leading-relaxed text-muted">{para}</p>
          ))}
        </section>

        <section aria-labelledby="rooms-heading">
          <p className="eyebrow">Rooms</p>
          <h2 id="rooms-heading" className="mt-3 text-3xl font-normal">Where {colour.name} <em>works</em></h2>
          <p className="mt-4 leading-relaxed text-muted">{guide.roomsLead}</p>
          <ul className="mt-6 space-y-3">
            {guide.rooms.map(({ room, why }) => (
              <li key={room} className="rounded-2xl border border-line bg-paper p-4">
                <p className="font-bold">{room}</p>
                <p className="mt-1 leading-relaxed text-muted">{why}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 leading-relaxed text-muted">{guide.finish}</p>
          {serviceLinks.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              Related:{" "}
              {serviceLinks.map((s, i) => (
                <span key={s.slug}>
                  {i > 0 && " · "}
                  <Link href={`/services/${s.slug}`} className="font-semibold text-ink underline underline-offset-2">{s.title}</Link>
                </span>
              ))}
            </p>
          )}
        </section>
      </div>

      {brandMatches.length > 0 && (
        <section className="container-page mt-20" aria-labelledby="brands-heading">
          <p className="eyebrow">Brand shade cards</p>
          <h2 id="brands-heading" className="mt-3 text-3xl font-normal md:text-5xl">Closest brand <em>shades</em></h2>
          <p className="mt-3 max-w-2xl text-muted">
            {guide.brands} Treat them as a starting point: the inspector brings the brand&apos;s physical shade card so you confirm the
            match in your own light before anything is quoted.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {brandMatches.map((m) => (
              <div key={m.brand} className="rounded-3xl border border-line bg-paper p-5">
                <h3 className="text-xl font-normal">{m.brandName}</h3>
                <ul className="mt-4 space-y-3">
                  {m.shades.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/colours?catalogue=brands&brand=${m.brand}&q=${encodeURIComponent(s.code)}`}
                        prefetch={false}
                        className="flex items-center gap-3 rounded-2xl border border-line p-2 pr-4 transition hover:-translate-y-0.5"
                      >
                        <span aria-hidden className="h-12 w-12 shrink-0 rounded-xl border border-line" style={{ background: s.hex }} />
                        <span className="min-w-0">
                          <span className="block truncate font-display leading-tight">{s.name}</span>
                          {/* PaintDB fills a missing code with the name's slug ("greenery"): show only real shade-card codes */}
                          <span className="block text-xs font-semibold text-muted">{hasShadeCardCode(s) ? `${s.code} · ` : ""}{s.hex.toUpperCase()}</span>
                          <span className="block text-xs text-muted">{matchLabel(s.distance)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-xs leading-relaxed text-muted">
            Brand shades: <a href={paintdb.source} className="underline" rel="noopener" target="_blank">PaintDB</a>, licensed{" "}
            <a href={paintdb.licenseUrl} className="underline" rel="noopener license" target="_blank">CC BY 4.0</a>. On-screen colours approximate each
            brand&apos;s published shade. Paint Man isn&apos;t affiliated with these brands.
          </p>
        </section>
      )}

      {goesWith.length > 0 && (
        <section className="container-page mt-20" aria-labelledby="pairs-heading">
          <p className="eyebrow">Pairs with</p>
          <h2 id="pairs-heading" className="mt-3 text-3xl font-normal">Ceiling, trim and <em>accent</em></h2>
          <div className="mt-6 flex flex-wrap gap-4">
            {goesWith.map((c) => <Swatch key={c.code} {...c} />)}
          </div>
        </section>
      )}

      {alike.length > 0 && (
        <section className="container-page mt-16" aria-labelledby="similar-heading">
          <p className="eyebrow">Close by</p>
          <h2 id="similar-heading" className="mt-3 text-3xl font-normal">More <em>{colour.family.toLowerCase()}</em></h2>
          <div className="mt-6 flex flex-wrap gap-4">
            {alike.map((c) => <Swatch key={c.code} {...c} />)}
          </div>
        </section>
      )}

      {inPalettes.length > 0 && (
        <section className="container-page mt-16" aria-labelledby="palettes-heading">
          <p className="eyebrow">Ready palettes</p>
          <h2 id="palettes-heading" className="mt-3 text-3xl font-normal"><em>Palettes</em> that use {colour.name}</h2>
          <ul className="mt-6 flex flex-wrap gap-4">
            {inPalettes.map((p) => (
              <li key={p.slug}>
                <Link href={`/palettes#${p.slug}`} className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-2 pr-4 transition hover:-translate-y-0.5">
                  <span className="flex h-12 w-16 overflow-hidden rounded-xl border border-line" aria-hidden>
                    {p.colours.map((c) => <span key={c.code} className="flex-1" style={{ background: c.hex }} />)}
                  </span>
                  <span>
                    <span className="block font-display font-normal leading-tight">{p.name}</span>
                    <span className="block text-xs font-semibold text-muted">{colour.name} is {paletteRole(p, colour.code)} · {p.rooms.join(", ")}</span>
                  </span>
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
