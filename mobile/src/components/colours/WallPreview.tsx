import { BlendColor, Canvas, Image, useImage, type SkImage } from "@shopify/react-native-skia";
import { useState } from "react";
import type { SharedValue } from "react-native-reanimated";
import { Dimensions, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

import { photoSource } from "~/lib/images";
import { genericScene } from "~/shared";
import { colors, fonts, radii } from "~/theme";

// Every shade on the same ordinary room (the website's WallPreview): the photo never changes, only
// the wall colour does, so shades compare fairly. The wall mask (alpha = wall) is filled with the
// shade's hex and multiplied onto the photograph, exactly as the website's `mix-blend-mode: multiply`
// tint layer does (white × shade = shade), so shadows and texture stay real and the furniture is
// untouched. Photo and mask are both cover-cropped around the centre, so the tint stays aligned at
// any frame shape. Drawn with Skia, which blends inside one canvas.

/** The shade a preview shows: a name and hex, plus its shade-card code and LRV when known. */
export type PreviewShade = { name: string; code?: string; hex: string; lrv?: number };

const scene = genericScene;
/** The room's width over its height. */
export const SCENE_RATIO = scene.width / scene.height;

// the room is drawn at most the screen's width (the finder's full-bleed preview), so it is fetched at that size
const uri = (src: string) => {
  const source = photoSource(src, Dimensions.get("window").width);
  return typeof source === "number" ? source : (source.uri as string);
};
const PHOTO = uri(scene.image.src);
const MASK = uri(scene.mask);

/** The room's photo and its wall mask as Skia images (null while they load). */
export function useSceneImages(): { photo: SkImage | null; mask: SkImage | null } {
  return { photo: useImage(PHOTO), mask: useImage(MASK) };
}

/**
 * The tint: the wall mask filled with `color` and multiplied onto whatever is drawn under it (the
 * photo), cover-cropped to `width` × `height`. `color` may be a shared value, so a shade can ease in.
 */
export function WallTint({ mask, width, height, color }: { mask: SkImage; width: number; height: number; color: string | SharedValue<string> }) {
  return (
    <Image image={mask} fit="cover" x={0} y={0} width={width} height={height} blendMode="multiply">
      <BlendColor color={color} mode="srcIn" />
    </Image>
  );
}

/** The room tinted in `hex`, filling its box (cover, centred). */
export function SceneCanvas({ colour, style }: { colour: PreviewShade; style?: StyleProp<ViewStyle> }) {
  const { photo, mask } = useSceneImages();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.width || height !== size.height) setSize({ width, height });
  };
  const ready = photo && mask && size.width > 0 && size.height > 0;
  return (
    <View
      style={[styles.scene, style]}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${scene.label} in ${colour.name}`}
      testID="wall-preview"
    >
      {ready && (
        <Canvas style={StyleSheet.absoluteFill}>
          <Image image={photo} fit="cover" x={0} y={0} width={size.width} height={size.height} />
          <WallTint mask={mask} width={size.width} height={size.height} color={colour.hex} />
        </Canvas>
      )}
    </View>
  );
}

/**
 * The preview in its frame. Without `fill` it is the whole photo at the frame's width with a caption
 * (name, code, hex and LRV), as on the palettes page. `fill`: the room fills the box it is given (the
 * finder's large preview), cropped around the centre.
 */
export function WallPreview({ colour, fill = false, radius = radii.xl, style }: { colour: PreviewShade; fill?: boolean; radius?: number; style?: StyleProp<ViewStyle> }) {
  const frame: StyleProp<ViewStyle> = fill ? styles.flex : { width: "100%", aspectRatio: SCENE_RATIO };
  return (
    <View style={[styles.figure, { borderRadius: radius }, fill && styles.flex, style]}>
      <SceneCanvas colour={colour} style={frame} />
      {!fill && (
        <View style={styles.caption}>
          <Text style={styles.captionName}>
            {colour.name}
            {colour.code ? <Text style={styles.captionCode}> {colour.code}</Text> : null}
          </Text>
          <Text style={styles.captionHex}>
            {colour.hex.toUpperCase()}
            {colour.lrv !== undefined ? ` · LRV ${colour.lrv}` : ""}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  figure: { overflow: "hidden", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  scene: { backgroundColor: colors.sand },
  caption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  captionName: { flexShrink: 1, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, letterSpacing: -0.07, color: colors.ink },
  captionCode: { fontFamily: fonts.sans, color: colors.muted },
  captionHex: { flexShrink: 1, fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 16, color: colors.muted },
});
