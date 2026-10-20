"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { NavMenu as Menu, NavNode } from "@/config/nav";

// One header dropdown (Services, Cities, Colours). The panel's links are always in the HTML
// (hidden until opened), so search engines crawl every hub and city page from every page. Opens on
// click or hover; Escape, a click outside, leaving with Tab or following a link closes it.
/** A click this soon after hovering opened the menu keeps it open. */
const HOVER_CLICK_GRACE_MS = 400;

export function NavMenu({ menu }: { menu: Menu }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // when hovering last opened the menu: a click that follows straight after keeps it open
  const hoverOpenedAt = useRef(0);
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
    hoverTimer.current = setTimeout(() => {
      if (next) hoverOpenedAt.current = Date.now();
      setOpen(next);
    }, next ? 60 : 180);
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
        onClick={() => {
          // the click decides: a pending hover can no longer flip the menu after it
          clearTimeout(hoverTimer.current);
          // a mouse user who hovers and then clicks expects the menu to stay open, not to close it again
          if (Date.now() - hoverOpenedAt.current < HOVER_CLICK_GRACE_MS) setOpen(true);
          else setOpen((o) => !o);
          hoverOpenedAt.current = 0;
        }}
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
        className={`absolute left-1/2 top-full z-50 mt-2 w-max min-w-[260px] -translate-x-1/2 rounded-3xl border border-line bg-paper p-5 shadow-[0_24px_48px_-20px_rgba(36,37,34,0.35)] ${menu.tree ? "max-w-[min(760px,94vw)]" : "max-w-[min(560px,90vw)]"}`}
      >
        {menu.tree && <Cascade tree={menu.tree} close={() => setOpen(false)} />}
        <div className={`grid gap-6 ${menu.groups.length > 1 ? "sm:grid-cols-2" : ""} ${menu.groups.length > 2 ? "lg:grid-cols-3" : ""}`}>
          {menu.groups.map((g, i) => (
            <div key={g.heading ?? i}>
              {g.heading && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{g.heading}</p>}
              <ul>
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

const row = "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-cream-wash";
const columnHeading = "mb-1 px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted";

/**
 * Cascading columns: regions, then the cities of the region pointed at, then the localities of the
 * city pointed at. Pointing (hover), focus and a click on a region all move the next column; a
 * city is a link to its page. Every list is rendered, the inactive ones `hidden`, so every link is
 * in the HTML for crawlers.
 */
function Cascade({ tree, close }: { tree: NavNode[]; close: () => void }) {
  const [region, setRegion] = useState(0);
  // the city pointed at in each region
  const [city, setCity] = useState<number[]>(() => tree.map(() => 0));
  const pickCity = (r: number, c: number) => setCity((prev) => prev.map((v, i) => (i === r ? c : v)));

  return (
    <div className="grid gap-4 sm:grid-cols-[170px_210px_minmax(250px,1fr)]">
      <div className="sm:border-r sm:border-line sm:pr-3">
        <p className={columnHeading}>Regions</p>
        <ul>
          {tree.map((r, i) => (
            <li key={r.label}>
              <button
                type="button"
                aria-expanded={i === region}
                onMouseEnter={() => setRegion(i)}
                onFocus={() => setRegion(i)}
                onClick={() => setRegion(i)}
                className={`${row} ${i === region ? "bg-cream-wash" : ""}`}
              >
                <span className="font-semibold">{r.label}</span>
                <span aria-hidden className="text-muted">›</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="sm:border-r sm:border-line sm:pr-3">
        {tree.map((r, i) => (
          <div key={r.label} hidden={i !== region}>
            <p className={columnHeading}>Cities in {r.label}</p>
            <ul>
              {(r.children ?? []).map((c, j) => (
                <li key={c.label}>
                  <Link
                    href={c.href!}
                    onMouseEnter={() => pickCity(i, j)}
                    onFocus={() => pickCity(i, j)}
                    onClick={close}
                    className={`${row} ${j === city[i] ? "bg-cream-wash" : ""}`}
                  >
                    <span className="flex flex-col">
                      <span className="font-semibold">{c.label}</span>
                      {c.note && <span className="text-xs text-muted">{c.note}</span>}
                    </span>
                    {c.children && c.children.length > 0 && <span aria-hidden className="text-muted">›</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div>
        {tree.flatMap((r, i) =>
          (r.children ?? []).map((c, j) => (
            <div key={`${r.label}/${c.label}`} hidden={i !== region || j !== city[i]}>
              <p className={columnHeading}>Localities in {c.label}</p>
              {c.children && c.children.length > 0 ? (
                <ul className="grid grid-cols-2 gap-x-1">
                  {c.children.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href!} onClick={close} className={row}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 py-1.5 text-sm leading-relaxed text-muted">
                  We are not painting in {c.label} yet.{" "}
                  <Link href={c.href!} onClick={close} className="font-semibold text-ink underline">Join the waitlist</Link>.
                </p>
              )}
            </div>
          )),
        )}
      </div>
    </div>
  );
}
