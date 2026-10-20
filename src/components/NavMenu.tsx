"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { NavMenu as Menu } from "@/config/nav";

// One header dropdown (Services, Cities, Colours). The panel's links are always in the HTML
// (hidden until opened), so search engines crawl every hub and city page from every page. Opens on
// click or hover; Escape, a click outside, leaving with Tab or following a link closes it.
export function NavMenu({ menu }: { menu: Menu }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const hover = (next: boolean) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(next), next ? 60 : 180);
  };

  return (
    <div
      ref={root}
      className="relative"
      onMouseEnter={() => hover(true)}
      onMouseLeave={() => hover(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          button.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-1 text-ink transition hover:text-terracotta"
      >
        {menu.label}
        <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div
        id={id}
        hidden={!open}
        className="absolute left-1/2 top-full z-50 mt-2 w-max min-w-[260px] max-w-[min(560px,90vw)] -translate-x-1/2 rounded-3xl border border-line bg-paper p-5 shadow-[0_24px_48px_-20px_rgba(36,37,34,0.35)]"
      >
        <div className={`grid gap-6 ${menu.groups.length > 1 ? "sm:grid-cols-2" : ""} ${menu.groups.length > 2 ? "lg:grid-cols-3" : ""}`}>
          {menu.groups.map((g, i) => (
            <div key={g.heading ?? i} className={g.wide ? "sm:col-span-full border-t border-line pt-4" : undefined}>
              {g.heading && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{g.heading}</p>}
              <ul className={g.wide ? "grid grid-cols-2 gap-x-2 sm:grid-cols-3" : undefined}>
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={() => setOpen(false)} className="flex min-h-11 flex-col justify-center rounded-xl px-2 py-1.5 hover:bg-cream-wash">
                      <span className="font-semibold">{l.label}</span>
                      {l.note && <span className="text-xs text-muted">{l.note}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Link href={menu.href} onClick={() => setOpen(false)} className="link-arrow mt-3 min-h-11 px-2 text-sm">
          All {menu.label.toLowerCase()} <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
