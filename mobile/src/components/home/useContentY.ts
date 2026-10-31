import { useCallback, useRef, type ComponentRef } from "react";
import type { LayoutChangeEvent, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import { usePage } from "~/components/site/Page";

// Where a section starts in the page content, for its scroll-driven motion: put `ref` and `onLayout`
// on the section's outer view (a direct child of the page, so a change above it moves it and fires
// onLayout again). `y` is its top in page-content coordinates (-1 until measured), `height` its height.

export function useContentY() {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const { contentRef } = usePage();
  const y = useSharedValue(-1);
  const height = useSharedValue(0);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      height.set(e.nativeEvent.layout.height);
      const container = contentRef.current;
      if (container) ref.current?.measureLayout(container, (_x: number, top: number) => y.set(top), () => undefined);
    },
    [contentRef, height, y],
  );
  return { ref, onLayout, y, height };
}
