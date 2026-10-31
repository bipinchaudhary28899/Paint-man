import { Image, type ImageContentFit } from "expo-image";
import { StyleSheet, useWindowDimensions, type ImageStyle, type StyleProp } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { imageSource, logos, photoSource } from "~/lib/images";
import { site, type Illustration } from "~/shared";
import { colors } from "~/theme";

// Photos and illustrations with the website's alt text. Standalone photos have sharp corners (the
// website's rule); a photo inside a card takes the card's radius from its `style`.
//
// Loading: a photo is fetched at the size it is drawn (photoSource: the drawn width × the screen's
// pixel ratio, rounded up to a few shared steps), kept in memory and on disk (cachePolicy memory-disk),
// so scrolling back or reopening a page shows it at once. Its box is reserved by its aspect ratio and
// filled with sand until the picture arrives, which then fades in over 150ms (at once under reduce
// motion). The first screen's photo (a page hero) asks for priority "high"; photos further down the page
// and in carousels pass "low", so they never queue ahead of it.

type Picture = { src: string; alt: string };

/** How long a picture takes to fade in over its sand box. */
export const FADE_MS = 150;

/**
 * A photo cropped to fill its box. Pass `aspectRatio` or a size in `style`. `width` is the width it is
 * drawn at in points (default: the screen's width, a full-bleed photo; never more than the screen), which
 * picks the size fetched. `decorative` hides it from screen readers (alt="").
 */
export function Photo({
  image,
  aspectRatio,
  style,
  fit = "cover",
  position,
  width,
  decorative = false,
  priority,
  recyclingKey,
}: {
  image: Picture;
  aspectRatio?: number;
  style?: StyleProp<ImageStyle>;
  fit?: ImageContentFit;
  /** object-position, e.g. "62% bottom" → { left: "62%", bottom: 0 } */
  position?: { top?: number | `${number}%`; left?: number | `${number}%`; right?: number | `${number}%`; bottom?: number | `${number}%` } | "center";
  /** the width the photo is drawn at, in points (default: the screen width) */
  width?: number;
  decorative?: boolean;
  /** "high" for the first screen's photo only, "low" below the fold and in carousels */
  priority?: "high" | "normal" | "low";
  /** a list or carousel item's key, so a recycled view never shows the previous photo while the next loads (default: the photo's path) */
  recyclingKey?: string;
}) {
  const { width: screen } = useWindowDimensions();
  const reduced = useReducedMotion();
  return (
    <Image
      source={photoSource(image.src, Math.min(width ?? screen, screen))}
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : image.alt}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "yes"}
      contentFit={fit}
      contentPosition={position}
      priority={priority}
      cachePolicy="memory-disk"
      recyclingKey={recyclingKey ?? image.src}
      transition={reduced ? 0 : FADE_MS}
      style={[styles.photo, aspectRatio !== undefined && { aspectRatio }, style]}
    />
  );
}

/** One of the owner's illustrations (transparent cut-outs, bundled with the app), whole, at its own proportions. */
export function Art({ art, style, width }: { art: Illustration; style?: StyleProp<ImageStyle>; width?: number | `${number}%` }) {
  return (
    <Image
      source={imageSource(art.src)}
      accessible
      accessibilityLabel={art.alt}
      contentFit="contain"
      cachePolicy="memory-disk"
      style={[{ width: width ?? "100%", aspectRatio: art.width / art.height }, style]}
    />
  );
}

type LogoName = keyof typeof logos;

/** A brand-pack logo at a given height (its width follows the file's proportions). `decorative` hides it from screen readers (inside a link that names it). */
export function Logo({ name = "short", height = 40, decorative = false }: { name?: LogoName; height?: number; decorative?: boolean }) {
  const art = logos[name];
  return (
    <Image
      source={art.source}
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : site.name}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "yes"}
      contentFit="contain"
      cachePolicy="memory-disk"
      style={{ height, width: (height * art.width) / art.height }}
    />
  );
}

const styles = StyleSheet.create({
  // the sand fill is the placeholder: it shows in the reserved box until the photo fades in over it
  photo: { width: "100%", borderRadius: 0, backgroundColor: colors.sand },
});
