import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fonts, radii } from "~/theme";

type Props = { label: string; selected?: boolean; onPress: () => void; accessibilityLabel?: string };

/** A choice pill: ink when chosen, a hairline ghost otherwise. Used where the website has a select. */
export function Chip({ label, selected = false, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.chip, selected ? styles.on : styles.off, pressed && !selected && styles.pressed]}
    >
      <Text style={[styles.label, selected && styles.labelOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: radii.pill, justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  off: { borderColor: colors.lineStrong, backgroundColor: colors.paper },
  on: { borderColor: colors.ink, backgroundColor: colors.ink },
  pressed: { backgroundColor: colors.chalk },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  labelOn: { color: colors.onInk },
});
