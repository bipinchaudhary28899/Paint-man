import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { JsonLd } from "@/components/JsonLd";
import { VisualizerFromParams } from "@/components/visualizer/VisualizerFromParams";
import { site } from "@/config/site";
import { BRAND_SHADES_ROUNDED } from "@/lib/colours/catalogue";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: `Wall Colour Visualizer for Homes in ${site.city}`,
  description: `See any wall colour on a photo of your own room. It runs in your browser, so the photo stays private; then we bring real shade cards to your home in ${site.city}.`,
  path: "/visualizer",
});

const faqs = [
  { q: "Is my photo uploaded anywhere?", a: "No. The wall detection and the recolouring both run inside your browser. The photo never leaves your device, and nothing is stored." },
  { q: "What if it paints a cupboard or misses a wall?", a: "Tap a surface on the photo to include or exclude it; Reset returns to what the detector found. If a wall is missed entirely, try a photo taken straight-on in daylight with the whole wall in frame." },
  { q: "Will the wall look exactly like this?", a: "It is a close guide. Daylight, tube lights and the finish (matt or sheen) all shift a shade, so the inspector brings physical shade cards and paints a test patch before you decide." },
];

// Static page: ?shade= and ?model= are read in the browser by VisualizerFromParams.
// The prerendered HTML is the default visualizer, which hydrates in place (no Suspense bailout).
export default function VisualizerPage() {
  return (
    <>
      <JsonLd data={faqJsonLd(faqs)} />
      <section className="border-b border-line-soft">
        <div className="container-page py-12 md:py-16">
          <Breadcrumbs items={[{ name: "Colours", path: "/colours" }, { name: "Visualizer", path: "/visualizer" }]} />
          <div className="mt-5 max-w-3xl">
            <p className="eyebrow">Try it on your wall</p>
            <h1 className="mt-4 text-[clamp(40px,5vw,68px)] leading-[1.04] tracking-[-0.02em]">
              Wall colour visualizer for {site.city} homes: see the shade on <em>your</em> walls
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-[1.65] text-muted">
              Drop in a photo of the room. We find the wall surfaces, then only they change colour: the sofa, cupboards, windows and
              light stay exactly as they are. Switch between {BRAND_SHADES_ROUNDED} brand shades by their shade-card code, or 32,000 named
              colours, instantly.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page mt-10 md:mt-14" aria-label="Visualizer">
        <VisualizerFromParams />
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
