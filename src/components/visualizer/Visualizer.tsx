"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { images } from "@/config/images";
import { palettes } from "@/config/palettes";
import { PAINTDB } from "@/lib/colours/catalogue";
import { colourFamilies, type ColourFamily } from "@/lib/colours/families";
import { fitWithin, validateImageFile } from "@/lib/visualizer/files";
import { feather, maskFromComponents, type Mask } from "@/lib/visualizer/mask";
import { recolour, wallMeanLightness } from "@/lib/visualizer/recolour";
import { Segmenter, type ModelId, type SegmentResult } from "./segmenter";

// The wall colour visualizer. Upload a room photo → the worker finds the wall surfaces →
// pick any shade and only the walls change, with their light and texture kept. Everything
// runs in the browser: the photo is never uploaded, and switching shades is a local repaint.
//
// Selection = the model's wall surfaces the user has kept (tap a surface to toggle it), feathered.

type Status = "idle" | "loading" | "detecting" | "ready" | "error";
/** `code` is shown under the name ("Asian Paints 8386"); `bookQuery` is the booking link's query (`shade=asian-paints%3A8386`). */
export type Shade = { name: string; hex: string; code?: string; bookQuery?: string };

/** The shade on the walls until the visitor or a link picks another: a soft sage green, Asian Paints Pepper Leaf 8386. */
export const DEFAULT_SHADE: Shade = { name: "Pepper Leaf", hex: "#bbc8b2", code: "Asian Paints 8386", bookQuery: "shade=asian-paints%3A8386" };

type Photo = { width: number; height: number; pixels: Uint8ClampedArray; name: string };

const samples = [images.livingWhite, images.apartment, images.livingMoody, images.painterWindow];
// Same-origin copy through the image optimizer (Next 16 only serves its configured widths/qualities),
// so the canvas is not tainted and getImageData works.
const proxied = (src: string) => `/_next/image?url=${encodeURIComponent(src)}&w=1080&q=75`;

export type VisualizerProps = { initialShade?: Shade; segmenterFactory?: () => Segmenter; /** SegFormer size; b0 is the shipped default, b1/b2 are for evaluation (?model=). */ model?: ModelId };

