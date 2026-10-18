"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { images } from "@/config/images";
import { clamp01, easeInOutQuad, useNeedsJsScroll, useScrollFrame } from "@/lib/scroll";

// "Watch the colour go on": the room stays in full colour; only the WALLS start as bare
// putty and take their shade from the floor up as the page scrolls 300vh with the panel
// pinned. The walls come from an exact detector mask of the photo, so the tint never touches
// curtains, shelves or plants.
// In browsers with CSS scroll timelines one named view timeline on the track drives the
// two clips, the stage list, the bar and the counter (see .pin-* in globals.css). Elsewhere
// a passive, rAF-throttled handler computes the same progress and applies it inline.
// Reduced motion shows the walls finished.
export const stages = [
  { title: "Prep & putty", text: "Cracks filled, walls sanded smooth." },
  { title: "Primer", text: "One coat that lets the colour hold." },
  { title: "First coat", text: "The shade begins to show." },
  { title: "Second coat", text: "Deep, even, finished." },
];
export const stageLabels = ["Before · putty", "Primer going on", "First coat", "Second coat · done"];
const longestLabel = stageLabels.reduce((a, b) => (b.length > a.length ? b : a));

/** The shade the walls take. Sage Mist, PM-502. */
export const wallShade = { name: "Sage Mist", code: "PM-502", hex: "#b8c7b0" };
const putty = "#cfc9bf";

/**
 * Exact wall mask of the photo (alpha = wall), produced once by the visualizer's SegFormer-B1
 * wall detector (see src/config/scenes.ts). `.tint` sizes it with cover + centre, the same
 * crop `object-cover` gives the photo, so the 7:8 frame and the mask stay aligned.
 */
export const wallMask = "/scenes/living-moody-mask.png";
const maskStyle = { maskImage: `url(${wallMask})`, WebkitMaskImage: `url(${wallMask})` } as const;

/** Progress → the values the panel renders. Exported for tests. */
export function reveal(p: number) {
  const fill = Math.round(easeInOutQuad(clamp01(p)) * 1000) / 10;
  const stage = p < 0.22 ? 0 : p < 0.5 ? 1 : p < 0.78 ? 2 : 3;
  const stageOpacity = (i: number) => (i === stage ? 1 : i < stage ? 0.55 : 0.3);
  return { fill, stage, stageOpacity, edgeVisible: fill > 1 && fill < 99 };
}

export function PinnedReveal() {
  const photo = images.livingMoody;
  const needsJs = useNeedsJsScroll();
  const track = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(1);
  const [pinnable, setPinnable] = useState(true);

  const frame = useCallback(() => {
    const vh = window.innerHeight || 800;
    // A canvas-style render with no real viewport cannot pin: collapse the runway, show 60%.
    const canPin = vh < 1400;
    setPinnable(canPin);
    if (!canPin || !track.current || !panel.current) return setP(0.6);
    const rect = track.current.getBoundingClientRect();
    const range = rect.height - panel.current.offsetHeight;
    if (range > 0) setP(clamp01(-rect.top / range));
  }, []);
  useScrollFrame(frame, needsJs);

  const js = needsJs ? reveal(p) : null;
  const trackStyle = needsJs ? { height: pinnable ? "300vh" : "auto" } : undefined;

  return (
    <section ref={track} id="how-a-wall-changes" aria-label="Watch the colour go on" className="pin-track relative" data-js={needsJs || undefined} style={trackStyle}>
      <div ref={panel} className="pin-panel sticky top-0 flex h-[min(860px,100vh)] items-center">
        <div className="container-page flex flex-wrap items-center gap-12 lg:gap-[72px]">
          <div className="min-w-0 flex-[1_1_380px]">
            <p className="eyebrow">How a wall changes</p>
            <h2 className="mt-6 text-[clamp(36px,4vw,56px)] leading-[1.06]">
              Watch the colour <em>go on.</em>
            </h2>
            <p className="mt-5 hidden max-w-[400px] text-[17px] leading-[1.65] text-muted sm:block">
              Keep scrolling. The room is finished; only the walls are waiting. Every stage is on your quotation before a brush
              touches them.
            </p>
            <ol className="rule-list mt-10 flex flex-col">
              {stages.map((s, i) => (
                <li key={s.title} className={`pin-stage pin-stage-${i} flex items-baseline gap-6 py-2.5 sm:py-4`} style={js ? { opacity: js.stageOpacity(i) } : undefined}>
                  <span className="w-6 font-display text-[15px] text-terracotta">0{i + 1}</span>
                  <span className="flex flex-col gap-0.5">
                    <strong className="text-[17px] font-semibold tracking-[-0.01em]">{s.title}</strong>
                    <span className="text-[15px] text-muted">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex items-center gap-4">
              <div aria-hidden className="h-0.5 flex-1 overflow-hidden bg-line-soft">
                <div className="pin-bar h-full bg-terracotta-light" style={js ? { width: `${js.fill}%` } : undefined} />
              </div>
              <span className="pin-pct min-w-[36px] text-right text-[13px] font-medium text-muted-2" aria-hidden>
                {js ? `${Math.round(js.fill)}%` : null}
              </span>
            </div>
            <p className="mt-3 text-[13px] text-muted-2">
              Walls in {wallShade.name} <span className="font-medium">{wallShade.code}</span>
            </p>
          </div>

          <div className="pin-img frame-shadow scene relative -order-1 w-full min-w-0 max-w-[560px] flex-[1_1_440px] overflow-hidden rounded-3xl bg-[#d9d2c5] md:order-none" style={{ aspectRatio: "7 / 8" }}>
            <Image src={photo.src} alt={`Living room with the walls being painted ${wallShade.name}`} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
            <div aria-hidden className="pin-before absolute inset-0" style={js ? { clipPath: `inset(0 0 ${js.fill}% 0)` } : undefined}>
              <span className="tint" style={{ background: putty, ...maskStyle }} />
            </div>
            <div aria-hidden className="pin-after absolute inset-0" style={js ? { clipPath: `inset(${100 - js.fill}% 0 0 0)` } : undefined}>
              <span className="tint" style={{ background: wallShade.hex, ...maskStyle }} />
            </div>
            <div aria-hidden className="pin-edge absolute inset-x-0 h-px bg-canvas/90 shadow-[0_0_20px_4px_rgba(248,245,239,0.5)]" style={js ? { top: `${100 - js.fill}%`, opacity: js.edgeVisible ? 1 : 0 } : undefined} />
            <span className="sticker absolute left-5 top-5">
              {/* an invisible copy of the longest label sizes the sticker, so no stage label ever wraps */}
              <span aria-hidden className="invisible whitespace-nowrap">{longestLabel}</span>
              {stageLabels.map((l, i) => (
                <span
                  key={l}
                  className={`pin-label pin-label-${i} absolute inset-0 flex items-center justify-center whitespace-nowrap`}
                  style={js ? { opacity: i === js.stage ? 1 : 0 } : undefined}
                >
                  {l}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
