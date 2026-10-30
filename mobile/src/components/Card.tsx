import { StyleSheet, View, type ViewProps } from "react-native";

import { colors, radii } from "~/theme";

/** A paper card with a hairline border and soft corners. `tone="sand"` is the website's sand panel. */
export function Card({ style, tone = "paper", ...props }: ViewProps & { tone?: "paper" | "sand" | "chalk" }) {
  return <View style={[styles.card, styles[tone], style]} {...props} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, padding: 20 },
  paper: { backgroundColor: colors.paper },
  sand: { backgroundColor: colors.sand, borderColor: "transparent" },
  chalk: { backgroundColor: colors.chalk },
});
