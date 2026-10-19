import Image from "next/image";
import { genericScene } from "@/config/scenes";

/** The shade a preview shows: a name and hex, plus its shade-card code and LRV when known. */
export type PreviewShade = { name: string; code?: string; hex: string; lrv?: number };

// Every shade on the same ordinary room: the photo never changes, only the wall colour does,
// so shades compare fairly. Tint layers in the shade's hex are masked by the scene's wall
// mask (a PNG from the wall detector) and blended onto the photograph (see scenes.ts for the
// two blend modes); shadows and texture stay real and the furniture is untouched.
// The whole photo is always shown (never cropped). `maxHeight` caps how tall it gets: the frame
// narrows to keep the photo's shape. `compact` (phones): the height comes from `frameClassName`,
// the width follows the photo's shape, and there is no caption. Every preview sits below the
// fold or beside the list, so the photo lazy-loads (no preload: it would compete with the CSS).
export function WallPreview({
  colour,
  className = "",
  sizes = "(min-width: 1024px) 720px, 100vw",
  compact = false,
  frameClassName = "",
  maxHeight = "75vh",
}: { colour: PreviewShade; className?: string; sizes?: string; compact?: boolean; frameClassName?: string; maxHeight?: string }) {
  const scene = genericScene;
  const ratio = scene.width / scene.height;
  const frame = compact
    ? { aspectRatio: `${scene.width} / ${scene.height}` }
    : { aspectRatio: `${scene.width} / ${scene.height}`, width: `min(100%, calc(${maxHeight} * ${ratio.toFixed(4)}))`, marginInline: "auto" };
  return (
    <figure className={`overflow-hidden rounded-3xl border border-line bg-paper ${className}`}>
      <div className={`scene relative ${compact ? "w-auto" : ""} ${frameClassName}`} style={frame}>
        <Image src={scene.image.src} alt={`${scene.label} in ${colour.name}`} fill sizes={sizes} className="object-cover" />
        {(scene.blend === "color" ? ["color", "lum"] : ["multiply"]).map((blend) => (
          <span
            key={blend}
            aria-hidden
            className={`tint tint-${blend}`}
            data-blend={blend}
            style={{ background: colour.hex, maskImage: `url(${scene.mask})`, WebkitMaskImage: `url(${scene.mask})` }}
          />
        ))}
      </div>
      <figcaption className={`${compact ? "hidden" : "flex"} items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-sm font-semibold`}>
        <span>{colour.name}{colour.code && <> <span className="font-normal text-muted">{colour.code}</span></>}</span>
        <span className="text-xs font-medium text-muted">{colour.hex.toUpperCase()}{colour.lrv !== undefined && ` · LRV ${colour.lrv}`}</span>
      </figcaption>
    </figure>
  );
}
