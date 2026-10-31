import { useCallback, useEffect, useRef } from "react";
import type { View } from "react-native";
import { measure, useAnimatedRef, useAnimatedStyle, useFrameCallback, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// The finder's two scroll effects, without access to the page's scroll view: on each frame (on the UI
// thread) it measures where the finder is on screen, then
// - pins the finder's bar (brands and search) under the header, as a CSS `position: sticky` would: the
//   bar moves down with the page until the finder's end pushes it back up;
// - asks for more shades when the end of the list comes within `nearEndPx` of the screen's bottom,
//   as the website's IntersectionObserver (rootMargin 800px) does.

/** How far to move the pinned item down: enough to keep it at `stickTop`, never past its container's end (less `gapBelow`). */
export function stickyOffset(containerTop: number, containerHeight: number, itemHeight: number, stickTop: number, gapBelow: number): number {
  "worklet";
  const max = Math.max(0, containerHeight - itemHeight - gapBelow);
  return Math.min(Math.max(0, stickTop - containerTop), max);
}

/** Whether a container's end is within `margin` of the bottom of a screen `screenHeight` tall. */
export function nearEnd(containerTop: number, containerHeight: number, screenHeight: number, margin: number): boolean {
  "worklet";
  return containerTop + containerHeight - screenHeight < margin;
}

type Options = {
  /** whether the item to pin is rendered (it is measured only then) */
  pinned: boolean;
  /** whether the screen is in front: a screen under another one stops watching */
  focused: boolean;
  /** the header's bottom edge on screen */
  stickTop: number;
  screenHeight: number;
  /** the space kept under the pinned item at the container's end (its bottom margin) */
  gapBelow: number;
  /** whether to watch for the list's end (more pages to load automatically) */
  watchEnd: boolean;
  nearEndPx: number;
  onNearEnd: () => void;
  /** changes when the list grows, so a list still short of the screen asks again */
  listKey: number;
};

export function useStickyScroll({ pinned, focused, stickTop, screenHeight, gapBelow, watchEnd, nearEndPx, onNearEnd, listKey }: Options) {
  const container = useAnimatedRef<View>();
  const item = useAnimatedRef<View>();
  const offset = useSharedValue(0);
  const near = useSharedValue(false);
  const watching = useSharedValue(watchEnd);
  const pinning = useSharedValue(pinned);
  const top = useSharedValue(stickTop);
  const screen = useSharedValue(screenHeight);

  useEffect(() => {
    watching.value = watchEnd;
    pinning.value = pinned;
    top.value = stickTop;
    screen.value = screenHeight;
  }, [watchEnd, pinned, stickTop, screenHeight, watching, pinning, top, screen]);

  // a grown list may still end on screen: let the next frame ask again
  useEffect(() => {
    near.value = false;
  }, [listKey, near]);

  const latest = useRef(onNearEnd);
  useEffect(() => {
    latest.current = onNearEnd;
  }, [onNearEnd]);
  const callNearEnd = useCallback(() => latest.current(), []);

  const frame = useCallback(() => {
    "worklet";
    const box = measure(container);
    if (!box) return;
    const pin = pinning.value ? measure(item) : null;
    offset.set(pin ? stickyOffset(box.pageY, box.height, pin.height, top.value, gapBelow) : 0);
    const isNear = watching.value && nearEnd(box.pageY, box.height, screen.value, nearEndPx);
    if (isNear && !near.value) scheduleOnRN(callNearEnd);
    near.set(isNear);
  }, [container, item, offset, top, gapBelow, watching, pinning, screen, nearEndPx, near, callNearEnd]);
  // runs only while there is something to pin or a list end to watch, on the screen in front
  const callback = useFrameCallback(frame, false);
  const run = focused && (pinned || watchEnd);
  useEffect(() => {
    callback.setActive(run);
  }, [callback, run]);

  const pinnedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  return { container, item, pinnedStyle };
}
