import Image, { getImageProps } from "next/image";
import { site } from "@/config/site";

// The Paint Saathi brand pack (public/brand, from the owner's logo files). Each lock-up is used
// where it fits: the short "PS" logo in the phone header, the full horizontal logo on wider
// screens, the stacked logo in the footer and the swatch-fan mark on its own (admin, icons).
type Art = { src: string; width: number; height: number };
const pack = (dir: string, name: string, tone: string, width: number, height: number): Art => ({
  src: `/brand/${dir}/paintsaathi-${name}-${tone}@2x.png`,
  width,
  height,
});

export const BRAND = {
  mark: "/brand/04-icon/paintsaathi-icon-color-256.png",
  horizontal: { color: pack("01-horizontal", "horizontal", "color", 1060, 248), reversed: pack("01-horizontal", "horizontal", "reversed", 1060, 248) },
  short: { color: pack("03-short-mobile", "short", "color", 344, 192), reversed: pack("03-short-mobile", "short", "reversed", 344, 192) },
  stacked: { color: pack("02-stacked", "stacked", "color", 592, 392), reversed: pack("02-stacked", "stacked", "reversed", 592, 392) },
} as const;

/** The width at which the header shows its full navigation; the full logo appears from here up. */
export const WIDE_MEDIA = "(min-width: 721px)";

/** The swatch-fan mark alone (decorative: the name is always written beside it or in the link label). */
export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return <Image src={BRAND.mark} alt="" width={256} height={256} className={`shrink-0 ${className}`} />;
}

/**
 * The header logo: the compact "PS" logo on phones and the full horizontal logo on wider screens,
 * larger on desktop. One <picture>, so a phone downloads only the small file; the <source> carries
 * the wide logo's own width/height so its space is reserved before it loads (no layout shift).
 */
export function Wordmark({
  variant = "color",
  eager = false,
  className = "h-10 w-auto min-[721px]:h-11 lg:h-12",
}: {
  variant?: "color" | "reversed";
  eager?: boolean;
  className?: string;
}) {
  const common = { alt: site.name, sizes: "220px", loading: eager ? ("eager" as const) : undefined };
  const wide = BRAND.horizontal[variant];
  const small = BRAND.short[variant];
  const {
    props: { srcSet: wideSrcSet },
  } = getImageProps({ ...common, ...wide });
  const { props } = getImageProps({ ...common, ...small });
  return (
    <picture>
      <source media={WIDE_MEDIA} srcSet={wideSrcSet} width={wide.width} height={wide.height} />
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img {...props} className={className} />
    </picture>
  );
}

/** The stacked logo (mark above "PaintSaathi") for the footer: smaller on phones, larger on desktop. */
export function StackedLogo({ variant = "reversed", className = "h-16 w-auto md:h-24" }: { variant?: "color" | "reversed"; className?: string }) {
  const art = BRAND.stacked[variant];
  return <Image src={art.src} alt={site.name} width={art.width} height={art.height} sizes="160px" className={className} />;
}
