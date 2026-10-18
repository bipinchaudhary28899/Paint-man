"use client";

import type { Mask } from "@/lib/visualizer/mask";

// Page-side handle on the segmentation worker. The worker loads the model once and answers
// `segment` requests with a wall mask at the photo's size plus the per-surface labels, so the
// page can toggle individual walls without re-running the model.

export type ModelId = "b0" | "b1" | "b2";

export type SegmentResult = {
  mask: Mask;
  labels: Int32Array;
  surfaces: number; // number of wall surfaces found
  coverage: number; // 0..1 of the photo that is wall
  ms: number;
};

type Progress = { status: string; progress?: number; file?: string };
type Msg =
  | { type: "progress"; data: Progress }
  | { type: "ready" }
  | { type: "result"; id: number; mask: Uint8Array; width: number; height: number; labels: Int32Array; surfaces: number; coverage: number; ms: number }
  | { type: "error"; id?: number; message: string };

export class Segmenter {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, { resolve: (r: SegmentResult) => void; reject: (e: Error) => void }>();
  onProgress?: (p: Progress) => void;

  constructor(private readonly factory: () => Worker = () => new Worker(new URL("./segment.worker.ts", import.meta.url), { type: "module" })) {}

  private ensure(): Worker {
    if (this.worker) return this.worker;
    const w = this.factory();
    w.onmessage = (e: MessageEvent<Msg>) => {
      const m = e.data;
      if (m.type === "progress") this.onProgress?.(m.data);
      else if (m.type === "result") {
        const p = this.pending.get(m.id);
        if (!p) return;
        this.pending.delete(m.id);
        p.resolve({ mask: { width: m.width, height: m.height, data: m.mask }, labels: m.labels, surfaces: m.surfaces, coverage: m.coverage, ms: m.ms });
      } else if (m.type === "error") {
        if (m.id !== undefined && this.pending.has(m.id)) {
          this.pending.get(m.id)!.reject(new Error(m.message));
          this.pending.delete(m.id);
        } else {
          for (const p of this.pending.values()) p.reject(new Error(m.message));
          this.pending.clear();
        }
      }
    };
    w.onerror = (ev) => {
      for (const p of this.pending.values()) p.reject(new Error(ev.message || "The wall detector could not start."));
      this.pending.clear();
    };
    this.worker = w;
    return w;
  }

  /** Finds the walls in an RGBA bitmap. Rejects if the model cannot load (offline, unsupported browser). */
  segment(pixels: Uint8ClampedArray, width: number, height: number, model: ModelId = "b0"): Promise<SegmentResult> {
    const w = this.ensure();
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const copy = new Uint8ClampedArray(pixels); // keep the page's buffer; the worker owns this one
      w.postMessage({ type: "segment", id, pixels: copy, width, height, model }, [copy.buffer]);
    });
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}
