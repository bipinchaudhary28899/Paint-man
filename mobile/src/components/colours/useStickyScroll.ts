import { useCallback, useEffect, useRef } from "react";
import type { LayoutChangeEvent } from "react-native";
import { useAnimatedReaction, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { screenTop } from "~/components/home/motion";
import { useContentY } from "~/components/home/useContentY";
import { usePage } from "~/components/site/Page";

// The finder's two scroll effects, driven by the page's own scroll position (usePage().scrollY, set
// on the UI thread as the page scrolls) and where the finder sits in the page content:
// - pins the finder's bar (brands and search) under the header, as a CSS `position: sticky` would: the
//   bar moves down with the page until the finder's end pushes it back up;
// - asks for more shades when the end of the list comes within `nearEndPx` of the screen's bottom,
//   as the website's IntersectionObserver (rootMargin 800px) does.
// It used to measure the finder on screen every frame; on Android that measurement trails the scroll
// by a frame, so the pinned bar shook as the page scrolled. Computed from the scroll position, the
// bar moves in the same frame as the page (the home reveal works the same way).

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
  /** whether the item to pin is rendered */
  pinned: boolean;
  /** the space kept under the pinned item at the container's end (its bottom margin) */
  gapBelow: number;
  /** whether to watch for the list's end (more pages to load automatically) */
  watchEnd: boolean;
  nearEndPx: number;
  onNearEnd: () => void;
};

export function useStickyScroll({ pinned, gapBelow, watchEnd, nearEndPx, onNearEnd }: Options) {
  const { scrollY, viewport, headerHeight, contentRef, watchLayout } = usePage();
  const { ref: container, onLayout: onContainerLayout, y, height } = useContentY();
  const itemHeight = useSharedValue(0);
  const watching = useSharedValue(watchEnd);
  const pinning = useSharedValue(pinned);

  useEffect(() => {
    watching.value = watchEnd;
    pinning.value = pinned;
  }, [watchEnd, pinned, watching, pinning]);

  // content above the finder that changes height moves it without a layout event of its own
  useEffect(
    () =>
      watchLayout(() => {
        const page = contentRef.current;
        if (page) container.current?.measureLayout(page, (_x: number, top: number) => y.set(top), () => undefined);
      }),
    [watchLayout, contentRef, container, y],
  );

  const latest = useRef(onNearEnd);
  useEffect(() => {
    latest.current = onNearEnd;
  }, [onNearEnd]);
  const callNearEnd = useCallback(() => latest.current(), []);

  // Runs again whenever a value it reads changes: the scroll, the finder's place and its height. It
  // asks when the end comes near, and again when the list has grown (a new height) and still ends
  // near: a list shorter than the screen fills it. Scrolling about near the end asks once.
  useAnimatedReaction(
    () => {
      if (!watching.value || y.value < 0) return -1;
      return nearEnd(screenTop(y.value, scrollY.value, headerHeight), height.value, viewport, nearEndPx) ? height.value : -1;
    },
    (nearAt, before) => {
      if (nearAt >= 0 && nearAt !== before) scheduleOnRN(callNearEnd);
    },
    [headerHeight, viewport, nearEndPx, callNearEnd],
  );

  const pinnedStyle = useAnimatedStyle(() => {
    if (!pinning.value || y.value < 0) return { transform: [{ translateY: 0 }] };
    const top = screenTop(y.value, scrollY.value, headerHeight);
    return { transform: [{ translateY: stickyOffset(top, height.value, itemHeight.value, headerHeight, gapBelow) }] };
  });

  const onItemLayout = useCallback((e: LayoutChangeEvent) => itemHeight.set(e.nativeEvent.layout.height), [itemHeight]);

  return { container, onContainerLayout, onItemLayout, pinnedStyle };
}
