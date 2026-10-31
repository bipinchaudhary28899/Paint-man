import { useId, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Svg, { ClipPath, Defs, Image as SvgImage, Path, type ImageProps } from "react-native-svg";

import { photoSource } from "~/lib/images";
import { colors, fonts } from "~/theme";

// The website's decorative pieces on the content pages: the outlined word in a heading
// (.text-outline-ink), a photo cropped to a blob with a solid blob behind it (PhotoCrop), and the
// soft blob behind the booking page (Decor's Blob).

/** DM Serif Display's space, in em (7.85px at 36px, measured on the website). */
const SPACE_EM = 0.218;

/** 16 directions around a circle: copies of the word nudged this way draw its outline. */
const RING = Array.from({ length: 16 }, (_, i) => [Math.cos((i * Math.PI) / 8), Math.sin((i * Math.PI) / 8)] as const);

type Part = string | { outline: string };

/**
 * A heading with one outlined word ("A managed service, <not> a directory"). The website strokes the
 * word in ink (2.4px, half of it under the canvas fill) and fills it with the page colour. Text in
 * React Native has no stroke, so the heading is laid out word by word (wrapping as text does, a
 * space apart) and the outlined word is drawn as ink copies 1.2pt around it under a canvas copy.
 * Screen readers hear the heading once, as text.
 */
export function OutlineHeading({ parts, size, leading, tracking = -0.015, style }: { parts: Part[]; size: number; leading: number; tracking?: number; style?: StyleProp<ViewStyle> }) {
  const label = parts.map((p) => (typeof p === "string" ? p : p.outline)).join("");
  const words = parts.flatMap((p) => (typeof p === "string" ? p.split(/\s+/).filter(Boolean).map((text) => ({ text, outline: false })) : [{ text: p.outline, outline: true }]));
  const text: TextStyle = { fontFamily: fonts.serif, fontSize: size, lineHeight: Math.round(size * leading), letterSpacing: tracking * size, color: colors.ink };
  const stroke = 1.2;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={label} style={[styles.words, { columnGap: (SPACE_EM + tracking) * size }, style]}>
      {words.map((w, i) =>
        w.outline ? (
          <View key={i} testID="outlined-word">
            {RING.map(([dx, dy], k) => (
              // left and right together keep each copy exactly the word's width, so it never wraps
              <Text key={k} style={[text, styles.copy, { left: dx * stroke, right: -dx * stroke, top: dy * stroke }]}>
                {w.text}
              </Text>
            ))}
            <Text style={[text, { color: colors.canvas }]}>{w.text}</Text>
          </View>
        ) : (
          <Text key={i} style={text}>
            {w.text}
          </Text>
        ),
      )}
    </View>
  );
}

/** PhotoCrop's blob shapes (src/lib/shapes.ts on the website), in a 200 × 200 box stretched to the photo. */
export const SHAPES = {
  blob2:
    "M185.3,100.0C186.2,114.1 182.3,130.0 176.2,144.0C170.1,158.0 161.3,177.2 148.6,184.1C135.9,191.0 115.3,187.1 100.0,185.6C84.7,184.1 69.5,182.0 56.7,175.1C43.9,168.2 29.1,156.9 23.2,144.3C17.3,131.8 21.1,114.6 21.4,100.0C21.7,85.4 19.2,69.6 24.8,56.6C30.5,43.6 42.6,30.7 55.1,22.3C67.7,13.9 86.2,4.2 100.0,6.2C113.8,8.1 126.4,25.0 138.2,33.9C150.0,42.7 162.8,48.2 170.7,59.2C178.5,70.2 184.4,85.9 185.3,100.0Z",
} as const;

/**
 * PhotoCrop: a photo cut to a shape, with the same shape in a solid colour offset 12pt down and right
 * behind it. The shape stretches with the box (preserveAspectRatio="none" on the website); the photo
 * keeps its proportions and covers it (object-cover), fetched at the box's width once it is laid out.
 */
export function ShapedPhoto({
  image,
  shape,
  backdrop,
  aspectRatio,
  offset = 12,
  style,
}: {
  image: { src: string; alt: string };
  shape: keyof typeof SHAPES;
  backdrop?: string;
  aspectRatio: number;
  offset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const clipId = `crop${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const d = SHAPES[shape];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={image.alt}
      style={[styles.crop, { aspectRatio }, style]}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {box && box.w > 0 && (
        <Svg width={box.w + offset} height={box.h + offset} style={styles.svg}>
          <Defs>
            <ClipPath id={clipId}>
              <Path d={d} transform={`scale(${box.w / 200} ${box.h / 200})`} />
            </ClipPath>
          </Defs>
          {backdrop && <Path d={d} fill={backdrop} transform={`translate(${offset} ${offset}) scale(${box.w / 200} ${box.h / 200})`} />}
          <SvgImage
            href={photoSource(image.src, box.w) as ImageProps["href"]}
            x={0}
            y={0}
            width={box.w}
            height={box.h}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        </Svg>
      )}
    </View>
  );
}

const BLOB = "M44.7,-58.5C57.1,-49.8,66,-35.6,70.6,-19.8C75.2,-4,75.5,13.4,68.6,27.3C61.7,41.2,47.6,51.6,32.3,59.5C17,67.4,0.5,72.8,-16.7,71.4C-33.9,70,-51.8,61.8,-62.4,48.1C-73,34.4,-76.3,15.2,-73.4,-2.3C-70.5,-19.8,-61.3,-35.6,-48.5,-44.3C-35.7,-53,-19.3,-54.7,-2.4,-51.7C14.5,-48.8,32.3,-67.2,44.7,-58.5Z";

/** Decor's Blob: a soft organic shape behind a page (decorative). */
export function Blob({ color, size, style }: { color: string; size: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style} testID="blob">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Path fill={color} d={BLOB} transform="translate(100 100)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  words: { flexDirection: "row", flexWrap: "wrap" },
  copy: { position: "absolute", color: colors.ink },
  crop: { width: "100%" },
  svg: { position: "absolute", left: 0, top: 0 },
});
