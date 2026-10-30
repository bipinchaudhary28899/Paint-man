import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { FaqItem } from "~/shared";
import { colors, fonts } from "~/theme";
import { Body } from "./Text";

/** Questions that open one at a time; the + turns to × on the open one. */
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <View style={styles.list}>
      {items.map((item, i) => {
        const expanded = open === i;
        return (
          <View key={item.q} style={styles.item}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setOpen(expanded ? null : i)}
              style={styles.question}
            >
              <Text style={styles.q}>{item.q}</Text>
              <Text aria-hidden style={[styles.toggle, expanded && styles.toggleOpen]}>
                +
              </Text>
            </Pressable>
            {expanded && <Body style={styles.a}>{item.a}</Body>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  item: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  question: { minHeight: 56, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  q: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 22, color: colors.ink },
  toggle: { fontFamily: fonts.sans, fontSize: 24, color: colors.ink, width: 24, textAlign: "center" },
  toggleOpen: { transform: [{ rotate: "45deg" }] },
  a: { paddingBottom: 18, fontSize: 15, lineHeight: 23 },
});
