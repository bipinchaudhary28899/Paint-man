import Image from "next/image";

// The PaintMan brand pack (public/brand, from the owner's logo files): the swatch-fan mark and
// the serif wordmark, in colour (for the cream canvas) and reversed (for ink backgrounds).
export const BRAND = {
  mark: "/brand/04-icon/paintman-icon-color-256.png",
  horizontal: { color: "/brand/01-horizontal/paintman-horizontal-color@2x.png", reversed: "/brand/01-horizontal/paintman-horizontal-reversed@2x.png" },
  /** 924 × 248 at @2x */
  horizontalSize: { width: 924, height: 248 },
} as const;

/** The swatch-fan mark alone (decorative: the name is always written beside it or in the link label). */
export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return <Image src={BRAND.mark} alt="" width={256} height={256} className={`shrink-0 ${className}`} />;
}

/** The horizontal logo (mark + "PaintMan"). Its alt carries the name, so a link around it needs no other text. */
export function Wordmark({ variant = "color", className = "h-9 w-auto", eager = false }: { variant?: "color" | "reversed"; className?: string; eager?: boolean }) {
  return (
    <Image
      src={BRAND.horizontal[variant]}
      alt="PaintMan"
      width={BRAND.horizontalSize.width}
      height={BRAND.horizontalSize.height}
      sizes="180px"
      loading={eager ? "eager" : undefined}
      className={className}
    />
  );
}
