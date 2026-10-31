import { Children, isValidElement, useReducer, type ReactNode } from "react";
import { StyleSheet, Text, useWindowDimensions, type LayoutChangeEvent, type TextProps } from "react-native";

import { colors, fonts } from "~/theme";

// The website's type (globals.css): h1/h2/h3 in DM Serif Display, weight 400, letter-spacing
// -0.015em, with the one italic accent word (`<em>`) in terracotta-light; Manrope for text. Screens
// pass the sizes their website section uses on phones (text-[30px]/[1.06] → { fontSize: 30, lineHeight: 32 }).

/**
 * How far text grows with the phone's text size (Settings > Larger Text / Font size). Body text has no
 * cap. Headings and button labels, already large, stop at 2× (200%, what WCAG 1.4.4 asks for), so a
 * 40pt heading never breaks a word across lines. Labels inside a fixed box (the bottom nav, pills,
 * stickers on photos) stop at 1.3×, where the box still holds them.
 */
export const MAX_SCALE = { large: 2, fixed: 1.3 } as const;

type HeadingProps = TextProps & { size?: number; leading?: number; tracking?: number; balance?: boolean };

/** The text of a heading's children, nested accents included (the key a balanced width is remembered under). */
export function plainText(children: ReactNode): string {
  return Children.toArray(children)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : isValidElement<{ children?: ReactNode }>(c) ? plainText(c.props.children) : ""))
    .join("");
}

type Balance = { full?: number; lines?: number; lo?: number; hi?: number; width?: number; done: boolean };
type Measure = { width: number; height: number };

/** Balanced widths already found, by heading text, size and available width: a heading balances once per app run. */
const balanced = new Map<string, number | null>();

/**
 * One step of the search for a balanced width, from the heading's layout. The first layout gives the
 * available width and the natural line count (height ÷ line height); then each try sets an explicit
 * width (so every try reports its own layout) and halves the range between half the width and the full
 * width, keeping the narrowest width that still makes the same number of lines.
 */
export function balanceStep(state: Balance, m: Measure, lineHeight: number, key: string): Balance {
  if (state.done) return state;
  const lines = Math.max(1, Math.round(m.height / lineHeight));
  if (state.full === undefined) {
    const cached = balanced.get(`${key}|${m.width}`);
    if (cached !== undefined) return { full: m.width, lines, width: cached ?? undefined, done: true };
    if (lines <= 1 || m.width <= 0) {
      balanced.set(`${key}|${m.width}`, null);
      return { full: m.width, lines, done: true };
    }
    const lo = m.width / 2;
    return { full: m.width, lines, lo, hi: m.width, width: Math.ceil((lo + m.width) / 2), done: false };
  }
  // a layout from an earlier try (or the final one) says nothing about the current width
  if (m.width !== state.width) return state;
  const fits = lines <= state.lines!;
  const lo = fits ? state.lo! : state.width;
  const hi = fits ? state.width : state.hi!;
  if (hi - lo <= 2) {
    balanced.set(`${key}|${state.full}`, hi);
    return { ...state, lo, hi, width: hi, done: true };
  }
  return { ...state, lo, hi, width: Math.ceil((lo + hi) / 2) };
}

/**
 * The website's `text-wrap: balance` for headings: the same number of lines, as even as they can be.
 * React Native wraps greedily, so the heading measures itself, then searches for the narrowest width that
 * keeps its line count (as browsers do) and keeps it. Off with `balance={false}` or numberOfLines.
 */
function useBalance(enabled: boolean, key: string, lineHeight: number) {
  const [state, dispatch] = useReducer((s: Balance, m: Measure) => balanceStep(s, m, lineHeight, key), undefined, (): Balance => ({ done: !enabled }));
  const onLayout = !enabled || state.done ? undefined : (e: LayoutChangeEvent) => dispatch({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
  return { width: enabled ? state.width : undefined, onLayout };
}

/**
 * A heading (h1, h2 or h3 on the website): serif, announced as a header, lines balanced. `leading` is a
 * multiple of the size. It grows with the phone's text size up to MAX_SCALE.large; the balancing counts
 * lines at the grown size (the layout reports scaled heights).
 */
export function H({ size = 30, leading = 1.1, tracking = -0.015, balance = true, maxFontSizeMultiplier = MAX_SCALE.large, style, children, ...props }: HeadingProps) {
  const { fontScale } = useWindowDimensions();
  const flat = StyleSheet.flatten(style);
  const lineHeight = typeof flat?.lineHeight === "number" ? flat.lineHeight : Math.round(size * leading);
  const scale = maxFontSizeMultiplier && maxFontSizeMultiplier >= 1 ? Math.min(fontScale, maxFontSizeMultiplier) : fontScale;
  const shown = lineHeight * Math.max(1, scale);
  const { width, onLayout } = useBalance(balance && props.numberOfLines === undefined, `${size}|${lineHeight}|${scale}|${plainText(children)}`, shown);
  return (
    <Text
      accessibilityRole="header"
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      onLayout={onLayout}
      style={[
        styles.h,
        { fontSize: size, lineHeight: Math.round(size * leading), letterSpacing: tracking * size },
        style,
        width !== undefined && { width, maxWidth: "100%", alignSelf: flat?.textAlign === "center" ? "center" : "flex-start" },
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

/** The italic accent word inside a heading (`<em>`). */
export function Em({ style, ...props }: TextProps) {
  return <Text style={[styles.em, style]} {...props} />;
}

type PProps = TextProps & { size?: number; leading?: number; color?: string; weight?: keyof typeof weights };

const weights = { regular: fonts.sans, medium: fonts.sansMedium, semibold: fonts.sansSemiBold, bold: fonts.sansBold } as const;

/** A paragraph of Manrope text (body letter-spacing -0.005em). */
export function P({ size = 16, leading = 1.5, color = colors.ink, weight = "regular", style, ...props }: PProps) {
  return (
    <Text
      style={[{ fontFamily: weights[weight], fontSize: size, lineHeight: Math.round(size * leading), color, letterSpacing: -0.005 * size }, style]}
      {...props}
    />
  );
}

/** Bold text inside a paragraph (`<strong>`, font-semibold text-ink). */
export function Strong({ style, ...props }: TextProps) {
  return <Text style={[styles.strong, style]} {...props} />;
}

/** The section eyebrow (.eyebrow): 12px, semibold, 0.16em tracking, uppercase, terracotta. */
export function Eyebrow({ size = 12, style, ...props }: TextProps & { size?: number }) {
  return <Text style={[styles.eyebrow, { fontSize: size, letterSpacing: 0.16 * size }, style]} {...props} />;
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.serif, color: colors.ink },
  em: { fontFamily: fonts.serifItalic, color: colors.terracottaLight },
  strong: { fontFamily: fonts.sansSemiBold, color: colors.ink },
  eyebrow: { fontFamily: fonts.sansSemiBold, textTransform: "uppercase", color: colors.terracotta },
});
