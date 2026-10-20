import Image from "next/image";
import { illustrations } from "@/config/images";
import Link from "next/link";
import { ColourTools } from "@/components/ColourTools";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { WallPreview } from "@/components/colours/WallPreview";
import { palettes, shadeDisplayName, type PaletteShade } from "@/config/palettes";
import { site } from "@/config/site";
import { getBrandShade, hasShadeCardCode, matchLabel, nearestBrandShades, paintdb } from "@/lib/colours/brands";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Wall Colour Combinations for Homes in ${site.city}`,
  description: `${palettes.length} wall colour combinations for ${site.city} homes, each three Asian Paints shade codes: a feature wall, its white and an accent. We bring the shade cards to you.`,
  path: "/palettes",
});

const roles = ["Feature wall", "Other walls & ceiling", "Accent"] as const;
/** The other brands our customers ask for by code, matched to each palette shade on screen. */
const MATCH_BRANDS = ["berger", "nerolac"];

/** The colour finder searching one shade. */
const finderHref = (s: Pick<PaletteShade, "brand" | "code">) => `/colours?${new URLSearchParams({ brand: s.brand, q: s.code })}`;

/** A palette shade with its LRV from the catalogue and its closest Berger and Nerolac shades. */
function resolve(s: PaletteShade) {
  const matches = nearestBrandShades(s.hex, MATCH_BRANDS, 1).flatMap((m) => m.shades.slice(0, 1));
  return { ...s, lrv: getBrandShade(s.id)?.lrv, matches };
}

export default function PalettesPage() {
  const all = palettes.map((p) => ({ ...p, resolved: p.shades.map(resolve) }));
  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-cream-wash">
        <div className="glow -right-24 -top-24 h-80 w-80 bg-cobalt opacity-30" />
        <div className="glow -bottom-32 left-1/4 h-72 w-72 bg-pink opacity-50" />
        <div className="container-page relative py-12 md:py-16">
          <Breadcrumbs items={[{ name: "Palettes", path: "/palettes" }]} />
          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-normal leading-[1.05] md:text-6xl">
                Wall colour combinations for {site.city} homes that <span className="brush">already work</span>
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                Ready-made colour combinations, three shades per room: the feature wall, the white around it and one accent. Each
                shade is an Asian Paints shade-card code, shown with the closest Berger and Nerolac shades. They are set out the way
                our inspector proposes colours on a site visit in {site.city}, and we bring all three shade cards to your home. Not
                sure yet? <Link href="/colours" className="font-bold text-cobalt-text underline">Search single shades</Link> and see
                each one on the same room.
              </p>
            </div>
            <Image
              src={illustrations.toolbox.src}
              alt={illustrations.toolbox.alt}
              width={illustrations.toolbox.width}
              height={illustrations.toolbox.height}
              sizes="240px"
              className="hidden h-auto w-60 md:block"
            />
          </div>
          <ColourTools current="palettes" className="mt-8 md:mt-10" />
          <nav aria-label="Jump to a palette" className="mt-8 flex flex-wrap gap-2">
            {all.map((p) => (
              <a key={p.slug} href={`#${p.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-sm font-bold transition hover:bg-sunshine">
                {p.name}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="container-page mt-8 space-y-8 md:mt-16 md:space-y-14">
        {all.map((p, i) => {
          const [feature] = p.resolved;
          return (
            <article key={p.slug} id={p.slug} className="reveal card scroll-mt-28 overflow-hidden" aria-labelledby={`${p.slug}-title`}>
              <div className="grid lg:grid-cols-[1.1fr_1fr]">
                <div className={`p-5 md:p-10 ${i % 2 ? "lg:order-2" : ""}`}>
                  <p className="eyebrow">{p.rooms.join(" · ")}</p>
                  <h2 id={`${p.slug}-title`} className="mt-2 text-[28px] font-normal md:mt-3 md:text-5xl">{p.name}</h2>
                  <p className="mt-1 font-hand text-xl text-cobalt-text md:mt-2 md:text-2xl">{p.mood}</p>
                  <p className="mt-3 text-base leading-relaxed text-ink md:mt-4 md:text-lg">{p.description}</p>

                  <ul className="mt-5 space-y-3 md:mt-6" aria-label={`Shades in ${p.name}`}>
                    {p.resolved.map((s, j) => (
                      <li key={s.id} className="flex gap-3 rounded-2xl border border-line bg-paper p-3 sm:gap-4 sm:p-4">
                        <span aria-hidden className="h-14 w-14 shrink-0 rounded-xl border border-line sm:h-16 sm:w-16" style={{ background: s.hex }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{roles[j]}</p>
                          <h3 className="mt-0.5 font-display text-lg font-normal leading-tight">
                            {shadeDisplayName(s.name)} <span className="font-sans text-sm font-semibold text-muted">{s.brandName} {s.code}</span>
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-muted">
                            {s.hex.toUpperCase()}{s.lrv !== undefined && ` · LRV ${s.lrv}`} · {s.finish}
                          </p>
                          {s.matches.length > 0 && (
                            <p className="mt-1 text-xs leading-relaxed text-muted">
                              Closest on screen:{" "}
                              {s.matches.map((m, k) => (
                                <span key={m.id}>
                                  {k > 0 && "; "}
                                  {hasShadeCardCode(m) ? (
                                    <Link href={finderHref(m)} prefetch={false} className="underline decoration-line-strong underline-offset-2 hover:text-terracotta">
                                      {m.brandName} {m.name} {m.code}
                                    </Link>
                                  ) : (
                                    `${m.brandName} ${m.name}`
                                  )}{" "}
                                  ({matchLabel(m.distance).toLowerCase()})
                                </span>
                              ))}
                            </p>
                          )}
                          <p className="mt-1 flex flex-wrap gap-x-4 text-sm font-semibold">
                            <Link href={finderHref(s)} prefetch={false} className="inline-flex min-h-11 items-center underline decoration-terracotta underline-offset-4 hover:text-terracotta">
                              See {s.brandName} {s.code} in the finder
                            </Link>
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-5 rounded-2xl bg-cream-wash p-3 text-[13px] leading-relaxed md:mt-6 md:p-4 md:text-sm">
                    <strong>Inspector&apos;s tip:</strong> {p.tip}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3 md:mt-8">
                    <Link href={`/book?palette=${p.slug}`} className="btn-primary w-full sm:w-auto">Book an inspection with this palette</Link>
                  </div>
                </div>
                {/* phones: the room preview comes first, so the palette is seen before it is read */}
                <div className={`-order-1 border-b border-line bg-chalk p-3 lg:order-none lg:border-b-0 ${i % 2 ? "lg:border-r-2" : "lg:border-l-2"} md:p-8`}>
                  <WallPreview
                    colour={{ name: shadeDisplayName(feature.name), code: `${feature.brandName} ${feature.code}`, hex: feature.hex, lrv: feature.lrv }}
                    desktopCrop
                    maxHeight="min(70vh, 620px)"
                    sizes="(min-width: 1024px) 520px, 100vw"
                  />
                  <div className="mt-3 flex h-6 overflow-hidden rounded-full border border-line md:mt-4 md:h-10" aria-hidden>
                    <span className="flex-[3]" style={{ background: p.shades[0].hex }} />
                    <span className="flex-[2]" style={{ background: p.shades[1].hex }} />
                    <span className="flex-1" style={{ background: p.shades[2].hex }} />
                  </div>
                  <p className="mt-2 hidden text-xs text-muted md:block">Roughly the proportion on site: 60% feature, 30% white, 10% accent.</p>
                </div>
              </div>
            </article>
          );
        })}
        <p className="max-w-3xl text-xs leading-relaxed text-muted">
          Brand shades: <a href={paintdb.source} className="underline" rel="noopener" target="_blank">PaintDB</a>, licensed{" "}
          <a href={paintdb.licenseUrl} className="underline" rel="noopener license" target="_blank">CC BY 4.0</a>. On-screen colours approximate each
          brand&apos;s published shade, and the closest Berger and Nerolac shades are screen matches to confirm on the card. {site.name}
          isn&apos;t affiliated with these brands.
        </p>
      </div>

      <CtaBanner heading={`Like a palette? We bring the three shade cards to your home in ${site.city}.`} />
    </>
  );
}
