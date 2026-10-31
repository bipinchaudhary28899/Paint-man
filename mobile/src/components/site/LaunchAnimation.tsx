import { Image } from "expo-image";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { logos } from "~/lib/images";
import { colors } from "~/theme";

// The opening animation: the Paint Saathi mark is a paint fan deck (three strips on a rivet). The app
// opens on the whole deck fanned out into a ring of shades, which turns once and then closes like a
// fan deck, the other shades tucking behind until only the logo's three are left: sage, terracotta and
// golden, each turned on the rivet as in the brand mark. As it closes it settles onto the brand pack's
// stacked logo (public/brand/02-stacked): "PaintSaathi" rises in under it, the drawn fan hands over to
// the logo file itself, and the screen fades into the app. A tap skips it; with reduce motion on it is
// not shown at all.

/** The drawn strip, measured on the 512px icon: 128 × 336 with a 28px radius, the rivet 280px down. */
const W = 44;
const H = (W * 336) / 128;
const RADIUS = (W * 28) / 128;
const PIVOT = (W * 280) / 128;
const DOT = (W * 42) / 128;
/** How far the logo's side strips are turned on the rivet. */
const SIDE = 25;

/**
 * The stacked logo as shown at the end, and where its parts are, measured on its 1184 × 784 (@4x) file:
 * the terracotta strip is 104px wide, the rivet dot is centred at (591.5, 327), the fan ends above
 * y 460 and the wordmark starts below it.
 */
const LOCKUP_W = 340;
const PX = LOCKUP_W / 1184;
const LOCKUP_H = 784 * PX;
const SPLIT = 460 * PX;
/** The rivet's place in the stacked logo, from the logo's centre (the screen's centre). */
const DOT_X = (591.5 - 592) * PX;
const DOT_Y = 327 * PX - LOCKUP_H / 2;
/** The drawn fan's size at the end: its strips as wide as the logo's (104px of the file). */
export const FINAL_SCALE = (104 * PX) / W;

/** The ring, clockwise from the top: the logo's terracotta at 0°, golden at 30°, sage at 330°. */
export const RING = [
  "#C76B4A",
  "#E9B949",
  "#F2D98A",
  "#9FB8A8",
  "#5A9AA6",
  "#4B6A8F",
  "#6B4A6E",
  "#C3B5D6",
  "#D98C8C",
  "#E8866A",
  "#4F6B4A",
  "#71856A",
] as const;

/** Where each of the logo's strips ends up (degrees), by its place in the ring. */
export const LOGO: Readonly<Record<number, number>> = { 0: 0, 1: SIDE, [RING.length - 1]: -SIDE };

/**
 * The timeline in ms: the ring comes in and turns once; the deck closes while it slows; the wordmark
 * rises in; the logo file takes over from the drawn fan; the stacked logo holds; the screen fades.
 */
export const TIMES = { in: 400, spinEnd: 1400, closeStart: 900, closeEnd: 1700, wordStart: 1450, wordEnd: 1900, swapStart: 1700, swapEnd: 1850, hold: 2350, end: 2700 } as const;

const clamp01 = (v: number) => {
  "worklet";
  return Math.min(1, Math.max(0, v));
};
const easeInOut = (v: number) => {
  "worklet";
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
};
const easeOut = (v: number) => {
  "worklet";
  return 1 - Math.pow(1 - v, 3);
};
const between = (ms: number, from: number, to: number) => {
  "worklet";
  return clamp01((ms - from) / (to - from));
};

/** The deck's closing, 0 → 1. */
export const closing = (ms: number) => {
  "worklet";
  return easeInOut(between(ms, TIMES.closeStart, TIMES.closeEnd));
};

/** A strip's angle at a moment: its place in the ring plus one turn, easing into its place in the logo (or behind it). */
export function stripAngle(index: number, ms: number): number {
  "worklet";
  const step = 360 / RING.length;
  const ring = index * step > 180 ? index * step - 360 : index * step;
  const spin = 360 * easeInOut(clamp01(ms / TIMES.spinEnd));
  const end = 360 + (LOGO[index] ?? 0);
  const c = closing(ms);
  return (ring + spin) * (1 - c) + end * c;
}

/** The other shades fade as they tuck behind the logo's three. */
export function stripOpacity(index: number, ms: number): number {
  "worklet";
  if (index in LOGO) return 1;
  return 1 - clamp01((closing(ms) - 0.55) / 0.4);
}