export function Visualizer({ initialShade, segmenterFactory, model = "b0" }: VisualizerProps) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<SegmentResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [shade, setShade] = useState<Shade>(initialShade ?? DEFAULT_SHADE);
  // Set once the visitor chooses a shade in the picker (a swatch, including a search result).
  const [userPicked, setUserPicked] = useState(false);
  const pickShade = useCallback((s: Shade) => {
    setUserPicked(true);
    setShade(s);
  }, []);
  // A starting shade can arrive after mount: the page reads its link after hydrating, and a
  // brand shade from ?shade= is looked up through the API. It replaces the current shade without
  // remounting, so a loaded photo is kept, but never a shade the visitor has already picked.
  // (Loading a photo is not a pick: the visitor came for the linked shade.)
  // The picker opens on the linked shade's brand (?shade=berger:2P1857 → Berger), and follows a
  // linked shade that arrives later on the same terms as the walls do.
  const initialKey = initialShade ? `${initialShade.hex}|${initialShade.name}|${initialShade.code ?? ""}|${initialShade.bookQuery ?? ""}` : "";
  const [appliedKey, setAppliedKey] = useState(initialKey);
  const [pickerBrand, setPickerBrand] = useState(shadeBrand(initialShade));
  if (initialKey !== appliedKey) {
    setAppliedKey(initialKey);
    if (initialShade && !userPicked) {
      setShade(initialShade);
      setPickerBrand(shadeBrand(initialShade));
    }
  }
  const [showOriginal, setShowOriginal] = useState(false);
  const [hint, setHint] = useState("");

  const canvas = useRef<HTMLCanvasElement>(null);
  const segmenter = useRef<Segmenter | null>(null);
  const outBuf = useRef<Uint8ClampedArray<ArrayBuffer> | null>(null);

  useEffect(() => () => segmenter.current?.dispose(), []);

  const getSegmenter = useCallback(() => {
    if (!segmenter.current) {
      segmenter.current = segmenterFactory ? segmenterFactory() : new Segmenter();
      segmenter.current.onProgress = (p) => {
        if (p.status === "progress" && p.file && typeof p.progress === "number") setProgress(`Loading wall detector… ${Math.round(p.progress)}%`);
        else if (p.status === "ready") setProgress("Finding the walls…");
      };
    }
    return segmenter.current;
  }, [segmenterFactory]);

  // --- load a photo (file or sample) into pixels, then detect
  const loadBitmap = useCallback(async (bitmap: ImageBitmap | HTMLImageElement, name: string) => {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const c = document.createElement("canvas");
    c.width = width; c.height = height;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    const next: Photo = { width, height, pixels: data, name };
    setPhoto(next);
    setResult(null); setSelected(new Set()); setError(""); setHint("");
    setStatus("loading"); setProgress("Loading wall detector…");
    try {
      const r = await getSegmenter().segment(data, width, height, model);
      setResult(r);
      const all = new Set<number>();
      for (let i = 1; i <= r.surfaces; i++) all.add(i);
      setSelected(all);
      setStatus("ready");
      if (r.surfaces === 0 || r.coverage < 0.03) {
        setHint("We couldn't find a wall confidently in this photo. Try one taken straight-on in daylight, with the whole wall in frame.");
      } else {
        setHint(r.surfaces > 1 ? `${r.surfaces} wall surfaces found. Tap a wall to include or exclude it.` : "1 wall surface found. Tap it to include or exclude it.");
      }
    } catch (err) {
      setResult(null);
      setStatus("error");
      setError(`${err instanceof Error ? err.message : "Wall detection is unavailable"}. Check your connection and try again.`);
    }
  }, [getSegmenter, model]);

  const onFile = useCallback(async (file: File) => {
    const problem = validateImageFile(file);
    if (problem) { setError(problem); return; }
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      await loadBitmap(bitmap, file.name);
    } catch {
      setError("That file could not be read as a photo.");
    }
  }, [loadBitmap]);

  const onSample = useCallback((src: string, alt: string) => {
    const img = new Image();
    img.onload = () => loadBitmap(img, alt);
    img.onerror = () => setError("The sample photo could not be loaded.");
    img.src = proxied(src);
  }, [loadBitmap]);

  // --- the effective selection
  const effective = useMemo<Mask | null>(() => {
    if (!photo || !result) return null;
    return feather(maskFromComponents(result.mask, result.labels, selected), Math.max(1, Math.round(photo.width / 600)), 2);
  }, [photo, result, selected]);

  const meanL = useMemo(() => (photo && effective ? wallMeanLightness(photo.pixels, effective) : 0.8), [photo, effective]);

  // --- paint
  useEffect(() => {
    const c = canvas.current;
    if (!c || !photo) return;
    if (c.width !== photo.width || c.height !== photo.height) { c.width = photo.width; c.height = photo.height; }
    const ctx = c.getContext("2d")!;
    if (!outBuf.current || outBuf.current.length !== photo.pixels.length) outBuf.current = new Uint8ClampedArray(new ArrayBuffer(photo.pixels.length));
    const out = outBuf.current;
    if (showOriginal || !effective) out.set(photo.pixels);
    else recolour(photo.pixels, out, effective, shade.hex, meanL);
    ctx.putImageData(new ImageData(out, photo.width, photo.height), 0, 0);
  }, [photo, effective, shade, meanL, showOriginal]);

  // --- tap a surface to include or exclude it
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo || !result) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * photo.width);
    const y = Math.floor(((e.clientY - r.top) / r.height) * photo.height);
    const id = result.labels[y * photo.width + x];
    if (!id) { setHint("That spot isn't a detected wall."); return; }
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const reset = () => {
    if (result) { const all = new Set<number>(); for (let i = 1; i <= result.surfaces; i++) all.add(i); setSelected(all); }
  };

  const download = () => {
    const c = canvas.current;
    if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `paintman-${(shade.code ?? shade.name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.jpg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/jpeg", 0.92);
  };

  const busy = status === "loading" || status === "detecting";

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      {/* ---------- photo + tools ---------- */}
      <div>
        {!photo ? (
          <Dropzone onFile={onFile} onSample={onSample} error={error} />
        ) : (
          <div>
            <div className="relative overflow-hidden rounded-3xl border border-line bg-paper">
              <canvas
                ref={canvas}
                className="block h-auto w-full cursor-pointer touch-none"
                aria-label={`${photo.name}, walls shown in ${shade.name}`}
                onPointerDown={onPointerDown}
              />
              {busy && (
                <div role="status" className="absolute inset-0 flex items-center justify-center bg-canvas/70 backdrop-blur-sm">
                  <div className="rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold">{progress || "Working…"}</div>
                </div>
              )}
              <span className="sticker absolute left-4 top-4">{showOriginal ? "Before" : `After · ${shade.name}`}</span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Photo tools">
              <button
                type="button"
                className="btn-secondary !min-h-[40px] !px-4 text-sm"
                onPointerDown={() => setShowOriginal(true)}
                onPointerUp={() => setShowOriginal(false)}
                onPointerLeave={() => setShowOriginal(false)}
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") setShowOriginal(true); }}
                onKeyUp={() => setShowOriginal(false)}
                aria-pressed={showOriginal}
              >
                Hold to compare
              </button>
              <button type="button" className="btn-secondary !min-h-[40px] !px-4 text-sm" onClick={reset}>Reset selection</button>
              <button type="button" className="btn-secondary !min-h-[40px] !px-4 text-sm" onClick={download}>Download</button>
              <button type="button" className="link-arrow ml-auto text-sm" onClick={() => { setPhoto(null); setResult(null); setStatus("idle"); setError(""); }}>
                Change photo
              </button>
            </div>
            {(hint || error) && (
              <p className={`mt-3 text-sm ${error ? "text-danger" : "text-muted"}`} role={error ? "alert" : "status"}>
                {error || hint}
                {result && <span className="ml-1 text-muted-2">Detected in {result.ms} ms.</span>}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ---------- shade picker ---------- */}
      <aside className="min-w-0">
        <ShadePicker value={shade} onChange={pickShade} startBrand={pickerBrand} />
        <div className="mt-6 rounded-2xl border border-line bg-paper p-4 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-ink">How this works</p>
          <p className="mt-1">
            Your photo stays on your device. A small vision model (SegFormer, trained on the ADE20K room dataset) marks the wall
            surfaces; we then repaint only those pixels, keeping their light, shadows and texture. Screen colours are a guide; the
            inspector brings real shade cards.
          </p>
          <Link href={`/book${shade.bookQuery ? `?${shade.bookQuery}` : ""}`} className="btn-primary mt-4 w-full">
            Book an inspection with {shade.name}
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Dropzone({ onFile, onSample, error }: { onFile: (f: File) => void; onSample: (src: string, alt: string) => void; error: string }) {
  const [over, setOver] = useState(false);
  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        className={`flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed p-8 text-center transition ${over ? "border-terracotta bg-sand/40" : "border-line-strong bg-paper"}`}
      >
        <span className="font-display text-3xl">Drop a photo of your room</span>
        <span className="mt-2 max-w-sm text-sm text-muted">JPEG, PNG or WebP up to 12 MB. Stand back so the whole wall is in frame; daylight photos work best.</span>
        <span className="btn-primary mt-6">Choose a photo</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} aria-label="Choose a room photo" />
      </label>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p>}
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted-2">Or try a sample room</p>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {samples.map((s) => (
          <button key={s.src} type="button" onClick={() => onSample(s.src, s.alt)} className="overflow-hidden rounded-2xl border border-line transition hover:-translate-y-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proxied(s.src)} alt={s.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

type WebColour = { name: string; hex: string; family: ColourFamily; lrv: number };
type BrandOption = { slug: string; name: string; count: number };
/** The fields of an /api/v1/colours/paint item the picker uses. */
type BrandPick = { id: string; brandName: string; code: string; name: string; hex: string };
/** Loaded pages of one brand query; `key` is the query's first-page URL. */
type BrandPage = { key: string; items: BrandPick[]; total: number; page: number; pages: number };

/** Brand shades per load in the picker; "Show more" adds the next page. */
export const PICKER_PER_PAGE = 48;
/** The brand the picker opens on, and the only option until the brand list arrives. */
const FIRST_BRAND: BrandOption = { slug: "asian-paints", name: "Asian Paints", count: 0 };

/** A brand shade as the visualizer holds it: named by brand and code, booked by its id. */
export const brandShadePick = (s: BrandPick): Shade => ({ name: s.name, hex: s.hex, code: `${s.brandName} ${s.code}`, bookQuery: `shade=${encodeURIComponent(s.id)}` });

/** The brand slug of a brand shade ("shade=berger%3A2P1857" → "berger"); undefined for a named colour. */
export function shadeBrand(shade?: Shade): string | undefined {
  const id = shade?.bookQuery ? new URLSearchParams(shade.bookQuery).get("shade") : null;
  const slug = id?.split(":")[0];
  return slug && /^[a-z0-9-]+$/.test(slug) ? slug : undefined;
}

/**
 * The picker's first row while nothing is searched: every shade from our palettes (all Asian
 * Paints, Pepper Leaf first), so the first view offers varied colours, not the shade card's
 * opening run of near-identical whites. The palettes module is client-safe; no catalogue loads.
 */
export const STARTER_SHADES: Shade[] = [...new Map(palettes.flatMap((p) => p.shades).map((s) => [s.id, brandShadePick(s)])).values()];
const STARTER_BRAND = palettes[0].shades[0].brand;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** A readable name for a brand slug until the brand list arrives ("asian-paints" → "Asian Paints"). */
const slugName = (slug: string) => slug.split("-").map(cap).join(" ");
const chipClass = (on: boolean) => `inline-flex min-h-11 items-center rounded-full border px-3 text-xs font-semibold ${on ? "border-ink bg-ink text-on-ink" : "border-line bg-paper hover:border-line-strong"}`;
const sameShade = (a: Shade, b: Shade) => a.hex === b.hex && a.name === b.name;

/** One swatch: the name and its brand code are read out, the hex is in the tooltip. */
function Swatch({ shade: s, selected, onPick, className }: { shade: Shade; selected: boolean; onPick: (s: Shade) => void; className: string }) {
  return (
    <button
      type="button"
      title={`${s.name}${s.code ? ` ${s.code}` : ""} ${s.hex.toUpperCase()}`}
      aria-label={`${s.name}${s.code ? `, ${s.code}` : ""}`}
      aria-pressed={selected}
      onClick={() => onPick(s)}
      className={`${className} rounded-xl border border-line-soft transition hover:-translate-y-0.5`}
      style={{ background: s.hex, boxShadow: selected ? "0 0 0 2px #f8f5ef, 0 0 0 4px #242522" : undefined }}
    />
  );
}

// Two catalogues: brand shades (50,000+ shade-card codes from 25 brands, searched on the server
// through /api/v1/colours/paint, a page at a time) and ~32,000 public named colours
// (/api/v1/colours/web). The brand data is server-only, so the brand list, its colour families
// and every page of shades arrive through the public API.
function ShadePicker({ value, onChange, startBrand }: { value: Shade; onChange: (s: Shade) => void; startBrand?: string }) {
  const [tab, setTab] = useState<"brands" | "web">("brands");
  const [q, setQ] = useState("");

  // --- brand shades
  const [brands, setBrands] = useState<BrandOption[]>([FIRST_BRAND]);
  const [brandFamilies, setBrandFamilies] = useState<string[]>([]);
  const [brand, setBrand] = useState(startBrand ?? FIRST_BRAND.slug);
  const [brandFamily, setBrandFamily] = useState("");
  const [brandPage, setBrandPage] = useState<BrandPage | null>(null);
  const [brandState, setBrandState] = useState<"idle" | "loading" | "error">("idle");
  // a linked shade that arrives later moves the picker to its brand, unless the visitor chose one
  const [brandChosen, setBrandChosen] = useState(false);
  const [appliedStart, setAppliedStart] = useState(startBrand);
  if (startBrand !== appliedStart) {
    setAppliedStart(startBrand);
    if (startBrand && !brandChosen) {
      setBrand(startBrand);
      setBrandFamily("");
    }
  }

  // --- named colours
  const [webFamily, setWebFamily] = useState<ColourFamily | undefined>();
  const [web, setWeb] = useState<{ items: WebColour[]; total: number } | null>(null);
  const [webState, setWebState] = useState<"idle" | "loading" | "error">("idle");

  // the brands (Indian brands first) and their colour families, once
  useEffect(() => {
    const ctl = new AbortController();
    fetch("/api/v1/colours/brands", { signal: ctl.signal })
      .then((res) => (res.ok ? (res.json() as Promise<{ data?: BrandOption[]; meta?: { families?: string[] } }>) : null))
      .then((json) => {
        if (Array.isArray(json?.data) && json.data.length) setBrands(json.data);
        if (Array.isArray(json?.meta?.families)) setBrandFamilies(json.meta.families);
      })
      .catch(() => {
        // offline or aborted: the picker keeps Asian Paints and no family chips
      });
    return () => ctl.abort();
  }, []);

  /** The paint API query for page `n` of the current brand, search and family. */
  const brandQuery = useCallback((n: number) => {
    const sp = new URLSearchParams({ perPage: String(PICKER_PER_PAGE), page: String(n), brand });
    if (q.trim()) sp.set("q", q.trim());
    if (brandFamily) sp.set("family", brandFamily);
    return `/api/v1/colours/paint?${sp}`;
  }, [brand, q, brandFamily]);
  const currentKey = brandQuery(1);

  // Every query's loaded pages stay in memory, so switching to named colours and back, or
  // returning to a family or brand seen before, keeps the pages "Show more" already added.
  const brandCache = useRef(new Map<string, BrandPage>());

  // the first page whenever the brand, search or family changes
  const brandKey = useRef("");
  useEffect(() => {
    if (tab !== "brands") return;
    const url = currentKey;
    brandKey.current = url;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      const cached = brandCache.current.get(url);
      if (cached) {
        setBrandPage(cached);
        setBrandState("idle");
        return;
      }
      setBrandState("loading");
      try {
        const res = await fetch(url, { signal: ctl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { data: BrandPick[]; meta: { total: number; page: number; pages: number } };
        const first: BrandPage = { key: url, items: json.data, total: json.meta.total, page: json.meta.page, pages: json.meta.pages };
        brandCache.current.set(url, first);
        setBrandPage(first);
        setBrandState("idle");
      } catch (err) {
        if ((err as Error).name !== "AbortError") setBrandState("error");
      }
    }, q && !brandCache.current.has(url) ? 250 : 0);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [tab, currentKey, q]);

  const showMore = async () => {
    if (!brandPage || brandPage.page >= brandPage.pages) return;
    const key = brandKey.current;
    try {
      const res = await fetch(brandQuery(brandPage.page + 1));
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { data: BrandPick[]; meta: { page: number; pages: number } };
      if (brandKey.current !== key) return; // the search changed while this page was loading
      setBrandPage((p) => {
        if (!p) return p;
        const next = { ...p, items: [...p.items, ...json.data.filter((s) => !p.items.some((i) => i.id === s.id))], page: json.meta.page, pages: json.meta.pages };
        brandCache.current.set(p.key, next);
        return next;
      });
    } catch {
      setBrandState("error");
    }
  };

  useEffect(() => {
    if (tab !== "web") return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setWebState("loading");
      try {
        const sp = new URLSearchParams({ perPage: "60" });
        if (q) sp.set("q", q);
        if (webFamily) sp.set("family", webFamily);
        const res = await fetch(`/api/v1/colours/web?${sp}`, { signal: ctl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { data: WebColour[]; meta: { total: number } };
        setWeb({ items: json.data, total: json.meta.total });
        setWebState("idle");
      } catch (err) {
        if ((err as Error).name !== "AbortError") setWebState("error");
      }
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [tab, q, webFamily]);

  // the shown page belongs to an earlier search, family or brand until the new one arrives
  const brandStale = brandState === "loading" || !brandPage || brandPage.key !== currentKey;
  const brandOptions = brands.some((b) => b.slug === brand) ? brands : [...brands, { slug: brand, name: slugName(brand), count: 0 }];
  const brandName = brandOptions.find((b) => b.slug === brand)!.name;
  const showStarter = tab === "brands" && brand === STARTER_BRAND && !q.trim() && !brandFamily;
  const list: Shade[] = tab === "brands" ? (brandPage?.items ?? []).map(brandShadePick) : (web?.items ?? []).map((c) => ({ name: c.name, hex: c.hex }));
  const status =
    tab === "brands"
      ? brandState === "error"
        ? "Brand shades are unavailable right now."
        : brandStale
          ? "Loading shades…"
          : brandPage.total === 0
            ? `No ${brandName} shade matches that. Try a shade-card code, a name or a hex.`
            : `${brandPage.total.toLocaleString("en-IN")} ${brandName} shade${brandPage.total === 1 ? "" : "s"}, showing ${brandPage.items.length}`
      : webState === "loading"
        ? "Searching named colours…"
        : webState === "error"
          ? "Named colours are unavailable right now."
          : `${web?.total ?? 0} named colours, showing ${web?.items.length ?? 0}`;

  return (
    <div className="rounded-3xl border border-line bg-paper p-5">
      <div className="flex items-center gap-4">
        <span className="h-16 w-16 shrink-0 rounded-2xl border border-line" style={{ background: value.hex }} />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-2">On the walls</p>
          <p className="truncate font-display text-2xl">{value.name}</p>
          <p className="text-sm text-muted">{value.hex.toUpperCase()}{value.code ? ` · ${value.code}` : " · named colour"}</p>
        </div>
      </div>

      <div role="group" aria-label="Catalogue" className="mt-5 inline-flex gap-1 rounded-full border border-line p-1 text-sm font-semibold">
        <button type="button" aria-pressed={tab === "brands"} onClick={() => setTab("brands")} className={`min-h-11 rounded-full px-3.5 py-1.5 ${tab === "brands" ? "bg-ink text-on-ink" : "hover:bg-cream-wash"}`}>Brand shades</button>
        <button type="button" aria-pressed={tab === "web"} onClick={() => setTab("web")} className={`min-h-11 rounded-full px-3.5 py-1.5 ${tab === "web" ? "bg-ink text-on-ink" : "hover:bg-cream-wash"}`}>All named colours</button>
      </div>

      {tab === "brands" && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <label htmlFor="picker-brand" className="font-semibold text-muted">Brand</label>
          <select id="picker-brand" value={brand} onChange={(e) => { setBrand(e.target.value); setBrandFamily(""); setBrandChosen(true); }} className="field min-h-11 !py-1.5 text-sm">
            {brandOptions.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
          </select>
        </div>
      )}

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tab === "brands" ? `Search ${brandName} by code, name or hex` : "Search 32,000 colour names or a hex"}
        aria-label="Search shades"
        className="field mt-3 text-sm"
      />
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Colour family">
        {tab === "brands"
          ? brandFamilies.map((f) => (
              <button key={f} type="button" aria-pressed={brandFamily === f} onClick={() => setBrandFamily(brandFamily === f ? "" : f)} className={chipClass(brandFamily === f)}>
                {cap(f)}
              </button>
            ))
          : colourFamilies.map((f) => (
              <button key={f} type="button" aria-pressed={webFamily === f} onClick={() => setWebFamily(webFamily === f ? undefined : f)} className={chipClass(webFamily === f)}>
                {f}
              </button>
            ))}
      </div>

      {showStarter && (
        <>
          <p id="picker-starter" className="mt-3 text-xs font-semibold text-muted">From our palettes</p>
          <ul className="-mx-1 mt-1.5 flex gap-2 overflow-x-auto px-1 pb-2 pt-1" aria-labelledby="picker-starter">
            {STARTER_SHADES.map((s) => (
              <li key={s.bookQuery} className="shrink-0">
                <Swatch shade={s} selected={sameShade(s, value)} onPick={onChange} className="block h-11 w-11" />
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-xs text-muted" aria-live="polite">{status}</p>
      <ul className={`mt-2 grid max-h-72 grid-cols-6 gap-2 overflow-y-auto pr-1 transition-opacity ${tab === "brands" && brandStale && brandPage ? "opacity-60" : ""}`} aria-label="Shades" aria-busy={tab === "brands" ? brandStale : webState === "loading"}>
        {list.map((s) => (
          <li key={`${s.hex}-${s.name}-${s.code ?? ""}`}>
            <Swatch shade={s} selected={sameShade(s, value)} onPick={onChange} className="block aspect-square w-full" />
          </li>
        ))}
      </ul>
      {tab === "brands" && brandPage && !brandStale && brandPage.page < brandPage.pages && brandState !== "error" && (
        <button type="button" onClick={() => void showMore()} className="btn-secondary mt-3 !min-h-11 w-full !px-4 text-sm">
          Show more ({(brandPage.total - brandPage.items.length).toLocaleString("en-IN")} left)
        </button>
      )}
      {tab === "brands" && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Brand shades: <a href={PAINTDB.source} className="underline" rel="noopener" target="_blank">PaintDB</a>, licensed{" "}
          <a href={PAINTDB.licenseUrl} className="underline" rel="noopener license" target="_blank">CC BY 4.0</a>. Screen colours approximate each brand&apos;s
          published shade; Paint Man isn&apos;t affiliated with these brands.
        </p>
      )}
    </div>
  );
}
