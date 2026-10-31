import { images, type SiteImage } from "~/shared";
import type { Box } from "./pictures";

// The Finishes collage at phone width (src/components/home/Finishes.tsx and .collage, .shape-* in
// globals.css): photos cut into shapes that together fill one sharp rectangle, all one gap apart, on a
// 2 × 5 grid of aspect 335:850. G and D are tablet and desktop only.
//   A B
//   A F
//   C C   (a band cut on its diagonal into two triangles)
//   E E   (a quarter disc and the bite it leaves)
//   E E
// Every shape is an SVG path in its tile's own coordinates, so Skia can clip the photo to it exactly
// (elliptical corners and diagonals that a view's border radius cannot draw).

export const COLLAGE_ASPECT = 335 / 850;
/** --gap on phones */
export const COLLAGE_GAP = 8;

type Shape = "corner" | "triLow" | "triHigh" | "disc" | "bite" | "leaf" | "quarter";
type PieceDef = { image: SiteImage; shape: Shape; position?: readonly [number, number] };
/** A tile: its grid area (columns and rows, 0-based, phones) and its place in the wave (rising in order). */
type TileDef = { col: number; row: number; cols: number; rows: number; wave: number; pieces: PieceDef[] };

export const collageTiles: TileDef[] = [
  // A: one rounded corner, a cell's width, on the inner top edge
  { col: 0, row: 0, cols: 1, rows: 2, wave: 0, pieces: [{ image: images.uniformSpraying, shape: "corner", position: [0.5, 0.3] }] },
  // C: a band cut on its diagonal into two triangles
  {
    col: 0,
    row: 2,
    cols: 2,
    rows: 1,
    wave: 1,
    pieces: [
      { image: images.twoPaintedDoors, shape: "triLow", position: [0.3, 0.6] },
      { image: images.blueHouseDoor, shape: "triHigh", position: [0.5, 0.4] },
    ],
  },
  // E: a quarter disc and the bite it leaves, one gap apart
  {
    col: 0,
    row: 3,
    cols: 2,
    rows: 2,
    wave: 1.2,
    pieces: [
      { image: images.redHouseWall, shape: "disc", position: [0.3, 0.5] },
      { image: images.brushesAndRoller, shape: "bite", position: [0.75, 0.5] },
    ],
  },
  // B: a leaf, two opposite corners rounded
  { col: 1, row: 0, cols: 1, rows: 1, wave: 3, pieces: [{ image: images.shadeCardFan, shape: "leaf", position: [0.5, 0.4] }] },
  // F: a quarter circle
  { col: 1, row: 1, cols: 1, rows: 1, wave: 3.2, pieces: [{ image: images.turquoiseHouse, shape: "quarter", position: [0.7, 0.5] }] },
];

/** The collage's height for a width (aspect-[335/850]). */
export const collageHeight = (width: number) => width / COLLAGE_ASPECT;

/** A tile's box in the collage (grid-cols-2 grid-rows-5, gap 8). */
export function tileBox(tile: Pick<TileDef, "col" | "row" | "cols" | "rows">, width: number, gap = COLLAGE_GAP): Box {
  const cell = (width - gap) / 2;
  const row = (collageHeight(width) - 4 * gap) / 5;
  return { x: tile.col * (cell + gap), y: tile.row * (row + gap), width: tile.cols * cell + (tile.cols - 1) * gap, height: tile.rows * row + (tile.rows - 1) * gap };
}

/** The box a piece's photo fills inside its tile: the whole tile, except the disc, inset one gap from the top and right. */
export function pieceBox(shape: Shape, w: number, h: number, gap = COLLAGE_GAP): Box {
  return shape === "disc" ? { x: 0, y: gap, width: w - gap, height: h - gap } : { x: 0, y: 0, width: w, height: h };
}

const n = (v: number) => Math.round(v * 100) / 100;

/** A piece's outline as an SVG path, in its tile's coordinates (w × h). */
export function shapePath(shape: Shape, w: number, h: number, gap = COLLAGE_GAP): string {
  // the triangles' diagonals shift sideways so the two sit one gap apart (--dx = gap × 1.14)
  const dx = gap * 1.14;
  switch (shape) {
    case "corner": // rounded-tr-[100%_50%]
      return `M0 0 A${n(w)} ${n(h / 2)} 0 0 1 ${n(w)} ${n(h / 2)} L${n(w)} ${n(h)} L0 ${n(h)} Z`;
    case "triHigh": // polygon(dx 0, 100%+dx 0, 100%+dx 100%), cut to the tile
      return `M${n(dx)} 0 L${n(w)} 0 L${n(w)} ${n((h * (w - dx)) / w)} Z`;
    case "triLow": // polygon(-dx 0, 100%-dx 100%, -dx 100%), cut to the tile
      return `M0 ${n((h * dx) / w)} L${n(w - dx)} ${n(h)} L0 ${n(h)} Z`;
    case "disc": // inset: gap gap 0 0; border-top-right-radius: 100%
      return `M0 ${n(gap)} A${n(w - gap)} ${n(h - gap)} 0 0 1 ${n(w - gap)} ${n(h)} L0 ${n(h)} Z`;
    case "bite": // the tile less the quarter ellipse at its bottom-left corner
      return `M0 0 L${n(w)} 0 L${n(w)} ${n(h)} A${n(w)} ${n(h)} 0 0 0 0 0 Z`;
    case "leaf": // rounded-tl-[100%] rounded-br-[100%]
      return `M0 ${n(h)} A${n(w)} ${n(h)} 0 0 1 ${n(w)} 0 A${n(w)} ${n(h)} 0 0 1 0 ${n(h)} Z`;
    case "quarter": // rounded-tl-[100%]
      return `M0 ${n(h)} A${n(w)} ${n(h)} 0 0 1 ${n(w)} 0 L${n(w)} ${n(h)} Z`;
  }
}
