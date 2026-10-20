"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { shadeDisplayName } from "@/config/palettes";
import { useUrlQuery } from "../useUrlQuery";
import { PreviewSheet } from "./PreviewSheet";
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

/** The browse orders /api/v1/colours/paint knows. */
export const SORTS = ["shade", "code", "name"] as const;
type Sort = (typeof SORTS)[number];
const isSort = (s: unknown): s is Sort => typeof s === "string" && (SORTS as readonly string[]).includes(s);

type Props = {
  initialQuery?: string;
  initialBrand?: string;
  initialFamily?: string;
  initialSort?: string;
  /** brand-shade catalogue facts, passed from the server page (the catalogue itself is server-only) */
  brands?: BrandInfo[];
  brandFamilies?: string[];
  brandTotal?: number;
  attribution?: { text: string; source: string; licenseUrl: string };
  /** Pages of brand shades infinite scroll loads by itself; after that the Show more button takes over, so the DOM stays bounded. */
  autoLoadPages?: number;
};

/** What the preview panels show for the selected shade. */
type View = {
  name: string;
  code: string;
  hex: string;
  lrv: number;
  eyebrow: string;
  meta: string;
  note: string;
  bookHref: string;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// PaintDB keeps a brand's suffix on some names ("Malibu Green-n"); visitors see the clean name.
const brandView = (s: BrandShadeItem): View => ({
  name: shadeDisplayName(s.name),
  code: `${s.brandName} ${s.code}`,
  hex: s.hex,
  lrv: s.lrv,
  eyebrow: s.brandName,
  meta: `${s.hex.toUpperCase()} · LRV ${s.lrv} · ${cap(s.family)} · ${s.undertone}`,
  note: s.interior && s.exterior ? "Made for interior and exterior walls." : s.exterior ? "An exterior shade." : "An interior shade.",
  bookHref: `/book?shade=${encodeURIComponent(s.id)}`,
});

/** A representative swatch per PaintDB colour family, for the primary-colour chips. */
const FAMILY_SWATCH: Record<string, string> = {
  white: "#f6f3ec", beige: "#e3d3b8", yellow: "#f0cf63", orange: "#ee9a57", pink: "#eaa3a8", red: "#c4473f",
  purple: "#8c6fa8", blue: "#6c93c4", green: "#7fa77a", gray: "#a3a39e", brown: "#8a5a3c", black: "#2a2a28",
};
/** Shades per load: 12 rows of 4 on a phone, 16 rows of 3 on desktop (about 10 KB). */
export const PER_PAGE = 48;
/** Infinite scroll stops after this many pages (about 960 tiles); "Show more" still loads the rest. */
export const AUTO_LOAD_PAGES = 20;
type PageResp = { data: BrandShadeItem[]; meta: { total: number; page: number; pages: number } };

// Hairline tiles; the selected one gets an ink ring (the design system has no hard offset shadows).
const tileClass = (on: boolean) =>
  `group block w-full overflow-hidden rounded-xl border bg-paper text-left transition hover:-translate-y-0.5 sm:rounded-[1.25rem] ${on ? "border-ink ring-2 ring-ink" : "border-line hover:border-line-strong"}`;

/** The finder's state as its shareable /colours query: the family and order only inside a brand. */
function finderSearch({ brand, q, family, sort }: { brand: string; q: string; family: string; sort: Sort }): string {
  const sp = new URLSearchParams();
  if (brand) sp.set("brand", brand);
  if (q) sp.set("q", q);
  if (brand && family) sp.set("family", family);
  if (brand && sort !== "shade") sp.set("sort", sort);
  return sp.size ? `?${sp}` : "";
}

/** A plain primary click, the kind a brand link turns into an in-page step; anything else (new tab, download) is left to the browser. */
const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

// Brand shades have no pages of their own, so their tiles are toggle buttons. Off-screen tiles
// skip style and layout work (content-visibility) on the button itself: on the grid cell, its
// paint containment would clip the tile's selected ring and hover lift, which
// paint outside the button's box. The reserved size is per breakpoint (phone tiles are shorter).
// Memoised: a tap re-renders only the two tiles whose selected state flips.
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
        <span className="block truncate font-display text-[12px] font-normal leading-tight sm:text-base">{shadeDisplayName(s.name)}</span>
        <span className="mt-0.5 flex items-center justify-between gap-2 text-[10px] font-semibold text-muted sm:mt-1 sm:text-xs">
          <span className="truncate">{s.code}</span>
          <span className="hidden truncate sm:inline">{showBrand ? s.brandName : ""}</span>
        </span>
      </span>
    </button>
  );
});

