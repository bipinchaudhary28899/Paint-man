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

/** The shade the walls take: a soft sage green, Asian Paints Pepper Leaf 8386 (PaintDB hex). */
export const wallShade = { name: "Pepper Leaf", code: "Asian Paints 8386", hex: "#bbc8b2" };
const putty = "#cfc9bf";

/**
 * Exact wall mask of the photo (alpha = wall), produced once with a SegFormer-B1
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
      {/* Phones: one column sized to fit between the sticky header and the bottom nav, heading on
          top, the room in the middle of the screen, the stages as a compact strip under it.
          Wider screens: text beside the image. The text block is `display: contents` on phones so
          its children can be ordered around the image without duplicating any heading. */}
      <div ref={panel} className="pin-panel sticky top-0 flex h-[100svh] flex-col justify-center pb-[128px] pt-[76px] md:h-[min(860px,100vh)] md:flex-row md:items-center md:py-0">
        <div className="container-page flex w-full flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:gap-12 lg:gap-[72px]">
          <div className="contents md:block md:min-w-0 md:flex-[1_1_380px]">
            <div className="order-1 md:order-none">
              <p className="eyebrow">How a wall changes</p>
              <h2 className="mt-2 text-[30px] leading-[1.06] md:mt-6 md:text-[clamp(36px,4vw,56px)]">
                Watch the colour <em>go on.</em>
              </h2>
              <p className="mt-5 hidden max-w-[400px] text-[17px] leading-[1.65] text-muted md:block">
                Keep scrolling. The room is finished; only the walls are waiting. Every stage is on your quotation before a brush
                touches them.
              </p>
            </div>
            <ol className="pin-stages order-3 grid grid-cols-4 gap-2 md:order-none md:mt-10 md:flex md:flex-col md:gap-0">
              {stages.map((s, i) => (
                <li key={s.title} className={`pin-stage pin-stage-${i} flex flex-col gap-0.5 md:flex-row md:items-baseline md:gap-6 md:py-4`} style={js ? { opacity: js.stageOpacity(i) } : undefined}>
                  <span className="font-display text-[13px] text-terracotta md:w-6 md:text-[15px]">0{i + 1}</span>
                  <span className="flex flex-col gap-0.5">
                    <strong className="text-[12px] font-semibold leading-tight tracking-[-0.01em] md:text-[17px]">{s.title}</strong>
                    <span className="hidden text-[15px] text-muted md:block">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="order-4 flex items-center gap-4 md:order-none md:mt-7">
              <div aria-hidden className="h-0.5 flex-1 overflow-hidden bg-line-soft">
                <div className="pin-bar h-full bg-terracotta-light" style={js ? { width: `${js.fill}%` } : undefined} />
              </div>
              <span className="pin-pct min-w-[36px] text-right text-[13px] font-medium text-muted-2" aria-hidden>
                {js ? `${Math.round(js.fill)}%` : null}
              </span>
            </div>
            <p className="order-5 -mt-2 text-[12px] text-muted-2 md:order-none md:mt-3 md:text-[13px]">
              Walls in {wallShade.name}, <span className="font-medium">{wallShade.code}</span>
            </p>
          </div>

          <div className="pin-img frame-shadow scene relative order-2 w-full min-w-0 overflow-hidden rounded-3xl bg-[#d9d2c5] md:order-none md:max-w-[560px] md:flex-[1_1_440px]">
            <Image src={photo.src} alt={`Living room with the walls being painted ${wallShade.name}`} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
            <div aria-hidden className="pin-before absolute inset-0" style={js ? { clipPath: `inset(0 0 ${js.fill}% 0)` } : undefined}>
              <span className="tint" style={{ background: putty, ...maskStyle }} />
            </div>
            <div aria-hidden className="pin-after absolute inset-0" style={js ? { clipPath: `inset(${100 - js.fill}% 0 0 0)` } : undefined}>
              <span className="tint" style={{ background: wallShade.hex, ...maskStyle }} />
            </div>
            {/* The wet edge: a 1px line at the top of a full-size track that only ever moves by
                translateY (a percentage of its own height, i.e. the image's), never by `top`, so the
                sweep causes no layout shift. */}
            <div aria-hidden className="pin-edge pointer-events-none absolute inset-0" style={js ? { transform: `translateY(${100 - js.fill}%)`, opacity: js.edgeVisible ? 1 : 0 } : undefined}>
              <div className="absolute inset-x-0 top-0 h-px bg-canvas/90 shadow-[0_0_20px_4px_rgba(248,245,239,0.5)]" />
            </div>
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
