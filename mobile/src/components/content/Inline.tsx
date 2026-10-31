import { Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { goldenText } from "~/lib/contrast";
import { openHref } from "~/lib/links";
import { cityPath, liveCities, type City } from "~/shared";
import { colors, fonts } from "~/theme";

// Small inline pieces the content pages share: the website's .text-gradient word, links inside a
// paragraph (its `linkClass` and friends), LiveCityLinks, a 44pt link on a line of its own, and the
// wrapping row of buttons (`flex flex-wrap gap-3`).

/**
 * .text-gradient: terracotta-light → golden → sage, left to right across the word. The golden is the
 * deepened text golden (goldenText), so every letter reads at 3:1 or more on canvas, cream and white.
 */
const STOPS = [colors.terracottaLight, goldenText, colors.sage] as const;

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** The gradient's colour at `t` (0 = left edge, 1 = right edge), interpolated in sRGB as CSS does. */
export function gradientAt(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const f = x - i;
  const [a, b] = [channels(STOPS[i]), channels(STOPS[i + 1])];
  return `#${a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The website's gradient word inside a heading (`<span class="text-gradient">`). React Native text
 * cannot be clipped to a gradient, so each letter takes the gradient's colour at its place: the word
 * stays inline, wraps with its line and reads as one word.
 */
export function GradientText({ children }: { children: string }) {
  const letters = Array.from(children);
  return (
    <Text>
      {letters.map((ch, i) => (
        <Text key={i} style={{ color: gradientAt((i + 0.5) / letters.length) }}>
          {ch}
        </Text>
      ))}
    </Text>
  );
}

/** A link inside a paragraph: the website's linkClass (semibold, underlined in terracotta), or with `plain` just underlined (`className="underline"`); `style` adds to either. */
export function InlineLink({ href, children, style, plain = false, onPress }: { href: string; children: ReactNode; style?: StyleProp<TextStyle>; plain?: boolean; onPress?: () => void }) {
  return (
    <Text accessibilityRole="link" onPress={onPress ?? (() => openHref(href))} style={[plain ? styles.plain : styles.inline, style]}>
      {children}
    </Text>
  );
}

/** "font-bold text-ink underline" (the booking page's links). */
export const boldInk: TextStyle = { fontFamily: fonts.sansBold, color: colors.ink, textDecorationColor: colors.ink };

/** LiveCityLinks: "Agra, Mathura and Vrindavan", each name linking to its city page. */
export function CityLinks({ linkStyle, conjunction = "and", live = liveCities() }: { linkStyle?: StyleProp<TextStyle>; conjunction?: "and" | "or"; live?: readonly City[] }) {
  return (
    <>
      {live.map((c, i) => (
        <Fragment key={c.slug}>
          {i > 0 && (i === live.length - 1 ? ` ${conjunction} ` : ", ")}
          <InlineLink href={cityPath(c)} style={linkStyle}>
            {c.name}
          </InlineLink>
        </Fragment>
      ))}
    </>
  );
}

/** A link on a line of its own with a 44pt tap target (`inline-flex min-h-11 items-center`). */
export function TapLink({ label, onPress, textStyle, style }: { label: string; onPress: () => void; textStyle?: StyleProp<TextStyle>; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} style={[styles.tap, style]}>
      <Text style={[styles.inline, textStyle]}>{label}</Text>
    </Pressable>
  );
}

/** `flex flex-wrap gap-3`: buttons at their own width, wrapping onto the next line when they run out of room. */
export function ButtonRow({ children, center = false, style }: { children: ReactNode; center?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, center && styles.center, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  inline: { fontFamily: fonts.sansSemiBold, textDecorationLine: "underline", textDecorationColor: colors.terracotta },
  plain: { textDecorationLine: "underline" },
  tap: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  center: { justifyContent: "center" },
});
