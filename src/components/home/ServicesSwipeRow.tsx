"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A scroller that is a labelled, focusable region only while it actually scrolls (the phone swipe
 * row), so a keyboard can scroll it there; where the same content lays out without scrolling
 * (tablet table, desktop grid) it is a plain wrapper and no tab stop. Rendered as a region first
 * (phones first) and measured after hydration and on resize (passive, rAF-throttled).
 */
export function ServicesSwipeRow({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(true);

  useEffect(() => {
    const el = row.current as HTMLDivElement;
    let frame = 0;
    let pending = false;
    const measure = () => setScrolls(el.scrollWidth - el.clientWidth > 1);
    const schedule = () => {
      if (pending) return;
      pending = true;
      frame = requestAnimationFrame(() => {
        pending = false;
        measure();
      });
    };
    measure();
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div
      ref={row}
      role={scrolls ? "region" : undefined}
      aria-label={scrolls ? label : undefined}
      tabIndex={scrolls ? 0 : undefined}
      className={className}
    >
      {children}
    </div>
  );
}
