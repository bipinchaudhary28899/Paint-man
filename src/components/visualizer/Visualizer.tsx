"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { colourFamilies, colours, type Colour, type ColourFamily } from "@/config/colours";
import { images } from "@/config/images";
import { searchColours } from "@/lib/colours/search";
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
type Shade = { name: string; hex: string; code?: string };

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
  const [shade, setShade] = useState<Shade>(initialShade ?? { name: colours[18].name, hex: colours[18].hex, code: colours[18].code });
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
      a.download = `paintman-${shade.code ?? shade.name.toLowerCase().replace(/\s+/g, "-")}.jpg`;
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
      <aside>
        <ShadePicker value={shade} onChange={setShade} />
        <div className="mt-6 rounded-2xl border border-line bg-paper p-4 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-ink">How this works</p>
          <p className="mt-1">
            Your photo stays on your device. A small vision model (SegFormer, trained on the ADE20K room dataset) marks the wall
            surfaces; we then repaint only those pixels, keeping their light, shadows and texture. Screen colours are a guide; the
            inspector brings real shade cards.
          </p>
          <Link href={`/book${shade.code ? `?colour=${shade.code}` : ""}`} className="btn-primary mt-4 w-full">
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

function ShadePicker({ value, onChange }: { value: Shade; onChange: (s: Shade) => void }) {
  const [tab, setTab] = useState<"ours" | "web">("ours");
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<ColourFamily | undefined>();
  const [web, setWeb] = useState<{ items: WebColour[]; total: number } | null>(null);
  const [webState, setWebState] = useState<"idle" | "loading" | "error">("idle");

  const ours = useMemo(() => searchColours({ q, family, limit: 60 }), [q, family]);

  useEffect(() => {
    if (tab !== "web") return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setWebState("loading");
      try {
        const sp = new URLSearchParams({ perPage: "60" });
        if (q) sp.set("q", q);
        if (family) sp.set("family", family);
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
  }, [tab, q, family]);

  const list: Shade[] = tab === "ours" ? ours.map((c: Colour) => ({ name: c.name, hex: c.hex, code: c.code })) : (web?.items ?? []).map((c) => ({ name: c.name, hex: c.hex }));

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
        <button type="button" aria-pressed={tab === "ours"} onClick={() => setTab("ours")} className={`rounded-full px-3.5 py-1.5 ${tab === "ours" ? "bg-ink text-on-ink" : "hover:bg-cream-wash"}`}>Our shades ({colours.length})</button>
        <button type="button" aria-pressed={tab === "web"} onClick={() => setTab("web")} className={`rounded-full px-3.5 py-1.5 ${tab === "web" ? "bg-ink text-on-ink" : "hover:bg-cream-wash"}`}>All named colours</button>
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tab === "ours" ? "Search name, code or hex" : "Search 32,000 colour names or a hex"}
        aria-label="Search shades"
        className="field mt-3 text-sm"
      />
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Colour family">
        {colourFamilies.map((f) => (
          <button key={f} type="button" aria-pressed={family === f} onClick={() => setFamily(family === f ? undefined : f)} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${family === f ? "border-ink bg-ink text-on-ink" : "border-line bg-paper hover:border-line-strong"}`}>
            {f}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted" aria-live="polite">
        {tab === "ours" ? `${ours.length} shade${ours.length === 1 ? "" : "s"}` : webState === "loading" ? "Searching named colours…" : webState === "error" ? "Named colours are unavailable right now." : `${web?.total ?? 0} named colours, showing ${web?.items.length ?? 0}`}
      </p>
      <ul className="mt-2 grid max-h-72 grid-cols-6 gap-2 overflow-y-auto pr-1" aria-label="Shades">
        {list.map((s) => (
          <li key={`${s.hex}-${s.name}`}>
            <button
              type="button"
              title={`${s.name} ${s.hex.toUpperCase()}`}
              aria-label={s.name}
              aria-pressed={s.hex === value.hex && s.name === value.name}
              onClick={() => onChange(s)}
              className="block aspect-square w-full rounded-xl border border-line-soft transition hover:-translate-y-0.5"
              style={{ background: s.hex, boxShadow: s.hex === value.hex && s.name === value.name ? "0 0 0 2px #f8f5ef, 0 0 0 4px #242522" : undefined }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
