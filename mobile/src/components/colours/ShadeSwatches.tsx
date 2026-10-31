import { useIsFocused } from "expo-router";
import { memo, useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";

import { P } from "~/components/ui/Text";
import { swatchHref, type ShadeCredit, type Swatch } from "~/lib/colours";
import { openHref } from "~/lib/links";
import { colors, fonts, gutter } from "~/theme";
import { useStickyScroll } from "./useStickyScroll";

// A grid of brand shades as on a paper shade card (the website's ShadeSwatches on phones): three a row,
// the colour square over the code printed on the card, the name and the LRV, all as text. Each swatch
// opens the colour finder on that shade, where it is shown on a room wall.
//
// A family page holds up to ~520 swatches in the page's one scroll, so the grid draws its rows as they
// near the screen: the first FIRST_ROWS at once (about two screens), then MORE_ROWS each time the drawn
// rows end within AHEAD_PX of the screen's bottom (watched on the UI thread, as the finder's list is).
// The rows not drawn yet keep their room, estimated, so the footer below stays put. With a screen
// reader on, the rows are all drawn, a batch a frame, so swiping from swatch to swatch never skips any.

const GAP = 8;
/** Rows drawn on the first render. */
export const FIRST_ROWS = 8;
/** Rows added each time the drawn rows near the screen (or each frame, with a screen reader on). */
export const MORE_ROWS = 12;
/** How far below the screen's bottom the drawn rows reach before more are added. */
export const AHEAD_PX = 1200;
const COLUMNS = 3;

/** A swatch tile's height for a tile `width` wide: the colour square, then the code, a name line and the LRV with their padding. */
export const estimatedRowHeight = (width: number) => width + 82;

/** The rows to draw for `count` swatches when `drawn` rows are up and more are wanted: MORE_ROWS more, at most all of them. */
export const nextRows = (drawn: number, count: number) => Math.min(Math.ceil(count / COLUMNS), drawn + MORE_ROWS);

const SwatchTile = memo(function SwatchTile({ s, width }: { s: Swatch; width: number }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${s.code ? `${s.code} ` : ""}${s.name}, LRV ${s.lrv}`}
      onPress={() => openHref(swatchHref(s))}
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
      testID="swatch"
    >
      <View style={[styles.colour, { backgroundColor: s.hex }]} />
      <View style={styles.body}>
        {s.code !== null && <Text style={styles.code}>{s.code}</Text>}
        <Text style={s.code !== null ? styles.name : styles.nameOnly}>{s.name}</Text>
        <Text style={styles.lrv}>LRV {s.lrv}</Text>
      </View>
    </Pressable>
  );
});

/** Whether VoiceOver or TalkBack is on, following changes. */
function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((v) => live && setOn(v));
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setOn);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return on;
}

export function ShadeSwatches({ shades, label }: { shades: Swatch[]; label: string }) {
  const { width, height } = useWindowDimensions();
  const tile = (width - gutter * 2 - GAP * 2) / COLUMNS;
  const totalRows = Math.ceil(shades.length / COLUMNS);
  const [rows, setRows] = useState(Math.min(FIRST_ROWS, totalRows));
  const more = useCallback(() => setRows((r) => nextRows(r, shades.length)), [shades.length]);
  const screenReader = useScreenReader();
  const done = rows >= totalRows;

  // a screen reader reads the whole card: draw the rest, a batch a frame
  useEffect(() => {
    if (!screenReader || done) return;
    const id = requestAnimationFrame(more);
    return () => cancelAnimationFrame(id);
  }, [screenReader, done, rows, more]);

  const focused = useIsFocused();
  const { container } = useStickyScroll({
    pinned: false,
    focused,
    stickTop: 0,
    screenHeight: height,
    gapBelow: 0,
    watchEnd: !done,
    nearEndPx: AHEAD_PX,
    onNearEnd: more,
    listKey: rows,
  });

  const left = totalRows - rows;
  return (
    <View accessibilityLabel={label}>
      <Animated.View ref={container} collapsable={false} style={styles.grid}>
        {shades.slice(0, rows * COLUMNS).map((s) => (
          <SwatchTile key={s.id} s={s} width={tile} />
        ))}
      </Animated.View>
      {left > 0 && <View style={{ height: left * (estimatedRowHeight(tile) + GAP) }} testID="swatches-to-come" />}
    </View>
  );
}

/** The CC BY 4.0 credit PaintDB's licence asks for wherever its shades are shown. */
export function PaintDbCredit({ credit }: { credit: ShadeCredit }) {
  return (
    <P size={14} leading={1.625} color={colors.muted}>
      Shade data:{" "}
      <Text accessibilityRole="link" style={styles.link} onPress={() => openHref(credit.source)}>
        PaintDB
      </Text>
      ,{" "}
      <Text accessibilityRole="link" style={styles.link} onPress={() => openHref(credit.licenseUrl)}>
        CC BY 4.0
      </Text>
      . {credit.note} Screens vary, so confirm every shade on the brand&apos;s physical card before it goes on the wall.
    </P>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", alignItems: "stretch", gap: GAP },
  tile: { overflow: "hidden", borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  pressed: { opacity: 0.85 },
  colour: { width: "100%", aspectRatio: 1, borderBottomWidth: 1, borderColor: colors.line },
  body: { flex: 1, paddingHorizontal: 8, paddingVertical: 8 },
  code: { fontFamily: fonts.sansBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.3, color: colors.ink },
  name: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16.5, color: colors.muted },
  nameOnly: { fontFamily: fonts.sansBold, fontSize: 12, lineHeight: 16.5, color: colors.ink },
  lrv: { marginTop: "auto", paddingTop: 4, fontFamily: fonts.sans, fontSize: 11, lineHeight: 16.5, color: colors.muted },
  link: { fontFamily: fonts.sansSemiBold, textDecorationLine: "underline" },
});