// The shade finder: 50,000+ real shades from 25 paint brands (PaintDB), searched on the server
// one page at a time (/api/v1/colours/paint). Pick a brand (each is a real link, so the static
// page links every brand), then a primary colour or scroll its whole shade card, or search by
// code, name or hex. A tap shows the shade on the same room, pinned on phones and beside the list
// on wide screens.
export function ColourFinder({
  initialQuery = "",
  initialBrand,
  initialFamily,
  initialSort,
  brands = [],
  brandFamilies = [],
  brandTotal = 0,
  attribution,
  autoLoadPages = AUTO_LOAD_PAGES,
}: Props) {
  const startBrand = brands.some((b) => b.slug === initialBrand) ? initialBrand! : "";
  const [q, setQ] = useState(initialQuery);
  const [brand, setBrand] = useState(startBrand);
  // a colour family only narrows a brand's card
  const [family, setFamily] = useState(startBrand && initialFamily && brandFamilies.includes(initialFamily) ? initialFamily : "");
  const [sort, setSort] = useState<Sort>(isSort(initialSort) ? initialSort : "shade");
  const [items, setItems] = useState<BrandShadeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [selected, setSelected] = useState<BrandShadeItem | null>(null);
  const showBrandGrid = !brand && !q.trim();
  // Phones: the large preview (PreviewSheet). Opening it pushes a history entry, so the phone's
  // Back button closes it instead of leaving the page.
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const openSheet = () => {
    window.history.pushState({ finderPreview: true }, "", window.location.href);
    expandedRef.current = true;
    setExpanded(true);
  };
  const closeSheet = useCallback(() => {
    if (!expandedRef.current) return;
    if ((window.history.state as { finderPreview?: boolean } | null)?.finderPreview) window.history.back(); // popstate closes it
    else {
      expandedRef.current = false;
      setExpanded(false);
    }
  }, []);
  // a phone turned to a wide screen gets the side panel instead
  useEffect(() => {
    if (!expanded || typeof window.matchMedia !== "function") return;
    const wide = window.matchMedia("(min-width: 1024px)");
    const onChange = () => { if (wide.matches) closeSheet(); };
    wide.addEventListener?.("change", onChange);
    return () => wide.removeEventListener?.("change", onChange);
  }, [expanded, closeSheet]);

  // Opening a brand, and going back to all brands, are steps a visitor expects Back to undo (the
  // brand tiles are links), so each pushes one history entry; Back then restores the step from the
  // URL. Typing, family chips and the order only replace the current entry.
  const chooseBrand = useCallback((slug: string) => {
    window.history.pushState(null, "", `${window.location.pathname}${finderSearch({ brand: slug, q: "", family: "", sort })}`);
    setBrand(slug);
    setFamily("");
    setSelected(null);
  }, [sort]);
  const allBrands = () => {
    window.history.pushState(null, "", window.location.pathname);
    setBrand("");
    setFamily("");
    setQ("");
    setSelected(null);
  };
  useEffect(() => {
    const onPopState = () => {
      // Back with the large preview open only closes it; the finder keeps its place
      if (expandedRef.current) {
        expandedRef.current = false;
        setExpanded(false);
        return;
      }
      const sp = new URLSearchParams(window.location.search);
      const nextBrand = brands.some((b) => b.slug === sp.get("brand")) ? sp.get("brand")! : "";
      const nextFamily = sp.get("family") ?? "";
      const nextSort = sp.get("sort");
      setBrand(nextBrand);
      setFamily(nextBrand && brandFamilies.includes(nextFamily) ? nextFamily : "");
      setQ(sp.get("q") ?? "");
      setSort(isSort(nextSort) ? nextSort : "shade");
      setSelected(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [brands, brandFamilies]);

  // Every page already loaded stays in memory: scrolling back, or returning to a colour family
  // or brand opened before, never asks the server again. (The server answers from memory, so a
  // first load is one short trip.)
  const pageCache = useRef(new Map<string, Promise<PageResp>>());
  const fetchPage = useCallback((n: number) => {
    const sp = new URLSearchParams({ perPage: String(PER_PAGE), page: String(n) });
    if (q.trim()) sp.set("q", q.trim());
    if (brand) sp.set("brand", brand);
    if (family) sp.set("family", family);
    if (sort !== "shade") sp.set("sort", sort);
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
  }, [q, brand, family, sort]);

  // first page whenever the brand, colour family, order or search changes
  useEffect(() => {
    if (showBrandGrid) return;
    let live = true;
    setState("loading");
    setItems([]);
    const t = setTimeout(async () => {
      try {
        const json = await fetchPage(1);
        if (!live) return;
        setItems(json.data);
        setTotal(json.meta.total);
        setPage(json.meta.page);
        setPages(json.meta.pages);
        setState("idle");
      } catch {
        if (live) setState("error");
      }
    }, q.trim() ? 250 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [showBrandGrid, fetchPage, q]);

  // infinite scroll: the next page loads about a screen before the end of the list
  const loadingMore = useRef(false);
  const loadMore = useCallback(async () => {
    if (loadingMore.current || page >= pages || state === "error") return;
    loadingMore.current = true;
    try {
      const json = await fetchPage(page + 1);
      setItems((list) => {
        const seen = new Set(list.map((i) => i.id));
        return [...list, ...json.data.filter((s) => !seen.has(s.id))];
      });
      setPage(json.meta.page);
      setPages(json.meta.pages);
    } catch {
      setState("error");
    } finally {
      loadingMore.current = false;
    }
  }, [page, pages, state, fetchPage]);
  const sentinel = useRef<HTMLDivElement>(null);
  const autoLoad = page < autoLoadPages;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !autoLoad || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) void loadMore(); }, { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, items.length, autoLoad]);

  const brandInfo = brands.find((b) => b.slug === brand);

  // Keep the URL shareable without a navigation.
  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}${finderSearch({ brand, q, family, sort })}`);
  }, [brand, q, family, sort]);

  const active = selected && items.some((s) => s.id === selected.id) ? selected : items[0] ?? null;
  const view: View | null = active ? brandView(active) : null;

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
            {/* tap the room for the large preview, where picking goes on */}
            <button type="button" onClick={openSheet} aria-label={`See ${view.name} larger`} className="relative shrink-0 rounded-2xl">
              <WallPreview colour={view} compact frameClassName="h-[26svh] min-h-[180px] max-h-[240px]" sizes="45vw" className="!rounded-2xl" />
              <span aria-hidden className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-canvas/90 shadow-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
              </span>
            </button>
            <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
              <div>
                <span className="block h-7 w-7 rounded-lg border border-line" style={{ background: view.hex }} />
                <p className="mt-2 font-display text-[19px] leading-tight">{view.name}</p>
                <p className="mt-0.5 text-xs font-semibold text-muted">{view.code}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-muted">{view.hex.toUpperCase()} · LRV {view.lrv}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link href={view.bookHref} className="btn-primary !min-h-11 !px-3.5 !py-1.5 text-xs">Book</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="card p-4 md:p-7">
          {brandInfo && (
            <div className="mb-3 flex items-center gap-3">
              <button type="button" onClick={allBrands} className="inline-flex min-h-11 items-center text-sm font-semibold text-muted underline underline-offset-2">
                ← All brands
              </button>
              <p className="font-display text-lg">{brandInfo.name} <span className="font-sans text-sm text-muted">({brandInfo.count.toLocaleString("en-IN")} shades)</span></p>
            </div>
          )}
          <label htmlFor="brand-q" className="block text-sm font-bold">
            {brandInfo ? `Search ${brandInfo.name} by code, name or hex` : "Search all brands by code, name or hex"}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="brand-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={brandInfo ? "e.g. 7982, Mecca Gold, #e7975b" : "e.g. Asian Paints 7982, Berger 3P0050, #bbc8b2"}
              autoComplete="off"
              className="field min-w-0 flex-1 text-base"
            />
            {(q || family) && (
              <button type="button" onClick={() => { setQ(""); setFamily(""); }} className="btn-secondary !min-h-11 shrink-0 !px-4 text-sm">
                Clear
              </button>
            )}
          </div>
          {brandInfo && !q.trim() && (
            <div className="mt-3 flex min-w-0 items-center gap-2 text-sm">
              <label htmlFor="brand-sort" className="font-semibold text-muted">Sort</label>
              <select id="brand-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field min-h-11 min-w-0 flex-1 !py-1.5 text-sm sm:!w-auto sm:flex-none">
                <option value="shade">Shade card (light → dark)</option>
                <option value="code">Shade code</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </div>
          )}
          {brandInfo && (
            <div className={`${chipRow} mt-4`} role="group" aria-label="Primary colour">
              {["", ...brandFamilies].map((f) => (
                <button key={f || "all"} type="button" aria-pressed={family === f} onClick={() => setFamily(f)} className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm font-bold transition ${family === f ? "bg-ink text-on-ink" : "bg-paper hover:bg-cream-wash"}`}>
                  {f && <span aria-hidden className="h-3 w-3 rounded-full border border-line" style={{ background: FAMILY_SWATCH[f] ?? "#ccc" }} />}
                  {f ? cap(f) : "All colours"}
                </button>
              ))}
            </div>
          )}
        </div>

        {showBrandGrid ? (
          <>
            <p className="mt-4 text-sm font-semibold text-muted md:mt-6">
              {brandTotal > 0 ? `${brandTotal.toLocaleString("en-IN")} shades from ${brands.length} brands. ` : ""}Choose a brand to see its shade card, or search above.
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3" aria-label="Paint brands">
              {brands.map((b) => (
                <li key={b.slug}>
                  {/* a real link, so the static page links every brand's card; a plain click opens it in place */}
                  <Link
                    href={`/colours?brand=${encodeURIComponent(b.slug)}`}
                    prefetch={false}
                    onClick={(e) => {
                      if (!isPlainClick(e)) return;
                      e.preventDefault();
                      chooseBrand(b.slug);
                    }}
                    className="flex w-full flex-col items-start rounded-2xl border border-line bg-paper p-3 text-left transition hover:-translate-y-0.5 hover:border-ink sm:p-4"
                  >
                    <span className="font-display text-base leading-tight sm:text-lg">{b.name}</span>
                    <span className="mt-0.5 text-xs font-semibold text-muted">{b.count.toLocaleString("en-IN")} shades</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm font-semibold text-muted md:mt-6" aria-live="polite">
              {state === "error"
                ? "Brand shades are unavailable right now. Try again in a minute."
                : state === "loading" && items.length === 0
                  ? "Loading shades…"
                  : total === 0
                    ? "No shade matches that. Try a code like 7982, a name, or a hex like #bbc8b2."
                    : `${total.toLocaleString("en-IN")} shade${total === 1 ? "" : "s"}${q ? ` for “${q}”` : ""}${family ? ` · ${cap(family)}` : ""}. Tap one to see it on the wall.`}
            </p>
            <ul className="mt-3 grid grid-cols-4 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-4" aria-label="Brand shades">
              {items.map((s) => (
                <li key={s.id}>
                  <BrandTile shade={s} selected={active?.id === s.id} showBrand={!brand} onSelect={setSelected} />
                </li>
              ))}
            </ul>
            {/* infinite scroll trigger, plus a button for keyboard users and old browsers */}
            <div ref={sentinel} aria-hidden className="h-px" />
            {page < pages && state !== "error" && items.length > 0 && (
              <button type="button" onClick={() => void loadMore()} className="btn-secondary mt-5 w-full sm:w-auto">
                Show more ({(total - items.length).toLocaleString("en-IN")} left)
              </button>
            )}
          </>
        )}
        <p className="mt-6 hidden text-sm text-muted md:block">
          Want combinations instead? Start from a <Link href="/palettes" className="font-semibold text-cobalt-text underline">ready palette</Link>.
        </p>
        {attribution && (
          <p className="mt-5 text-xs leading-relaxed text-muted">
            Brand shades: <a href={attribution.source} className="underline" rel="noopener" target="_blank">PaintDB</a>, licensed{" "}
            <a href={attribution.licenseUrl} className="underline" rel="noopener license" target="_blank">CC BY 4.0</a>. On-screen colours approximate each brand&apos;s
            published shade. Paint Saathi isn&apos;t affiliated with these brands; the inspector brings the real shade card.
          </p>
        )}
      </div>

      {!view && (
        <aside className="hidden rounded-[2rem] border border-dashed border-line-strong bg-paper p-8 text-center lg:sticky lg:top-24 lg:block">
          {showBrandGrid ? (
            <>
              <p className="font-display text-2xl">Pick a brand</p>
              <p className="mt-2 text-sm text-muted">Then a primary colour, or scroll its whole shade card. Every shade you tap shows on the room here.</p>
            </>
          ) : state === "loading" ? (
            <p className="font-display text-2xl">Loading shades…</p>
          ) : state === "error" ? (
            <>
              <p className="font-display text-2xl">Shades didn&apos;t load</p>
              <p className="mt-2 text-sm text-muted">Try again in a minute. Every shade you tap shows on the room here.</p>
            </>
          ) : (
            <>
              <p className="font-display text-2xl">No shade to show yet</p>
              <p className="mt-2 text-sm text-muted">Clear the search or pick another colour family. Every shade you tap shows on the room here.</p>
            </>
          )}
        </aside>
      )}

      {view && (
        <section className="hidden rounded-[2rem] border border-line bg-paper p-5 lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto" aria-labelledby="active-colour">
          <WallPreview colour={view} desktopCrop maxHeight="min(56vh, 600px)" sizes="(min-width: 1280px) 440px, (min-width: 1024px) 400px, 100vw" />
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
          <p className="mt-4 text-base text-ink">{view.note}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={view.bookHref} className="btn-primary">Book an inspection with this shade</Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            Screen colours are a guide. Paint shifts with daylight, bulbs and sheen, so our inspector brings physical shade cards
            and paints a test patch before you decide.
          </p>
        </section>
      )}
      {expanded && view && active && (
        <PreviewSheet
          view={view}
          shades={items}
          selectedId={active.id}
          onSelect={(id) => setSelected(items.find((s) => s.id === id) ?? null)}
          onClose={closeSheet}
          onNearEnd={() => void loadMore()}
        />
      )}
    </div>
  );
}

const MemoColourFinder = memo(ColourFinder);

/**
 * The finder with its starting brand, search, colour family and order read from the URL in the
 * browser (/colours?brand=berger&q=3P0050, /colours?brand=asian-paints&family=blue&sort=code), so
 * /colours itself stays a static page. Other parameters are ignored. The server HTML is the finder
 * with no filters (the brand grid, a link per brand), which hydrates in place. A link with filters
 * then remounts the finder once with them (the finder holds its search and filters in its own
 * state); without any, nothing remounts.
 */
export function ColourFinderFromUrl(props: Omit<Props, "initialQuery" | "initialBrand" | "initialFamily" | "initialSort">) {
  // Read once: later URL changes are the finder's own (it keeps the URL shareable as you filter).
  const params = useUrlQuery({ once: true });
  // an old visualizer link (/visualizer?shade=asian-paints:8386 now redirects here) opens that shade
  const [shadeBrand, shadeCode] = (params.get("shade") ?? "").split(/:(.*)/s);
  const fromShade = !params.get("brand") && !params.get("q") && shadeBrand && shadeCode ? { brand: shadeBrand, q: shadeCode } : undefined;
  const initial = {
    initialQuery: fromShade?.q ?? params.get("q") ?? undefined,
    initialBrand: fromShade?.brand ?? params.get("brand") ?? undefined,
    initialFamily: params.get("family") ?? undefined,
    initialSort: params.get("sort") ?? undefined,
  };
  const key = JSON.stringify(Object.values(initial));
  return <MemoColourFinder key={key} {...props} {...initial} />;
}
