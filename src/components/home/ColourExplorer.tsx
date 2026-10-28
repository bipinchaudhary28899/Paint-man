"use client";

import { useCallback, useRef, useState } from "react";
import { ColourTools } from "@/components/ColourTools";
import { PAINTDB } from "@/lib/colours/catalogue";
import { clamp01, useNeedsJsScroll, useScrollFrame } from "@/lib/scroll";

// Wheel of 36 illustrative shades that turns only with the scroll: it starts the moment the
// wheel's box enters the screen (0°) and has turned half a revolution when it leaves (180°);
// no auto-rotation. Twelve tappable swatches and a card for the chosen shade. CSS view timeline
// on the wheel's box where available (see .wheel in globals.css); passive rAF-throttled scroll
// handler elsewhere.

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

/** Rotation for the wheel's progress across the screen 0..1 (enters → leaves): 0° → 180°. Exported for tests. */
export const WHEEL_SWEEP = 180;
export const wheelAngle = (cp: number) => Math.round(clamp01(cp) * WHEEL_SWEEP * 10) / 10;

export function ColourExplorer() {
  const [sel, setSel] = useState(2);
  const [name, hex, family] = wheelShades[swatchIndices[sel]];
  const needsJs = useNeedsJsScroll();
  const wheelBox = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  // (centred with top: calc(50% - half height), not a translate: view timelines ignore transforms)
  // progress = how far the wheel's own box has travelled from entering the bottom of the
  // screen (0) to leaving the top (1), the same range as the CSS `view()` timeline
  const frame = useCallback(() => {
    if (!wheelBox.current) return;
    const vh = window.innerHeight || 800;
    const r = wheelBox.current.getBoundingClientRect();
    setAngle(wheelAngle((vh - r.top) / (vh + r.height)));
  }, []);
  useScrollFrame(frame, needsJs);

  return (
    <section id="colour" className="relative desk:min-h-[760px]" data-js={needsJs || undefined}>
      {/* Phone: one column; the selected shade is a big colour block with its label card on top,
          then the swatches as a 6 x 2 grid of circles (no wheel). Tablet: the picker beside a
          280px colour ring whose centre shows the selected shade. Desktop: the picker with the
          full wheel bleeding off the right edge. */}
      <div className="container-page relative py-14 tab:grid tab:grid-cols-[minmax(0,1fr)_280px] tab:items-center tab:gap-9 tab:py-[88px] desk:flex desk:flex-wrap desk:items-center desk:gap-12 desk:py-40">
        <div className="relative z-[2] min-w-0 max-w-[560px] flex-[1_1_440px]">
          <p className="eyebrow max-tab:text-[11px]">Colour explorer</p>
          <h2 className="mt-3 text-[30px] leading-[1.06] tab:mt-5 tab:text-[44px] desk:mt-6 desk:text-[clamp(36px,4vw,56px)]">
            Find a shade that feels like <em>you.</em>
          </h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-muted tab:mt-4 tab:text-[16px] tab:leading-[1.65] desk:mt-5 desk:max-w-[440px] desk:text-[17px]">
            Apna rang chuniye: pick a shade to see it up close. Our inspector brings the real cards to your home and helps you choose finishes that suit
            your light, furniture and budget.
          </p>

          <div className="relative mt-5 h-[150px] overflow-hidden rounded-[22px] tab:mt-6 tab:flex tab:h-auto tab:items-stretch tab:gap-4 tab:overflow-visible tab:rounded-[20px] tab:border tab:border-line-soft tab:bg-paper tab:p-3 desk:mt-9 desk:gap-5 desk:p-4">
            <div className="absolute inset-0 transition-colors duration-300 tab:static tab:min-h-[84px] tab:w-[92px] tab:shrink-0 tab:rounded-[14px] desk:min-h-0 desk:w-28" style={{ background: hex }} />
            <div className="absolute inset-x-3 bottom-3 flex min-w-0 flex-col justify-center gap-0.5 rounded-[14px] bg-canvas/94 px-3.5 py-3 tab:static tab:gap-1 tab:rounded-none tab:bg-transparent tab:p-0">
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted-2 tab:text-xs">Selected shade</span>
              <span className="flex flex-wrap items-baseline justify-between gap-x-2.5 tab:contents">
                <strong className="font-display text-[22px] font-normal tracking-[-0.01em] tab:text-[26px] desk:text-[28px]">{name}</strong>
                <span className="text-[13px] text-muted tab:text-sm">{hex.toUpperCase()} · {family}</span>
              </span>
            </div>
          </div>

          <ul className="mt-3.5 grid max-w-[480px] grid-cols-6 gap-2 tab:mt-4 tab:gap-2.5 desk:mt-5" aria-label="Featured shades">
            {swatchIndices.map((ci, i) => {
              const [sName, sHex] = wheelShades[ci];
              return (
                <li key={sName}>
                  <button
                    type="button"
                    onClick={() => setSel(i)}
                    aria-label={sName}
                    aria-pressed={i === sel}
                    className="block aspect-square min-h-11 w-full rounded-full transition-transform duration-200 hover:-translate-y-0.5 tab:rounded-xl"
                    style={{ background: sHex, boxShadow: i === sel ? "0 0 0 2px #f8f5ef, 0 0 0 4px #242522" : "inset 0 0 0 1px rgba(36,37,34,0.12)" }}
                  />
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-2 max-desk:leading-[1.5] tab:mt-3.5">
            Shades shown on screen are illustrative. Final colour depends on the paint range, finish and your room&apos;s light.
            Brand shade data: <a href={PAINTDB.source} className="underline" rel="noopener" target="_blank">PaintDB</a>,{" "}
            <a href={PAINTDB.licenseUrl} className="underline" rel="noopener license" target="_blank">CC BY 4.0</a>.
          </p>
          {/* Every colour tool, as cards (the finder, the shade cards, combinations, a visit) */}
          <ColourTools columns={2} className="mt-5 tab:mt-6 desk:mt-7" />
        </div>

        {/* The wheel turns only with the scroll (.wheel in globals.css). Phones: none. Tablets: a
            280px ring beside the picker, its centre the selected shade. Desktop: the full wheel
            bleeding off the right edge beside the content. */}
        <div ref={wheelBox} aria-hidden className="wheel-wrap pointer-events-none relative z-0 hidden h-[280px] w-[280px] rounded-full shadow-[0_40px_80px_-40px_rgba(36,37,34,0.45)] tab:block desk:absolute desk:-right-[200px] desk:top-[calc(50%-560px)] desk:h-[1120px] desk:w-[760px] desk:rounded-none desk:shadow-none">
          <svg viewBox="0 0 1120 1120" className="wheel wheel-svg absolute inset-0 h-full w-full overflow-visible desk:inset-auto desk:left-0 desk:top-0 desk:h-[1120px] desk:w-[1120px]" style={needsJs ? { transform: `rotate(${angle}deg)`, transition: "transform .12s linear", willChange: "transform" } : undefined}>
            {segments.map((s, i) => <path key={i} d={s.d} fill={s.hex} />)}
            <circle cx={CX} cy={CY} r="212" fill="#f8f5ef" />
            <circle cx={CX} cy={CY} r="212" fill="none" stroke="rgba(36,37,34,0.1)" />
            {/* tablet ring: a cream band and the selected shade in the centre */}
            <circle className="desk:hidden" cx={CX} cy={CY} r="280" fill="#f8f5ef" />
            <circle data-testid="wheel-centre" className="transition-colors duration-300 desk:hidden" cx={CX} cy={CY} r="248" style={{ fill: hex }} />
          </svg>
        </div>
      </div>
    </section>
  );
}
