"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { colourFamilies, colours, rooms, type Colour, type ColourFamily, type Room } from "@/config/colours";
import { finishSummary } from "@/lib/colours/guide";
import { isFamily, isRoom, searchColours } from "@/lib/colours/search";
import { useUrlQuery } from "../useUrlQuery";
import { WallPreview } from "./WallPreview";

/** A brand shade as the API returns it (see /api/v1/colours/paint). */
export type BrandShadeItem = {
  id: string;
  brand: string;
  brandName: string;
  code: string;
  name: string;
  hex: string;
  lrv: number;
  family: string;
  undertone: string;
  interior: boolean;
  exterior: boolean;
};
export type BrandInfo = { slug: string; name: string; count: number };

type Catalogue = "ours" | "brands";
type Props = {
  initialQuery?: string;
  initialFamily?: string;
  initialRoom?: string;
  initialCatalogue?: string;
  initialBrand?: string;
  /** brand-shade catalogue facts, passed from the server page */
  brands?: BrandInfo[];
  brandFamilies?: string[];
  brandTotal?: number;
  attribution?: { text: string; source: string; licenseUrl: string };
  /** Pages of brand shades infinite scroll loads by itself; after that the Show more button takes over, so the DOM stays bounded. */
  autoLoadPages?: number;
};

/** What the preview panels show, for either catalogue. */
type View = {
  key: string;
  name: string;
  code: string;
  hex: string;
  lrv: number;
  eyebrow: string;
  meta: string;
  note?: string;
  goodFor?: string;
  bookHref: string;
  tryHref: string;
  detailsHref?: string;
};

const ourView = (c: Colour): View => ({
  key: c.code,
  name: c.name,
  code: c.code,
  hex: c.hex,
  lrv: c.lrv,
  eyebrow: c.family,
  meta: `${c.hex.toUpperCase()} · LRV ${c.lrv} · ${finishSummary(c)}`,
  note: c.note,
  goodFor: c.rooms.join(", "),
  bookHref: `/book?colour=${c.code}`,
  tryHref: `/visualizer?colour=${c.code}`,
  detailsHref: `/colours/${c.code}`,
});

const brandView = (s: BrandShadeItem): View => ({
  key: s.id,
  name: s.name,
  code: `${s.brandName} ${s.code}`,
  hex: s.hex,
  lrv: s.lrv,
  eyebrow: s.brandName,
  meta: `${s.hex.toUpperCase()} · LRV ${s.lrv} · ${cap(s.family)} · ${s.undertone}`,
  note: s.interior && s.exterior ? "Made for interior and exterior walls." : s.exterior ? "An exterior shade." : "An interior shade.",
  bookHref: `/book?shade=${encodeURIComponent(s.id)}`,
  tryHref: `/visualizer?shade=${encodeURIComponent(s.id)}`,
});

