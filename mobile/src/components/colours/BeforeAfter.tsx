import { Canvas, Group, Image } from "@shopify/react-native-skia";
import { useEffect, useMemo, useState } from "react";
import { PanResponder, StyleSheet, Text, View, type AccessibilityActionEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { Sticker, Swipe } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { openHref } from "~/lib/links";
import { palettes, shadeDisplayName } from "~/shared";
import { colors, fonts, radii } from "~/theme";
import { ChoicePill } from "./Pills";
import { useSceneImages, WallTint } from "./WallPreview";

// The colour preview slider: the finder's example living room (a stock photo, never one of our jobs)
// with a divider the visitor drags sideways. Left of it the photo as it is; right of it the same photo
// with its walls repainted in the chosen shade, by the same Skia multiply tint as every other preview
// (WallPreview). The shades are the palettes' feature walls: real Asian Paints shade-card codes. The
// divider lives in a shared value, so a drag moves the line, the handle, the stickers and the tint's clip
// on the UI thread without re-rendering React; the drag itself is a PanResponder that claims sideways
// moves only, so a vertical swipe over the photo still scrolls the page. Screen readers get an
// adjustable control (swipe up or down to show more or less of the repainted room); a new shade eases
// in over 350ms, at once under reduce motion.

/** A shade the preview can show. */
export type PreviewChoice = { id: string; name: string; code: string; brandName: string; hex: string };

/** Whether a shade is so pale (every channel at E0 or above) that the room's warm white walls would barely change. */
export const isNearWhite = (hex: string) => [1, 3, 5].every((i) => parseInt(hex.slice(i, i + 2), 16) >= 0xe0);

/** The palettes' feature walls, each once, leaving out the near-whites. */
export const previewShades: PreviewChoice[] = palettes
  .map((p) => p.shades[0])
  .filter((s, i, all) => all.findIndex((o) => o.id === s.id) === i && !isNearWhite(s.hex))
  .map((s) => ({ id: s.id, name: shadeDisplayName(s.name), code: s.code, brandName: s.brandName, hex: s.hex }));

/** The booking page for a shade, as the finder links it. */
export const bookShadeHref = (s: Pick<PreviewChoice, "id">) => `/book?shade=${encodeURIComponent(s.id)}`;

/** Keeps the divider inside the frame (0: all repainted, 1: all as photographed). */
export const clampSplit = (v: number) => Math.min(1, Math.max(0, v));

/** Whether a move is a sideways drag (past 6pt, more across than down): only those move the divider. */
export const isSideways = (dx: number, dy: number) => Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy);

/** How far one screen-reader step moves the divider, in percent of the frame. */
export const STEP = 10;
/** The frame's width over its height: the portrait room cropped around its centre. */
export const FRAME_RATIO = 4 / 5;
const HANDLE = 44;
const ease = { duration: 350, easing: Easing.bezier(0.2, 0.8, 0.2, 1), reduceMotion: ReduceMotion.System };

