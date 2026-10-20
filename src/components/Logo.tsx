import Image from "next/image";
import { site } from "@/config/site";

// The Paint Saathi brand pack (public/brand, from the owner's logo files): the swatch-fan mark and
// the horizontal logo (mark + "PaintSaathi"), in colour for the cream canvas and reversed for ink.
export const BRAND = {
  mark: "/brand/04-icon/paintsaathi-icon-color-256.png",
  horizontal: {
    color: "/brand/01-horizontal/paintsaathi-horizontal-color@2x.png",
    reversed: "/brand/01-horizontal/paintsaathi-horizontal-reversed@2x.png",
  },
  /** 1060 × 248 at @2x */
  horizontalSize: { width: 1060, height: 248 },
} as const;

/** The swatch-fan mark alone (decorative: the name is always written beside it or in the link label). */
export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return <Image src={BRAND.mark} alt="" width={256} height={256} className={`shrink-0 ${className}`} />;
}

/** The horizontal logo. Its alt is the name, so a link around it reads as "Paint Saathi". */
export function Wordmark({ variant = "color", className = "h-9 w-auto md:h-10", eager = false }: { variant?: "color" | "reversed"; className?: string; eager?: boolean }) {
  return (
    <Image
      src={BRAND.horizontal[variant]}
      alt={site.name}
      width={BRAND.horizontalSize.width}
      height={BRAND.horizontalSize.height}
      sizes="180px"
      loading={eager ? "eager" : undefined}
      className={className}
    />
  );
}
