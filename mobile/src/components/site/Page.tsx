import { BlurView } from "expo-blur";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from "react-native";
import Animated, { makeMutable, useAnimatedRef, useReducedMotion, useScrollOffset, useSharedValue, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AccountButton } from "~/components/account/AccountButton";
import { Logo } from "~/components/ui/Media";
import { site } from "~/shared";
import { colors, gutter, HEADER_HEIGHT } from "~/theme";
import { MenuButton, NavDrawer } from "./Drawer";
import { Footer } from "./Footer";
import { useNavState } from "./nav-state";
import { CTA_GAP, CTA_HEIGHT, CTA_HIDDEN_ROUTES, FORM_ANCHORS, StickyCta } from "./StickyCta";

// Every screen is a website page: the sticky header (the short "PS" logo on phones, and the menu
// button that opens the drawer), the page's sections, then the footer, all in one scroll. In-page
// anchors (the website's #ids) register with the page; a `section` param (from a link with a
// #fragment) scrolls to its anchor, 96px below the top as the website's scroll-margin-top does. The
// floating booking pill (StickyCta) rides over the page and steps aside while a booking form is on screen.
// Blocks that place themselves by where they sit in the page (Reveal) can watch for the content changing
// height (an accordion opening above them), and the footer's "Back to top" scrolls the page to its top.

type ViewHandle = ComponentRef<typeof View>;
type PageApi = {
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
};

const PageCtx = createContext<PageApi>({
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

/** The last section whose top has passed 55% of the screen (MobileCtaBar's activeSection); 0 before any. */
export function sectionInView(anchors: ReadonlyMap<string, number>, sections: readonly string[], scrollY: number, viewport: number): number {
  let active = 0;
  sections.forEach((id, i) => {
    const y = anchors.get(id);
    if (y !== undefined && y - scrollY <= viewport * 0.55) active = i;
  });
  return active;
}

/** The website's scroll-margin-top for [id] (6rem). */
const ANCHOR_MARGIN = 96;

/** How long the content's height must hold still before layout watchers measure again (an accordion animates for ~260ms). */
export const LAYOUT_SETTLE_MS = 120;

type Props = {
  children: ReactNode;
  testID?: string;
  /** the footer closes every page (on by default) */
  footer?: boolean;
  /** on the home page: the section ids the bottom nav follows (top, services, colour, book) */
  sections?: readonly string[];
};

export function Page({ children, testID, footer = true, sections }: Props) {
  const insets = useSafeAreaInsets();
  const { height: vh } = useWindowDimensions();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useScrollOffset(scrollRef);
  const contentRef = useRef<ViewHandle>(null);
  const anchors = useRef(new Map<string, number>());
  const margins = useRef(new Map<string, number>());
  const jumped = useRef(false);
  // where the booking forms sit in the content (StickyCta stays off them): by anchor, and flat for the UI thread
  const formRanges = useRef(new Map<string, [number, number]>());
  const forms = useSharedValue<number[]>([]);
  // the first booking form this page holds, if any: the sticky pill glides there instead of opening /book
  const [ownForm, setOwnForm] = useState<string>();
  const pathname = usePathname();
  const cta = !(CTA_HIDDEN_ROUTES as readonly string[]).includes(pathname);
  const nav = useNavState();
  const { setScrollHome, setHomeSection } = nav;
  const reduced = useReducedMotion();

  const offsetFor = useCallback((y: number, margin = ANCHOR_MARGIN) => Math.max(0, y - insets.top - margin), [insets.top]);

  const scrollTo = useCallback(
    (id: string) => {
      const y = anchors.current.get(id);
      if (y !== undefined) scrollRef.current?.scrollTo({ y: offsetFor(y, margins.current.get(id)), animated: true });
    },
    [offsetFor],
  );

  const register = useCallback(
    (id: string, y: number, margin?: number, height?: number) => {
      anchors.current.set(id, y);
      if (margin !== undefined) margins.current.set(id, margin);
      if (height !== undefined && FORM_ANCHORS.includes(id)) {
        formRanges.current.set(id, [y, y + height]);
        forms.value = [...formRanges.current.values()].flat();
        setOwnForm((f) => f ?? id);
      }
      if (id === section && !jumped.current) {
        jumped.current = true;
        scrollRef.current?.scrollTo({ y: offsetFor(y, margin), animated: false });
      }
    },
    [section, offsetFor, forms],
  );

  const scrollToTop = useCallback(() => scrollRef.current?.scrollTo({ y: 0, animated: !reduced }), [reduced]);

  // blocks watching the layout measure again once the content's height has settled after a change
  const watchers = useRef(new Set<() => void>());
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const watchLayout = useCallback((fn: () => void) => {
    watchers.current.add(fn);
    return () => void watchers.current.delete(fn);
  }, []);
  const onContentLayout = useCallback(() => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => watchers.current.forEach((fn) => fn()), LAYOUT_SETTLE_MS);
  }, []);
  useEffect(() => () => clearTimeout(settle.current), []);

  useEffect(() => {
    if (!sections) return;
    setScrollHome(scrollTo);
    return () => setScrollHome(undefined);
  }, [sections, scrollTo, setScrollHome]);

  const last = useRef(0);
  const onScroll = sections
    ? (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const active = sectionInView(anchors.current, sections, e.nativeEvent.contentOffset.y, vh);
        if (active !== last.current) {
          last.current = active;
          setHomeSection(active);
        }
      }
    : undefined;

  const headerHeight = insets.top + HEADER_HEIGHT;

  return (
    <PageCtx.Provider value={{ register, scrollTo, contentRef, scrollY, viewport: vh, headerHeight, scrollToTop, watchLayout }}>
      <View style={styles.page} testID={testID}>
        {/* first in the tree, so screen readers reach the logo and the menu before the page; zIndex keeps it drawn on top */}
        <Header />
        <Animated.ScrollView
          ref={scrollRef}
          style={styles.page}
          contentContainerStyle={{ paddingTop: insets.top + HEADER_HEIGHT }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          onScroll={onScroll}
          scrollEventThrottle={8}
        >
          <View ref={contentRef} collapsable={false} onLayout={onContentLayout}>
            {children}
            {footer && <Footer />}
            {/* room at the very end for the booking pill, so it covers none of the footer's last lines */}
            {cta && <View style={[styles.ctaRoom, footer && styles.ctaRoomInk]} testID="cta-room" />}
          </View>
        </Animated.ScrollView>
        {cta && <StickyCta scrollY={scrollY} viewport={vh} headerHeight={headerHeight} forms={forms} toForm={ownForm ? () => scrollTo(ownForm) : undefined} />}
      </View>
    </PageCtx.Provider>
  );
}

/** The website's phone header: the short "PS" logo linking home, then the account control ("Log in", or the customer's initials) and the menu button, on frosted canvas, a hairline under it. */
export function Header() {
  const insets = useSafeAreaInsets();
  const { scrollTo } = usePage();
  const [menu, setMenu] = useState(false);
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.headerWash]} />
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="link" accessibilityLabel={`${site.name} home`} onPress={() => router.navigate("/")} hitSlop={8}>
          <Logo name="short" height={40} decorative />
        </Pressable>
        <View style={styles.headerEnd}>
          <AccountButton />
          <MenuButton open={menu} onPress={() => setMenu(true)} />
        </View>
      </View>
      <NavDrawer open={menu} onClose={() => setMenu(false)} scrollTo={scrollTo} />
    </View>
  );
}

