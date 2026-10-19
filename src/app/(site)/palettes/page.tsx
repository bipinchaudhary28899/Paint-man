import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { WallPreview } from "@/components/colours/WallPreview";
import { Emoji } from "@/components/Emoji";
import { site } from "@/config/site";
import { resolvePalettes } from "@/lib/colours/palettes";
import { pageMetadata } from "@/lib/seo";

const all = resolvePalettes();

export const metadata = pageMetadata({
  title: `Wall Colour Combinations for Homes in ${site.city}`,
  description: `${all.length} wall colour combinations for homes in ${site.city}: a feature-wall shade, its matching white and an accent. We bring the shade cards to your home.`,
  path: "/palettes",
});

const roles = ["Feature wall", "Other walls & ceiling", "Accent"] as const;

export default function PalettesPage() {
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
                Wall colour combinations that <span className="brush">already work</span>
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                Ready-made colour combinations, three shades per room: the feature wall, the white around it and one accent.
                Each is set out the way our inspector proposes colours on a site visit in {site.city}, and we bring all three
                shade cards to your home. Not sure yet? <Link href="/colours" className="font-bold text-cobalt-text underline">Search single shades</Link>{" "}
                or <Link href="/visualizer" className="font-bold text-cobalt-text underline">try a shade on your own room</Link>.
              </p>
            </div>
            <Emoji name="rainbow" size={120} className="hidden animate-float md:block" />
          </div>
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
          return (
            <article key={p.slug} id={p.slug} className="reveal card scroll-mt-28 overflow-hidden" aria-labelledby={`${p.slug}-title`}>
              <div className="grid lg:grid-cols-[1.1fr_1fr]">
                <div className={`p-5 md:p-10 ${i % 2 ? "lg:order-2" : ""}`}>
                  <p className="eyebrow">{p.rooms.join(" · ")}</p>
                  <h2 id={`${p.slug}-title`} className="mt-2 text-[28px] font-normal md:mt-3 md:text-5xl">{p.name}</h2>
                  <p className="mt-1 font-hand text-xl text-cobalt-text md:mt-2 md:text-2xl">{p.mood}</p>
                  <p className="mt-3 text-base leading-relaxed text-ink md:mt-4 md:text-lg">{p.description}</p>

                  {/* phones: the three shades as one compact strip; wider: cards */}
                  <ul className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 md:mt-6" aria-label="Shades in this palette">
                    {p.colours.map((c, j) => (
                      <li key={c.code}>
                        <Link href={`/colours/${c.code}`} className="group block rounded-xl border border-line bg-paper transition hover:-translate-y-0.5 sm:rounded-2xl">
                          <span className="block h-10 rounded-t-[0.7rem] border-b border-line sm:h-16 sm:rounded-t-[0.9rem]" style={{ background: c.hex }} />
                          <span className="block p-2 sm:p-3">
                            <span className="block truncate text-[9px] font-bold uppercase tracking-wider text-muted sm:text-[11px]">{roles[j]}</span>
                            <span className="block truncate font-display text-[13px] font-normal leading-tight sm:text-base">{c.name}</span>
                            <span className="text-[10px] font-semibold text-muted sm:text-xs">{c.code}<span className="hidden sm:inline"> · {c.hex.toUpperCase()}</span></span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-5 flex gap-3 rounded-2xl bg-cream-wash p-3 text-[13px] leading-relaxed md:mt-6 md:p-4 md:text-sm">
                    <Emoji name="light-bulb" size={24} className="shrink-0 self-start" />
                    <span><strong>Inspector&apos;s tip:</strong> {p.tip}</span>
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3 md:mt-8">
                    <Link href={`/book?palette=${p.slug}`} className="btn-primary w-full sm:w-auto">Book an inspection with this palette</Link>
                  </div>
                </div>
                {/* phones: the room preview comes first, so the palette is seen before it is read */}
                <div className={`-order-1 border-b border-line bg-chalk p-3 lg:order-none lg:border-b-0 ${i % 2 ? "lg:border-r-2" : "lg:border-l-2"} md:p-8`}>
                  <WallPreview colour={p.colours[0]} desktopCrop maxHeight="min(70vh, 620px)" sizes="(min-width: 1024px) 520px, 100vw" />
                  <div className="mt-3 flex h-6 overflow-hidden rounded-full border border-line md:mt-4 md:h-10" aria-hidden>
                    <span className="flex-[3]" style={{ background: p.colours[0].hex }} />
                    <span className="flex-[2]" style={{ background: p.colours[1].hex }} />
                    <span className="flex-1" style={{ background: p.colours[2].hex }} />
                  </div>
                  <p className="mt-2 hidden text-xs text-muted md:block">Roughly the proportion on site: 60% feature, 30% white, 10% accent.</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <CtaBanner heading={`Like a palette? We bring the three shade cards to your home in ${site.city}.`} />
    </>
  );
}
