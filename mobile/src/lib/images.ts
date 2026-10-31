import type { ImageSource } from "expo-image";
import { PixelRatio } from "react-native";

// Pictures for the app. The website's config (src/config/images.ts, gallery.ts, scenes.ts) names each
// photo and illustration with its alt text; here those web paths become sources. Our own files (brand
// art, uniform photos, the wall mask) are bundled from ../public (Metro watches it), so they show
// offline; Pexels stock photos load from Pexels at the width they are drawn at (photoSource).

const bundled: Record<string, number> = {
  "/brand/illustrations/paint-brands.webp": require("../../../public/brand/illustrations/paint-brands.webp"),
  "/brand/illustrations/painter-roller.webp": require("../../../public/brand/illustrations/painter-roller.webp"),
  "/brand/illustrations/paint-can.webp": require("../../../public/brand/illustrations/paint-can.webp"),
  "/brand/illustrations/toolbox.webp": require("../../../public/brand/illustrations/toolbox.webp"),
  "/photos/painter-uniform-skimming.jpg": require("../../../public/photos/painter-uniform-skimming.jpg"),
  "/photos/painter-uniform-ceiling.jpg": require("../../../public/photos/painter-uniform-ceiling.jpg"),
  "/photos/painter-uniform-spraying.jpg": require("../../../public/photos/painter-uniform-spraying.jpg"),
  "/scenes/living-moody-mask.png": require("../../../public/scenes/living-moody-mask.png"),
};

/**
 * The brand pack's lock-ups the app draws (src/components/Logo.tsx on the website): the short "PS" logo
 * in the phone header, the stacked reversed logo in the footer and the stacked colour logo of the
 * opening animation. Each pack file comes at @1x, @2x and @4x; Metro picks the one for the screen. Only
 * these are required: every file required here ships in the app, drawn or not (the horizontal logo and
 * the swatch-fan mark, never drawn in the app, would add about 95 KB).
 */
export const logos = {
  short: { source: require("../../../public/brand/03-short-mobile/paintsaathi-short-color.png") as number, width: 344, height: 192 },
  stackedReversed: { source: require("../../../public/brand/02-stacked/paintsaathi-stacked-reversed.png") as number, width: 592, height: 392 },
  stackedColor: { source: require("../../../public/brand/02-stacked/paintsaathi-stacked-color.png") as number, width: 592, height: 392 },
} as const;

const PEXELS = /^https:\/\/images\.pexels\.com\/photos\/\d+\/[\w.-]+\.jpe?g$/;

/** The source for a website image path: bundled for our own files, a Pexels URL `width` pixels wide for stock photos. */
export function imageSource(src: string, width = 1080): ImageSource | number {
  if (src in bundled) return bundled[src];
  if (PEXELS.test(src)) return { uri: `${src}?auto=compress&cs=tinysrgb&w=${width}` };
  throw new Error(`No app source for image "${src}": bundle it in mobile/src/lib/images.ts`);
}

/**
 * The widths Pexels is asked for. A photo is fetched at the first step that covers the pixels it is
 * drawn at, so photos drawn at similar sizes share one cached file (and one download).
 */
export const PHOTO_WIDTHS = [400, 600, 800, 1080, 1280, 1600] as const;

/**
 * The Pexels width for a photo drawn `points` wide on a screen with `pixelRatio` pixels a point: the
 * smallest step that covers 90% of its pixels (a photo shown 10% larger than its file is not visibly
 * softer), never more than the largest step. A full-bleed photo on a 393pt, 3× iPhone (1179px) is 1080;
 * a 170pt tile on the same phone, 600; anything on a 2× phone, about two thirds of that.
 */
export function photoWidth(points: number, pixelRatio: number): number {
  const need = Math.max(0, points) * pixelRatio * 0.9;
  return PHOTO_WIDTHS.find((w) => w >= need) ?? PHOTO_WIDTHS[PHOTO_WIDTHS.length - 1];
}

/** The source for a photo drawn `points` wide on this screen: a bundled file as it is, a Pexels photo at photoWidth. */
export function photoSource(src: string, points: number, pixelRatio: number = PixelRatio.get()): ImageSource | number {
  return imageSource(src, photoWidth(points, pixelRatio));
}
