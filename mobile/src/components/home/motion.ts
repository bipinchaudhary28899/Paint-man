// The home page's scroll-driven motion as plain functions (worklets, so they run on the UI thread with
// the page's scroll offset). They mirror the website's CSS timelines: the pinned reveal's `view()`
// timeline over its 300vh track (src/components/home/PinnedReveal.tsx and .pin-* in globals.css) and
// the collage tiles rising in on their own `view()` timelines (.collage > li).

export const clamp01 = (n: number) => {
  "worklet";
  return n < 0 ? 0 : n > 1 ? 1 : n;
};

export const easeInOutQuad = (p: number) => {
  "worklet";
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
};

/** Progress → what the reveal panel shows: the fill (0–100, eased), the current stage and the wet edge. */
export function reveal(p: number) {
  "worklet";
  const fill = Math.round(easeInOutQuad(clamp01(p)) * 1000) / 10;
  const stage = p < 0.22 ? 0 : p < 0.5 ? 1 : p < 0.78 ? 2 : 3;
  return { fill, stage, edgeVisible: fill > 1 && fill < 99 };
}

/** A stage's opacity in the strip: the current one full, those done 55%, those to come 30%. */
export function stageOpacity(i: number, stage: number) {
  "worklet";
  return i === stage ? 1 : i < stage ? 0.55 : 0.3;
}

/** Where a page-content y sits on the screen: content starts under the header (`headerHeight`). */
export function screenTop(contentY: number, scrollY: number, headerHeight: number) {
  "worklet";
  return contentY + headerHeight - scrollY;
}

/**
 * The website's `animation-range: contain 0% contain 100%` on the track: 0 when the track's top meets
 * the top of the screen, 1 when its bottom meets the bottom.
 */
export function containProgress(trackTopOnScreen: number, trackHeight: number, viewport: number) {
  "worklet";
  const range = trackHeight - viewport;
  return range > 0 ? clamp01(-trackTopOnScreen / range) : 1;
}

/**
 * `position: sticky; top: <header>`: how far the panel moves down its track so it stays under the
 * header, from 0 (not reached yet) to the end of the track (released with it).
 */
export function stickyOffset(trackTopOnScreen: number, headerHeight: number, trackHeight: number, panelHeight: number) {
  "worklet";
  return Math.min(Math.max(headerHeight - trackTopOnScreen, 0), Math.max(trackHeight - panelHeight, 0));
}

/** A `view()` timeline's `cover` progress: 0 as the box's top enters the bottom of the screen, 1 as its bottom leaves the top. */
export function coverProgress(topOnScreen: number, height: number, viewport: number) {
  "worklet";
  return (viewport - topOnScreen) / (viewport + height);
}

/**
 * A collage tile rising in (`collage-in` over `cover wave×2% → 20% + wave×2%`, linear): its opacity
 * and how far below its place it still is (40px → 0).
 */
export function riseIn(cover: number, wave: number) {
  "worklet";
  const t = clamp01((cover - wave * 0.02) / 0.2);
  return { opacity: t, translateY: 40 * (1 - t) };
}
