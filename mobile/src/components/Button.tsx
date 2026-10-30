import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { colors, fonts, radii } from "~/theme";

// The website's two buttons: btn-primary (terracotta pill, cream text) and btn-secondary (hairline
// ghost). At least 52pt tall, so every tap target clears 44pt.

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  /** Shows a spinner and `busyLabel`, and ignores presses. */
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = "primary", busy = false, busyLabel, disabled = false, accessibilityHint, style }: Props) {
  const primary = variant === "primary";
  const inactive = busy || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      accessibilityHint={accessibilityHint}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        pressed && (primary ? styles.primaryPressed : styles.secondaryPressed),
        disabled && !busy && styles.disabled,
        style,
      ]}
    >
      {busy && <ActivityIndicator color={primary ? colors.onInk : colors.ink} size="small" />}
      <Text style={[styles.label, primary ? styles.primaryLabel : styles.secondaryLabel]}>{busy && busyLabel ? busyLabel : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radii.pill, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primary: { backgroundColor: colors.terracotta },
  primaryPressed: { backgroundColor: colors.terracottaHover },
  secondary: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong, backgroundColor: "transparent" },
  secondaryPressed: { backgroundColor: colors.chalk },
  disabled: { opacity: 0.5 },
  label: { fontFamily: fonts.sansBold, fontSize: 16 },
  primaryLabel: { color: colors.onInk },
  secondaryLabel: { color: colors.ink },
});
