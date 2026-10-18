"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { colours as catalogue } from "@/config/colours";
import { clamp01, useNeedsJsScroll, useScrollFrame } from "@/lib/scroll";

// Semicircular wheel of 36 illustrative shades slowly turning as the section scrolls, with
// twelve tappable swatches and a card for the chosen shade. CSS view timeline where
// available (see .wheel in globals.css); passive rAF-throttled scroll handler elsewhere.

export const wheelShades: [string, string, string][] = [
  ["Chalk", "#F4F1EA", "Whites"], ["Linen", "#EDE6D8", "Whites"], ["Oat", "#E3D7C2", "Neutrals"], ["Sand", "#E8D7C5", "Neutrals"],
  ["Biscuit", "#D9BFA0", "Neutrals"], ["Caramel", "#C49A6C", "Browns"], ["Walnut", "#8A5A3C", "Browns"], ["Clay", "#B8714F", "Terracottas"],
  ["Terracotta", "#C76B4A", "Terracottas"], ["Paprika", "#B5473A", "Reds"], ["Oxblood", "#7A2E2A", "Reds"], ["Rose", "#D98C8C", "Pinks"],
  ["Blush", "#EBC4BE", "Pinks"], ["Coral", "#E8866A", "Corals"], ["Apricot", "#F0A878", "Oranges"], ["Marigold", "#E99A3C", "Oranges"],
  ["Golden", "#E9B949", "Yellows"], ["Butter", "#F2D98A", "Yellows"], ["Olive", "#9A9A5E", "Greens"], ["Sage", "#71856A", "Greens"],
  ["Fern", "#4F6B4A", "Greens"], ["Eucalyptus", "#9FB8A8", "Greens"], ["Teal", "#2E6B6A", "Blues"], ["Lagoon", "#5A9AA6", "Blues"],
  ["Sky", "#A9C6D6", "Blues"], ["Denim", "#4B6A8F", "Blues"], ["Navy", "#283B5A", "Blues"], ["Lilac", "#C3B5D6", "Purples"],
  ["Plum", "#6B4A6E", "Purples"], ["Mist", "#D6D8D4", "Greys"], ["Pebble", "#B3B2AA", "Greys"], ["Slate", "#6E7370", "Greys"],
  ["Charcoal", "#3C3D3A", "Darks"], ["Ink", "#242522", "Darks"], ["Espresso", "#3F2E26", "Darks"], ["Ivory", "#F8F5EF", "Whites"],
];
export const swatchIndices = [1, 3, 8, 12, 13, 16, 19, 21, 23, 25, 27, 30];

const CX = 560, CY = 560, R0 = 224, R1 = 548, GAP = 0.7;
const pt = (r: number, a: number) => {
  const t = (a * Math.PI) / 180;
  return `${(CX + r * Math.cos(t)).toFixed(1)} ${(CY + r * Math.sin(t)).toFixed(1)}`;
};
const n = wheelShades.length;
export const segments = wheelShades.map((c, i) => {
  const a0 = (360 / n) * i + GAP / 2, a1 = (360 / n) * (i + 1) - GAP / 2;
  return { hex: c[1], d: `M${pt(R1, a0)} A${R1} ${R1} 0 0 1 ${pt(R1, a1)} L${pt(R0, a1)} A${R0} ${R0} 0 0 0 ${pt(R0, a0)} Z` };
});

/** Rotation for a section progress 0..1: −28° → +28°. Exported for tests. */
export const wheelAngle = (cp: number) => Math.round((-28 + clamp01(cp) * 56) * 10) / 10;

export function ColourExplorer() {
  const [sel, setSel] = useState(2);
  const [name, hex, family] = wheelShades[swatchIndices[sel]];
  const needsJs = useNeedsJsScroll();
  const section = useRef<HTMLElement>(null);
  const [angle, setAngle] = useState(0);
  // The wheel revolves from the moment any of it is on screen (and rests when it is not).
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const frame = useCallback(() => {
    if (!section.current) return;
    const vh = window.innerHeight || 800;
    const r = section.current.getBoundingClientRect();
    setAngle(wheelAngle((vh - r.top) / (vh + r.height)));
  }, []);
  useScrollFrame(frame, needsJs);

  return (
    <section ref={section} id="colour" className="relative min-h-[760px]" data-js={needsJs || undefined}>
      <div className="container-page relative flex flex-wrap items-center gap-12 py-[120px] md:py-40">
        <div className="relative z-[2] min-w-0 max-w-[560px] flex-[1_1_440px]">
          <p className="eyebrow">Colour explorer</p>
          <h2 className="mt-6 text-[clamp(36px,4vw,56px)] leading-[1.06]">
            Find a shade that feels like <em>you.</em>
          </h2>
          <p className="mt-5 max-w-[440px] text-[17px] leading-[1.65] text-muted">
            Pick a shade to see it up close. Our inspector brings the real cards to your home and helps you choose finishes that suit
            your light, furniture and budget.
          </p>

          <div className="mt-9 flex items-stretch gap-5 rounded-[20px] border border-line-soft bg-paper p-4">
            <div className="w-28 shrink-0 rounded-[14px] transition-colors duration-300" style={{ background: hex }} />
            <div className="flex min-w-0 flex-col justify-center gap-1">
              <span className="text-xs uppercase tracking-[0.12em] text-muted-2">Selected shade</span>
              <strong className="font-display text-[28px] font-normal tracking-[-0.01em]">{name}</strong>
              <span className="text-sm text-muted">{hex.toUpperCase()} · {family}</span>
            </div>
          </div>

          <ul className="mt-5 grid max-w-[480px] grid-cols-6 gap-2.5" aria-label="Featured shades">
            {swatchIndices.map((ci, i) => {
              const [sName, sHex] = wheelShades[ci];
              return (
                <li key={sName}>
                  <button
                    type="button"
                    onClick={() => setSel(i)}
                    aria-label={sName}
                    aria-pressed={i === sel}
                    className="block aspect-square w-full rounded-xl transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ background: sHex, boxShadow: i === sel ? "0 0 0 2px #f8f5ef, 0 0 0 4px #242522" : "inset 0 0 0 1px rgba(36,37,34,0.12)" }}
                  />
                </li>
              );
            })}
          </ul>
          <p className="mt-3.5 text-xs text-muted-2">
            Shades shown on screen are illustrative. Final colour depends on the paint range, finish and your room&apos;s light.
          </p>
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
            <Link href="/book" className="link-arrow">
              Discuss this shade with us <Arrow />
            </Link>
            <Link href="/colours" className="link-arrow">
              Search all {catalogue.length} shades <Arrow />
            </Link>
          </div>
        </div>

        <div aria-hidden className="wheel-wrap pointer-events-none relative mt-8 h-[300px] w-full md:absolute md:-right-[200px] md:top-1/2 md:mt-0 md:h-[1120px] md:w-[760px] md:-translate-y-1/2">
          <svg viewBox="0 0 1120 1120" className="wheel-svg absolute -left-[20%] -top-[50px] w-[200%] overflow-visible md:left-0 md:top-0 md:h-[1120px] md:w-[1120px]">
            <g className={`wheel-spin ${visible ? "is-visible" : ""}`}>
              <g className="wheel" style={needsJs ? { transform: `rotate(${angle}deg)`, transition: "transform .12s linear", willChange: "transform" } : undefined}>
                {segments.map((s, i) => <path key={i} d={s.d} fill={s.hex} />)}
                <circle cx={CX} cy={CY} r="212" fill="#f8f5ef" />
                <circle cx={CX} cy={CY} r="212" fill="none" stroke="rgba(36,37,34,0.1)" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