export function BeforeAfter({ shades = previewShades, style }: { shades?: PreviewChoice[]; style?: StyleProp<ViewStyle> }) {
  const [index, setIndex] = useState(0);
  const shade = shades[index] ?? shades[0];
  const { photo, mask } = useSceneImages();
  const [size, setSize] = useState({ width: 0, height: 0 });
  // the divider, as a share of the frame's width from the left; where it was when the finger took it; the frame's width
  const split = useSharedValue(0.5);
  const dragStart = useSharedValue(0.5);
  const frameWidth = useSharedValue(0);
  // the same, in percent of the room repainted, for screen readers (updated when a drag ends)
  const [repainted, setRepainted] = useState(50);
  const tint = useSharedValue(shade.hex);

  useEffect(() => {
    tint.set(withTiming(shade.hex, ease));
  }, [shade.hex, tint]);

  const responder = useMemo(() => {
    const settle = () => setRepainted(Math.round((1 - split.get()) * 100));
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => isSideways(g.dx, g.dy),
      onPanResponderGrant: () => {
        cancelAnimation(split);
        dragStart.set(split.get());
      },
      onPanResponderMove: (_e, g) => split.set(clampSplit(dragStart.get() + g.dx / (frameWidth.get() || 1))),
      onPanResponderRelease: settle,
      onPanResponderTerminate: settle,
      // once sideways, the drag stays with the divider (the page does not take it over)
      onPanResponderTerminationRequest: () => false,
    });
  }, [split, dragStart, frameWidth]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    frameWidth.set(w);
    if (w !== size.width || h !== size.height) setSize({ width: w, height: h });
  };

  const step = (by: number) => {
    const next = Math.min(100, Math.max(0, repainted + by));
    setRepainted(next);
    split.set(withTiming(1 - next / 100, ease));
  };
  const onAction = (e: AccessibilityActionEvent) => step(e.nativeEvent.actionName === "increment" ? STEP : -STEP);

  const W = size.width;
  const clip = useDerivedValue(() => ({ x: split.value * W, y: 0, width: (1 - split.value) * W, height: size.height }));
  const divider = useAnimatedStyle(() => ({ transform: [{ translateX: split.value * W - HANDLE / 2 }] }));
  // each sticker sits in its own half: a full-frame box slid so its edge is the divider, the sticker slid back
  const leftBox = useAnimatedStyle(() => ({ transform: [{ translateX: (split.value - 1) * W }] }));
  const leftInner = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - split.value) * W }] }));
  const rightBox = useAnimatedStyle(() => ({ transform: [{ translateX: split.value * W }] }));
  const rightInner = useAnimatedStyle(() => ({ transform: [{ translateX: -split.value * W }] }));

  const ready = photo && mask && W > 0 && size.height > 0;
  const full = `${shade.name}, ${shade.brandName} ${shade.code}`;

  return (
    <View style={style}>
      <View
        style={styles.frame}
        onLayout={onLayout}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Colour preview on an example room: on the left as photographed, on the right with the walls repainted in ${full}`}
        accessibilityHint="Swipe up or down to show more or less of the repainted room."
        accessibilityValue={{ min: 0, max: 100, now: repainted, text: `${repainted}% repainted` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={onAction}
        testID="before-after"
      >
        {ready && (
          <Canvas style={StyleSheet.absoluteFill}>
            <Image image={photo} fit="cover" x={0} y={0} width={W} height={size.height} />
            <Group clip={clip}>
              <WallTint mask={mask} width={W} height={size.height} color={tint} />
            </Group>
          </Canvas>
        )}
        <Animated.View style={[styles.half, leftBox]} pointerEvents="none">
          <Animated.View style={[StyleSheet.absoluteFill, leftInner]}>
            <Sticker style={styles.stickerLeft}>As photographed</Sticker>
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.half, rightBox]} pointerEvents="none">
          <Animated.View style={[StyleSheet.absoluteFill, rightInner]}>
            <Sticker style={styles.stickerRight}>Repainted</Sticker>
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.divider, divider]} pointerEvents="none" testID="before-after-divider">
          <View style={styles.line} />
          <View style={styles.handle}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
            </Svg>
          </View>
        </Animated.View>
        {/* the touch layer over the whole room takes the drags */}
        <View style={StyleSheet.absoluteFill} testID="before-after-touch" {...responder.panHandlers} />
      </View>

      <View style={styles.chips}>
        <Swipe gap={8} accessibilityLabel="Wall colours" contentStyle={styles.chipsRow}>
          {shades.map((s, i) => (
            <ChoicePill key={s.id} label={s.name} detail={s.code} dot={s.hex} selected={i === index} onPress={() => setIndex(i)} />
          ))}
        </Swipe>
      </View>

      <Text style={styles.caption}>
        A colour preview on an example room, not a finished job of ours. Only the walls of this stock photo are recoloured on screen, in {full}. Your light and
        finish change a shade, so the inspector brings the real shade card.
      </Text>
      <Button label="Book an inspection with this shade" onPress={() => openHref(bookShadeHref(shade))} style={styles.book} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", aspectRatio: FRAME_RATIO, overflow: "hidden", backgroundColor: colors.sand },
  half: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, overflow: "hidden" },
  stickerLeft: { position: "absolute", top: 12, left: 12 },
  stickerRight: { position: "absolute", top: 12, right: 12 },
  divider: { position: "absolute", top: 0, bottom: 0, left: 0, width: HANDLE, alignItems: "center", justifyContent: "center" },
  line: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: colors.canvas, boxShadow: "0px 0px 8px rgba(36, 37, 34, 0.35)" },
  handle: {
    width: HANDLE,
    height: HANDLE,
    borderRadius: radii.pill,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 6px 18px -6px rgba(36, 37, 34, 0.45)",
  },
  chips: { marginTop: 14 },
  chipsRow: { paddingBottom: 2 },
  caption: { marginTop: 12, fontFamily: fonts.sans, fontSize: 13, lineHeight: 19.5, letterSpacing: -0.065, color: colors.muted },
  book: { marginTop: 16 },
});