/**
 * A target for the website's #id links: wraps a section and reports where it starts in the page.
 * `margin` is the website's scroll-margin-top for it: 96 by default ([id] { scroll-margin-top: 6rem }),
 * 112 where the website sets scroll-mt-28 (booking sections, localities, palettes, shade families).
 */
export function Anchor({ id, children, style, margin }: { id: string; children?: ReactNode; style?: StyleProp<ViewStyle>; margin?: number }) {
  const ref = useRef<ViewHandle>(null);
  const { register, contentRef } = usePage();
  return (
    <View
      ref={ref}
      collapsable={false}
      style={style}
      onLayout={() => {
        const container = contentRef.current;
        if (container) ref.current?.measureLayout(container, (_x: number, y: number, _w: number, h: number) => register(id, y, margin, h), () => undefined);
      }}
    >
      {children}
    </View>
  );
}

/** .container-page on phones: the 20px side gutter. */
export function Container({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, elevation: 10, borderBottomWidth: 1, borderColor: colors.lineSoft, overflow: "hidden" },
  headerWash: { backgroundColor: "rgba(248, 245, 239, 0.9)" },
  headerRow: { minHeight: HEADER_HEIGHT - 1, paddingHorizontal: gutter, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerEnd: { flexDirection: "row", alignItems: "center", gap: 10 },
  container: { paddingHorizontal: gutter },
  ctaRoom: { height: CTA_HEIGHT + CTA_GAP },
  ctaRoomInk: { backgroundColor: colors.ink },
});
