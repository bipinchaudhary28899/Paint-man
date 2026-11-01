import { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";

// A card's answer to a finger (owner: "cards slightly move, bounce or respond to touch"): while it is
// pressed it lifts a little (rises 4pt and grows a touch), and when let go it settles back with a soft
// spring that overshoots once. Under reduced motion nothing moves. Spread `handlers` on the Pressable
// and put `style` on the view that should lift.

/** How far a pressed card rises (points) and how much it grows. */
export const LIFT = { y: -4, scale: 1.015 };
/** Quick and soft: it settles in about a quarter of a second, with one small overshoot. */
const SPRING = { damping: 14, stiffness: 260, mass: 0.6 };

export function useSpringPress() {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: pressed.value * LIFT.y }, { scale: 1 + pressed.value * (LIFT.scale - 1) }] }));
  return {
    style: reduced ? undefined : style,
    handlers: {
      onPressIn: () => {
        if (!reduced) pressed.set(withSpring(1, SPRING));
      },
      onPressOut: () => {
        if (!reduced) pressed.set(withSpring(0, SPRING));
      },
    },
  };
}
