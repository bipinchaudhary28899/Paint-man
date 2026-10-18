"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { colourFamilies, rooms, type Colour, type ColourFamily, type Room } from "@/config/colours";
import { isFamily, isRoom, searchColours } from "@/lib/colours/search";
import { WallPreview } from "./WallPreview";

type Props = { initialQuery?: string; initialFamily?: string; initialRoom?: string };

// Search the shade catalogue by name, code, hex, room or mood; tap a shade to see it on
// three ordinary walls. Pure client-side filtering over a small catalogue, so results are
// instant and the full grid is server-rendered for crawlers.
export function ColourFinder({ initialQuery = "", initialFamily, initialRoom }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [family, setFamily] = useState<ColourFamily | undefined>(isFamily(initialFamily) ? initialFamily : undefined);
  const [room, setRoom] = useState<Room | undefined>(isRoom(initialRoom) ? initialRoom : undefined);
  const [selected, setSelected] = useState<Colour | null>(null);

  const results = useMemo(() => searchColours({ q, family, room }), [q, family, room]);

  // Keep the URL shareable without a navigation.
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (family) sp.set("family", family);
    if (room) sp.set("room", room);
    const url = `${window.location.pathname}${sp.size ? `?${sp}` : ""}`;
    window.history.replaceState(null, "", url);
  }, [q, family, room]);

  const active = selected && results.includes(selected) ? selected : results[0] ?? null;

  return (
    // Wide screens: the list on the left and the preview in a sticky column beside it.
    // Phones: a compact preview pinned under the header, with search, swipeable filters and a
    // dense swatch grid below it, so every tap shows on the wall without scrolling.
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_440px]">
      {active && (
        <div className="sticky top-[73px] z-20 -mx-5 mb-4 border-b border-line-soft bg-canvas/95 px-5 pb-3 pt-2 backdrop-blur-md lg:hidden" aria-label="Selected shade preview">
          <WallPreview colour={active} compact frameClassName="h-[30svh] min-h-[170px]" sizes="100vw" className="!rounded-2xl" />
          <div className="mt-2.5 flex items-center gap-3">
            <span className="h-9 w-9 shrink-0 rounded-xl border border-line" style={{ background: active.hex }} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[19px] leading-tight">
                {active.name} <span className="font-sans text-xs font-semibold text-muted">{active.code}</span>
              </p>
              <p className="text-[11px] font-semibold text-muted">{active.hex.toUpperCase()} · LRV {active.lrv}</p>
            </div>
            <Link href={`/colours/${active.code}`} className="shrink-0 text-xs font-semibold underline underline-offset-2">Details</Link>
            <Link href={`/book?colour=${active.code}`} className="btn-primary shrink-0 !min-h-[36px] !px-3.5 !py-1.5 text-xs">Book</Link>
          </div>
        </div>
      )}

      <div>
      <div className="card p-4 md:p-7">
        <label htmlFor="colour-q" className="block text-sm font-bold">
          Search by name, code, hex or mood
        </label>
        <div className="mt-2 flex flex-wrap gap-3">
          <input
            id="colour-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. sage, PM-502, #b8c7b0, pooja room, warm"
            autoComplete="off"
            className="field min-w-0 flex-1 text-base"
          />
          {(q || family || room) && (
            <button
              type="button"
              onClick={() => { setQ(""); setFamily(undefined); setRoom(undefined); }}
              className="btn-secondary !py-2.5 text-sm"
            >
              Clear
            </button>
          )}
        </div>

        {/* phones: one swipeable row per filter group; wider: wrapped */}
        <div className="chip-row -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:mt-5 md:flex-wrap md:overflow-visible md:px-0 md:pb-0" role="group" aria-label="Colour family">
          {colourFamilies.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={family === f}
              onClick={() => setFamily(family === f ? undefined : f)}
              className={`shrink-0 rounded-full border border-line px-3.5 py-1.5 text-sm font-bold transition ${family === f ? "bg-ink text-on-ink" : "bg-paper hover:bg-cream-wash"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="chip-row -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:mt-3 md:flex-wrap md:overflow-visible md:px-0 md:pb-0" role="group" aria-label="Room">
          {rooms.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={room === r}
              onClick={() => setRoom(room === r ? undefined : r)}
              className={`shrink-0 rounded-full border border-line px-3 py-1 text-xs font-bold transition ${room === r ? "border-ink bg-sky-wash" : "bg-paper hover:border-line-strong"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 hidden text-sm text-muted md:block">
        Need a shade that isn&apos;t here? The <Link href="/visualizer" className="font-semibold text-cobalt-text underline">visualizer</Link> also searches 32,000 named colours and shows any of them on your own photo.
      </p>
      <p className="mt-4 text-sm font-semibold text-muted md:mt-6" aria-live="polite">
        {results.length === 0
          ? "No shade matches that. Try a family or a room above, or a hex like #b8c7b0."
          : `${results.length} shade${results.length === 1 ? "" : "s"}${q ? ` for “${q}”` : ""}${family ? ` in ${family}` : ""}. Tap one to see it on the wall.`}
      </p>

      <ul className="mt-3 grid grid-cols-4 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-4" aria-label="Shades">
        {results.map((c) => {
          const isActive = active?.code === c.code;
          return (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => setSelected(c)}
                aria-pressed={isActive}
                className={`group block w-full overflow-hidden rounded-xl border bg-paper text-left transition hover:-translate-y-0.5 sm:rounded-[1.25rem] ${isActive ? "border-ink ring-2 ring-ink sm:ring-0 sm:shadow-[6px_6px_0_var(--pm-shadow-ink)]" : "border-line sm:shadow-[3px_3px_0_var(--pm-shadow-ink)]"}`}
              >
                <span className="block h-14 border-b border-line sm:h-24" style={{ background: c.hex }} />
                <span className="block p-1.5 sm:p-3">
                  <span className="block truncate font-display text-[12px] font-normal leading-tight sm:text-base">{c.name}</span>
                  <span className="mt-0.5 flex items-center justify-between text-[10px] font-semibold text-muted sm:mt-1 sm:text-xs">
                    <span>{c.code}</span>
                    <span className="hidden sm:inline">{c.family}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      </div>

      {active && (
        <section className="hidden rounded-[2rem] border border-line bg-paper p-5 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto" aria-labelledby="active-colour">
          <WallPreview colour={active} sizes="(min-width: 1280px) 440px, (min-width: 1024px) 400px, 100vw" />
          <div className="mt-5 flex items-center gap-4">
            <span className="h-14 w-14 shrink-0 rounded-2xl border border-line" style={{ background: active.hex }} />
            <div className="min-w-0">
              <p className="eyebrow">{active.family}</p>
              <h2 id="active-colour" className="mt-1 text-2xl font-normal md:text-3xl">
                {active.name} <span className="font-sans text-base font-semibold text-muted">{active.code}</span>
              </h2>
              <p className="mt-1 text-sm font-semibold text-muted">
                {active.hex.toUpperCase()} · LRV {active.lrv} · {active.finish}
              </p>
            </div>
          </div>
          <p className="mt-4 text-base text-ink">{active.note}</p>
          <p className="mt-2 text-sm text-muted">Good for: {active.rooms.join(", ")}.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/book?colour=${active.code}`} className="btn-primary">Book an inspection with this shade</Link>
            <Link href={`/visualizer?colour=${active.code}`} className="btn-secondary">Try on your wall</Link>
            <Link href={`/colours/${active.code}`} className="btn-secondary">Full details</Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            Screen colours are a guide. Paint shifts with daylight, bulbs and sheen, so our inspector brings physical shade cards
            and paints a test patch before you decide.
          </p>
        </section>
      )}
    </div>
  );
}
