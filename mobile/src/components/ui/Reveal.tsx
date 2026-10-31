import { useCallback, useEffect, useRef, type ComponentRef, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { Container, usePage } from "~/components/site/Page";

// A block that fades and rises into place (opacity 0 → 1, 16pt → 0, 400ms) the first time it scrolls
// into view, driven by the page's scroll offset on the UI thread. It starts out shown: only once it
// has measured where it sits in the page, and found itself still below the fold, does it hide to wait
// for its entrance. So a block that cannot be measured, or one already on screen, simply shows, and
// under reduce motion nothing ever hides. It measures again when the page's content changes height (an
// accordion opening above it), and once it has shown it stays shown.

export const REVEAL_MS = 400;
/** How far below its place a block starts its rise. */
export const REVEAL_RISE = 16;
/** A block shows once its top has come up past this share of the screen's height. */
export const REVEAL_LINE = 0.92;

const timing = { duration: REVEAL_MS, easing: Easing.bezier(0.2, 0.8, 0.2, 1), reduceMotion: ReduceMotion.System };

/** Whether a block whose top is `contentY` down the page's content is due to show at scroll offset `scrollY` (blocks scrolled past count too). */
export function revealDue(contentY: number, scrollY: number, headerHeight: number, viewport: number): boolean {
  "worklet";
  return contentY + headerHeight - scrollY < viewport * REVEAL_LINE;
}

// where a block is in its life: not measured yet (shown as it is), waiting below the fold (hidden), shown for good
const UNMEASURED = 0;
const WAITING = 1;
const SHOWN = 2;

type Props = {
  children: ReactNode;
  /** the wrapper's own style (margins); lay out the children inside it */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Reveal({ children, style, testID }: Props) {
  const reduced = useReducedMotion();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const { contentRef, scrollY, viewport, headerHeight, watchLayout } = usePage();
  const y = useSharedValue(-1);
  const phase = useSharedValue(UNMEASURED);
  const progress = useSharedValue(1);

  const measure = useCallback(() => {
    const container = contentRef.current;
    if (reduced || !container || phase.get() === SHOWN) return;
    ref.current?.measureLayout(
      container,
      (_x: number, top: number) => {
        y.set(top);
        if (phase.get() === SHOWN) return;
        if (revealDue(top, scrollY.get(), headerHeight, viewport)) {
          // already in view (or scrolled past): shows now, rising only if it had been waiting
          if (phase.get() === WAITING) progress.set(withTiming(1, timing));
          phase.set(SHOWN);
        } else if (phase.get() === UNMEASURED) {
          phase.set(WAITING);
          progress.set(0);
        }
      },
      () => undefined,
    );
  }, [reduced, contentRef, phase, progress, y, scrollY, headerHeight, viewport]);

  // the content above may change height: measure again once it settles
  useEffect(() => (reduced ? undefined : watchLayout(measure)), [reduced, watchLayout, measure]);

  // reduce motion switched on while it waits: show it as it is
  useEffect(() => {
    if (!reduced) return;
    phase.set(SHOWN);
    progress.set(1);
  }, [reduced, phase, progress]);

  useAnimatedReaction(
    () => scrollY.get(),
    (sy) => {
      if (phase.get() !== WAITING || y.get() < 0 || !revealDue(y.get(), sy, headerHeight, viewport)) return;
      phase.set(SHOWN);
      progress.set(withTiming(1, timing));
    },
  );

  const rise = useAnimatedStyle(() => ({ opacity: progress.get(), transform: [{ translateY: (1 - progress.get()) * REVEAL_RISE }] }));

  return (
    <View ref={ref} collapsable={false} onLayout={measure} style={style} testID={testID}>
      <Animated.View style={rise}>{children}</Animated.View>
    </View>
  );
}

/** A page section in the page's gutters that rises into view: `style` takes its margins, `containerStyle` the layout inside (gap). */
export function RevealContainer({ children, style, containerStyle }: { children: ReactNode; style?: StyleProp<ViewStyle>; containerStyle?: StyleProp<ViewStyle> }) {
  return (
    <Reveal style={style}>
      <Container style={containerStyle}>{children}</Container>
    </Reveal>
  );
}
