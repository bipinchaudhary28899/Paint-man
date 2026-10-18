/// <reference lib="webworker" />
// Wall detection, off the main thread. Runs SegFormer-B0 fine-tuned on ADE20K (150 indoor /
// outdoor classes, one of which is "wall") with ONNX Runtime WebAssembly, entirely in the
// browser: the photo never leaves the device and the model (≈4 MB, quantised) is downloaded
// once and kept in the browser cache. We take only the "wall" class, drop specks, and label
// each separate wall surface so the page can toggle them individually.
import { env, pipeline, RawImage, type ImageSegmentationPipeline } from "@huggingface/transformers";
import { connectedComponents, coverage, dropSmallComponents, fillSmallHoles, type Mask } from "@/lib/visualizer/mask";

env.allowLocalModels = false;
env.useBrowserCache = true;
// The ONNX runtime's own WebAssembly build comes from jsDelivr (transformers.js's default,
// pinned to the installed onnxruntime-web version); the CSP allows exactly that host.

// B0 (4 MB) is the default; B1 (14 MB) and B2 (29 MB) are more accurate and slower, selectable per request.
export const MODELS = {
  b0: "Xenova/segformer-b0-finetuned-ade-512-512",
  b1: "Xenova/segformer-b1-finetuned-ade-512-512",
  b2: "Xenova/segformer-b2-finetuned-ade-512-512",
} as const;
export type ModelId = keyof typeof MODELS;
export const SPECK_FRACTION = 0.004;
export const HOLE_FRACTION = 0.004;
const segmenters = new Map<ModelId, Promise<ImageSegmentationPipeline>>();

function load(model: ModelId) {
  let segmenter = segmenters.get(model);
  if (!segmenter) {
    segmenter = pipeline("image-segmentation", MODELS[model], {
      dtype: "q8",
      device: "wasm",
      progress_callback: (data: unknown) => self.postMessage({ type: "progress", data }),
    }).then((p) => {
      self.postMessage({ type: "ready" });
      return p as ImageSegmentationPipeline;
    });
    segmenters.set(model, segmenter);
    segmenter.catch(() => { segmenters.delete(model); });
  }
  return segmenter;
}

type Req = { type: "segment"; id: number; pixels: Uint8ClampedArray; width: number; height: number; model?: ModelId };

self.onmessage = async (e: MessageEvent<Req>) => {
  const { type, id, pixels, width, height, model = "b0" } = e.data;
  if (type !== "segment") return;
  const t0 = performance.now();
  try {
    const seg = await load(model in MODELS ? model : "b0");
    const image = new RawImage(pixels, width, height, 4);
    // No explicit subtask: transformers.js 4.3.1 resolves it from the SegFormer processor (semantic);
    // passing it by name trips a bug where the post-processor is looked up as a string.
    const out = (await seg(image)) as { label: string; mask: RawImage }[];
    const wall = out.find((o) => o.label === "wall");
    let mask: Mask = { width, height, data: new Uint8Array(width * height) };
    if (wall) {
      const m = wall.mask; // single channel, 0 or 255, already at the photo's size
      const src = m.data;
      if (m.width === width && m.height === height) {
        mask.data.set(src);
      } else {
        for (let y = 0; y < height; y++) {
          const sy = Math.min(m.height - 1, Math.floor((y * m.height) / height));
          for (let x = 0; x < width; x++) mask.data[y * width + x] = src[sy * m.width + Math.min(m.width - 1, Math.floor((x * m.width) / width))];
        }
      }
      // Tuned on docs/visualizer-eval: specks under 0.4% of the photo go, pockets under 0.4% fill.
      mask = fillSmallHoles(dropSmallComponents(mask, SPECK_FRACTION), HOLE_FRACTION);
    }
    const { labels, sizes } = connectedComponents(mask);
    self.postMessage(
      { type: "result", id, mask: mask.data, width, height, labels, surfaces: sizes.length - 1, coverage: coverage(mask), ms: Math.round(performance.now() - t0) },
      [mask.data.buffer, labels.buffer],
    );
  } catch (err) {
    console.error("[segment.worker]", err);
    self.postMessage({ type: "error", id, message: err instanceof Error ? err.message : "Wall detection failed." });
  }
};
