import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { colors, fonts, radii } from "~/theme";
import { MAX_SCALE } from "./Text";

// The website's buttons (.btn-primary, .btn-secondary, .btn-dark, .btn-lg): pills, 52px tall
// (58 large, 44 small), 15px semibold with 0.01em tracking; pressed they darken and sink to 98%;
// busy or disabled they dim to 60%. Every tappable control that acts as a button is one of these.
// The label grows with the phone's text size up to 2× and wraps inside the pill, which grows with it.

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "dark";
  /** btn-lg: 58px tall, 32px sides, 16px text */
  large?: boolean;
  /** the compact pill (44px tall, 18px sides, 14px text) for tight rows: cards, sheets, the finder */
  small?: boolean;
  /** min-height override (the website's max-tab:min-h-[54px] and similar) */
  height?: number;
  fontSize?: number;
  /** the label colour when the website gives the button its own text colour (e.g. text-brand-700) */
  textColor?: string;
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  accessibilityHint?: string;
  /** what a screen reader says when it differs from the label ("Call us" for a "Call" pill) */
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "link";
  /** a mark before the label (the WhatsApp logo on its button) */
  leading?: ReactNode;
  /** how far the label grows with the phone's text size: 2× (MAX_SCALE.large) by default; MAX_SCALE.fixed for a pill in a fixed bar */
  maxFontSizeMultiplier?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const fill = {
  primary: { bg: colors.terracotta, pressed: colors.terracottaHover, text: colors.onInk },
  secondary: { bg: "transparent", pressed: "rgba(36, 37, 34, 0.1)", text: colors.ink },
  dark: { bg: colors.ink, pressed: colors.inkSoft, text: colors.onInk },
} as const;

export function Button({
  label,
  onPress,
  variant = "primary",
  large = false,
  small = false,
  height,
  fontSize,
  textColor,
  busy = false,
  busyLabel,
  disabled = false,
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole = "button",
  leading,
  maxFontSizeMultiplier = MAX_SCALE.large,
  style,
  testID,
}: Props) {
  const look = fill[variant];
  const inactive = busy || disabled;
  return (
    <Pressable
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: inactive, busy }}
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        small && styles.small,
        height !== undefined && { minHeight: height },
        { backgroundColor: pressed ? look.pressed : look.bg },
        variant === "secondary" && styles.secondary,
        pressed && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={look.text} size="small" /> : leading}
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        style={[
          styles.label,
          variant === "secondary" && styles.secondaryLabel,
          large && styles.largeLabel,
          small && styles.smallLabel,
          fontSize !== undefined && { fontSize, letterSpacing: 0.01 * fontSize },
          { color: textColor ?? look.text },
        ]}
      >
        {busy && busyLabel ? busyLabel : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radii.pill, paddingHorizontal: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  large: { minHeight: 58, paddingHorizontal: 32 },
  small: { minHeight: 44, paddingHorizontal: 18, gap: 8 },
  secondary: { borderWidth: 1, borderColor: "rgba(36, 37, 34, 0.25)" },
  pressed: { transform: [{ scale: 0.98 }] },
  inactive: { opacity: 0.6 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 15, letterSpacing: 0.15, textAlign: "center" },
  secondaryLabel: { fontFamily: fonts.sansMedium },
  largeLabel: { fontSize: 16, letterSpacing: 0.16 },
  smallLabel: { fontSize: 14, letterSpacing: 0.14 },
});
