import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { ColourTools } from "~/components/colours/ColourTools";
import { FinderBrandLinks } from "~/components/colours/Pills";
import { Container } from "~/components/site/Page";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { PAINTDB } from "~/shared";
import { colors, fonts } from "~/theme";

// "Find a shade that feels like you" on phones (src/components/home/ColourExplorer.tsx): the selected
// shade as a big colour block with its label card on top, twelve featured shades as a 6 × 2 grid of
// circles (the website's scroll-turned wheel is tablet and desktop only), the illustrative-colour note
// with the PaintDB credit, the finder's brand pills (each opens the finder on that brand's shade card),
// then every colour tool as cards.

/** The wheel's 36 illustrative shades: name, hex, family (word for word from the website). */
export const wheelShades: [string, string, string][] = [
  ["Chalk", "#F4F1EA", "Whites"], ["Linen", "#EDE6D8", "Whites"], ["Oat", "#E3D7C2", "Neutrals"], ["Sand", "#E8D7C5", "Neutrals"],
  ["Biscuit", "#D9BFA0", "Neutrals"], ["Caramel", "#C49A6C", "Browns"], ["Walnut", "#8A5A3C", "Browns"], ["Clay", "#B8714F", "Terracottas"],
  ["Terracotta", "#C76B4A", "Terracottas"], ["Paprika", "#B5473A", "Reds"], ["Oxblood", "#7A2E2A", "Reds"], ["Rose", "#D98C8C", "Pinks"],
  ["Blush", "#EBC4BE", "Pinks"], ["Coral", "#E8866A", "Corals"], ["Apricot", "#F0A878", "Oranges"], ["Marigold", "#E99A3C", "Oranges"],
  ["Golden", "#E9B949", "Yellows"], ["Butter", "#F2D98A", "Yellows"], ["Olive", "#9A9A5E", "Greens"], ["Sage", "#71856A", "Greens"],
  ["Fern", "#4F6B4A", "Greens"], ["Eucalyptus", "#9FB8A8", "Greens"], ["Teal", "#2E6B6A", "Blues"], ["Lagoon", "#5A9AA6", "Blues"],
  ["Sky", "#A9C6D6", "Blues"], ["Denim", "#4B6A8F", "Blues"], ["Navy", "#283B5A", "Blues"], ["Lilac", "#C3B5D6", "Purples"],
  ["Plum", "#6B4A6E", "Purples"], ["Mist", "#D6D8D4", "Greys"], ["Pebble", "#B3B2AA", "Greys"], ["Slate", "#6E7370", "Greys"],
  ["Charcoal", "#3C3D3A", "Darks"], ["Ink", "#242522", "Darks"], ["Espresso", "#3F2E26", "Darks"], ["Ivory", "#F8F5EF", "Whites"],
];
/** The twelve featured swatches (indices into wheelShades). */
export const swatchIndices = [1, 3, 8, 12, 13, 16, 19, 21, 23, 25, 27, 30];

export function ColourExplorer() {
  const [sel, setSel] = useState(2);
  const [name, hex, family] = wheelShades[swatchIndices[sel]];
  // the block eases to the new shade (transition-colors duration-300)
  const shade = useSharedValue(hex);
  useEffect(() => {
    shade.value = withTiming(hex, { duration: 300, reduceMotion: ReduceMotion.System });
  }, [hex, shade]);
  const block = useAnimatedStyle(() => ({ backgroundColor: shade.value }));

  return (
    <Container style={styles.section}>
      <Eyebrow size={11} style={styles.eyebrow}>
        Colour explorer
      </Eyebrow>
      <H size={30} leading={1.06} style={styles.mt12}>
        Find a shade that feels like <Em>you.</Em>
      </H>
      <P size={15} leading={1.6} color={colors.muted} style={styles.mt12}>
        Apna rang chuniye: pick a shade to see it up close. Our inspector brings the real cards to your home and helps you choose finishes that suit your light,
        furniture and budget.
      </P>

      <View style={styles.selected}>
        <Animated.View style={[StyleSheet.absoluteFill, block]} testID="selected-shade" />
        <View style={styles.label}>
          <Text style={styles.labelKey}>Selected shade</Text>
          <View style={styles.labelRow}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.hex}>
              {hex.toUpperCase()} · {family}
            </Text>
          </View>
        </View>
      </View>

      <View accessibilityLabel="Featured shades" style={styles.swatches}>
        {[swatchIndices.slice(0, 6), swatchIndices.slice(6)].map((row, r) => (
          <View key={r} style={styles.swatchRow}>
            {row.map((ci, j) => {
              const i = r * 6 + j;
              const [sName, sHex] = wheelShades[ci];
              const on = i === sel;
              return (
                <Pressable
                  key={sName}
                  accessibilityRole="button"
                  accessibilityLabel={sName}
                  accessibilityState={{ selected: on }}
                  onPress={() => setSel(i)}
                  style={[styles.swatch, { backgroundColor: sHex }, on ? styles.swatchOn : styles.swatchOff]}
                />
              );
            })}
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        Shades shown on screen are illustrative. Final colour depends on the paint range, finish and your room&apos;s light. Brand shade data:{" "}
        <Text accessibilityRole="link" style={styles.underline} onPress={() => void Linking.openURL(PAINTDB.source)}>
          PaintDB
        </Text>
        ,{" "}
        <Text accessibilityRole="link" style={styles.underline} onPress={() => void Linking.openURL(PAINTDB.licenseUrl)}>
          CC BY 4.0
        </Text>
        .
      </Text>

      <FinderBrandLinks style={styles.brands} />
      <ColourTools style={styles.tools} />
    </Container>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: 56 },
  eyebrow: { lineHeight: 16.5 },
  mt12: { marginTop: 12 },
  selected: { marginTop: 20, height: 150, overflow: "hidden", borderRadius: 22 },
  label: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    gap: 2,
    borderRadius: 14,
    backgroundColor: "rgba(248, 245, 239, 0.94)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  labelKey: { fontFamily: fonts.sans, fontSize: 10, lineHeight: 15, letterSpacing: 1.2, textTransform: "uppercase", color: colors.muted2 },
  labelRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", columnGap: 10 },
  name: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 33, letterSpacing: -0.22, color: colors.ink },
  hex: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19.5, letterSpacing: -0.08, color: colors.muted },
  swatches: { marginTop: 14, maxWidth: 480, gap: 8 },
  swatchRow: { flexDirection: "row", gap: 8 },
  swatch: { flex: 1, aspectRatio: 1, minHeight: 44, borderRadius: 999 },
  swatchOn: { boxShadow: "0px 0px 0px 2px #f8f5ef, 0px 0px 0px 4px #242522" },
  swatchOff: { boxShadow: "inset 0px 0px 0px 1px rgba(36, 37, 34, 0.12)" },
  note: { marginTop: 12, fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, letterSpacing: -0.08, color: colors.muted2 },
  underline: { textDecorationLine: "underline" },
  brands: { marginTop: 20 },
  tools: { marginTop: 20 },
});
