import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, fonts } from "~/theme";
import { Arrow } from "./Bits";
import { MAX_SCALE } from "./Text";

// A list of links or facts as rows, the way the "Where we paint" card lists a city's localities: each
// row at least 44pt tall with a hairline under it, a dot (terracotta, or a shade's own swatch), the
// label, an optional detail (a count, a shade code) and, on a link, an arrow. Short labels (localities,
// checks) go in two columns. Lists are never drawn as pill chips wrapped over several lines.

export type ListRow = {
  key: string;
  label: string;
  /** a count or a shade code, muted, after the label */
  detail?: string;
  /** a swatch's colour for the dot (terracotta when left out) */
  swatch?: string;
  /** makes the row a link */
  onPress?: () => void;
  /** the page the visitor is on: shown in terracotta, not a link */
  current?: boolean;
  /** the link's name when the label alone is not enough ("Interior Painting in Agra") */
  accessibilityLabel?: string;
};

export function ListRows({ rows, columns = 1, accessibilityLabel, style }: { rows: readonly ListRow[]; columns?: 1 | 2; accessibilityLabel?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.list, style]}>
      {rows.map((r) => (
        <Row key={r.key} row={r} half={columns === 2} />
      ))}
    </View>
  );
}

function Row({ row, half }: { row: ListRow; half: boolean }) {
  const link = row.onPress && !row.current;
  const body = (
    <>
      <View aria-hidden style={row.swatch ? [styles.swatch, { backgroundColor: row.swatch }] : styles.dot} />
      <Text style={[styles.label, row.current && styles.labelOn]} numberOfLines={2} maxFontSizeMultiplier={MAX_SCALE.large}>
        {row.label}
      </Text>
      {row.detail !== undefined && (
        <Text style={styles.detail} maxFontSizeMultiplier={MAX_SCALE.large}>
          {row.detail}
        </Text>
      )}
      {link && !half && <Arrow size={16} color={colors.muted} />}
    </>
  );
  const box = [styles.row, half && styles.half];
  if (link) {
    return (
      <Pressable accessibilityRole="link" accessibilityLabel={row.accessibilityLabel} onPress={row.onPress} style={({ pressed }) => [box, pressed && styles.pressed]}>
        {body}
      </Pressable>
    );
  }
  return (
    <View accessible style={box} accessibilityState={row.current ? { selected: true } : undefined}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderColor: colors.line },
  row: { width: "100%", minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingRight: 4, borderBottomWidth: 1, borderColor: colors.line },
  half: { width: "50%", paddingRight: 12 },
  pressed: { opacity: 0.6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.terracotta },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: colors.lineSoft },
  label: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 20, color: colors.ink },
  labelOn: { color: colors.terracotta },
  detail: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18, color: colors.muted },
});
