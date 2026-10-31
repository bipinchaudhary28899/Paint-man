import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

import { Swipe } from "~/components/ui/Bits";
import { openHref } from "~/lib/links";
import { shadeCardBrands } from "~/shared";
import { MAX_SCALE } from "~/components/ui/Text";
import { colors, fonts, radii } from "~/theme";

// The colour explorer's pills: a brand or a colour family as a rounded chip (44pt tall), ink when
// chosen, with a dot of the family's colour where it has one. The finder uses them as its brand row
// and its family row; the home colour explorer uses the brand row as links into the finder.

type PillProps = {
  label: string;
  selected?: boolean;
  /** a swatch dot before the label */
  dot?: string;
  /** a quieter word after the label (a shade's code) */
  detail?: string;
  onPress: () => void;
  role?: "button" | "link";
  onLayout?: (e: LayoutChangeEvent) => void;
};

/** One pill: hairline on white, ink when selected; pressed it warms to cream. */
export function ChoicePill({ label, selected = false, dot, detail, onPress, role = "button", onLayout }: PillProps) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={detail ? `${label} ${detail}` : label}
      accessibilityState={role === "button" ? { selected } : undefined}
      onPress={onPress}
      onLayout={onLayout}
      style={({ pressed }) => [styles.pill, dot !== undefined && styles.pillDot, selected && styles.on, pressed && !selected && styles.pressed]}
    >
      {dot !== undefined && <View style={[styles.dot, { backgroundColor: dot }]} aria-hidden />}
      <Text style={[styles.text, selected && styles.textOn]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE.fixed}>
        {label}
      </Text>
      {detail !== undefined && <Text style={[styles.detail, selected && styles.detailOn]} maxFontSizeMultiplier={MAX_SCALE.fixed}>{detail}</Text>}
    </Pressable>
  );
}

/** "Browse a brand's shades": a pill per brand that opens the finder on that brand's shade card. */
export function FinderBrandLinks({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={styles.label}>Browse a brand&apos;s shades</Text>
      <Swipe gap={8} accessibilityLabel="Paint brands" contentStyle={styles.row}>
        {shadeCardBrands.map((b) => (
          <ChoicePill key={b.slug} role="link" label={b.name} onPress={() => openHref(`/colours?brand=${b.slug}`)} />
        ))}
      </Swipe>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
  },
  pillDot: { paddingLeft: 8, paddingRight: 14 },
  on: { borderColor: colors.ink, backgroundColor: colors.ink },
  pressed: { backgroundColor: colors.creamWash },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  text: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, letterSpacing: -0.07, color: colors.ink },
  textOn: { color: colors.onInk },
  detail: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
  detailOn: { color: colors.onInkMuted },
  label: { marginBottom: 8, fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 18, letterSpacing: -0.065, color: colors.muted },
  row: { paddingVertical: 2 },
});
