import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";
import type { SiteImage } from "@/config/images";

// The home hero photo. It is only the LCP element where it sits beside the copy: the hero is a
// wrapping flex row of a 500px and a 420px column with a 72px gap inside 2 × 32px padding, so the
// two sit side by side from a 1056px layout width, which is up to 1073px of media width once a
// classic scrollbar is counted. Below that the photo is stacked under the h1, about 1000px down a
// phone screen, where the h1 is the LCP and an early high-priority fetch would only compete with
// the CSS and fonts the h1 needs.
// So: no deprecated `priority`, an eager <img> with no fetchpriority (never lazy-loaded on
// desktop), and a high-priority preload limited to the side-by-side media query.
export const heroSideBySide = "(min-width: 1080px)";
export const heroSizes = `${heroSideBySide} 560px, 100vw`;

export function HeroImage({ image }: { image: SiteImage }) {
  const { props } = getImageProps({ src: image.src, alt: image.alt, fill: true, sizes: heroSizes });
  preload(props.src, {
    as: "image",
    imageSrcSet: props.srcSet,
    imageSizes: props.sizes,
    media: heroSideBySide,
    fetchPriority: "high",
  });
  return <Image src={image.src} alt={image.alt} fill loading="eager" sizes={heroSizes} className="object-cover" />;
}
