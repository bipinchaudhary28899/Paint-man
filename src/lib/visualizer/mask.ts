// Mask utilities for the wall visualizer. A mask is a Uint8Array of width×height, one byte per
// pixel, 0 = not wall, 255 = wall (values between are soft edges). Everything here is pure and
// synchronous so it can run in a worker or the page and be unit-tested without a canvas.

export type Mask = { width: number; height: number; data: Uint8Array };

export function emptyMask(width: number, height: number): Mask {
  return { width, height, data: new Uint8Array(width * height) };
}

/** Labels 4-connected regions of a binary mask. Returns per-pixel component ids (0 = none) and their sizes. */
export function connectedComponents(mask: Mask, threshold = 128): { labels: Int32Array; sizes: number[] } {
  const { width, height, data } = mask;
  const labels = new Int32Array(width * height);
  const sizes: number[] = [0];
  const stack = new Int32Array(width * height);
  let next = 1;
  for (let start = 0; start < data.length; start++) {
    if (data[start] < threshold || labels[start]) continue;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = next;
    let size = 0;
    while (sp) {
      const i = stack[--sp];
      size++;
      const x = i % width, y = (i - x) / width;
      if (x > 0 && data[i - 1] >= threshold && !labels[i - 1]) { labels[i - 1] = next; stack[sp++] = i - 1; }
      if (x < width - 1 && data[i + 1] >= threshold && !labels[i + 1]) { labels[i + 1] = next; stack[sp++] = i + 1; }
      if (y > 0 && data[i - width] >= threshold && !labels[i - width]) { labels[i - width] = next; stack[sp++] = i - width; }
      if (y < height - 1 && data[i + width] >= threshold && !labels[i + width]) { labels[i + width] = next; stack[sp++] = i + width; }
    }
    sizes.push(size);
    next++;
  }
  return { labels, sizes };
}

/** Drops components smaller than `minFraction` of the image (specks the model leaves on furniture). */
export function dropSmallComponents(mask: Mask, minFraction = 0.004): Mask {
  const { labels, sizes } = connectedComponents(mask);
  const min = mask.width * mask.height * minFraction;
  const out = new Uint8Array(mask.data);
  for (let i = 0; i < out.length; i++) if (labels[i] && sizes[labels[i]] < min) out[i] = 0;
  return { ...mask, data: out };
}

/**
 * Fills non-wall pockets smaller than `minFraction` of the image: the speck filter run on the
 * inverse mask. Dark or glossy patches of a wall (shadow under a shelf, a switch plate, a
 * reflection) that the model leaves out become wall again; anything larger (a picture, a TV,
 * a window) stays untouched.
 */
export function fillSmallHoles(mask: Mask, minFraction = 0.004): Mask {
  const inverse: Mask = { ...mask, data: mask.data.map((v) => 255 - v) };
  const { labels, sizes } = connectedComponents(inverse);
  const min = mask.width * mask.height * minFraction;
  const out = new Uint8Array(mask.data);
  for (let i = 0; i < out.length; i++) if (labels[i] && sizes[labels[i]] < min) out[i] = 255;
  return { ...mask, data: out };
}

/** Builds a mask from the components whose ids are in `selected`. */
export function maskFromComponents(mask: Mask, labels: Int32Array, selected: Set<number>): Mask {
  const out = new Uint8Array(mask.width * mask.height);
  for (let i = 0; i < out.length; i++) if (selected.has(labels[i])) out[i] = 255;
  return { ...mask, data: out };
}

/** Nearest-neighbour resize of a mask (used to take the model's mask to the photo's size). */
export function resizeMask(mask: Mask, width: number, height: number): Mask {
  if (mask.width === width && mask.height === height) return mask;
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(mask.height - 1, Math.floor((y * mask.height) / height));
    for (let x = 0; x < width; x++) {
      const sx = Math.min(mask.width - 1, Math.floor((x * mask.width) / width));
      out[y * width + x] = mask.data[sy * mask.width + sx];
    }
  }
  return { width, height, data: out };
}

/** Separable box blur, run `passes` times (≈ Gaussian), to soften mask edges by `radius` px. */
export function feather(mask: Mask, radius = 2, passes = 2): Mask {
  if (radius <= 0) return mask;
  const { width, height } = mask;
  let src = Float32Array.from(mask.data);
  let dst = new Float32Array(src.length);
  const win = radius * 2 + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < height; y++) {
      let sum = 0;
      const row = y * width;
      for (let x = -radius; x <= radius; x++) sum += src[row + Math.min(width - 1, Math.max(0, x))];
      for (let x = 0; x < width; x++) {
        dst[row + x] = sum / win;
        sum += src[row + Math.min(width - 1, x + radius + 1)] - src[row + Math.max(0, x - radius)];
      }
    }
    [src, dst] = [dst, src];
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) sum += src[Math.min(height - 1, Math.max(0, y)) * width + x];
      for (let y = 0; y < height; y++) {
        dst[y * width + x] = sum / win;
        sum += src[Math.min(height - 1, y + radius + 1) * width + x] - src[Math.max(0, y - radius) * width + x];
      }
    }
    [src, dst] = [dst, src];
  }
  const out = new Uint8Array(src.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.round(src[i]);
  return { width, height, data: out };
}

/** Paints a filled circle into the mask (value 255 to add, 0 to erase). Mutates and returns the mask. */
export function brush(mask: Mask, cx: number, cy: number, radius: number, value: 0 | 255): Mask {
  const { width, height, data } = mask;
  const r2 = radius * radius;
  const x0 = Math.max(0, Math.floor(cx - radius)), x1 = Math.min(width - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius)), y1 = Math.min(height - 1, Math.ceil(cy + radius));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= r2) data[y * width + x] = value;
  }
  return mask;
}

/** Paints a stroke by stamping the brush along the segment, so fast drags leave no gaps. */
export function brushLine(mask: Mask, x0: number, y0: number, x1: number, y1: number, radius: number, value: 0 | 255): Mask {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(1, radius / 2)));
  for (let s = 0; s <= steps; s++) brush(mask, x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps, radius, value);
  return mask;
}

/** Fraction of pixels that are wall (≥128). */
export function coverage(mask: Mask): number {
  let n = 0;
  for (let i = 0; i < mask.data.length; i++) if (mask.data[i] >= 128) n++;
  return mask.data.length ? n / mask.data.length : 0;
}

/** Pixel-wise max of two masks (union). */
export function unionMask(a: Mask, b: Mask): Mask {
  const out = new Uint8Array(a.data.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(a.data[i], b.data[i]);
  return { ...a, data: out };
}

/** a minus b. */
export function subtractMask(a: Mask, b: Mask): Mask {
  const out = new Uint8Array(a.data.length);
  for (let i = 0; i < out.length; i++) out[i] = b.data[i] >= 128 ? 0 : a.data[i];
  return { ...a, data: out };
}
