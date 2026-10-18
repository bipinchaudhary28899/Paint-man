"use client";

import { useEffect, useState } from "react";

/** True when the browser can drive animations from scroll in CSS (`animation-timeline: view()`). */
export function supportsScrollTimeline(): boolean {
  return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("animation-timeline", "view()");
}

/** True when the user asked for less motion. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Runs `frame` on scroll and resize, passively and at most once per animation frame.
 * Used only as the fallback where CSS scroll-driven animations are unavailable, so the
 * JS path never runs in browsers that can do it in CSS.
 */
export function useScrollFrame(frame: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        frame();
      });
    };
    frame();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [frame, enabled]);
}

/** Decides, after mount, whether a component must fall back to JS for its scroll effect. */
export function useNeedsJsScroll(): boolean {
  const [needs, setNeeds] = useState(false);
  useEffect(() => {
    setNeeds(!supportsScrollTimeline() && !prefersReducedMotion());
  }, []);
  return needs;
}

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
export const easeInOutQuad = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
