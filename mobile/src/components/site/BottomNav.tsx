import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Mask, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { MAX_SCALE } from "~/components/ui/Text";
import { colors, fonts } from "~/theme";
import { useNavState } from "./nav-state";

// The website's phone nav (src/components/MobileCtaBar.tsx and .bnav-* in globals.css), drawn the same
// way: a charcoal pill, 64px tall, 16px in from the sides, with a disc cut out of its top edge (the dip)
// over the active tab; the active tab's colour sits in that dip as a 56px dab carrying its icon, half
// above the bar. The other tabs are cream labels in faint pill outlines; the active label drops under
// its dab. On a change the dab glides to the new tab while hopping in an arc. On the home page the
// active tab follows the section in view and a tap glides the page there; elsewhere it follows the route.
// In the app the bar has depth: the charcoal lightens towards its top, a fine highlight runs along the
// top edge and a darker edge along the bottom (a bevel), and a deeper soft shadow lifts it off the page;
// the dab is a glossy raised disc in the dip, and the labels sit in faintly sunken pills.
// The bar keeps its height at any text size: its labels grow with the phone's text size up to 1.3×
// (MAX_SCALE.fixed) and stay on one line, shrinking a little to fit a narrow tab rather than wrapping.

type Item = { label: string; hue: string; on: string; href: string; section?: string; match: (p: string) => boolean };

export const items: Item[] = [
  { label: "Home", hue: colors.sage, on: colors.onInk, href: "/", section: "top", match: (p) => p === "/" },
  { label: "Services", hue: colors.golden, on: colors.ink, href: "/services", section: "services", match: (p) => p.startsWith("/services") },
  { label: "Colours", hue: colors.terracottaLight, on: colors.onInk, href: "/colours", section: "colour", match: (p) => p.startsWith("/colours") || p.startsWith("/palettes") || p.startsWith("/shade-cards") },
  // cream on the charcoal bar (a charcoal dot would vanish into it); Estimate always opens the booking page
  { label: "Estimate", hue: colors.canvas, on: colors.ink, href: "/book", match: (p) => p.startsWith("/book") || p.startsWith("/contact") },
];

/** The bar's charcoal, from its lit top to its deep bottom, each drawn at 96–97% over the page. */
export const BAR_STOPS = [
  { offset: 0, color: "#45463f", opacity: 0.97 },
  { offset: 0.45, color: "#2b2c28", opacity: 0.96 },
  { offset: 1, color: "#1b1c19", opacity: 0.97 },
] as const;
/** The bar's lightest charcoal as one colour (the worst case for its cream labels). */
export const BAR_TOP = "rgba(69, 70, 63, 0.97)";

const BAR = 64;
const DAB = 56;
const DIP = 34;
const GLIDE = 450;

/** The bar's gap above the screen's bottom edge (or the home indicator's safe area, when larger). */
export const navBottom = (insetBottom: number) => Math.max(16, insetBottom);
/** How far up from the screen's bottom edge the nav reaches: its gap, the bar, and the half of the dab that rises above it. */
export const navReach = (insetBottom: number) => navBottom(insetBottom) + BAR + DAB / 2;

