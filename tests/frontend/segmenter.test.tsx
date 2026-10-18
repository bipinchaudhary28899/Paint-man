import { describe, expect, it, vi } from "vitest";
import { Segmenter } from "@/components/visualizer/segmenter";

// A stand-in Worker: records posted messages and lets the test emit worker → page messages.
class FakeWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminated = false;
  postMessage(msg: unknown) { this.posted.push(msg); }
  terminate() { this.terminated = true; }
  emit(data: unknown) { this.onmessage?.({ data } as MessageEvent); }
}

const pixels = new Uint8ClampedArray(2 * 2 * 4);

describe("Segmenter", () => {
  it("creates the worker lazily, transfers a copy of the pixels and resolves with the mask", async () => {
    const w = new FakeWorker();
    const factory = vi.fn(() => w as unknown as Worker);
    const s = new Segmenter(factory);
    expect(factory).not.toHaveBeenCalled();
    const progress = vi.fn();
    s.onProgress = progress;

    const p = s.segment(pixels, 2, 2);
    expect(factory).toHaveBeenCalledTimes(1);
    const sent = w.posted[0] as { type: string; id: number; pixels: Uint8ClampedArray; width: number; height: number };
    expect(sent).toMatchObject({ type: "segment", id: 1, width: 2, height: 2 });
    expect(sent.pixels).not.toBe(pixels); // the page keeps its own buffer

    w.emit({ type: "progress", data: { status: "progress", progress: 40, file: "model.onnx" } });
    expect(progress).toHaveBeenCalledWith({ status: "progress", progress: 40, file: "model.onnx" });
    w.emit({ type: "ready" });

    const mask = new Uint8Array([255, 0, 0, 255]);
    const labels = new Int32Array([1, 0, 0, 2]);
    w.emit({ type: "result", id: 1, mask, width: 2, height: 2, labels, surfaces: 2, coverage: 0.5, ms: 12 });
    await expect(p).resolves.toEqual({ mask: { width: 2, height: 2, data: mask }, labels, surfaces: 2, coverage: 0.5, ms: 12 });

    // a stray result for an unknown id is ignored, and the worker is reused
    w.emit({ type: "result", id: 99, mask, width: 2, height: 2, labels, surfaces: 0, coverage: 0, ms: 1 });
    void s.segment(pixels, 2, 2);
    expect(factory).toHaveBeenCalledTimes(1);
    expect((w.posted[1] as { id: number }).id).toBe(2);
  });

  it("rejects the matching request on a worker error, or every pending request when the error has no id", async () => {
    const w = new FakeWorker();
    const s = new Segmenter(() => w as unknown as Worker);
    const a = s.segment(pixels, 2, 2);
    const b = s.segment(pixels, 2, 2);
    w.emit({ type: "error", id: 1, message: "bad image" });
    await expect(a).rejects.toThrow("bad image");
    w.emit({ type: "error", message: "model failed to load" });
    await expect(b).rejects.toThrow("model failed to load");
    // an error for an id nobody is waiting on falls through to the broadcast path harmlessly
    w.emit({ type: "error", id: 7, message: "late" });
  });

  it("rejects pending work when the worker itself crashes, and dispose terminates it", async () => {
    const w = new FakeWorker();
    const s = new Segmenter(() => w as unknown as Worker);
    const p = s.segment(pixels, 2, 2);
    w.onerror?.({ message: "" } as ErrorEvent);
    await expect(p).rejects.toThrow(/could not start/);
    const q = s.segment(pixels, 2, 2);
    w.onerror?.({ message: "boom" } as ErrorEvent);
    await expect(q).rejects.toThrow("boom");
    s.dispose();
    expect(w.terminated).toBe(true);
    s.dispose(); // idempotent
  });
});
