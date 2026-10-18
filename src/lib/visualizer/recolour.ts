import type { Mask } from "./mask";

// Realistic recolouring: every wall pixel keeps its own lightness relative to the wall's
// average (so shadows, light falloff and plaster texture survive) and takes the target
// shade's hue and chroma. Done in OKLab, which keeps the result perceptually even, then
// blended by the (soft-edged) mask so non-wall pixels are byte-for-byte unchanged.

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const LIN = new Float32Array(256).map((_, i) => srgbToLinear(i / 255));

export function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = LIN[r], lg = LIN[g], lb = LIN[b];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

export function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const to = (c: number) => Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.min(1, Math.max(0, c))))) * 255);
  return [to(lr), to(lg), to(lb)];
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Mean OKLab lightness of the pixels the mask marks as wall (≥128). */
export function wallMeanLightness(pixels: Uint8ClampedArray, mask: Mask): number {
  let sum = 0, n = 0;
  for (let i = 0, p = 0; i < mask.data.length; i++, p += 4) {
    if (mask.data[i] < 128) continue;
    sum += rgbToOklab(pixels[p], pixels[p + 1], pixels[p + 2])[0];
    n++;
  }
  return n ? sum / n : 0.8;
}

export type RecolourOptions = {
  /** How strongly the wall's own light/shade variation shows through (0 flat, 1 full). */
  texture?: number;
};

/**
 * Writes the recoloured image into `out` (same size as `src`). For each pixel:
 * relative lightness = pixel L / wall mean L; new L = target L × relative lightness (eased so
 * very dark shadows don't crush and highlights don't blow out); hue and chroma = target's,
 * with chroma easing off towards the extremes of lightness. Then mix by mask alpha.
 */
export function recolour(src: Uint8ClampedArray, out: Uint8ClampedArray, mask: Mask, targetHex: string, meanL: number, opts: RecolourOptions = {}): void {
  const texture = opts.texture ?? 1;
  const [tr, tg, tb] = hexToRgb(targetHex);
  const [tL, ta, tb2] = rgbToOklab(tr, tg, tb);
  const safeMean = Math.max(0.05, meanL);
  for (let i = 0, p = 0; i < mask.data.length; i++, p += 4) {
    const m = mask.data[i];
    if (m === 0) { out[p] = src[p]; out[p + 1] = src[p + 1]; out[p + 2] = src[p + 2]; out[p + 3] = src[p + 3]; continue; }
    const [L] = rgbToOklab(src[p], src[p + 1], src[p + 2]);
    const rel = 1 + ((L / safeMean) - 1) * texture; // 1 = same as the average wall pixel
    let nL = tL * rel;
    // soften extremes: compress above 0.95 and below 0.08 so paint never reads as pure white/black
    if (nL > 0.95) nL = 0.95 + (nL - 0.95) * 0.3;
    if (nL < 0.08) nL = 0.08 - (0.08 - nL) * 0.4;
    const chromaScale = nL > tL ? Math.max(0.35, 1 - (nL - tL) * 2.2) : 1;
    const [r, g, b] = oklabToRgb(nL, ta * chromaScale, tb2 * chromaScale);
    const a = m / 255;
    out[p] = Math.round(src[p] + (r - src[p]) * a);
    out[p + 1] = Math.round(src[p + 1] + (g - src[p + 1]) * a);
    out[p + 2] = Math.round(src[p + 2] + (b - src[p + 2]) * a);
    out[p + 3] = src[p + 3];
  }
}