/** A representative swatch per PaintDB colour family, for the primary-colour chips. */
const FAMILY_SWATCH: Record<string, string> = {
  white: "#f6f3ec", beige: "#e3d3b8", yellow: "#f0cf63", orange: "#ee9a57", pink: "#eaa3a8", red: "#c4473f",
  purple: "#8c6fa8", blue: "#6c93c4", green: "#7fa77a", gray: "#a3a39e", brown: "#8a5a3c", black: "#2a2a28",
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Shades per load: 12 rows of 4 on a phone, 16 rows of 3 on desktop (about 10 KB). */
export const PER_PAGE = 48;
/** Infinite scroll stops after this many pages (about 960 tiles); "Show more" still loads the rest. */
export const AUTO_LOAD_PAGES = 20;
type PageResp = { data: BrandShadeItem[]; meta: { total: number; page: number; pages: number } };

const tileClass = (on: boolean) =>
  `group block w-full overflow-hidden rounded-xl border bg-paper text-left transition hover:-translate-y-0.5 sm:rounded-[1.25rem] ${on ? "border-ink ring-2 ring-ink sm:ring-0 sm:shadow-[6px_6px_0_var(--pm-shadow-ink)]" : "border-line sm:shadow-[3px_3px_0_var(--pm-shadow-ink)]"}`;

/** A plain primary click, the kind a tile turns into "show it on the wall"; anything else (new tab, download) is left to the browser. */
const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

// A Paint Man shade tile is a real link to the shade's page, so crawlers and no-JS visitors
// reach every shade from here; with JS a plain click shows it on the wall instead, and
// ctrl/cmd/middle click still opens the page. Memoised: a tap re-renders only the two tiles
// whose selected state flips.
const ShadeTile = memo(function ShadeTile({ colour: c, selected, onSelect }: { colour: Colour; selected: boolean; onSelect: (c: Colour) => void }) {
  return (
    <Link
      href={`/colours/${c.code}`}
      prefetch={false}
      aria-current={selected ? "true" : undefined}
      onClick={(e) => {
        if (!isPlainClick(e)) return;
        e.preventDefault();
        onSelect(c);
      }}
      className={tileClass(selected)}
    >
      <span className="block h-14 border-b border-line sm:h-24" style={{ background: c.hex }} />
      <span className="block p-1.5 sm:p-3">
        <span className="block truncate font-display text-[12px] font-normal leading-tight sm:text-base">{c.name}</span>
        <span className="mt-0.5 flex items-center justify-between text-[10px] font-semibold text-muted sm:mt-1 sm:text-xs">
          <span>{c.code}</span>
          <span className="hidden sm:inline">{c.family}</span>
        </span>
      </span>
    </Link>
  );
});

// Brand shades have no pages of their own, so their tiles stay toggle buttons. Off-screen tiles
// skip style and layout work (content-visibility) on the button itself: on the grid cell, its
// paint containment would clip the tile's selected ring, offset shadow and hover lift, which
// paint outside the button's box. The reserved size is per breakpoint (phone tiles are shorter).
const BrandTile = memo(function BrandTile({ shade: s, selected, showBrand, onSelect }: { shade: BrandShadeItem; selected: boolean; showBrand: boolean; onSelect: (s: BrandShadeItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(s)}
      aria-pressed={selected}
      className={`${tileClass(selected)} [content-visibility:auto] [contain-intrinsic-size:auto_100px] sm:[contain-intrinsic-size:auto_164px]`}
    >
      <span className="block h-14 border-b border-line sm:h-24" style={{ background: s.hex }} />
      <span className="block p-1.5 sm:p-3">
        <span className="block truncate font-display text-[12px] font-normal leading-tight sm:text-base">{s.name}</span>
        <span className="mt-0.5 flex items-center justify-between gap-2 text-[10px] font-semibold text-muted sm:mt-1 sm:text-xs">
          <span className="truncate">{s.code}</span>
          <span className="hidden truncate sm:inline">{showBrand ? s.brandName : ""}</span>
        </span>
      </span>
    </button>
  );
});

// Two catalogues in one finder. Paint Man shades: our 167, filtered in the browser (the full
// grid is server-rendered for crawlers). Brand shades: 50,000+ real shades from 25 brands,
// searched on the server one page at a time (/api/v1/colours/paint). Either way a tap shows
// the shade on the same room, pinned on phones and beside the list on wide screens.
export function ColourFinder({
  initialQuery = "",
  initialFamily,
  initialRoom,
  initialCatalogue,
  initialBrand,
  brands = [],
  brandFamilies = [],
  brandTotal = 0,
  attribution,
  autoLoadPages = AUTO_LOAD_PAGES,
}: Props) {
  const [catalogue, setCatalogue] = useState<Catalogue>(initialCatalogue === "brands" && brandTotal > 0 ? "brands" : "ours");

  // --- Paint Man shades
  const [q, setQ] = useState(initialCatalogue === "brands" ? "" : initialQuery);
  const [family, setFamily] = useState<ColourFamily | undefined>(isFamily(initialFamily) ? initialFamily : undefined);
  const [room, setRoom] = useState<Room | undefined>(isRoom(initialRoom) ? initialRoom : undefined);
  const [selected, setSelected] = useState<Colour | null>(null);
  const results = useMemo(() => searchColours({ q, family, room }), [q, family, room]);

  // --- Brand shades: pick a brand → (optionally) a primary colour → scroll, or search
  const [bq, setBq] = useState(initialCatalogue === "brands" ? initialQuery : "");
  const [brand, setBrand] = useState(brands.some((b) => b.slug === initialBrand) ? initialBrand! : "");
  const [bFamily, setBFamily] = useState("");
  const [bSort, setBSort] = useState<"shade" | "code" | "name">("shade");
  const [bItems, setBItems] = useState<BrandShadeItem[]>([]);
  const [bTotal, setBTotal] = useState(0);
  const [bPage, setBPage] = useState(0);
  const [bPages, setBPages] = useState(1);
  const [bState, setBState] = useState<"idle" | "loading" | "error">("idle");
  const [bSelected, setBSelected] = useState<BrandShadeItem | null>(null);
  const showBrandGrid = catalogue === "brands" && !brand && !bq.trim();

  // Every page already loaded stays in memory: scrolling back, or returning to a colour family
  // or brand opened before, never asks the server again. (The server answers from memory and
  // Vercel's edge caches each page, so a first load is one short trip.)
  const pageCache = useRef(new Map<string, Promise<PageResp>>());
  const fetchPage = useCallback((page: number) => {
    const sp = new URLSearchParams({ perPage: String(PER_PAGE), page: String(page) });
    if (bq.trim()) sp.set("q", bq.trim());
    if (brand) sp.set("brand", brand);
    if (bFamily) sp.set("family", bFamily);
    if (bSort !== "shade") sp.set("sort", bSort);
    const key = sp.toString();
    let hit = pageCache.current.get(key);
    if (!hit) {
      hit = fetch(`/api/v1/colours/paint?${sp}`).then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as PageResp;
      });
      hit.catch(() => pageCache.current.delete(key)); // a failed page is retried next time
      pageCache.current.set(key, hit);
    }
    return hit;
  }, [bq, brand, bFamily, bSort]);

  // first page whenever the brand, colour family or search changes
  useEffect(() => {
    if (catalogue !== "brands" || showBrandGrid) return;
    let live = true;
    setBState("loading");
    setBItems([]);
    const t = setTimeout(async () => {
      try {
        const json = await fetchPage(1);
        if (!live) return;
        setBItems(json.data);
        setBTotal(json.meta.total);
        setBPage(json.meta.page);
        setBPages(json.meta.pages);
        setBState("idle");
      } catch {
        if (live) setBState("error");
      }
    }, bq.trim() ? 250 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [catalogue, showBrandGrid, fetchPage, bq]);

  // infinite scroll: the next page loads about a screen before the end of the list
  const loadingMore = useRef(false);
  const loadMore = useCallback(async () => {
    if (loadingMore.current || bPage >= bPages || bState === "error") return;
    loadingMore.current = true;
    try {
      const json = await fetchPage(bPage + 1);
      setBItems((items) => {
        const seen = new Set(items.map((i) => i.id));
        return [...items, ...json.data.filter((s) => !seen.has(s.id))];
      });
      setBPage(json.meta.page);
      setBPages(json.meta.pages);
    } catch {
      setBState("error");
    } finally {
      loadingMore.current = false;
    }
  }, [bPage, bPages, bState, fetchPage]);
  const sentinel = useRef<HTMLDivElement>(null);
  const autoLoad = bPage < autoLoadPages;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !autoLoad || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) void loadMore(); }, { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, bItems.length, autoLoad]);

  const brandInfo = brands.find((b) => b.slug === brand);

  // Keep the URL shareable without a navigation.
  useEffect(() => {
    const sp = new URLSearchParams();
    if (catalogue === "brands") {
      sp.set("catalogue", "brands");
      if (bq) sp.set("q", bq);
      if (brand) sp.set("brand", brand);
    } else {
      if (q) sp.set("q", q);
      if (family) sp.set("family", family);
      if (room) sp.set("room", room);
    }
    window.history.replaceState(null, "", `${window.location.pathname}${sp.size ? `?${sp}` : ""}`);
  }, [catalogue, q, family, room, bq, brand]);

  const ourActive = selected && results.includes(selected) ? selected : results[0] ?? null;
  const brandActive = bSelected && bItems.some((s) => s.id === bSelected.id) ? bSelected : bItems[0] ?? null;
  const view: View | null = catalogue === "brands" ? (brandActive ? brandView(brandActive) : null) : ourActive ? ourView(ourActive) : null;

  const chipRow = "chip-row -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0";

  return (
    // Wide screens: the list on the left and the preview in a sticky column beside it.
    // Phones: a compact preview pinned under the header, with search, swipeable filters and a
    // dense swatch grid below it, so every tap shows on the wall without scrolling.
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_440px]">
      {view && (
        <div role="group" aria-label="Selected shade preview" className="sticky top-[73px] z-20 -mx-5 mb-4 border-b border-line-soft bg-canvas/95 px-5 pb-3 pt-2 backdrop-blur-md lg:hidden">
          {/* the whole room on the left, the shade and its actions on the right */}
          <div className="flex items-stretch gap-3">
            <WallPreview colour={view} compact frameClassName="h-[26svh] min-h-[180px] max-h-[240px]" sizes="45vw" className="shrink-0 !rounded-2xl" />
            <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
              <div>
                <span className="block h-7 w-7 rounded-lg border border-line" style={{ background: view.hex }} />
                <p className="mt-2 font-display text-[19px] leading-tight">{view.name}</p>
                <p className="mt-0.5 text-xs font-semibold text-muted">{view.code}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-muted">{view.hex.toUpperCase()} · LRV {view.lrv}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link href={view.bookHref} className="btn-primary !min-h-11 !px-3.5 !py-1.5 text-xs">Book</Link>
                {view.detailsHref && <Link href={view.detailsHref} className="inline-flex min-h-11 items-center text-xs font-semibold underline underline-offset-2">Details</Link>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="card p-4 md:p-7">
          {brandTotal > 0 && (
            <div role="group" aria-label="Catalogue" className="mb-4 inline-flex w-full gap-1 rounded-full border border-line p-1 text-sm font-semibold sm:w-auto">
              <button type="button" aria-pressed={catalogue === "ours"} onClick={() => setCatalogue("ours")} className={`flex-1 rounded-full px-3.5 py-1.5 sm:flex-none ${catalogue === "ours" ? "bg-ink text-on-ink" : "hover:bg-cream-wash"}`}>
                Paint Man shades ({colours.length})
              </button>
              <button type="button" aria-pressed={catalogue === "brands"} onClick={() => setCatalogue("brands")} className={`flex-1 rounded-full px-3.5 py-1.5 sm:flex-none ${catalogue === "brands" ? "bg-ink text-on-ink" : "hover:bg-cream-wash"}`}>
                Brand shades ({brandTotal.toLocaleString("en-IN")})
              </button>
            </div>
          )}

          {catalogue === "ours" ? (
            <>
              <label htmlFor="colour-q" className="block text-sm font-bold">Search by name, code, hex or mood</label>
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
                  <button type="button" onClick={() => { setQ(""); setFamily(undefined); setRoom(undefined); }} className="btn-secondary !py-2.5 text-sm">
                    Clear
                  </button>
                )}
              </div>

              {/* phones: one swipeable row per filter group; wider: wrapped */}
              <div className={`${chipRow} mt-4 md:mt-5`} role="group" aria-label="Colour family">
                {colourFamilies.map((f) => (
                  <button key={f} type="button" aria-pressed={family === f} onClick={() => setFamily(family === f ? undefined : f)} className={`shrink-0 rounded-full border border-line px-3.5 py-1.5 text-sm font-bold transition ${family === f ? "bg-ink text-on-ink" : "bg-paper hover:bg-cream-wash"}`}>
                    {f}
                  </button>
                ))}
              </div>
              <div className={`${chipRow} mt-2.5 md:mt-3`} role="group" aria-label="Room">
                {rooms.map((r) => (
                  <button key={r} type="button" aria-pressed={room === r} onClick={() => setRoom(room === r ? undefined : r)} className={`shrink-0 rounded-full border border-line px-3 py-1 text-xs font-bold transition ${room === r ? "border-ink bg-sky-wash" : "bg-paper hover:border-line-strong"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {brandInfo && (
                <div className="mb-3 flex items-center gap-3">
                  <button type="button" onClick={() => { setBrand(""); setBFamily(""); setBq(""); setBSelected(null); }} className="text-sm font-semibold text-muted underline underline-offset-2">
                    ← All brands
                  </button>
                  <p className="font-display text-lg">{brandInfo.name} <span className="font-sans text-sm text-muted">({brandInfo.count.toLocaleString("en-IN")} shades)</span></p>
                </div>
              )}
              <label htmlFor="brand-q" className="block text-sm font-bold">
                {brandInfo ? `Search ${brandInfo.name} by code, name or hex` : "Search all brands by code, name or hex"}
              </label>
              <input
                id="brand-q"
                type="search"
                value={bq}
                onChange={(e) => setBq(e.target.value)}
                placeholder={brandInfo ? "e.g. 7982, Mecca Gold, #e7975b" : "e.g. Asian Paints 7982, Berger 3P0050, #b8c7b0"}
                autoComplete="off"
                className="field mt-2 w-full text-base"
              />
              {brandInfo && !bq.trim() && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <label htmlFor="brand-sort" className="font-semibold text-muted">Sort</label>
                  <select id="brand-sort" value={bSort} onChange={(e) => setBSort(e.target.value as typeof bSort)} className="field !w-auto !py-1.5 text-sm">
                    <option value="shade">Shade card (similar colours together, light → dark)</option>
                    <option value="code">Shade code</option>
                    <option value="name">Name (A–Z)</option>
                  </select>
                </div>
              )}
              {brandInfo && (
                <div className={`${chipRow} mt-4`} role="group" aria-label="Primary colour">
                  {["", ...brandFamilies].map((f) => (
                    <button key={f || "all"} type="button" aria-pressed={bFamily === f} onClick={() => setBFamily(f)} className={`flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm font-bold transition ${bFamily === f ? "bg-ink text-on-ink" : "bg-paper hover:bg-cream-wash"}`}>
                      {f && <span aria-hidden className="h-3 w-3 rounded-full border border-line" style={{ background: FAMILY_SWATCH[f] ?? "#ccc" }} />}
                      {f ? cap(f) : "All colours"}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {catalogue === "ours" ? (
          <>
            <p className="mt-6 hidden text-sm text-muted md:block">
              Want a brand&apos;s shade card instead? Switch to <button type="button" onClick={() => setCatalogue("brands")} className="font-semibold text-cobalt-text underline">Brand shades</button>, or see any colour on your own photo in the <Link href="/visualizer" className="font-semibold text-cobalt-text underline">visualizer</Link>.
            </p>
            <p className="mt-4 text-sm font-semibold text-muted md:mt-6" aria-live="polite">
              {results.length === 0
                ? "No shade matches that. Try a family or a room above, or a hex like #b8c7b0."
                : `${results.length} shade${results.length === 1 ? "" : "s"}${q ? ` for “${q}”` : ""}${family ? ` in ${family}` : ""}. Tap one to see it on the wall.`}
            </p>
            <ul className="mt-3 grid grid-cols-4 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-4" aria-label="Shades">
              {results.map((c) => (
                <li key={c.code}>
                  <ShadeTile colour={c} selected={ourActive?.code === c.code} onSelect={setSelected} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            {showBrandGrid ? (
              <>
                <p className="mt-4 text-sm font-semibold text-muted md:mt-6">Choose a brand to see its shade card, or search above.</p>
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3" aria-label="Paint brands">
                  {brands.map((b) => (
                    <li key={b.slug}>
                      <button type="button" onClick={() => { setBrand(b.slug); setBFamily(""); setBSelected(null); }} className="flex w-full flex-col items-start rounded-2xl border border-line bg-paper p-3 text-left transition hover:-translate-y-0.5 hover:border-ink sm:p-4">
                        <span className="font-display text-base leading-tight sm:text-lg">{b.name}</span>
                        <span className="mt-0.5 text-xs font-semibold text-muted">{b.count.toLocaleString("en-IN")} shades</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="mt-4 text-sm font-semibold text-muted md:mt-6" aria-live="polite">
                  {bState === "error"
                    ? "Brand shades are unavailable right now. Try again in a minute."
                    : bState === "loading" && bItems.length === 0
                      ? "Loading shades…"
                      : bTotal === 0
                        ? "No shade matches that. Try a code like 7982, a name, or a hex like #b8c7b0."
                        : `${bTotal.toLocaleString("en-IN")} shade${bTotal === 1 ? "" : "s"}${bq ? ` for “${bq}”` : ""}${bFamily ? ` · ${cap(bFamily)}` : ""}. Tap one to see it on the wall.`}
                </p>
                <ul className="mt-3 grid grid-cols-4 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-4" aria-label="Brand shades">
                  {bItems.map((s) => (
                    <li key={s.id}>
                      <BrandTile shade={s} selected={brandActive?.id === s.id} showBrand={!brand} onSelect={setBSelected} />
                    </li>
                  ))}
                </ul>
                {/* infinite scroll trigger, plus a button for keyboard users and old browsers */}
                <div ref={sentinel} aria-hidden className="h-px" />
                {bPage < bPages && bState !== "error" && bItems.length > 0 && (
                  <button type="button" onClick={() => void loadMore()} className="btn-secondary mt-5 w-full sm:w-auto">
                    Show more ({(bTotal - bItems.length).toLocaleString("en-IN")} left)
                  </button>
                )}
              </>
            )}
            {attribution && (
              <p className="mt-5 text-xs leading-relaxed text-muted">
                Brand shades: <a href={attribution.source} className="underline" rel="noopener" target="_blank">PaintDB</a>, licensed{" "}
                <a href={attribution.licenseUrl} className="underline" rel="noopener license" target="_blank">CC BY 4.0</a>. On-screen colours approximate each brand&apos;s
                published shade. Paint Man isn&apos;t affiliated with these brands; the inspector brings the real shade card.
              </p>
            )}
          </>
        )}
      </div>

      {!view && catalogue === "brands" && (
        <aside className="hidden rounded-[2rem] border border-dashed border-line-strong bg-paper p-8 text-center lg:sticky lg:top-24 lg:block">
          <p className="font-display text-2xl">Pick a brand</p>
          <p className="mt-2 text-sm text-muted">Then a primary colour, or scroll its whole shade card. Every shade you tap shows on the room here.</p>
        </aside>
      )}

      {view && (
        <section className="hidden rounded-[2rem] border border-line bg-paper p-5 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto" aria-labelledby="active-colour">
          <WallPreview colour={view} maxHeight="min(56vh, 600px)" sizes="(min-width: 1280px) 440px, (min-width: 1024px) 400px, 100vw" />
          <div className="mt-5 flex items-center gap-4">
            <span className="h-14 w-14 shrink-0 rounded-2xl border border-line" style={{ background: view.hex }} />
            <div className="min-w-0">
              <p className="eyebrow">{view.eyebrow}</p>
              <h2 id="active-colour" className="mt-1 text-2xl font-normal md:text-3xl">
                {view.name} <span className="font-sans text-base font-semibold text-muted">{view.code}</span>
              </h2>
              <p className="mt-1 text-sm font-semibold text-muted">{view.meta}</p>
            </div>
          </div>
          {view.note && <p className="mt-4 text-base text-ink">{view.note}</p>}
          {view.goodFor && <p className="mt-2 text-sm text-muted">Good for: {view.goodFor}.</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={view.bookHref} className="btn-primary">Book an inspection with this shade</Link>
            <Link href={view.tryHref} className="btn-secondary">Try on your wall</Link>
            {view.detailsHref && <Link href={view.detailsHref} className="btn-secondary">Full details</Link>}
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

const MemoColourFinder = memo(ColourFinder);

/**
 * The finder with its starting search, filters and catalogue read from the URL in the browser
 * (/colours?family=Greens, /colours?catalogue=brands&brand=berger&q=3P0050), so /colours itself
 * stays a static page. The server HTML is the finder with no filters, which carries a link to
 * every shade page and hydrates in place. A link with filters then remounts the finder once with
 * them (the finder holds its search and filters in its own state); without any, nothing remounts.
 */
export function ColourFinderFromUrl(props: Omit<Props, "initialQuery" | "initialFamily" | "initialRoom" | "initialCatalogue" | "initialBrand">) {
  // Read once: later URL changes are the finder's own (it keeps the URL shareable as you filter).
  const params = useUrlQuery({ once: true });
  const initial = {
    initialQuery: params.get("q") ?? undefined,
    initialFamily: params.get("family") ?? undefined,
    initialRoom: params.get("room") ?? undefined,
    initialCatalogue: params.get("catalogue") ?? undefined,
    initialBrand: params.get("brand") ?? undefined,
  };
  const key = JSON.stringify(Object.values(initial));
  return <MemoColourFinder key={key} {...props} {...initial} />;
}
