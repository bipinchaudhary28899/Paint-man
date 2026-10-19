"use client";

import Link from "next/link";
import { useEffect, useRef, type KeyboardEvent, type UIEvent } from "react";
import { WallPreview } from "./WallPreview";

/** The shade the sheet shows, as the finder describes it. */
export type SheetView = { name: string; code: string; hex: string; lrv: number; meta: string; bookHref: string };
/** A swatch in the strip. */
export type SheetShade = { id: string; name: string; code: string; hex: string };

/** Pixels from the strip's end at which the next page of shades is asked for. */
export const NEAR_END_PX = 240;

// Phones: the selected shade on the room, as large as the screen allows, with the loaded shades
// in a swipeable strip underneath, so a visitor keeps picking while looking at the big room.
// A dialog over the page (the grid stays where it was behind it): × , Escape and the phone's Back
// close it. The room fills the space between the header and the strip, cover-cropped around the
// centre like the photo, so the wall tint stays aligned.
export function PreviewSheet({
  view,
  shades,
  selectedId,
  onSelect,
  onClose,
  onNearEnd,
}: {
  view: SheetView;
  shades: SheetShade[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** The strip was scrolled close to its end: load more shades if there are any. */
  onNearEnd?: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const strip = useRef<HTMLUListElement>(null);

  // Focus moves into the dialog; the page behind stops scrolling; focus returns on close.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);

  // The picked swatch stays in view as the visitor swipes and taps.
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`);
    el?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialog.current) return;
    // keep Tab inside the dialog
    const focusable = [...dialog.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onScroll = (e: UIEvent<HTMLUListElement>) => {
    const el = e.currentTarget;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - NEAR_END_PX) onNearEnd?.();
  };

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-shade"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 flex flex-col bg-canvas px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-1 h-9 w-9 shrink-0 rounded-xl border border-line" style={{ background: view.hex }} />
        <div className="min-w-0 flex-1">
          <h2 id="sheet-shade" className="truncate font-display text-2xl font-normal leading-tight">{view.name}</h2>
          <p className="truncate text-xs font-semibold text-muted">{view.code} · {view.meta}</p>
        </div>
        <button
          ref={close}
          type="button"
          onClick={onClose}
          aria-label="Close the large preview"
          className="-mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="mt-3 min-h-0 flex-1">
        <WallPreview colour={view} compact frameClassName="!w-full h-full" sizes="100vw" className="h-full !rounded-3xl" />
      </div>

      <ul
        ref={strip}
        onScroll={onScroll}
        aria-label="Shades"
        className="chip-row -mx-4 mt-3 flex shrink-0 gap-2 overflow-x-auto px-4 py-1"
      >
        {shades.map((s) => {
          const on = s.id === selectedId;
          return (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                data-id={s.id}
                onClick={() => onSelect(s.id)}
                aria-pressed={on}
                aria-label={`${s.name} ${s.code}`}
                className={`block h-12 w-12 rounded-xl border transition ${on ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-canvas" : "border-line"}`}
                style={{ background: s.hex }}
              />
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex shrink-0 items-center gap-3">
        <Link href={view.bookHref} className="btn-primary min-h-11 flex-1 justify-center whitespace-nowrap text-sm">Book an inspection with this shade</Link>
      </div>
    </div>
  );
}
