import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PaintShade } from "~/lib/colours";
import { shadeDisplayName } from "~/shared";
import { colors, fonts } from "~/theme";

// The finder's swatch grid on phones: three tiles a row, close together, each a generous block of the
// colour over the shade's clean name (serif, 13px) and code. A tap opens the shade's large preview; the
// selected tile gets the ink ring. Memoised: a tap re-renders only the two tiles whose selected state flips.

export const TILE_GAP = 6;
/** The colour block's height for a tile `width` wide (a little wider than tall). */
export const swatchHeight = (width: number) => Math.round(width * 0.68);

export const BrandTile = memo(function BrandTile({ shade: s, selected, width, onSelect }: { shade: PaintShade; selected: boolean; width: number; onSelect: (s: PaintShade) => void }) {
  const name = shadeDisplayName(s.name);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name} ${s.code}`}
      accessibilityHint="Opens a larger preview on a room"
      onPress={() => onSelect(s)}
      style={{ width }}
      testID={`tile-${s.id}`}
    >
      <View style={[styles.tile, selected && styles.tileOn]}>
        <View style={[styles.colour, { height: swatchHeight(width), backgroundColor: s.hex }]} />
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.code} numberOfLines={1}>
            {s.code}
          </Text>
        </View>
      </View>
      {selected && <View style={styles.ring} pointerEvents="none" />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: { overflow: "hidden", borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  tileOn: { borderColor: colors.ink },
  ring: { position: "absolute", top: -2, left: -2, right: -2, bottom: -2, borderRadius: 14, borderWidth: 2, borderColor: colors.ink },
  colour: { borderBottomWidth: 1, borderColor: colors.line },
  body: { paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8 },
  name: { minHeight: 32, fontFamily: fonts.serif, fontSize: 13, lineHeight: 16, letterSpacing: -0.2, color: colors.ink },
  code: { marginTop: 2, fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 15, color: colors.muted },
});
