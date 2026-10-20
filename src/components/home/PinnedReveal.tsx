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

/**
 * The phone strip's active-stage rule: shown (terracotta) only while its stage is current. It runs
 * the sticker's label keyframes (label-0..3 in globals.css) on the track's `--pin` view timeline;
 * without scroll timelines the last stage's rule shows, as the finished walls do. Written out in
 * full so Tailwind finds every class.
 */
const ruleOnTimeline =
  "supports-[animation-timeline:view()]:[animation-timeline:--pin] supports-[animation-timeline:view()]:[animation-range:contain_0%_contain_100%] supports-[animation-timeline:view()]:[animation-fill-mode:both] supports-[animation-timeline:view()]:[animation-timing-function:linear]";
const activeRule = [
  `opacity-0 supports-[animation-timeline:view()]:[animation-name:label-0] ${ruleOnTimeline}`,
  `opacity-0 supports-[animation-timeline:view()]:[animation-name:label-1] ${ruleOnTimeline}`,
  `opacity-0 supports-[animation-timeline:view()]:[animation-name:label-2] ${ruleOnTimeline}`,
  `opacity-100 supports-[animation-timeline:view()]:[animation-name:label-3] ${ruleOnTimeline}`,
];

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
      {/* Three layouts, one markup. Phones: one column sized to fit between the sticky header and
          the bottom nav: heading on top, the room in the middle of the screen, the stages as a
          compact strip under it (the active one carries a terracotta rule). The text block is
          `display: contents` on phones so its children can be ordered around the image without
          duplicating any heading. Tablets: the intro and the stage list beside a room of up to
          360px, centred below the header. Desktop: text and a larger room side by side. */}
      <div ref={panel} className="pin-panel sticky top-0 flex h-[100svh] flex-col justify-center pb-[128px] pt-[76px] tab:h-[min(860px,100vh)] tab:flex-row tab:items-center tab:pb-0 tab:pt-[86px] desk:pt-0">
        <div className="container-page flex w-full flex-col tab:grid tab:grid-cols-[minmax(0,1fr)_min(360px,47%)] tab:items-center tab:gap-10 desk:flex desk:flex-row desk:flex-wrap desk:gap-[72px]">
          <div className="contents tab:block tab:min-w-0 desk:flex-[1_1_380px]">
            <div className="order-1 tab:order-none">
              <p className="eyebrow max-tab:text-[11px]">How a wall changes</p>
              <h2 className="mt-2 text-[30px] leading-[1.06] tab:mt-5 tab:text-[44px] desk:mt-6 desk:text-[clamp(36px,4vw,56px)]">
                Watch the colour <em>go on.</em>
              </h2>
              <p className="hidden leading-[1.65] text-muted tab:mt-4 tab:block tab:text-[16px] desk:mt-5 desk:max-w-[400px] desk:text-[17px]">
                Keep scrolling. The room is finished; only the walls are waiting. Every stage is on your quotation before a brush
                touches them.
              </p>
            </div>
            <ol className="order-3 mt-3.5 grid grid-cols-4 gap-2 tab:order-none tab:mt-6 tab:flex tab:flex-col tab:gap-0 tab:border-t tab:border-line desk:mt-10 desk:border-t-0">
              {stages.map((s, i) => (
                <li
                  key={s.title}
                  className={`pin-stage pin-stage-${i} relative flex flex-col gap-0.5 border-t-2 border-line pt-1.5 tab:flex-row tab:items-baseline tab:gap-[18px] tab:border-t-0 tab:border-b tab:py-3.5 desk:gap-6 desk:border-b-0 desk:py-4`}
                  style={js ? { opacity: js.stageOpacity(i) } : undefined}
                >
                  {/* Phones: the active stage's rule turns terracotta, on the same timeline as the sticker */}
                  <span aria-hidden className={`absolute inset-x-0 -top-0.5 h-0.5 bg-terracotta-light tab:hidden ${activeRule[i]}`} style={js ? { opacity: i === js.stage ? 1 : 0 } : undefined} />
                  <span className="font-display text-[13px] text-terracotta tab:w-[22px] tab:text-[15px] desk:w-6">0{i + 1}</span>
                  <span className="flex flex-col gap-0.5">
                    <strong className="text-[12px] font-semibold leading-tight tracking-[-0.01em] tab:text-[16px] desk:text-[17px]">{s.title}</strong>
                    <span className="hidden text-muted tab:block tab:text-[14px] desk:text-[15px]">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="order-4 mt-3 flex items-center gap-3 tab:order-none tab:mt-5 tab:gap-3.5 desk:mt-7 desk:gap-4">
              <div aria-hidden className="h-0.5 flex-1 overflow-hidden bg-line-soft">
                <div className="pin-bar h-full bg-terracotta-light" style={js ? { width: `${js.fill}%` } : undefined} />
              </div>
              <span className="pin-pct min-w-[36px] text-right text-[12px] font-medium text-muted-2 tab:text-[13px]" aria-hidden>
                {js ? `${Math.round(js.fill)}%` : null}
              </span>
            </div>
            <p className="order-5 mt-1.5 text-[12px] text-muted-2 tab:order-none tab:mt-2 tab:text-[13px] desk:mt-3">
              Walls in {wallShade.name}, <span className="font-medium">{wallShade.code}</span>
            </p>
          </div>

          {/* The room: on phones its height is what is left of the screen after the header, heading,
              stage strip and bottom nav (at most 300px), so the pinned panel always fits; 7:8 from
              tablets up. The wall mask is cover-cropped like the photo, so the two stay aligned. */}
          <div className="frame-shadow scene relative order-2 mt-4 h-[clamp(180px,calc(100svh_-_390px),300px)] w-full min-w-0 overflow-hidden rounded-[22px] bg-[#d9d2c5] tab:order-none tab:mt-0 tab:aspect-[7/8] tab:h-auto tab:rounded-3xl desk:max-w-[560px] desk:flex-[1_1_440px]">
            <Image src={photo.src} alt={`Living room with the walls being painted ${wallShade.name}`} fill sizes="(min-width: 1080px) 560px, (min-width: 721px) 360px, 100vw" className="object-cover" />
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
            <span className="sticker absolute left-3.5 top-3.5 px-3 py-[7px] text-[10px] tab:left-[18px] tab:top-[18px] tab:px-3.5 tab:py-2 tab:text-[11px] desk:left-5 desk:top-5">
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
