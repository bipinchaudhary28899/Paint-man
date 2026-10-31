"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/scroll";

// Phone-only nav from the sketch: a bar of four tab labels with a round dab of colour sitting
// over the active tab, half above the bar, in a dip the bar makes for it. On a change the dab
// hops along the bar in an arc to the new tab and the dip travels with it. The active tab is the
// page you are on (Home all the way down the home page, where Home takes you back to the top), and
// every other tab opens its page. Booking is always one tap. While a form field has focus (the
// keyboard is up) the bar slides away, so it never sits over the field or its submit button.
// Everything that moves does so by transform or mask (see .bnav-* in globals.css), so a tab change
// never shifts layout.
type Item = { label: string; hue: string; on: string; href: string; match: (p: string) => boolean };
export const items: Item[] = [
  { label: "Home", hue: "#71856a", on: "#f8f5ef", href: "/", match: (p) => p === "/" },
  { label: "Services", hue: "#e9b949", on: "#242522", href: "/services", match: (p) => p.startsWith("/services") },
  { label: "Colours", hue: "#c76b4a", on: "#f8f5ef", href: "/colours", match: (p) => p.startsWith("/colours") || p.startsWith("/palettes") || p.startsWith("/shade-cards") },
  // cream on the charcoal bar (a charcoal dot would vanish into it)
  { label: "Book", hue: "#f8f5ef", on: "#242522", href: "/book", match: (p) => p.startsWith("/book") || p.startsWith("/contact") },
];

const icons: Record<string, React.ReactNode> = {
  Home: <><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /></>,
  Services: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
  Colours: <><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 1-2 1-3a9 9 0 0 0-7-9z" /><circle cx="8" cy="10" r="1" /><circle cx="12" cy="7" r="1" /><circle cx="16" cy="10" r="1" /></>,
  Book: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M8 3v4M16 3v4" /></>,
};

/** Whether focus is in a field the keyboard types into (not a button, checkbox or radio). Exported for tests. */
export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el.isContentEditable) return true;
  return el instanceof HTMLInputElement && !["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "image", "hidden"].includes(el.type);
}

/** Horizontal centre of tab `i` as a percentage of the bar: the dab and the dip both sit there. */
export const slotCentre = (i: number) => `${((i + 0.5) / items.length) * 100}%`;

export function MobileCtaBar() {
  const pathname = usePathname() ?? "/";
  const onHome = pathname === "/";
  const activeIndex = Math.max(0, items.findIndex((i) => i.match(pathname)));
  // the keyboard is up: the bar steps aside until focus leaves the field
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const onFocus = (e: FocusEvent) => setTyping(isTypingTarget(e.target));
    const onBlur = (e: FocusEvent) => setTyping(isTypingTarget(e.relatedTarget));
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);
  const active = items[activeIndex];

  // Every change of tab is one hop: the dab's inner disc remounts (key = hop count) so its arc
  // plays once, while the bar's dip and the dab's position glide across on a CSS transition.
  const [hops, setHops] = useState(0);
  const last = useRef(activeIndex);
  useEffect(() => {
    if (activeIndex === last.current) return;
    last.current = activeIndex;
    setHops((h) => h + 1);
  }, [activeIndex]);

  return (
    <nav
      aria-label="Mobile"
      data-typing={typing || undefined}
      className={`bnav fixed inset-x-4 bottom-4 z-40 h-[64px] transition-[translate,opacity] duration-200 motion-reduce:transition-none min-[721px]:hidden ${typing ? "pointer-events-none translate-y-[calc(100%+24px)] opacity-0" : ""}`}
      style={{ ["--nx" as string]: slotCentre(activeIndex) }}
    >
      {/* The bar itself, masked with a dip under the dab */}
      <span aria-hidden className="bnav-bar absolute inset-0 rounded-full border border-white/10 bg-ink/95 shadow-[0_24px_48px_-16px_rgba(36,37,34,0.55)] backdrop-blur-xl" />
      {/* A zero-height track as wide as the bar, slid by translateX(--nx): it carries the dip's
          hairline and the dab over the active tab */}
      <span aria-hidden className="bnav-slot">
        {/* The hairline continues around the dip (the lower half of a ring the size of the cut-out) */}
        <span className="bnav-dip" />
        {/* The dab: a disc of the active tab's colour, half above the bar, carrying the tab's icon */}
        <span className="bnav-dab" data-tab={active.label}>
          <span key={hops} className={hops ? "bnav-dab-inner bnav-dab-hop" : "bnav-dab-inner"} style={{ background: active.hue, color: active.on }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              {icons[active.label]}
            </svg>
          </span>
        </span>
      </span>
      <div className="relative flex h-full">
        {items.map((item, i) => {
          const on = i === activeIndex;
          // on the home page Home goes back to the top; every other tab opens its page
          const href = onHome && i === 0 ? "#top" : item.href;
          const hash = href.startsWith("#");
          const cls = "flex flex-1 items-end justify-center pb-[9px] text-[11px] font-semibold tracking-[0.04em] text-on-ink";
          // the active tab's label drops under its dab (by transform); the others sit in a small
          // hairline box. Both states share one box, so switching tabs moves no layout.
          const content = <span className={on ? "bnav-label bnav-label-on" : "bnav-label"}>{item.label}</span>;
          // Home on the home page is a plain anchor: the page glides back to the top.
          if (hash) {
            return (
              <a
                key={item.label}
                href={href}
                aria-label={item.label}
                aria-current={on ? "page" : undefined}
                className={cls}
                onClick={(e) => {
                  const target = document.getElementById(href.slice(1));
                  if (target) {
                    e.preventDefault();
                    history.replaceState(null, "", href);
                    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
                  }
                }}
              >
                {content}
              </a>
            );
          }
          return (
            <Link key={item.label} href={href} aria-label={item.label} aria-current={on ? "page" : undefined} className={cls}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
