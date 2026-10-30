import { Image } from "expo-image";
import { StyleSheet, type ImageStyle, type StyleProp } from "react-native";

import { imageSource, logo } from "~/lib/images";
import { site, type Illustration, type SiteImage } from "~/shared";

// Photos and illustrations from the website's src/config/images.ts, with its alt text.

/** A standalone photo: sharp corners, cropped to fill its box. */
export function Photo({ image, aspectRatio = 4 / 3, style }: { image: SiteImage; aspectRatio?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={imageSource(image.src)}
      accessible
      accessibilityLabel={image.alt}
      contentFit="cover"
      transition={150}
      style={[styles.photo, { aspectRatio }, style]}
    />
  );
}

/** One of the owner's illustrations (transparent cut-outs), whole, at its own proportions. */
export function Art({ art, style }: { art: Illustration; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={imageSource(art.src)}
      accessible
      accessibilityLabel={art.alt}
      contentFit="contain"
      style={[{ width: "100%", aspectRatio: art.width / art.height }, style]}
    />
  );
}

/** The Paint Saathi logo (the horizontal mark from the brand pack). */
export function Wordmark({ height = 30 }: { height?: number }) {
  return <Image source={logo.source} accessible accessibilityLabel={site.name} contentFit="contain" style={{ height, width: height * logo.aspectRatio }} />;
}

const styles = StyleSheet.create({
  photo: { width: "100%", borderRadius: 0, backgroundColor: "#e8d7c5" },
});
