import Image from "next/image";
import { site } from "@/config/site";

// The Paint Saathi brand pack (public/brand, from the owner's logo files). Each lock-up is used
// where it fits: the full horizontal logo in the header at every width (on phones too, so the name
// is always read, as in the app), the stacked logo in the footer and the swatch-fan mark on its own
// (admin, icons). The pack's short "PS" lock-up is not used: alone it does not say who we are.
type Art = { src: string; width: number; height: number };
const pack = (dir: string, name: string, tone: string, width: number, height: number): Art => ({
  src: `/brand/${dir}/paintsaathi-${name}-${tone}@2x.png`,
  width,
  height,
});

export const BRAND = {
  mark: "/brand/04-icon/paintsaathi-icon-color-256.png",
  horizontal: { color: pack("01-horizontal", "horizontal", "color", 1060, 248), reversed: pack("01-horizontal", "horizontal", "reversed", 1060, 248) },
  stacked: { color: pack("02-stacked", "stacked", "color", 592, 392), reversed: pack("02-stacked", "stacked", "reversed", 592, 392) },
} as const;

/** The swatch-fan mark alone (decorative: the name is always written beside it or in the link label). */
export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return <Image src={BRAND.mark} alt="" width={256} height={256} className={`shrink-0 ${className}`} />;
}

/**
 * The header logo: the full horizontal logo (mark and "PaintSaathi") at every width, smaller on
 * phones (smallest under 360px, where it still fits beside "Log in"), larger on desktop. Its
 * width/height reserve the space before it loads (no layout shift).
 */
export function Wordmark({
  variant = "color",
  eager = false,
  className = "h-8 w-auto min-[360px]:h-9 min-[721px]:h-11 lg:h-12",
}: {
  variant?: "color" | "reversed";
  eager?: boolean;
  className?: string;
}) {
  const art = BRAND.horizontal[variant];
  return <Image src={art.src} alt={site.name} width={art.width} height={art.height} sizes="220px" loading={eager ? "eager" : undefined} className={className} />;
}

/** The stacked logo (mark above "PaintSaathi") for the footer: smaller on phones, larger on desktop. */
export function StackedLogo({ variant = "reversed", className = "h-16 w-auto md:h-24" }: { variant?: "color" | "reversed"; className?: string }) {
  const art = BRAND.stacked[variant];
  return <Image src={art.src} alt={site.name} width={art.width} height={art.height} sizes="160px" className={className} />;
}
