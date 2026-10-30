import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "~/theme";
import { Body } from "./Text";

// Lists without icons: numbered steps on a hairline, titled points, and plain lines with a dash.

type Titled = { title: string; text?: string; body?: string };

/** Numbered steps joined by a hairline (the website's phone timeline for "How the work gets done"). */
export function StepList({ steps }: { steps: readonly Titled[] }) {
  return (
    <View>
      {steps.map((s, i) => (
        <View key={s.title} style={styles.step}>
          <View style={styles.rail}>
            <View style={styles.dot}>
              <Text style={styles.dotText}>{i + 1}</Text>
            </View>
            {i < steps.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.stepBody}>
            <Text style={styles.title}>{s.title}</Text>
            <Body style={styles.text}>{s.text ?? s.body}</Body>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Titled paragraphs separated by hairlines (promises, weather notes, the paint system). */
export function PointList({ points }: { points: readonly Titled[] }) {
  return (
    <View style={styles.points}>
      {points.map((p) => (
        <View key={p.title} style={styles.point}>
          <Text style={styles.title}>{p.title}</Text>
          <Body style={styles.text}>{p.text ?? p.body}</Body>
        </View>
      ))}
    </View>
  );
}

/** Short lines, each after an en dash. */
export function DashList({ items }: { items: readonly string[] }) {
  return (
    <View style={styles.dashes}>
      {items.map((item) => (
        <View key={item} style={styles.dashRow}>
          <Text aria-hidden style={styles.dash}>
            –
          </Text>
          <Body style={styles.dashText}>{item}</Body>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: "row", gap: 14 },
  rail: { alignItems: "center", width: 30 },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  dotText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.onInk },
  line: { flex: 1, width: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong, marginVertical: 4 },
  stepBody: { flex: 1, paddingBottom: 22 },
  title: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 22, color: colors.ink, marginTop: 4 },
  text: { marginTop: 4, fontSize: 15, lineHeight: 23 },
  points: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  point: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  dashes: { gap: 8 },
  dashRow: { flexDirection: "row", gap: 10 },
  dash: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 24, color: colors.terracotta },
  dashText: { flex: 1, fontSize: 15, lineHeight: 23 },
});
