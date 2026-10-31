import { BlendColor, Canvas, Group, Image as SkiaImage, useImage } from "@shopify/react-native-skia";
import { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedReaction, useAnimatedStyle, useDerivedValue, useReducedMotion, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Container, usePage } from "~/components/site/Page";
import { Em, Eyebrow, H } from "~/components/ui/Text";
import { genericScene } from "~/shared";
import { colors, fonts } from "~/theme";
import { containProgress, reveal, screenTop, stageColours, stickyOffset } from "./motion";
import { skiaSource } from "./pictures";
import { useContentY } from "./useContentY";

// "Watch the colour go on" (src/components/home/PinnedReveal.tsx): the room stays in full colour and
// only its walls, cut out by the photo's exact wall mask, start as bare putty and take their shade from
// the floor up as the page scrolls 300vh with the panel pinned under the header. On phones: the heading,
// the room filling the middle of the panel, the four stages as a strip (the current one carries a
// terracotta rule), the progress bar with its percentage and the shade's name. The tints are multiplied
// over the photo with Skia, as the website's mix-blend-mode does. Reduced motion shows the walls finished.

export const stages = [
  { title: "Prep & putty", text: "Cracks filled, walls sanded smooth." },
  { title: "Primer", text: "One coat that lets the colour hold." },
  { title: "First coat", text: "The shade begins to show." },
  { title: "Second coat", text: "Deep, even, finished." },
];
export const stageLabels = ["Before · putty", "Primer going on", "First coat", "Second coat · done"];
const longestLabel = stageLabels.reduce((a, b) => (b.length > a.length ? b : a));

/** The shade the walls take: a soft sage green, Asian Paints Pepper Leaf 8386 (PaintDB hex). */
export const wallShade = { name: "Pepper Leaf", code: "Asian Paints 8386", hex: "#bbc8b2" };
const putty = "#cfc9bf";

/** The website's bottom padding on the pinned panel (pb-24), which clears the bottom nav 16px above the screen's edge. */
const NAV_PAD = 96;

export function PinnedReveal() {
  const { scrollY, viewport, headerHeight } = usePage();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { ref, onLayout, y } = useContentY();
  // A screen too tall to pin (the website's canvas-render case) or reduced motion: no runway, walls finished.
  const pinnable = !reduced && viewport > 0 && viewport < 1400;
  const panelHeight = viewport > 0 ? viewport - headerHeight : undefined;
  const trackHeight = pinnable ? viewport * 3 : panelHeight;

  const progress = useDerivedValue(() => {
    if (!pinnable) return 1;
    if (y.value < 0) return 0;
    return containProgress(screenTop(y.value, scrollY.value, headerHeight), viewport * 3, viewport);
  });
  const fill = useDerivedValue(() => reveal(progress.value).fill);
  const stage = useDerivedValue(() => reveal(progress.value).stage);

  // `position: sticky` under the header: the panel moves down its track as the page scrolls past it
  const pinned = useAnimatedStyle(() => {
    if (!pinnable || y.value < 0) return { transform: [{ translateY: 0 }] };
    const top = screenTop(y.value, scrollY.value, headerHeight);
    return { transform: [{ translateY: stickyOffset(top, headerHeight, viewport * 3, viewport - headerHeight) }] };
  });

  return (
    <View ref={ref} onLayout={onLayout} collapsable={false} testID="reveal-track" style={{ height: trackHeight }}>
      <Animated.View testID="reveal-panel" style={[styles.panel, { height: panelHeight, paddingBottom: NAV_PAD + Math.max(0, insets.bottom - 16) }, pinned]}>
        <Container style={styles.column}>
          <View>
            <Eyebrow size={11} style={styles.eyebrow}>
              How a wall changes
            </Eyebrow>
            <H size={30} leading={1.06} style={styles.heading}>
              Watch the colour <Em>go on.</Em>
            </H>
          </View>
          <Room fill={fill} stage={stage} />
          <View style={styles.stages}>
            {stages.map((s, i) => (
              <Stage key={s.title} index={i} title={s.title} stage={stage} />
            ))}
          </View>
          <View style={styles.progressRow}>
            <View style={styles.bar}>
              <Bar fill={fill} />
            </View>
            <Percent fill={fill} initial={pinnable ? Math.round(reveal(0).fill) : Math.round(reveal(1).fill)} />
          </View>
          <Text style={styles.caption}>
            Walls in {wallShade.name}, <Text style={styles.code}>{wallShade.code}</Text>
          </Text>
        </Container>
      </Animated.View>
    </View>
  );
}

