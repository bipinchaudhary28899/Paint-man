import { createContext, useContext, type ComponentRef } from "react";
import type { View } from "react-native";
import { makeMutable, type SharedValue } from "react-native-reanimated";

// The page's API for the blocks inside it (src/components/site/Page.tsx provides it). In a module of
// its own so the footer, which Page renders, can use it without importing Page back.

export type ViewHandle = ComponentRef<typeof View>;
export type PageApi = {
  /** `margin`: how far below the top of the screen a jump to this anchor stops (the website's scroll-margin-top); `height`: the anchor's own height */
  register: (id: string, y: number, margin?: number, height?: number) => void;
  scrollTo: (id: string) => void;
  contentRef: React.RefObject<ViewHandle | null>;
  /** the page's scroll offset, on the UI thread, for scroll-driven motion (the website's animation-timeline) */
  scrollY: SharedValue<number>;
  /** the screen height (the website's viewport) */
  viewport: number;
  /** the height the sticky header covers at the top of the screen (safe area + header) */
  headerHeight: number;
  /** scrolls the page back to its top (the footer's "Back to top") */
  scrollToTop: () => void;
  /** calls `fn` shortly after the page's content changes height (so a block measures where it now sits); returns the unsubscribe */
  watchLayout: (fn: () => void) => () => void;
  /** the page's own booking or contact form anchor, once it has one (the first that registered) */
  ownForm?: string;
};

export const PageCtx = createContext<PageApi>({
  register: () => undefined,
  scrollTo: () => undefined,
  contentRef: { current: null },
  scrollY: makeMutable(0),
  viewport: 0,
  headerHeight: 0,
  scrollToTop: () => undefined,
  watchLayout: () => () => undefined,
});

/** Scrolls the current page to one of its anchors (the website's same-page #links). */
export const usePage = () => useContext(PageCtx);
