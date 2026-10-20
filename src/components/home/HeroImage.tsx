import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";
type HeroSource = { src: string; alt: string };

// The home hero picture. Where it is the LCP element depends on the layout (measured):
// - desktop (from 1080px, the `desk:` breakpoint in globals.css): beside the copy, in the first screen;
// - tablets (721px up, `tab:`): a framed panel spanning the page under the headline and the intro,
//   about 720px wide and fully in the first screen of a portrait tablet, so it outweighs the h1;
// - phones: the same panel well down the first screen, smaller than the h1, which is the LCP there;
//   an early high-priority fetch would only compete with the CSS and fonts the h1 needs.
// So: no deprecated `priority`, an eager <img> with no fetchpriority (never lazy-loaded), and a
// high-priority preload limited to tablets and desktop.
export const heroSideBySide = "(min-width: 1080px)";
export const heroTablet = "(min-width: 721px)";
/** Where the picture is the LCP element, so it is preloaded at high priority: tablets and desktop. */
export const heroPreloadMedia = heroTablet;

/**
 * The widest the picture column gets side by side. Both columns grow equally from their bases
 * (`flex: 1 1 500px` and `1 1 420px`) into the 1200px content box of the 1264px container, so the
 * picture is 420 + (1200 − 500 − 420 − 72) / 2 = 524px at most, and about 420px at the breakpoint.
 */
const HERO_PHOTO_MAX_WIDTH = 524;

/**
 * Below desktop the picture fills a framed panel that spans the page: the screen less the page
 * gutters, the panel's 1px border and its padding. Tablets: 2 × 32px gutter, 2 × 1px border,
 * 2 × 24px padding = 114px. Phones: 2 × 20px gutter, 2 × 1px border, 2 × 12px padding = 66px.
 */
const HERO_TABLET_INSET = 114;
const HERO_PHONE_INSET = 66;

/** One `sizes` for both the <img> and the preload, so the browser picks the same file for each. */
export const heroSizes = `${heroSideBySide} ${HERO_PHOTO_MAX_WIDTH}px, ${heroTablet} calc(100vw - ${HERO_TABLET_INSET}px), calc(100vw - ${HERO_PHONE_INSET}px)`;

export function HeroImage({ image, className = "object-cover" }: { image: HeroSource; className?: string }) {
  const { props } = getImageProps({ src: image.src, alt: image.alt, fill: true, sizes: heroSizes });
  preload(props.src, {
    as: "image",
    imageSrcSet: props.srcSet,
    imageSizes: props.sizes,
    media: heroPreloadMedia,
    fetchPriority: "high",
  });
  return <Image src={image.src} alt={image.alt} fill loading="eager" sizes={heroSizes} className={className} />;
}
