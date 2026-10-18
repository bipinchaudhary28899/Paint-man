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
  title: `Wall Colour Palettes for Indian Homes: Bedroom, Living Room, Exterior`,
  description: `${all.length} ready colour palettes for homes in ${site.city}: a feature-wall shade, the white that goes with it and an accent, each shown on an ordinary room. Pick one and book a shade-card visit.`,
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
                Colour palettes that <span className="brush">already work</span>
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                Three shades per room: the feature wall, the white around it and one accent. These are the combinations our
                inspectors propose most on site visits in {site.city}. Not sure yet? <Link href="/colours" className="font-bold text-cobalt-text underline">Search single shades</Link>.
              </p>
            </div>
            <Emoji name="rainbow" size={120} className="hidden animate-float md:block" />
          </div>
          <nav aria-label="Jump to a palette" className="mt-8 flex flex-wrap gap-2">
            {all.map((p) => (
              <a key={p.slug} href={`#${p.slug}`} className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm font-bold transition hover:bg-sunshine">
                {p.name}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="container-page mt-16 space-y-14">
        {all.map((p, i) => {
          return (
            <article key={p.slug} id={p.slug} className="reveal card scroll-mt-28 overflow-hidden" aria-labelledby={`${p.slug}-title`}>
              <div className="grid lg:grid-cols-[1.1fr_1fr]">
                <div className={`p-6 md:p-10 ${i % 2 ? "lg:order-2" : ""}`}>
                  <p className="eyebrow">{p.rooms.join(" · ")}</p>
                  <h2 id={`${p.slug}-title`} className="mt-3 text-3xl font-normal md:text-5xl">{p.name}</h2>
                  <p className="mt-2 font-hand text-2xl text-cobalt-text">{p.mood}</p>
                  <p className="mt-4 text-lg leading-relaxed text-ink">{p.description}</p>

                  <ul className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Shades in this palette">
                    {p.colours.map((c, j) => (
                      <li key={c.code}>
                        <Link href={`/colours/${c.code}`} className="group block rounded-2xl border border-line bg-paper transition hover:-translate-y-0.5">
                          <span className="block h-16 rounded-t-[0.9rem] border-b border-line" style={{ background: c.hex }} />
                          <span className="block p-3">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">{roles[j]}</span>
                            <span className="block font-display font-normal leading-tight">{c.name}</span>
                            <span className="text-xs font-semibold text-muted">{c.code} · {c.hex.toUpperCase()}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 flex gap-3 rounded-2xl bg-cream-wash p-4 text-sm leading-relaxed">
                    <Emoji name="light-bulb" size={28} className="shrink-0 self-start" />
                    <span><strong>Inspector&apos;s tip:</strong> {p.tip}</span>
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href={`/book?palette=${p.slug}`} className="btn-primary">Book an inspection with this palette</Link>
                  </div>
                </div>
                <div className={`border-t border-line bg-chalk p-6 lg:border-t-0 ${i % 2 ? "lg:border-r-2" : "lg:border-l-2"} md:p-8`}>
                  <WallPreview colour={p.colours[0]} sizes="(min-width: 1024px) 520px, 100vw" />
                  <div className="mt-4 flex h-10 overflow-hidden rounded-full border border-line" aria-hidden>
                    <span className="flex-[3]" style={{ background: p.colours[0].hex }} />
                    <span className="flex-[2]" style={{ background: p.colours[1].hex }} />
                    <span className="flex-1" style={{ background: p.colours[2].hex }} />
                  </div>
                  <p className="mt-2 text-xs text-muted">Roughly the proportion on site: 60% feature, 30% white, 10% accent.</p>
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