/** The drawn fan: grows in on the rivet, then shrinks and moves onto the stacked logo's fan as the deck closes; gone once the logo file shows. */
export function markMotion(ms: number) {
  "worklet";
  const grow = 0.6 + 0.4 * easeOut(clamp01(ms / TIMES.in));
  const c = closing(ms);
  const opacity = clamp01(ms / 250) * (1 - between(ms, TIMES.swapEnd, TIMES.swapEnd + 100));
  return { scale: grow * (1 + (FINAL_SCALE - 1) * c), translateX: DOT_X * c, translateY: DOT_Y * c, opacity };
}

/** "PaintSaathi" rises 14pt into place under the fan as it fades in. */
export function wordmarkMotion(ms: number) {
  "worklet";
  const w = easeOut(between(ms, TIMES.wordStart, TIMES.wordEnd));
  return { opacity: w, translateY: 14 * (1 - w) };
}

/** The logo file's fan fading in over the drawn one (same place, same size), so the end frame is the brand art itself. */
export const swapOpacity = (ms: number) => {
  "worklet";
  return between(ms, TIMES.swapStart, TIMES.swapEnd);
};

/** The finished logo swells a touch as the screen fades into the app. */
export const lockupScale = (ms: number) => {
  "worklet";
  return 1 + 0.06 * between(ms, TIMES.hold, TIMES.end);
};

/** The overlay's opacity: shown until the stacked logo has held, then fading into the app. */
export function screenOpacity(ms: number): number {
  "worklet";
  return 1 - between(ms, TIMES.hold, TIMES.end);
}

function Strip({ index, time }: { index: number; time: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: stripOpacity(index, time.value), transform: [{ rotate: `${stripAngle(index, time.value)}deg` }] }));
  return <Animated.View testID={`launch-strip-${index}`} style={[styles.strip, { backgroundColor: RING[index] }, style]} />;
}

/** The ring's other shades first, then sage and golden, then terracotta in front, as in the mark. */
const ORDER = [...RING.keys()].filter((i) => !(i in LOGO)).concat([RING.length - 1, 1, 0]);

/** One part of the stacked logo file: the fan (above SPLIT) or the wordmark (below it), cut from the same image so together they are the whole logo. */
function LockupPart({ part }: { part: "fan" | "word" }) {
  const top = part === "fan" ? 0 : SPLIT;
  return (
    <View style={[styles.part, { top: -LOCKUP_H / 2 + top, height: part === "fan" ? SPLIT : LOCKUP_H - SPLIT }]}>
      <Image source={logos.stackedColor.source} contentFit="contain" style={[styles.lockupImage, { top: -top }]} />
    </View>
  );
}

export function LaunchAnimation({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const time = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }
    time.value = withTiming(TIMES.end, { duration: TIMES.end, easing: Easing.linear }, (finished) => {
      if (finished) scheduleOnRN(onDone);
    });
  }, [reduced, time, onDone]);

  const screen = useAnimatedStyle(() => ({ opacity: screenOpacity(time.value) }));
  const lockup = useAnimatedStyle(() => ({ transform: [{ scale: lockupScale(time.value) }] }));
  const mark = useAnimatedStyle(() => {
    const m = markMotion(time.value);
    return { opacity: m.opacity, transform: [{ translateX: m.translateX }, { translateY: m.translateY }, { scale: m.scale }] };
  });
  const fan = useAnimatedStyle(() => ({ opacity: swapOpacity(time.value) }));
  const word = useAnimatedStyle(() => {
    const w = wordmarkMotion(time.value);
    return { opacity: w.opacity, transform: [{ translateY: w.translateY }] };
  });

  if (reduced) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, screen]} testID="launch" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Pressable style={styles.fill} onPress={onDone} accessibilityLabel="Skip">
        <Animated.View style={[styles.origin, lockup]}>
          <Animated.View style={[styles.origin, mark]}>
            {ORDER.map((i) => (
              <Strip key={i} index={i} time={time} />
            ))}
            <View style={styles.dot} />
          </Animated.View>
          <Animated.View style={[styles.origin, fan]} testID="launch-logo-fan">
            <LockupPart part="fan" />
          </Animated.View>
          <Animated.View style={[styles.origin, word]} testID="launch-logo-word">
            <LockupPart part="word" />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.canvas, zIndex: 100 },
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  // zero-size boxes at the screen's centre: the drawn strips turn about the rivet, the logo is laid out around it
  origin: { position: "absolute", width: 0, height: 0 },
  strip: { position: "absolute", left: -W / 2, top: -PIVOT, width: W, height: H, borderRadius: RADIUS, transformOrigin: `${W / 2}px ${PIVOT}px` },
  dot: { position: "absolute", left: -DOT / 2, top: -DOT / 2, width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.canvas },
  part: { position: "absolute", left: -LOCKUP_W / 2, width: LOCKUP_W, overflow: "hidden" },
  lockupImage: { position: "absolute", left: 0, width: LOCKUP_W, height: LOCKUP_H },
});
