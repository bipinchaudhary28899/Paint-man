"use client";

import { useCallback, useState } from "react";
import { useNeedsJsScroll, useScrollFrame } from "@/lib/scroll";

// Faint paint chips drifting behind the page. With CSS scroll timelines each chip rides its
// own view() timeline (.chip-bg in globals.css); otherwise a passive rAF-throttled handler
// translates each by scrollY × speed. Frozen under prefers-reduced-motion. Desktop only: their
// positions are set for the desktop page, and the phone and tablet designs have none.
export const chips = [
  { name: "Sand · 01", hex: "#e8d7c5", opacity: 0.6, side: "left", offset: "-40px", top: 760, w: 220, h: 290, r: 18, rot: -8, speed: -0.12 },
  { name: "Golden · 02", hex: "#e9b949", opacity: 0.28, side: "right", offset: "6%", top: 1380, w: 180, h: 240, r: 16, rot: 6, speed: -0.2 },
  { name: "Terracotta · 03", hex: "#c76b4a", opacity: 0.16, side: "left", offset: "4%", top: 2500, w: 260, h: 340, r: 20, rot: -4, speed: -0.08, lg: true },
  { name: "Sage · 04", hex: "#71856a", opacity: 0.2, side: "right", offset: "-30px", top: 4200, w: 200, h: 260, r: 18, rot: 9, speed: -0.16 },
  { name: "Linen · 05", hex: "#e8d7c5", opacity: 0.6, side: "left", offset: "10%", top: 6400, w: 180, h: 240, r: 16, rot: -6, speed: -0.1, lg: true },
  { name: "Ochre · 06", hex: "#e9b949", opacity: 0.22, side: "right", offset: "8%", top: 7300, w: 240, h: 310, r: 20, rot: 5, speed: -0.18 },
  { name: "Clay · 07", hex: "#c76b4a", opacity: 0.14, side: "left", offset: "-20px", top: 8200, w: 200, h: 260, r: 18, rot: -7, speed: -0.07, lg: true },
] as const;

export function ParallaxChips() {
  const needsJs = useNeedsJsScroll();
  const [sy, setSy] = useState(0);
  const frame = useCallback(() => setSy(window.scrollY || 0), []);
  useScrollFrame(frame, needsJs);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden desk:block" data-js={needsJs || undefined}>
      {chips.map((c) => (
        <div
          key={c.name}
          className={`chip-bg absolute flex flex-col justify-end ${"lg" in c && c.lg ? "hidden md:flex" : ""}`}
          style={{
            [c.side]: c.offset,
            top: c.top,
            width: c.w,
            height: c.h,
            borderRadius: c.r,
            background: c.hex,
            opacity: c.opacity,
            ["--rot" as string]: `${c.rot}deg`,
            ["--drift" as string]: `${Math.round(Math.abs(c.speed) * 700)}px`,
            ...(needsJs && { transform: `translateY(${Math.round(sy * c.speed)}px) rotate(${c.rot}deg)`, transition: "transform .15s linear" }),
          }}
        >
          <span className="rounded-b-[inherit] bg-canvas/75 px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink">{c.name}</span>
        </div>
      ))}
    </div>
  );
}
