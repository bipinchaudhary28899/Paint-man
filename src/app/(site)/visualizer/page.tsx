import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { JsonLd } from "@/components/JsonLd";
import { Visualizer } from "@/components/visualizer/Visualizer";
import { site } from "@/config/site";
import { getColour } from "@/lib/colours/search";
import { getBrandShade } from "@/lib/colours/brands";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Wall Colour Visualizer: See Paint Shades on Your Own Room Photo`,
  description: `Upload a photo of your room and see any wall colour on your walls only, with furniture, windows and light untouched. Runs in your browser; then book a shade-card visit in ${site.city}.`,
  path: "/visualizer",
});

const faqs = [
  { q: "Is my photo uploaded anywhere?", a: "No. The wall detection and the recolouring both run inside your browser. The photo never leaves your device, and nothing is stored." },
  { q: "What if it paints a cupboard or misses a wall?", a: "Tap a surface on the photo to include or exclude it; Reset returns to what the detector found. If a wall is missed entirely, try a photo taken straight-on in daylight with the whole wall in frame." },
  { q: "Will the wall look exactly like this?", a: "It is a close guide. Daylight, tube lights and the finish (matt or sheen) all shift a shade, so the inspector brings physical shade cards and paints a test patch before you decide." },
];

export default async function VisualizerPage({ searchParams }: { searchParams: Promise<{ colour?: string; model?: string; shade?: string }> }) {
  const { colour: code, model, shade: shadeId } = await searchParams;
  const ours = code ? getColour(code) : undefined;
  const brandShade = !ours && shadeId ? getBrandShade(shadeId) : undefined;
  const start = ours
    ? { name: ours.name, hex: ours.hex, code: ours.code }
    : brandShade
      ? { name: brandShade.name, hex: brandShade.hex, code: `${brandShade.brandName} ${brandShade.code}`, bookQuery: `shade=${encodeURIComponent(brandShade.id)}` }
      : undefined;
  const modelId = model === "b1" || model === "b2" ? model : "b0";
  return (
    <>
      <JsonLd data={faqJsonLd(faqs)} />
      <section className="border-b border-line-soft">
        <div className="container-page py-12 md:py-16">
          <Breadcrumbs items={[{ name: "Colours", path: "/colours" }, { name: "Visualizer", path: "/visualizer" }]} />
          <div className="mt-5 max-w-3xl">
            <p className="eyebrow">Try it on your wall</p>
            <h1 className="mt-4 text-[clamp(40px,5vw,68px)] leading-[1.04] tracking-[-0.02em]">
              See the colour on <em>your</em> walls.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-[1.65] text-muted">
              Drop in a photo of the room. We find the wall surfaces, then only they change colour: the sofa, cupboards, windows and
              light stay exactly as they are. Switch between any of our shades, or 32,000 named colours, instantly.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page mt-10 md:mt-14" aria-label="Visualizer">
        <Visualizer initialShade={start} model={modelId} />
      </section>

      <section className="container-page mt-24 grid gap-10 lg:grid-cols-[1fr_1.6fr]" aria-labelledby="vis-faq">
        <div>
          <p className="eyebrow">Good to know</p>
          <h2 id="vis-faq" className="mt-3 text-3xl md:text-5xl">Questions</h2>
        </div>
        <div className="rule-list flex flex-col">
          {faqs.map((f) => (
            <details key={f.q}>
              <summary className="flex min-h-[76px] items-center justify-between gap-4 text-[19px] font-medium">
                <h3 className="font-sans text-[19px] font-medium tracking-normal">{f.q}</h3>
                <svg className="plus shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
              </summary>
              <p className="mb-7 max-w-[600px] leading-[1.65] text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <CtaBanner heading={<>Liked a shade? <em>See it in person.</em></>} />
    </>
  );
}
