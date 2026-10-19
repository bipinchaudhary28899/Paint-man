import Link from "next/link";
import { getPalette, paletteBrands, shadeDisplayName, type Palette, type PaletteShade } from "@/config/palettes";
import { jobSize, site, type Service } from "@/config/site";
import { PAINTDB } from "@/lib/colours/catalogue";

// The long-form body of a service page: how the job runs, the paint system, what moves the
// price, timing, aftercare and matching shades. All copy lives in src/config/site.ts so the
// integrity tests can check it; this file only lays it out as real h2/h3 sections.

const sqft = (n: number) => `${n.toLocaleString("en-IN")} sq ft`;
const linkClass = "underline decoration-terracotta decoration-2 underline-offset-4 hover:text-terracotta";

/** "Interior Wall Painting Services in Agra" with the city as the heading's one italic accent. */
export function accentCity(title: string): React.ReactNode {
  const suffix = ` in ${site.city}`;
  if (!title.endsWith(suffix)) return title;
  return (
    <>
      {title.slice(0, -site.city.length)}
      <em>{site.city}</em>
    </>
  );
}

/** Rough crew sizing from the booking form's rule of thumb, for a full repaint of one floor. */
export function JobSizeTable({ examples }: { examples: { home: string; carpetArea: number }[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-paper">
      <table className="w-full text-left text-sm">
        <caption className="caption-bottom border-t border-line px-4 py-3 text-left text-xs text-muted">
          Rule of thumb for a full repaint (putty, primer and two coats) of one floor. The crew grows with the home, so the job length
          stays about the same. The inspector measures exactly on site.
        </caption>
        <thead className="bg-cream-wash">
          <tr>
            <th scope="col" className="px-3 py-3 font-bold sm:px-4">Home</th>
            <th scope="col" className="px-3 py-3 font-bold sm:px-4">Walls and ceilings</th>
            <th scope="col" className="px-3 py-3 font-bold sm:px-4">Typical crew</th>
          </tr>
        </thead>
        <tbody>
          {examples.map((e) => {
            const j = jobSize(e.carpetArea);
            return (
              <tr key={e.home} className="border-t border-line align-top">
                <th scope="row" className="px-3 py-3 font-bold sm:px-4">
                  {e.home}
                  <span className="block font-normal text-muted">{sqft(j.carpetArea)} carpet</span>
                </th>
                <td className="px-3 py-3 sm:px-4">
                  about {sqft(j.paintArea)}
                  <span className="block whitespace-nowrap text-muted">{j.painterDays} painter-days</span>
                </td>
                <td className="px-3 py-3 sm:px-4">
                  {j.painters} painters
                  <span className="block text-muted">for {j.duration}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The colour finder searching one brand shade by its shade-card code. */
export const finderSearchHref = (s: Pick<PaletteShade, "brand" | "code">) => `/colours?${new URLSearchParams({ brand: s.brand, q: s.code })}`;

/** Palettes that suit the service, linked to /palettes, with each shade linked to its search in the colour finder. */
export function ServiceShades({ service }: { service: Service }) {
  const palettes = service.shades.palettes.map(getPalette).filter((p): p is Palette => p !== undefined);
  return (
    <section className="mt-14">
      <h2 className="text-3xl font-normal">
        Shades that <em>suit</em>
      </h2>
      <p className="mt-4 leading-relaxed text-muted">{service.shades.intro}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {palettes.map((p) => (
          <li key={p.slug} className="rounded-2xl border border-line bg-paper p-5">
            <h3 className="text-xl">
              <Link href={`/palettes#${p.slug}`} className="inline-flex min-h-11 items-center hover:text-terracotta">
                {p.name}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-muted">
              {p.mood} · {paletteBrands(p).join(" and ")} shades
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {p.shades.map((s) => (
                <li key={s.id}>
                  <Link
                    href={finderSearchHref(s)}
                    prefetch={false}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold transition hover:border-ink"
                  >
                    <span aria-hidden className="h-5 w-5 shrink-0 rounded-full border border-line" style={{ backgroundColor: s.hex }} />
                    {shadeDisplayName(s.name)} <span className="font-normal text-muted">{s.code}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Brand shades: <a href={PAINTDB.source} className="underline" rel="noopener" target="_blank">PaintDB</a>, licensed{" "}
        <a href={PAINTDB.licenseUrl} className="underline" rel="noopener license" target="_blank">CC BY 4.0</a>. On-screen colours approximate each
        brand&apos;s published shade.
      </p>
      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-sm font-bold">
        <li>
          <Link href="/colours" className={`inline-flex min-h-11 items-center ${linkClass}`}>
            Browse every wall colour shade
          </Link>
        </li>
        <li>
          <Link href="/palettes" className={`inline-flex min-h-11 items-center ${linkClass}`}>
            All colour combinations
          </Link>
        </li>
        <li>
          <Link href="/visualizer" className={`inline-flex min-h-11 items-center ${linkClass}`}>
            Try a shade on a photo of your room
          </Link>
        </li>
      </ul>
    </section>
  );
}

/** Process, paint system, cost factors, timing, aftercare and shades for one service. */
export function ServiceDetails({ service }: { service: Service }) {
  const lower = service.name.toLowerCase();
  const [firstTimeline, ...restTimeline] = service.timeline;
  return (
    <>
      <section className="mt-14">
        <h2 className="text-3xl font-normal">
          How {lower} runs, step by <em>step</em>
        </h2>
        <ol className="rule-list mt-6">
          {service.process.map((p, i) => (
            <li key={p.step} className="flex gap-5 py-5">
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand font-display text-lg">
                {i + 1}
              </span>
              <div>
                <h3 className="text-xl">{p.step}</h3>
                <p className="mt-1 leading-relaxed text-muted">{p.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-normal">
          Surface preparation and the paint <em>system</em>
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {service.paintSystem.map((p) => (
            <div key={p.title} className="rounded-2xl border border-line bg-paper p-5">
              <h3 className="text-xl">{p.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-normal">
          What affects the <em>cost</em>
        </h2>
        <p className="mt-4 leading-relaxed text-muted">
          The inspector measures and checks your walls, and the quotation lists each of these as its own line, so you can see what moves the price before you approve it.
        </p>
        <dl className="rule-list mt-6">
          {service.costFactors.map((c) => (
            <div key={c.title} className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
              <dt className="font-bold">{c.title}</dt>
              <dd className="leading-relaxed text-muted">{c.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted">
          More on pricing and timing in our{" "}
          <Link href="/faq" className={`font-semibold ${linkClass}`}>
            house painting FAQs
          </Link>
          .
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-normal">
          How long it <em>takes</em>
        </h2>
        <p className="mt-4 leading-relaxed text-muted">{firstTimeline}</p>
        {service.sizeExamples && <JobSizeTable examples={service.sizeExamples} />}
        {restTimeline.map((t) => (
          <p key={t} className="mt-4 leading-relaxed text-muted">
            {t}
          </p>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-normal">
          Aftercare and <em>cleanup</em>
        </h2>
        <ul className="mt-6 space-y-3">
          {service.aftercare.map((a) => (
            <li key={a} className="flex gap-3 leading-relaxed">
              <span aria-hidden className="text-success">
                ✓
              </span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </section>

      <ServiceShades service={service} />
    </>
  );
}
