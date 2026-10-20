import Link from "next/link";
import { palettes } from "@/config/palettes";
import { BRAND_SHADES_ROUNDED } from "@/lib/colours/catalogue";

// Every colour tool in one place, as cards rather than text links: the colour finder, the brand
// shade cards, the ready combinations and a visit to see shades on your own walls. Each card shows a
// strip of real colours from that tool (decoration, not icons). Shown on the home colour section and
// on each colour page, where the page you are on is marked "You are here" instead of linking to itself.

export type ColourTool = "finder" | "shade-cards" | "palettes" | "visit";

const firstPalette = palettes[0];

export const colourTools: { key: ColourTool; href: string; title: string; text: string; swatches: string[] }[] = [
  {
    key: "finder",
    href: "/colours",
    title: "Colour finder",
    text: `Search ${BRAND_SHADES_ROUNDED} brand shades by code, name or hex, each shown on a room.`,
    swatches: ["#f3ead8", "#e7975b", "#c76b4a", "#71856a", "#4a6a8f"],
  },
  {
    key: "shade-cards",
    href: "/shade-cards",
    title: "Brand shade cards",
    text: "Asian Paints, Berger, Nerolac and Nippon Paint, every shade light to dark.",
    swatches: ["#f4efe4", "#efd9a7", "#e9b949", "#d98c5f", "#9b4f3a"],
  },
  {
    key: "palettes",
    href: "/palettes",
    title: "Colour combinations",
    text: `${palettes.length} ready palettes: a feature wall, its white and an accent.`,
    swatches: firstPalette ? [firstPalette.shades[0].hex, firstPalette.shades[1].hex, firstPalette.shades[2].hex] : ["#71856a", "#f3ead8", "#c76b4a"],
  },
  {
    key: "visit",
    href: "/book",
    title: "See shades at home",
    text: "Book a visit: the inspector brings the real shade cards to your walls.",
    swatches: ["#e8d7c5", "#f8f5ef", "#a8532f"],
  },
];

export function ColourTools({
  current,
  heading,
  columns = 4,
  className = "",
}: {
  /** the tool whose page this is: shown as "You are here", not linked */
  current?: ColourTool;
  /** an h2 above the cards; leave it out where the section already has a heading */
  heading?: React.ReactNode;
  /** 4 across from tablets up (a full-width row), or 2 by 2 everywhere (a narrow column) */
  columns?: 2 | 4;
  className?: string;
}) {
  return (
    <nav aria-label="Colour tools" className={className}>
      {heading && <h2 className="text-2xl tab:text-3xl">{heading}</h2>}
      <ul className={`grid grid-cols-2 gap-3 tab:gap-4 ${columns === 4 ? "tab:grid-cols-4" : ""} ${heading ? "mt-5" : ""}`}>
        {colourTools.map((t) => {
          const here = t.key === current;
          const body = (
            <>
              <span aria-hidden className="flex h-12 w-full tab:h-14">
                {t.swatches.map((hex, i) => (
                  <span key={`${hex}-${i}`} className="flex-1" style={{ background: hex }} />
                ))}
              </span>
              <span className="flex flex-1 flex-col p-3.5 tab:p-4">
                <span className="text-[15px] font-semibold leading-snug text-ink tab:text-base">{t.title}</span>
                <span className="mt-1 text-[13px] leading-[1.45] text-muted">{t.text}</span>
                <span className={`mt-3 text-[13px] font-semibold ${here ? "text-muted-2" : "text-terracotta"}`}>
                  {here ? "You are here" : <>Open <span aria-hidden>→</span></>}
                </span>
              </span>
            </>
          );
          return (
            <li key={t.key} className="flex">
              {here ? (
                <span aria-current="page" className="card flex w-full flex-col overflow-hidden ring-2 ring-terracotta/40">
                  {body}
                </span>
              ) : (
                <Link href={t.href} className="card card-hover flex w-full flex-col overflow-hidden">
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
