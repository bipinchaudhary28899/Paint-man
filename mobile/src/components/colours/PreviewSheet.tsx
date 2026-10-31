import { useCallback, useEffect, useMemo, useRef, type ComponentRef } from "react";
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, { Easing, Extrapolation, interpolate, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Button } from "~/components/ui/Button";
import { openHref } from "~/lib/links";
import { colors, fonts, radii } from "~/theme";
import { WallPreview } from "./WallPreview";

// The large preview as a bottom sheet: the selected shade on the room, as large as the sheet allows, with
// the loaded shades in a swipeable strip underneath, so a visitor keeps picking while looking at the big
// room. It slides up over the dimmed finder and covers most of the screen; dragging it down (anywhere
// but the strip, which swipes sideways) past 120pt or with a flick closes it, as do ×, the dimmed strip
// above it and the phone's Back. A short drag springs back. The slide is instant under reduce motion.

/** The shade the sheet shows, as the finder describes it. */
export type SheetView = { name: string; code: string; hex: string; lrv: number; meta: string; bookHref: string };
/** A swatch in the strip. */
export type SheetShade = { id: string; name: string; code: string; hex: string };

/** Points from the strip's end at which the next page of shades is asked for. */
export const NEAR_END_PX = 240;
/** The sheet's height as a share of the screen's. */
export const SHEET_SHARE = 0.9;
/** A drag down this far (points) closes the sheet... */
export const CLOSE_DISTANCE = 120;
/** ...as does a flick down this fast (points per millisecond). */
export const CLOSE_VELOCITY = 0.8;

/** Whether a move is a downward drag (past 6pt, more down than across): only those move the sheet. */
export const isDownward = (dx: number, dy: number) => dy > 6 && dy > Math.abs(dx);
/** Whether a drag that ended `dy` points down at `vy` closes the sheet. */
export const closesSheet = (dy: number, vy: number) => dy > CLOSE_DISTANCE || vy > CLOSE_VELOCITY;

const SWATCH = 48;
const GAP = 8;
const SIDE = 16;
const slide = { duration: 320, easing: Easing.bezier(0.2, 0.8, 0.2, 1), reduceMotion: ReduceMotion.System };

export function PreviewSheet({
  view,
  shades,
  selectedId,
  onSelect,
  onClose,
  onNearEnd,
}: {
  view: SheetView;
  shades: SheetShade[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Closes the sheet. Pass a stable function: the drag handling is made again when it changes. */
  onClose: () => void;
  /** The strip was scrolled close to its end: load more shades if there are any. */
  onNearEnd?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sheetHeight = Math.round(height * SHEET_SHARE);
  const strip = useRef<ComponentRef<typeof ScrollView>>(null);
  const index = shades.findIndex((s) => s.id === selectedId);
  // how far below its resting place the sheet is: off the screen until it has slid up
  const offset = useSharedValue(sheetHeight);
  // set once the sheet starts sliding away: from then on nothing else closes or drags it
  const closing = useSharedValue(false);

  useEffect(() => {
    offset.set(withTiming(0, slide));
  }, [offset]);

  /** Slides the sheet away, then closes it. */
  const dismiss = useCallback(() => {
    if (closing.get()) return;
    closing.set(true);
    offset.set(
      withTiming(sheetHeight, slide, (finished) => {
        if (finished) scheduleOnRN(onClose);
      }),
    );
  }, [offset, closing, sheetHeight, onClose]);

  const drag = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => !closing.get() && isDownward(g.dx, g.dy),
        onPanResponderMove: (_e, g) => offset.set(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (closesSheet(g.dy, g.vy)) dismiss();
          else offset.set(withTiming(0, slide));
        },
        onPanResponderTerminate: () => offset.set(withTiming(0, slide)),
        onPanResponderTerminationRequest: () => false,
      }),
    [offset, closing, dismiss],
  );

  // the picked swatch stays in view, centred, as the visitor swipes and taps
  useEffect(() => {
    if (index < 0) return;
    const x = SIDE + index * (SWATCH + GAP) - (width - SWATCH) / 2;
    strip.current?.scrollTo({ x: Math.max(0, x), animated: true });
  }, [index, width]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.x + layoutMeasurement.width >= contentSize.width - NEAR_END_PX) onNearEnd?.();
  };

  const dim = useAnimatedStyle(() => ({ opacity: interpolate(offset.value, [0, sheetHeight], [1, 0], Extrapolation.CLAMP) }));
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={dismiss}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dim]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} testID="sheet-backdrop" accessibilityElementsHidden importantForAccessibility="no" />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={dismiss}
          testID="preview-sheet"
          style={[styles.sheet, { height: sheetHeight, paddingBottom: Math.max(16, insets.bottom) }, lift]}
          {...drag.panHandlers}
        >
          <View style={styles.grab} aria-hidden>
            <View style={styles.grabBar} />
          </View>
          <View style={styles.head}>
            <View style={[styles.swatch, { backgroundColor: view.hex }]} aria-hidden />
            <View style={styles.titles}>
              <Text accessibilityRole="header" numberOfLines={1} style={styles.name}>
                {view.name}
              </Text>
              <Text numberOfLines={1} style={styles.meta}>
                {view.code} · {view.meta}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close the large preview" onPress={dismiss} style={styles.close} hitSlop={4}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.room}>
            <WallPreview colour={view} fill radius={radii.xl} />
          </View>

          <ScrollView
            ref={strip}
            horizontal
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={64}
            accessibilityLabel="Shades"
            style={styles.strip}
            contentContainerStyle={styles.stripContent}
          >
            {shades.map((s) => {
              const on = s.id === selectedId;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${s.name} ${s.code}`}
                  onPress={() => onSelect(s.id)}
                  style={[styles.pick, on && styles.pickOn]}
                >
                  <View style={[styles.pickColour, on && styles.pickColourOn, { backgroundColor: s.hex }]} />
                </Pressable>
              );
            })}
          </ScrollView>

          {/* close the sheet first: it is a modal over the page, and the booking page would open behind it */}
          <Button
            label="Book an inspection with this shade"
            onPress={() => {
              onClose();
              openHref(view.bookHref);
            }}
            height={44}
            fontSize={14}
            style={styles.book}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dim: { backgroundColor: "rgba(36, 37, 34, 0.45)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: SIDE,
    boxShadow: "0px -12px 40px -16px rgba(36, 37, 34, 0.45)",
  },
  grab: { height: 22, alignItems: "center", justifyContent: "center" },
  grabBar: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.lineStrong },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  swatch: { marginTop: 4, width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  titles: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, letterSpacing: -0.36, color: colors.ink },
  meta: { fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 16, color: colors.muted },
  close: {
    marginRight: -4,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontFamily: fonts.sans, fontSize: 20, lineHeight: 22, color: colors.ink },
  room: { flex: 1, minHeight: 0, marginTop: 12 },
  strip: { flexGrow: 0, flexShrink: 0, marginTop: 12, marginHorizontal: -SIDE },
  stripContent: { paddingHorizontal: SIDE, paddingVertical: 4, gap: GAP },
  // the ring sits 2pt outside the swatch with the canvas between (ring-2 ring-offset-2)
  pick: { width: SWATCH, height: SWATCH, borderRadius: 12 },
  pickOn: { margin: -4, width: SWATCH + 8, height: SWATCH + 8, padding: 2, borderWidth: 2, borderColor: colors.ink, borderRadius: 16 },
  pickColour: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  pickColourOn: { borderColor: colors.ink },
  book: { marginTop: 12 },
});
