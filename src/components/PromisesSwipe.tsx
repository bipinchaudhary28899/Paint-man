"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The promises row's moving parts. On phones the cards are a swipe row: a "1 / 6" counter beside the
 * heading and dots under the row follow the scroll (a passive, rAF-throttled listener), and the row is
 * a labelled, focusable region so a keyboard can scroll it. On tablets and desktop the same list is a
 * grid that never scrolls, so the counter and dots are hidden and the row is no longer a tab stop.
 */
export function PromisesSwipe({ heading, label, count, children }: { heading: ReactNode; label: string; count: number; children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // Rendered as a scrolling region first (phones first); measured after hydration.
  const [scrolls, setScrolls] = useState(true);

  useEffect(() => {
    const el = row.current as HTMLDivElement;
    let frame = 0;
    let pending = false;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      setScrolls(max > 1);
      const cards = [...el.querySelectorAll<HTMLElement>("li")];
      const distance = (i: number) => Math.abs(cards[i].offsetLeft - cards[0].offsetLeft - el.scrollLeft);
      // The card nearest the start of the row; the last card cannot snap to the start, so the end
      // of the row counts as the last card.
      let index = cards.reduce((nearest, _, i) => (distance(i) < distance(nearest) ? i : nearest), 0);
      if (max > 1 && el.scrollLeft >= max - 1) index = cards.length - 1;
      setActive(index);
    };
    const schedule = () => {
      if (pending) return;
      pending = true;
      frame = requestAnimationFrame(() => {
        pending = false;
        measure();
      });
    };
    measure();
    el.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <>
      {heading && (
        <div className="max-tab:flex max-tab:items-end max-tab:justify-between max-tab:gap-3">
          {heading}
          <p className="shrink-0 text-xs font-medium text-muted-2 tab:hidden">
            {active + 1} / {count}
          </p>
        </div>
      )}
      <div
        ref={row}
        role={scrolls ? "region" : undefined}
        aria-label={scrolls ? label : undefined}
        tabIndex={scrolls ? 0 : undefined}
        className={`swipe -mx-5 scroll-px-5 px-5 pb-1 focus-visible:outline-offset-[-3px] sm:-mx-8 sm:scroll-px-8 sm:px-8 tab:mx-0 tab:block tab:overflow-visible tab:scroll-px-0 tab:px-0 tab:pb-0 ${heading ? "mt-5 tab:mt-8" : ""}`}
      >
        {children}
      </div>
      <div aria-hidden="true" className="mt-3.5 flex gap-1.5 tab:hidden">
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className={`h-1 rounded-full ${i === active ? "w-[22px] bg-terracotta" : "w-1.5 bg-ink/20"}`} />
        ))}
      </div>
    </>
  );
}
