import { images, type SiteImage } from "./images";

// Photographic wall preview for the colour finder: one generic, ordinary room (a Pexels
// photo, free licence, see images.ts) with an exact wall mask. The mask is a PNG in
// `public/scenes/` whose alpha is 255 on wall and 0 elsewhere, produced once by running the
// visualizer's own SegFormer-B1 wall detector on the photo (speck filter, pocket fill, then a
// 1.5 px blur for a soft edge). A tint layer in the shade's colour is masked by it and
// blended onto the photo, so shadows, texture, sofa and TV stay real. `width`/`height` are
// the photo and mask's pixel size: the frame keeps that aspect ratio so the mask never drifts.
//
// blend: "multiply" for white/light walls (white × shade = shade, shadows kept);
//        "color" for walls that already have a colour: a `color` layer gives the shade's
//        hue and saturation while keeping the photo's shading, and a part-opacity
//        `luminosity` layer pulls the wall towards the shade's lightness so whites read
//        light and deep shades read deep.

export type PhotoScene = {
  id: string;
  label: string;
  image: SiteImage;
  width: number;
  height: number;
  /** Public URL of the wall mask PNG (alpha = wall), same aspect ratio as the photo. */
  mask: string;
  /** Share of the photo that is wall, from the detector; used by tests and the alt text. */
  wallCoverage: number;
  blend: "multiply" | "color";
};

/**
 * The one generic room every shade is shown on: the same cosy living room, and the same wall
 * colouring, as the home-page reveal (sofa, shelf, curtains). Its walls are warm white, so the
 * tint is a single "multiply" layer exactly as the reveal paints it: white × shade = shade, and
 * the wall's own light, shadow and texture stay crisp (the older colour + luminosity pair
 * flattened that shading and looked soft).
 */
export const genericScene: PhotoScene = {
  id: "living-room",
  label: "A cosy living room, repainted",
  image: images.livingMoody,
  width: 933,
  height: 1400,
  mask: "/scenes/living-moody-mask.png",
  wallCoverage: 0.39,
  blend: "multiply",
};

export const photoScenes: PhotoScene[] = [genericScene];