const icons: Record<string, React.ReactNode> = {
  Home: (
    <>
      <Path d="M4 11l8-7 8 7" />
      <Path d="M6 10v10h12V10" />
    </>
  ),
  Services: (
    <>
      <Rect x="4" y="4" width="7" height="7" rx="2" />
      <Rect x="13" y="4" width="7" height="7" rx="2" />
      <Rect x="4" y="13" width="7" height="7" rx="2" />
      <Rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  Colours: (
    <>
      <Path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 1-2 1-3a9 9 0 0 0-7-9z" />
      <Circle cx="8" cy="10" r="1" />
      <Circle cx="12" cy="7" r="1" />
      <Circle cx="16" cy="10" r="1" />
    </>
  ),
  Estimate: (
    <>
      <Rect x="4" y="5" width="16" height="15" rx="2" />
      <Path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
};

/** The active tab for a path: on the home page the section in view, elsewhere the route (Home when none matches). */
export function activeTab(pathname: string, homeSection: number): number {
  if (pathname === "/") return homeSection;
  return Math.max(0, items.findIndex((i) => i.match(pathname)));
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const glide = { duration: GLIDE, easing: Easing.linear, reduceMotion: ReduceMotion.System };
const hopEase = Easing.bezier(0.35, 0, 0.65, 1);

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { homeSection, scrollHome } = useNavState();
  const [width, setWidth] = useState(0);
  const active = activeTab(pathname, homeSection);
  const look = items[active];

  // the dab's and the dip's centre, as a share of the bar (MobileCtaBar's slotCentre)
  const share = useSharedValue((active + 0.5) / items.length);
  const barWidth = useSharedValue(0);
  const hopY = useSharedValue(0);
  const hopX = useSharedValue(1);
  const hopScaleY = useSharedValue(1);
  const rise = useSharedValue(0);
  const last = useRef(active);

  useEffect(() => {
    rise.value = withDelay(300, withTiming(1, { duration: 700, easing: Easing.bezier(0.2, 0.8, 0.2, 1), reduceMotion: ReduceMotion.System }));
  }, [rise]);

  useEffect(() => {
    if (active === last.current) return;
    last.current = active;
    share.value = withTiming((active + 0.5) / items.length, glide);
    // one hop per change (the dab-arc keyframes: 0% → 45% → 85% → 100% of 0.45s)
    const t = (f: number) => ({ duration: GLIDE * f, easing: hopEase, reduceMotion: ReduceMotion.System });
    hopY.value = withSequence(withTiming(0, { duration: 0 }), withTiming(-30, t(0.45)), withTiming(3, t(0.4)), withTiming(0, t(0.15)));
    hopX.value = withSequence(withTiming(0.92, { duration: 0 }), withTiming(1.06, t(0.45)), withTiming(1.08, t(0.4)), withTiming(1, t(0.15)));
    hopScaleY.value = withSequence(withTiming(0.92, { duration: 0 }), withTiming(1.06, t(0.45)), withTiming(0.9, t(0.4)), withTiming(1, t(0.15)));
  }, [active, share, hopY, hopX, hopScaleY]);

  const dipProps = useAnimatedProps(() => ({ cx: share.value * barWidth.value }));
  const ringProps = useAnimatedProps(() => ({ cx: share.value * barWidth.value }));
  const dabStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: share.value * barWidth.value - DAB / 2 }, { translateY: hopY.value }, { scaleX: hopX.value }, { scaleY: hopScaleY.value }],
  }));
  const riseStyle = useAnimatedStyle(() => ({ opacity: rise.value, transform: [{ translateY: (1 - rise.value) * BAR * 1.3 }] }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    barWidth.value = w;
    setWidth(w);
  };

  const press = (index: number) => {
    const item = items[index];
    if (pathname === "/" && item.section && scrollHome) {
      scrollHome(item.section);
      return;
    }
    if (index !== active || pathname !== item.href) router.navigate(item.href as never);
  };

  return (
    <Animated.View
      testID="bottom-nav"
      accessibilityRole="tablist"
      accessibilityLabel="Mobile"
      pointerEvents="box-none"
      style={[styles.nav, { bottom: navBottom(insets.bottom) }, riseStyle]}
      onLayout={onLayout}
    >
      {/* the bar: the charcoal pill with the dip cut out of its top edge, and the dip's own hairline */}
      <View style={styles.shadow} pointerEvents="none" />
      {width > 0 && (
        <Svg width={width} height={BAR} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <Mask id="dip" maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={BAR}>
              <Rect x={0} y={0} width={width} height={BAR} fill="#fff" />
              <AnimatedCircle animatedProps={dipProps} cy={0} r={DIP - 1} fill="#000" />
            </Mask>
            <ClipPath id="lower">
              <Rect x={0} y={0} width={width} height={BAR} />
            </ClipPath>
            {/* the charcoal, lighter at the top and deeper at the bottom */}
            <LinearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
              {BAR_STOPS.map((s) => (
                <Stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
              ))}
            </LinearGradient>
            {/* the bevel: a fine highlight along the top edge, a darker edge along the bottom */}
            <LinearGradient id="barBevel" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.26} />
              <Stop offset="0.3" stopColor="#ffffff" stopOpacity={0.04} />
              <Stop offset="0.6" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.45} />
            </LinearGradient>
            {/* the dip's rim catches the light on its lower curve */}
            <LinearGradient id="dipRim" x1="0" y1="0" x2="0" y2={DIP} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.3} />
              <Stop offset="1" stopColor="#f8f5ef" stopOpacity={0.24} />
            </LinearGradient>
          </Defs>
          <G mask="url(#dip)">
            <Rect x={0.5} y={0.5} width={width - 1} height={BAR - 1} rx={(BAR - 1) / 2} fill="url(#barFill)" stroke="rgba(0, 0, 0, 0.35)" strokeWidth={1} />
            <Rect testID="bottom-nav-bevel" x={1.5} y={1.5} width={width - 3} height={BAR - 3} rx={(BAR - 3) / 2} fill="none" stroke="url(#barBevel)" strokeWidth={1.25} />
          </G>
          <G clipPath="url(#lower)">
            <AnimatedCircle animatedProps={ringProps} cy={0} r={DIP - 0.5} fill="none" stroke="url(#dipRim)" strokeWidth={1.25} />
          </G>
        </Svg>
      )}

      {/* the dab over the active tab, carrying its icon */}
      {width > 0 && (
        <Animated.View style={[styles.dab, dabStyle]} pointerEvents="none" testID="bottom-nav-dab">
          <View style={[styles.dabInner, { backgroundColor: look.hue }]}>
            <DabGloss />
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={look.on} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              {icons[look.label]}
            </Svg>
          </View>
        </Animated.View>
      )}

      <View style={styles.row}>
        {items.map((item, i) => {
          const on = i === active;
          return (
            <Pressable
              key={item.label}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: on }}
              testID={`tab-${item.label}`}
              onPress={() => press(i)}
              style={styles.tab}
            >
              <View style={[styles.label, on && styles.labelOn]}>
                <Text
                  maxFontSizeMultiplier={MAX_SCALE.fixed}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[styles.labelText, on && styles.labelTextOn]}
                >
                  {item.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

/**
 * The light on the dab, over its colour (neutral white and black, so it suits every tab's hue): the
 * disc curves from a lit top to a shaded bottom, a soft gloss sits up and to the left, and a fine rim
 * catches the light along the top edge with a darker edge underneath.
 */
function DabGloss() {
  const r = DAB / 2;
  return (
    <Svg width={DAB} height={DAB} style={StyleSheet.absoluteFill} pointerEvents="none" testID="bottom-nav-gloss">
      <Defs>
        <LinearGradient id="dabCurve" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.2} />
          <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.2} />
        </LinearGradient>
        <RadialGradient id="dabGloss" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.42} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="dabRim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.55} />
          <Stop offset="0.45" stopColor="#ffffff" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
        </LinearGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill="url(#dabCurve)" />
      <Ellipse cx={r * 0.82} cy={r * 0.5} rx={r * 0.62} ry={r * 0.36} fill="url(#dabGloss)" />
      <Circle cx={r} cy={r} r={r - 0.75} fill="none" stroke="url(#dabRim)" strokeWidth={1.5} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  nav: { position: "absolute", left: 16, right: 16, height: BAR },
  // the bar's shadow on a transparent box (an outer shadow draws only outside its box, so nothing
  // shows through the bar's fill or the dip): a tight contact shadow under a deeper, softer one
  shadow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: BAR / 2,
    boxShadow: "0px 2px 4px rgba(20, 20, 18, 0.22), 0px 16px 28px -10px rgba(20, 20, 18, 0.5), 0px 32px 56px -18px rgba(20, 20, 18, 0.45)",
  },
  dab: { position: "absolute", top: -DAB / 2, left: 0, width: DAB, height: DAB, zIndex: 1 },
  dabInner: {
    flex: 1,
    overflow: "hidden",
    borderRadius: DAB / 2,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 2px 3px rgba(20, 20, 18, 0.3), 0px 12px 22px -8px rgba(20, 20, 18, 0.55)",
  },
  row: { flex: 1, flexDirection: "row" },
  tab: { flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 9 },
  // both states keep one box, so a tab change never moves layout; the active label drops 17px under its dab
  // the labels sit in faintly sunken pills: a darker well, shaded at its top inside, a hairline of light under it
  label: {
    marginBottom: 11,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(248, 245, 239, 0.16)",
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.16)",
    boxShadow: "inset 0px 1px 2px rgba(0, 0, 0, 0.45), 0px 1px 0px rgba(255, 255, 255, 0.07)",
  },
  labelOn: { borderColor: "transparent", backgroundColor: "transparent", boxShadow: [], transform: [{ translateY: 17 }] },
  labelText: { fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 13, letterSpacing: 0.44, color: "rgba(248, 245, 239, 0.92)" },
  labelTextOn: { color: "rgba(248, 245, 239, 0.7)" },
});
