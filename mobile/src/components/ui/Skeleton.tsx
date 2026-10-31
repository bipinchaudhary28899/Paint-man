import { LinearGradient } from "expo-linear-gradient";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";

// Placeholders in the shape of what is loading: soft sand blocks with a band of light sweeping across
// them, all in step within a SkeletonGroup (one animation on the UI thread for the group). Under reduce
// motion the blocks stay still. The blocks are hidden from screen readers; the group says what is
// loading ("Loading shades") and that it is busy.

/** One sweep of the light across a block. */
export const SWEEP_MS = 1300;

const SAND = "rgba(232, 215, 197, 0.6)";
const LIGHT = "rgba(248, 245, 239, 0.75)";
const CLEAR = "rgba(248, 245, 239, 0)";

const sweepTiming = { duration: SWEEP_MS, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.Never };

const SweepCtx = createContext<SharedValue<number> | null>(null);

/** A looping 0 → 1 sweep, running unless `idle` (reduce motion, or a group above already runs one). */
function useSweep(idle: boolean): SharedValue<number> {
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (idle) return;
    sweep.value = withRepeat(withTiming(1, sweepTiming), -1, false);
    return () => cancelAnimation(sweep);
  }, [idle, sweep]);
  return sweep;
}

/** Skeleton blocks that shimmer together, announced as `label` ("Loading shades") while busy. */
export function SkeletonGroup({ label, children, style, testID }: { label: string; children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const reduced = useReducedMotion();
  const sweep = useSweep(reduced);
  return (
    <SweepCtx.Provider value={sweep}>
      <View accessible accessibilityLabel={label} accessibilityState={{ busy: true }} accessibilityLiveRegion="polite" style={style} testID={testID}>
        {children}
      </View>
    </SweepCtx.Provider>
  );
}

type Props = {
  height: DimensionValue;
  width?: DimensionValue;
  /** the shape's corners: a text line's 6 by default (999 for a pill) */
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** One sand block, the size of what will take its place. */
export function Skeleton({ height, width = "100%", radius = 6, style }: Props) {
  const reduced = useReducedMotion();
  const group = useContext(SweepCtx);
  const own = useSweep(reduced || group !== null);
  const sweep = group ?? own;
  const w = useSharedValue(0);
  const band = useAnimatedStyle(() => ({ transform: [{ translateX: (sweep.value * 2 - 1) * w.value }] }));
  return (
    <View aria-hidden testID="skeleton" style={[styles.block, { height, width, borderRadius: radius }, style]} onLayout={(e) => w.set(e.nativeEvent.layout.width)}>
      {!reduced && (
        <Animated.View style={[StyleSheet.absoluteFill, band]}>
          <LinearGradient colors={[CLEAR, LIGHT, CLEAR]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
    </View>
  );
}

/** A few lines of text: full width but for a shorter last line. */
export function SkeletonLines({ lines = 3, height = 14, gap = 8, style }: { lines?: number; height?: number; gap?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={height} width={i === lines - 1 && lines > 1 ? "62%" : "100%"} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { overflow: "hidden", backgroundColor: SAND },
});
