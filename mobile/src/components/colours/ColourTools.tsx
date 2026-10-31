import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { openHref } from "~/lib/links";
import { BRAND_SHADES_ROUNDED, palettes } from "~/shared";
import { colors, fonts, radii } from "~/theme";

// Every colour tool as a card (the website's ColourTools on phones): two by two, each with a strip of
// real colours from that tool (decoration, not icons), a title, a line of text and an "Open →" pill
// (the whole card is the tap target). On a colour page the card of the page you are on reads "You are
// here" in a quiet sand pill, ringed, and opens nothing.

export type ColourTool = "finder" | "shade-cards" | "palettes" | "visit";

const firstPalette = palettes[0];

/** The four tools, word for word from the website's src/components/ColourTools.tsx. */
export const colourTools: { key: ColourTool; href: string; title: string; text: string; swatches: string[] }[] = [
  {
    key: "finder",
    href: "/colours",
    title: "Colour finder",
    text: `Search ${BRAND_SHADES_ROUNDED} brand shades by code, name or hex, each shown on a room.`,
    swatches: ["#f3ead8", "#e7975b", "#c76b4a", "#71856a", "#4a6a8f"],
  },
  {
    key: "shade-cards",
    href: "/shade-cards",
    title: "Brand shade cards",
    text: "Asian Paints, Berger, Nerolac and Nippon Paint, every shade light to dark.",
    swatches: ["#f4efe4", "#efd9a7", "#e9b949", "#d98c5f", "#9b4f3a"],
  },
  {
    key: "palettes",
    href: "/palettes",
    title: "Colour combinations",
    text: `${palettes.length} ready palettes: a feature wall, its white and an accent.`,
    swatches: firstPalette ? firstPalette.shades.map((s) => s.hex) : ["#71856a", "#f3ead8", "#c76b4a"],
  },
  {
    key: "visit",
    href: "/book",
    title: "See shades at home",
    text: "Book a visit: the inspector brings the real shade cards to your walls.",
    swatches: ["#e8d7c5", "#f8f5ef", "#a8532f"],
  },
];

export function ColourTools({ current, style }: { current?: ColourTool; style?: StyleProp<ViewStyle> }) {
  const rows = [colourTools.slice(0, 2), colourTools.slice(2, 4)];
  return (
    <View accessibilityLabel="Colour tools" style={[styles.grid, style]}>
      {rows.map((row) => (
        <View key={row[0].key} style={styles.row}>
          {row.map((t) => {
            const here = t.key === current;
            const body = (
              <>
                <View style={styles.strip} aria-hidden>
                  {t.swatches.map((hex, i) => (
                    <View key={`${hex}-${i}`} style={[styles.flex, { backgroundColor: hex }]} />
                  ))}
                </View>
                <View style={styles.body}>
                  <Text style={styles.title}>{t.title}</Text>
                  <Text style={styles.text}>{t.text}</Text>
                  <View style={styles.foot}>
                    <View style={[styles.open, here && styles.here]}>
                      <Text style={[styles.openText, here && styles.hereText]}>{here ? "You are here" : "Open →"}</Text>
                    </View>
                  </View>
                </View>
              </>
            );
            return here ? (
              <View key={t.key} style={styles.cell} accessible accessibilityLabel={`${t.title}, you are here`} accessibilityState={{ selected: true }}>
                <View style={styles.card}>{body}</View>
                <View style={styles.ring} pointerEvents="none" />
              </View>
            ) : (
              <Pressable key={t.key} accessibilityRole="link" accessibilityLabel={`${t.title}. ${t.text}`} onPress={() => openHref(t.href)} style={styles.cell}>
                {({ pressed }) => <View style={[styles.card, pressed && styles.pressed]}>{body}</View>}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  row: { flexDirection: "row", gap: 12, alignItems: "stretch" },
  cell: { flex: 1 },
  flex: { flex: 1 },
  card: { flex: 1, overflow: "hidden", borderRadius: radii.lg, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.paper },
  pressed: { opacity: 0.85 },
  ring: { position: "absolute", top: -2, left: -2, right: -2, bottom: -2, borderRadius: radii.lg + 2, borderWidth: 2, borderColor: "rgba(168, 83, 47, 0.4)" },
  strip: { flexDirection: "row", height: 48 },
  body: { flex: 1, padding: 14, alignItems: "flex-start" },
  title: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 20.6, letterSpacing: -0.08, color: colors.ink },
  text: { marginTop: 4, fontFamily: fonts.sans, fontSize: 13, lineHeight: 18.9, letterSpacing: -0.08, color: colors.muted },
  // pinned to the card's foot so the pills of a row line up whatever the text above them
  foot: { marginTop: "auto", paddingTop: 12 },
  open: { borderRadius: radii.pill, borderWidth: 1, borderColor: "rgba(168, 83, 47, 0.35)", paddingHorizontal: 12, paddingVertical: 5 },
  here: { borderColor: "transparent", backgroundColor: colors.sand },
  openText: { fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 18, letterSpacing: -0.08, color: colors.terracotta },
  hereText: { color: colors.muted },
});
