import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// An accordion's body that opens and closes by animating its height on the UI thread instead of
// popping. The body keeps its natural height inside a clipping box whose height follows the animation;
// once open the box sets no limit at all, so anything inside can grow (a nested accordion, a photo
// arriving) and, if measuring ever fails, the body still shows in full. A closing body is hidden from
// screen readers at once and unmounts when the box has shut. Under reduce motion it is instant.
// Turn rotates a chevron or a + along with it.

/** How long an accordion takes to open or close. */
export const COLLAPSE_MS = 260;

/** The box's limit once fully open: none in practice. */
export const UNLIMITED = 100_000;

const timing = { duration: COLLAPSE_MS, easing: Easing.bezier(0.2, 0.8, 0.2, 1), reduceMotion: ReduceMotion.System };

/**
 * The clip box's max height at animation `progress` (0 shut, 1 open) for a body `natural` points tall
 * (-1 until it has been measured): no limit when open, nothing when shut, and in between the share of
 * the body's height (nothing yet while it has not been measured, so it never pops open in one frame).
 */
export function collapseHeight(progress: number, natural: number): number {
  "worklet";
  if (progress >= 1) return UNLIMITED;
  if (progress <= 0 || natural < 0) return 0;
  return natural * progress;
}

type Props = {
  open: boolean;
  children: ReactNode;
  /** the body's own style (padding, gap); the clip box around it only animates */
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
};

export function Collapse({ open, children, style, testID, accessibilityLabel }: Props) {
  // mounted from the moment it opens until it has shut again
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const progress = useSharedValue(open ? 1 : 0);
  const natural = useSharedValue(-1);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, timing, (finished) => {
      if (finished && !open) scheduleOnRN(setMounted, false);
    });
  }, [open, progress]);

  const clip = useAnimatedStyle(() => ({ maxHeight: collapseHeight(progress.value, natural.value), opacity: Math.min(1, progress.value * 1.5) }));

  if (!mounted) return null;
  return (
    <Animated.View style={[styles.clip, clip]}>
      <View
        style={style}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityElementsHidden={!open}
        importantForAccessibility={open ? "auto" : "no-hide-descendants"}
        onLayout={(e) => natural.set(e.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </Animated.View>
  );
}

/** Turns its child (a chevron, a +) by `degrees` while `open`, in step with Collapse (instant under reduce motion). */
export function Turn({ open, degrees = 180, children, testID }: { open: boolean; degrees?: number; children: ReactNode; testID?: string }) {
  const turn = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    turn.value = withTiming(open ? 1 : 0, timing);
  }, [open, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * degrees}deg` }] }));
  return (
    <Animated.View style={style} testID={testID} aria-hidden>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
});
