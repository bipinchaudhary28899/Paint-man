import Image from "next/image";
import type { Colour } from "@/config/colours";
import { genericScene } from "@/config/scenes";

// Every shade on the same ordinary room: the photo never changes, only the wall colour does,
// so shades compare fairly. Tint layers in the shade's hex are masked by the scene's wall
// mask (a PNG from the wall detector) and blended onto the photograph (see scenes.ts for the
// two blend modes); shadows and texture stay real and the furniture is untouched.
// `compact`: a short, wide crop for phones (height set by the caller via `frameClassName`); the
// mask is cover-cropped like the photo, so any frame shape stays aligned. No caption.
export function WallPreview({
  colour,
  className = "",
  priority,
  sizes = "(min-width: 1024px) 720px, 100vw",
  compact = false,
  frameClassName = "",
}: { colour: Colour; className?: string; priority?: boolean; sizes?: string; compact?: boolean; frameClassName?: string }) {
  const scene = genericScene;
  return (
    <figure className={`overflow-hidden rounded-3xl border border-line bg-paper ${className}`}>
      <div className={`scene relative w-full ${frameClassName}`} style={compact ? undefined : { aspectRatio: `${scene.width} / ${scene.height}` }}>
        <Image src={scene.image.src} alt={`${scene.label} in ${colour.name}`} fill priority={priority} sizes={sizes} className="object-cover" />
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
        <span>{colour.name} <span className="font-normal text-muted">{colour.code}</span></span>
        <span className="text-xs font-medium text-muted">{colour.hex.toUpperCase()} · LRV {colour.lrv}</span>
      </figcaption>
    </figure>
  );
}