/** The room: the photo, the putty above the wet edge and the shade below it, the edge itself and the stage sticker. */
function Room({ fill, stage }: { fill: SharedValue<number>; stage: SharedValue<number> }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  // the colour previews' Indian living room, its walls in bare primer white (bundled with the app)
  const photo = useImage(skiaSource(genericScene.image.src));
  const mask = useImage(skiaSource(genericScene.mask));
  const { width, height } = size;
  // The canvas mounts once the room has its size and both pictures have loaded, so its first frame is the
  // whole room (mounted empty at no size, it sometimes stayed blank after they arrived); until then the
  // room's sand fill shows, as under a loading Photo.
  const ready = photo !== null && mask !== null && width > 0 && height > 0;
  const before = useDerivedValue(() => ({ x: 0, y: 0, width, height: (height * (100 - fill.value)) / 100 }));
  const after = useDerivedValue(() => ({ x: 0, y: (height * (100 - fill.value)) / 100, width, height: (height * fill.value) / 100 }));
  const edge = useAnimatedStyle(() => {
    const f = fill.value;
    return { opacity: f > 1 && f < 99 ? 1 : 0, transform: [{ translateY: (height * (100 - f)) / 100 }] };
  });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w !== width || h !== height) setSize({ width: w, height: h });
  };

  return (
    <View style={styles.room}>
      <View
        style={styles.roomInner}
        onLayout={onLayout}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Living room with the walls being painted ${wallShade.name}`}
      >
        {ready && (
          <Canvas style={StyleSheet.absoluteFill} testID="reveal-canvas">
            <SkiaImage image={photo} x={0} y={0} width={width} height={height} fit="cover" />
            <Group clip={before} blendMode="multiply">
              <SkiaImage image={mask} x={0} y={0} width={width} height={height} fit="cover">
                <BlendColor color={putty} mode="srcIn" />
              </SkiaImage>
            </Group>
            <Group clip={after} blendMode="multiply">
              <SkiaImage image={mask} x={0} y={0} width={width} height={height} fit="cover">
                <BlendColor color={wallShade.hex} mode="srcIn" />
              </SkiaImage>
            </Group>
          </Canvas>
        )}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, edge]}>
          <View style={styles.edge} />
        </Animated.View>
        <View style={styles.sticker}>
          <Text aria-hidden style={[styles.stickerText, styles.invisible]}>
            {longestLabel}
          </Text>
          {stageLabels.map((l, i) => (
            <StickerLabel key={l} index={i} label={l} stage={stage} />
          ))}
        </View>
      </View>
    </View>
  );
}

function StickerLabel({ index, label, stage }: { index: number; label: string; stage: SharedValue<number> }) {
  const shown = useAnimatedStyle(() => ({ opacity: stage.value === index ? 1 : 0 }));
  return (
    <Animated.View style={[styles.stickerLabel, shown]}>
      <Text style={styles.stickerText}>{label}</Text>
    </Animated.View>
  );
}

function Stage({ index, title, stage }: { index: number; title: string; stage: SharedValue<number> }) {
  const number = useAnimatedStyle(() => ({ color: stageColours(index, stage.value).number }));
  const name = useAnimatedStyle(() => ({ color: stageColours(index, stage.value).title }));
  const rule = useAnimatedStyle(() => ({ opacity: stage.value === index ? 1 : 0 }));
  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.rule, rule]} />
      <Animated.Text style={[styles.stageNo, number]}>0{index + 1}</Animated.Text>
      <Animated.Text style={[styles.stageTitle, name]}>{title}</Animated.Text>
    </View>
  );
}

/**
 * The progress bar's fill, scaled across from the left (a transform: nothing is laid out again as it
 * grows, so the pinned panel moving with the scroll never waits on a layout pass, as an animated width would).
 */
function Bar({ fill }: { fill: SharedValue<number> }) {
  const grow = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value / 100 }] }));
  return <Animated.View testID="reveal-bar-fill" style={[styles.barFill, grow]} />;
}

/** `initial`: the fill before any scroll (finished when nothing pins); then the reaction follows the scroll. */
function Percent({ fill, initial }: { fill: SharedValue<number>; initial: number }) {
  // reading a shared value while rendering is not allowed, so the first value comes from the caller
  const [pct, setPct] = useState(initial);
  useAnimatedReaction(
    () => Math.round(fill.value),
    (now, before) => {
      if (now !== before) scheduleOnRN(setPct, now);
    },
  );
  return (
    <Text aria-hidden style={styles.pct}>
      {`${pct}%`}
    </Text>
  );
}

const styles = StyleSheet.create({
  panel: { paddingTop: 20 },
  column: { flex: 1 },
  eyebrow: { lineHeight: 16.5 },
  heading: { marginTop: 8 },
  room: { marginTop: 16, flex: 1, minHeight: 180, width: "100%", backgroundColor: "#d9d2c5", boxShadow: "0px 50px 90px -50px rgba(36, 37, 34, 0.5)" },
  roomInner: { flex: 1, overflow: "hidden", backgroundColor: "#d9d2c5" },
  edge: { height: 1, backgroundColor: "rgba(248, 245, 239, 0.9)", boxShadow: "0px 0px 20px 4px rgba(248, 245, 239, 0.5)" },
  sticker: { position: "absolute", left: 14, top: 14, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "rgba(248, 245, 239, 0.9)" },
  stickerLabel: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  stickerText: { fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 11, letterSpacing: 1.2, textTransform: "uppercase", color: colors.ink },
  invisible: { opacity: 0 },
  stages: { marginTop: 14, flexDirection: "row", gap: 8 },
  stage: { flex: 1, borderTopWidth: 2, borderColor: colors.line, paddingTop: 6, gap: 2 },
  rule: { position: "absolute", left: 0, right: 0, top: -2, height: 2, backgroundColor: colors.terracottaLight },
  stageNo: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 19.5, color: colors.terracotta },
  stageTitle: { fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 15, letterSpacing: -0.12, color: colors.ink },
  progressRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  bar: { flex: 1, height: 2, overflow: "hidden", backgroundColor: colors.lineSoft },
  barFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.terracottaLight, transformOrigin: "left" },
  pct: { minWidth: 36, textAlign: "right", fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 18, color: colors.muted2 },
  caption: { marginTop: 6, fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, color: colors.muted2 },
  code: { fontFamily: fonts.sansMedium },
});
