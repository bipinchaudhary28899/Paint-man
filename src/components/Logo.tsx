import Image from "next/image";
import { site } from "@/config/site";

// Brand marks. The name is set as a clean text wordmark (DM Serif Display, the site's heading face)
// until the Paint Saathi logo files arrive; then swap Wordmark for the logo image. The swatch-fan
// mark (public/brand, no lettering) stays as the icon.
export const BRAND = {
  mark: "/brand/04-icon/paintman-icon-color-256.png",
} as const;

/** The swatch-fan mark alone (decorative: the name is always written beside it or in the link label). */
export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return <Image src={BRAND.mark} alt="" width={256} height={256} className={`shrink-0 ${className}`} />;
}

/** The name as a text wordmark: "Paint" in ink (or cream on dark), "Saathi" in the terracotta accent. Real text, so it reads and indexes as the name. */
export function Wordmark({ variant = "color", className = "text-[26px] md:text-[28px]" }: { variant?: "color" | "reversed"; className?: string }) {
  const [first, ...rest] = site.name.split(" ");
  return (
    <span className={`whitespace-nowrap font-display leading-none tracking-[-0.01em] ${variant === "reversed" ? "text-on-ink" : "text-ink"} ${className}`}>
      {first}
      {rest.length > 0 && <> <em className={`italic ${variant === "reversed" ? "text-golden" : "text-terracotta"}`}>{rest.join(" ")}</em></>}
    </span>
  );
}
