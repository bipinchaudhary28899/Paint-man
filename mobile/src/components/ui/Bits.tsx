import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewProps, type StyleProp, type TextStyle, type ViewProps, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Turn } from "./Collapse";
import { colors, fonts, gutter, radii } from "~/theme";
import { H, MAX_SCALE } from "./Text";

// Small pieces from the website's stylesheet: .card, .link-arrow with its Arrow,
// the + toggle, and the .swipe row that bleeds to the screen edges.

/** .card: white, hairline (line-soft), radius 20. `radius` follows the website's per-screen overrides. */
export function Card({ style, radius = radii.lg, ...props }: ViewProps & { radius?: number }) {
  return <View style={[styles.card, { borderRadius: radius }, style]} {...props} />;
}

/** The right arrow after a link-arrow label (decorative). */
export function Arrow({ size = 18, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

/** .link-arrow: "Book a free site visit →", 16px medium ink, 44px tall tap target. */
export function LinkArrow({ label, onPress, style, textStyle, color = colors.ink }: { label: string; onPress: () => void; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>; color?: string }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={[styles.linkArrow, style]}>
      <Text maxFontSizeMultiplier={MAX_SCALE.large} style={[styles.linkArrowText, { color }, textStyle]}>
        {label}
      </Text>
      <Arrow color={color} />
    </Pressable>
  );
}

/**
 * A card's title that links to its page (an h3 holding a link on the website): the serif title, 24pt,
 * announced as a link named by it, with a 44pt tap area even on one line.
 */
export function TitleLink({ label, onPress, size = 24 }: { label: string; onPress: () => void; size?: number }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={styles.titleLink}>
      <H size={size} leading={4 / 3}>
        {label}
      </H>
    </Pressable>
  );
}

/**
 * The + that turns to × when its row opens (.plus). With `disc` it sits in a round hairline pill
 * (36pt) that fills ink when open, so the toggle reads as a button like every other one.
 */
export function Plus({ open, size = 18, color = colors.ink, disc = false }: { open: boolean; size?: number; color?: string; disc?: boolean }) {
  const mark = (
    <Turn open={open} degrees={45}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={disc && open ? colors.onInk : color} strokeWidth={1.8} strokeLinecap="round">
        <Path d="M12 5v14M5 12h14" />
      </Svg>
    </Turn>
  );
  if (!disc) return mark;
  return (
    <View style={[styles.disc, open && styles.discOpen]} testID="plus-disc">
      {mark}
    </View>
  );
}

/** The chevron of a select or a footer row. */
export function Chevron({ size = 14, color = colors.ink, up = false, strokeWidth = 2.2 }: { size?: number; color?: string; up?: boolean; strokeWidth?: number }) {
  return (
    <View style={{ transform: [{ rotate: up ? "180deg" : "0deg" }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
        <Path d="M6 9l6 6 6-6" />
      </Svg>
    </View>
  );
}



/** .swipe: a horizontal row that scrolls inside itself and bleeds to the screen edges (-mx-5 px-5). */
export function Swipe({ children, gap = 12, contentStyle, ...props }: ScrollViewProps & { gap?: number; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      style={styles.bleed}
      contentContainerStyle={[{ paddingHorizontal: gutter, gap }, contentStyle]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.paper },
  disc: { width: 36, height: 36, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  discOpen: { borderColor: colors.ink, backgroundColor: colors.ink },
  linkArrow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, alignSelf: "flex-start" },
  titleLink: { minHeight: 44, justifyContent: "center" },
  linkArrowText: { fontFamily: fonts.sansMedium, fontSize: 16 },
  bleed: { marginHorizontal: -gutter },
});
