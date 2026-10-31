import { imageSource, photoSource } from "~/lib/images";

// Pictures drawn with Skia on the home page (the reveal's room and the shaped collage), where a photo
// needs a blend mode or a clip path that a plain image view cannot do.

/** What Skia's useImage takes for a website image path: the bundled module, or the Pexels URL sized for `points` drawn (as Photo fetches). */
export function skiaSource(src: string, points?: number): number | string {
  const source = points === undefined ? imageSource(src) : photoSource(src, points);
  const uri = (source as { uri?: unknown }).uri;
  return typeof uri === "string" ? uri : (source as number);
}

export type Box = { x: number; y: number; width: number; height: number };

/**
 * `object-fit: cover` with an `object-position` (0–1 on each axis, 0.5 is centre): the rectangle to draw
 * an image of `imageWidth` × `imageHeight` in so it fills `box`, cropped as the browser crops it.
 */
export function coverRect(imageWidth: number, imageHeight: number, box: Box, position: readonly [number, number] = [0.5, 0.5]): Box {
  const scale = Math.max(box.width / imageWidth, box.height / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return { x: box.x + (box.width - width) * position[0], y: box.y + (box.height - height) * position[1], width, height };
}
