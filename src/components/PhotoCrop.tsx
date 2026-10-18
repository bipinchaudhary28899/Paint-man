import Image from "next/image";
import type { CSSProperties } from "react";
import type { SiteImage } from "@/config/images";
import { shapePaths } from "@/lib/shapes";

export type CropShape = "arch" | "circle" | "pill" | "squircle" | "slant" | "ticket" | keyof typeof shapePaths;

const svgMask = (d: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' preserveAspectRatio='none'><path d='${d}'/></svg>`,
  )}")`;

function shapeStyle(shape: CropShape): { className: string; style?: CSSProperties } {
  switch (shape) {
    case "arch":
      return { className: "rounded-t-full rounded-b-[2rem]" };
    case "circle":
      return { className: "rounded-full" };
    case "pill":
      return { className: "rounded-full" };
    case "squircle":
      return { className: "rounded-[38%]" };
    case "slant":
      return { className: "", style: { clipPath: "polygon(12% 0, 100% 0, 88% 100%, 0 100%)" } };
    case "ticket":
      return {
        className: "rounded-[1.5rem]",
        style: {
          WebkitMask: "radial-gradient(circle at 0 50%, #0000 22px, #000 23px) left/51% 100% no-repeat, radial-gradient(circle at 100% 50%, #0000 22px, #000 23px) right/51% 100% no-repeat",
          mask: "radial-gradient(circle at 0 50%, #0000 22px, #000 23px) left/51% 100% no-repeat, radial-gradient(circle at 100% 50%, #0000 22px, #000 23px) right/51% 100% no-repeat",
        },
      };
    default: {
      const m = svgMask(shapePaths[shape]);
      return {
        className: "",
        style: { WebkitMaskImage: m, maskImage: m, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" },
      };
    }
  }
}

type Props = {
  image: SiteImage;
  shape: CropShape;
  /** Tailwind classes for size/aspect, e.g. "aspect-[4/5] w-full". */
  className?: string;
  /** Colour of the offset shape behind the photo. Omit for none. */
  backdrop?: string;
  sizes: string;
  priority?: boolean;
  rotate?: number;
};

// A photo cropped into a shape, with an optional solid shape offset behind it.
export function PhotoCrop({ image, shape, className = "", backdrop, sizes, priority, rotate = 0 }: Props) {
  const s = shapeStyle(shape);
  return (
    <div className={`${/\b(absolute|fixed)\b/.test(className) ? "" : "relative"} ${className}`} style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}>
      {backdrop && (
        <div
          aria-hidden
          className={`absolute inset-0 translate-x-3 translate-y-3 ${s.className}`}
          style={{ ...s.style, background: backdrop }}
        />
      )}
      <div className={`group/crop absolute inset-0 overflow-hidden ${s.className}`} style={s.style}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition duration-700 ease-out group-hover/crop:scale-110"
        />
      </div>
    </div>
  );
}
