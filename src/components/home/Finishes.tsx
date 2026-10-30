import type { CSSProperties } from "react";
import Image from "next/image";
import { images, type SiteImage } from "@/config/images";

// Example photos of painting in India (stock, see images.ts). No locality or "our job" claims until
// real, consented photos of our own jobs replace them.

/**
 * One photo cut to a shape: Tailwind radii, or a `.shape-*` class from globals.css (the triangles
 * and the interlocking quarter disc and bite). `wave` is its place in the hover wave, in grid
 * cells from the left, so the wave runs across the collage.
 */
type Piece = { image: SiteImage; shape: string; sizes: string; wave?: number; position?: string };
/** A grid cell group: where it sits on phones (2 columns) and from tablets up (6 by 3). */
type Tile = { place: string; wave: number; pieces: Piece[] };

const half = "(min-width: 1264px) 392px, (min-width: 721px) 33vw, 50vw";
const cell = "(min-width: 1264px) 190px, (min-width: 721px) 17vw, 50vw";
const band = "(min-width: 1264px) 392px, (min-width: 721px) 33vw, 100vw";

// Phones: A beside B over F, then the triangles, then the disc and bite square (G and D hide).
// Tablets and desktop, six columns by three rows:
//   A A C C G G
//   A A E E B D
//   A A E E F D
// Every curve and diagonal sits on an inner edge, so the collage keeps a sharp rectangle outline.
export const collageTiles: Tile[] = [
  {
    // A: one rounded corner, a cell's width, on the inner top edge
    place: "col-start-1 row-start-1 row-span-2 tab:col-span-2 tab:row-span-3",
    wave: 0,
    pieces: [{ image: images.uniformSpraying, shape: "rounded-tr-[100%_50%] tab:rounded-tr-[50%_33.333%]", sizes: half, position: "object-[50%_30%]" }],
  },
  {
    // C: a band cut on its diagonal into two triangles
    place: "col-start-1 col-span-2 row-start-3 tab:col-start-3 tab:row-start-1",
    wave: 1,
    pieces: [
      { image: images.twoPaintedDoors, shape: "shape-tri-low", sizes: band, wave: 1, position: "object-[30%_60%]" },
      { image: images.blueHouseDoor, shape: "shape-tri-high", sizes: band, wave: 2, position: "object-[50%_40%]" },
    ],
  },
  {
    // G: one rounded corner, facing the disc below
    place: "hidden tab:block tab:col-start-5 tab:col-span-2 tab:row-start-1",
    wave: 3.6,
    pieces: [{ image: images.rollerOnLadder, shape: "rounded-bl-[50%_100%]", sizes: "(min-width: 1264px) 392px, 33vw", position: "object-[40%_60%]" }],
  },
  {
    // E: a quarter disc and the bite it leaves, one gap apart
    place: "col-start-1 col-span-2 row-start-4 row-span-2 tab:col-start-3 tab:row-start-2",
    wave: 1.2,
    pieces: [
      { image: images.redHouseWall, shape: "shape-disc", sizes: band, wave: 1.2, position: "object-[30%_50%]" },
      { image: images.brushesAndRoller, shape: "shape-bite", sizes: band, wave: 2.2, position: "object-[75%_50%]" },
    ],
  },
  {
    // B: a leaf, two opposite corners rounded
    place: "col-start-2 row-start-1 tab:col-start-5 tab:row-start-2",
    wave: 3,
    pieces: [{ image: images.shadeCardFan, shape: "rounded-tl-[100%] rounded-br-[100%]", sizes: cell, position: "object-[50%_40%]" }],
  },
  {
    // F: a quarter circle
    place: "col-start-2 row-start-2 tab:col-start-5 tab:row-start-3",
    wave: 3.2,
    pieces: [{ image: images.turquoiseHouse, shape: "rounded-tl-[100%]", sizes: cell, position: "object-[70%_50%]" }],
  },
  {
    // D: an arch, for a doorway
    place: "hidden tab:block tab:col-start-6 tab:row-start-2 tab:row-span-2",
    wave: 4.2,
    pieces: [{ image: images.redYellowDoor, shape: "rounded-t-full", sizes: "(min-width: 1264px) 190px, 17vw" }],
  },
];

// "The finish we work to": a collage of painting in India, photos cut into shapes that fill one
// rectangle. Hovering it sends a wave across the pieces and zooms the photo under the pointer;
// scrolling it in raises the tiles in the same order. Both are off under reduced motion.
export function Finishes() {
  return (
    <section id="work" className="container-page relative z-[1] pb-14 tab:pb-[88px] desk:pb-40" aria-labelledby="work-heading">
      <div className="tab:flex tab:flex-wrap tab:items-end tab:justify-between tab:gap-6">
        <div>
          <p className="eyebrow max-tab:text-[11px]">Finishes</p>
          <h2 id="work-heading" className="mt-3 text-[30px] leading-[1.06] tab:mt-5 tab:text-[44px] desk:mt-6 desk:text-[clamp(36px,4vw,56px)]">
            The finish we <em>work to.</em>
          </h2>
        </div>
        <p className="mt-2.5 leading-[1.6] text-muted max-tab:text-[14px] max-tab:leading-[1.55] tab:mt-0 tab:max-desk:max-w-[300px] tab:max-desk:text-[15px] desk:max-w-[340px]">
          Rang, roller aur mehnat: example photos of painting across India. Photos of our own jobs are added as each one is handed over.
        </p>
      </div>
      <ul
        aria-label="Example photos of painting in India"
        className="collage mt-5 grid aspect-[335/850] grid-cols-2 grid-rows-5 tab:mt-8 tab:aspect-[81/40] tab:grid-cols-6 tab:grid-rows-3 desk:mt-14"
      >
        {collageTiles.map((t) => (
          <li key={t.pieces[0].image.src} className={`relative ${t.place}`} style={{ "--wave": t.wave } as CSSProperties}>
            {t.pieces.map((p) => (
              <div
                key={p.image.src}
                className={`collage-piece bg-sand ${p.shape}`}
                style={p.wave === undefined ? undefined : ({ "--wave": p.wave } as CSSProperties)}
              >
                <Image src={p.image.src} alt={p.image.alt} fill sizes={p.sizes} className={`object-cover ${p.position ?? ""}`} />
              </div>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
