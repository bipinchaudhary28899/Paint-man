import { images, type SiteImage } from "./images";

// Photographic wall previews: two rooms (Pexels photos, free licence, see images.ts), each with an
// exact wall mask. The real, lived-in Indian living room (genericScene) is the home-page reveal, the
// palettes and the app's before/after slider; the cosy living room with the sofa (finderScene) is the
// colour finder's room. The mask is a PNG in `public/scenes/` whose alpha is 255 on wall and 0 elsewhere,
// produced once with a SegFormer (ADE20K) wall detector. The Indian room's: SegFormer-B5 on overlapping
// tiles of the photo, edges snapped to the photo with a colour guided filter, specks dropped, small
// pockets filled, the open door, the table top and the chair's back leg cut out and the wall between
// the chair's arms added by hand, then a 1.5 px blur for a soft edge. The sofa room's: SegFormer-B1,
// speck filter, pocket fill and the same blur; its walls are warm white already. The Indian room's walls
// were lilac, so inside the same mask they were taken back to a warm primer white that keeps their own
// light and shade (the sun patches, the chair's shadow): the scene photo is that bare-wall version, the
// room "before colouring". A tint layer in the shade's colour is masked by the mask and blended onto
// it, so shadows, texture, door, TV and chair stay real. `width`/`height` are the photo and mask's
// pixel size: the frame keeps that aspect ratio (or crops photo and mask alike) so the mask never drifts.
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
 * The one generic room every shade is shown on, and the same wall colouring as the home-page reveal:
 * an ordinary Indian living room (panelled grey door, wall-mounted TV, plastic chair, a cot) with its
 * walls in bare primer white, so the tint is a single "multiply" layer exactly as the reveal paints
 * it: white × shade = shade, and the wall's own light, shadow and texture stay crisp.
 */
export const genericScene: PhotoScene = {
  id: "living-room",
  label: "An Indian living room, repainted",
  image: images.previewRoom,
  width: 1600,
  height: 1200,
  mask: "/scenes/indian-living-room-mask.png",
  wallCoverage: 0.46,
  blend: "multiply",
};

/**
 * The colour finder's room: the cosy living room with a navy sofa, open shelving and curtains. Its
 * walls are warm white, so the tint is the same single "multiply" layer.
 */
export const finderScene: PhotoScene = {
  id: "living-room-sofa",
  label: "A cosy living room, repainted",
  image: images.livingMoody,
  width: 933,
  height: 1400,
  mask: "/scenes/living-moody-mask.png",
  wallCoverage: 0.39,
  blend: "multiply",
};

export const photoScenes: PhotoScene[] = [genericScene, finderScene];
