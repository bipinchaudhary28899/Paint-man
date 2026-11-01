import { useEffect, useMemo, useState } from "react";
import { PanResponder, StyleSheet, Text, View, type AccessibilityActionEvent, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { MAX_SCALE } from "~/components/ui/Text";
import { colors, fonts, radii } from "~/theme";

// "Slide to accept" (owner: "swipe right to accept a quotation", made deliberate): a bar with a round
// knob that the customer drags to the far end. Let go before ACCEPT_AT of the way and it springs back;
// past it, the knob runs to the end and `onSlid` asks the screen to confirm. A sideways drag takes the
// knob, a vertical one scrolls the page. Screen readers get one action (double-tap) that does the
// same. With reduced motion the knob slides back without the spring.

/** How far along its travel the knob must be let go for the slide to count. */
export const ACCEPT_AT = 0.85;
const KNOB = 52;
const PAD = 4;
/** A soft spring: settles back in about a third of a second with a small overshoot. */
const SPRING = { damping: 16, stiffness: 180, mass: 0.6 };

/** The knob's place for a drag of `dx` from `start`, kept on the bar. */
export const knobAt = (start: number, dx: number, travel: number) => Math.min(travel, Math.max(0, start + dx));

type Props = {
  /** on the bar: "Slide to accept ₹23,700" */
  label: string;
  /** what screen readers hear: "Accept quotation version 2, ₹23,700" */
  accessibilityLabel: string;
  /** the knob reached the end, or a screen reader asked for it */
  onSlid: () => void;
  /** while the acceptance is sent: the knob stays at the end */
  busy?: boolean;
  /** change it to send the knob back (the customer did not confirm, or it failed) */
  resetKey?: number;
};

export function SlideToAccept({ label, accessibilityLabel, onSlid, busy = false, resetKey = 0 }: Props) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const travel = Math.max(0, width - KNOB - PAD * 2);
  const x = useSharedValue(0);
  const start = useSharedValue(0);

  // the knob goes home (the slide did not count, or the screen sent it back)
  useEffect(() => {
    if (resetKey) x.set(reduced ? withTiming(0, { duration: 160 }) : withSpring(0, SPRING));
  }, [resetKey, reduced, x]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => !busy && travel > 0 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => start.set(x.get()),
        onPanResponderMove: (_e, g) => x.set(knobAt(start.get(), g.dx, travel)),
        onPanResponderRelease: () => {
          if (x.get() >= travel * ACCEPT_AT) {
            x.set(withTiming(travel, { duration: 120 }));
            onSlid();
          } else x.set(reduced ? withTiming(0, { duration: 160 }) : withSpring(0, SPRING));
        },
        onPanResponderTerminate: () => x.set(withTiming(0, { duration: 160 })),
        // once sideways, the drag stays with the knob (the page does not take it over)
        onPanResponderTerminationRequest: () => false,
      }),
    [busy, travel, reduced, onSlid, start, x],
  );

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: x.value + KNOB + PAD * 2 }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: travel > 0 ? Math.max(0, 1 - (x.value / travel) * 1.4) : 1 }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === "activate" && !busy) onSlid();
  };

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Asks you to confirm before accepting"
      accessibilityState={{ busy, disabled: busy }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={onAction}
      style={styles.bar}
      testID="slide-to-accept"
    >
      <Animated.View style={[styles.fill, fillStyle]} />
      <Animated.Text maxFontSizeMultiplier={MAX_SCALE.fixed} style={[styles.label, labelStyle]}>
        {busy ? "Accepting…" : label}
      </Animated.Text>
      <Animated.View style={[styles.knob, knobStyle]} testID="slide-knob">
        <Text maxFontSizeMultiplier={MAX_SCALE.fixed} style={styles.arrow} aria-hidden>
          →
        </Text>
      </Animated.View>
      {/* the drag: a layer over the whole bar, so a finger anywhere on it moves the knob */}
      <View style={StyleSheet.absoluteFill} testID="slide-to-accept-touch" {...responder.panHandlers} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: KNOB + PAD * 2, borderRadius: radii.pill, backgroundColor: colors.creamWash, borderWidth: 1, borderColor: colors.line, justifyContent: "center", overflow: "hidden" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: radii.pill, backgroundColor: colors.sand },
  label: { textAlign: "center", paddingHorizontal: KNOB + PAD * 2, fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 22, color: colors.ink },
  knob: { position: "absolute", left: PAD, top: PAD, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center" },
  arrow: { fontFamily: fonts.sansBold, fontSize: 22, lineHeight: 26, color: colors.canvas },
});
