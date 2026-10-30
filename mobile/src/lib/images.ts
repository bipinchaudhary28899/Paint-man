import type { ImageSource } from "expo-image";

// Pictures for the app. The website's src/config/images.ts names each photo and illustration with
// its alt text; here those web paths become sources. The owner's brand art and the uniform photos
// are bundled from ../public (Metro watches it), so they show offline; Pexels stock photos load
// from Pexels at a phone-sized width.

const bundled: Record<string, number> = {
  "/brand/illustrations/paint-brands.webp": require("../../../public/brand/illustrations/paint-brands.webp"),
  "/brand/illustrations/painter-roller.webp": require("../../../public/brand/illustrations/painter-roller.webp"),
  "/brand/illustrations/paint-can.webp": require("../../../public/brand/illustrations/paint-can.webp"),
  "/brand/illustrations/toolbox.webp": require("../../../public/brand/illustrations/toolbox.webp"),
  "/photos/painter-uniform-skimming.jpg": require("../../../public/photos/painter-uniform-skimming.jpg"),
  "/photos/painter-uniform-ceiling.jpg": require("../../../public/photos/painter-uniform-ceiling.jpg"),
  "/photos/painter-uniform-spraying.jpg": require("../../../public/photos/painter-uniform-spraying.jpg"),
};

/** The horizontal Paint Saathi logo, as the website's header uses. The pack has @1x, @2x and @4x files and Metro picks the one for the screen. */
export const logo = { source: require("../../../public/brand/01-horizontal/paintsaathi-horizontal-color.png") as number, aspectRatio: 1060 / 248 };

const PEXELS = /^https:\/\/images\.pexels\.com\/photos\/\d+\/[\w.-]+\.jpe?g$/;

/** The source for a website image path: bundled for our own files, a sized Pexels URL for stock photos. */
export function imageSource(src: string, width = 1080): ImageSource | number {
  if (src in bundled) return bundled[src];
  if (PEXELS.test(src)) return { uri: `${src}?auto=compress&cs=tinysrgb&w=${width}` };
  throw new Error(`No app source for image "${src}": bundle it in mobile/src/lib/images.ts`);
}
