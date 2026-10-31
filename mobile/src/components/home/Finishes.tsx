import { Canvas, Group, Image as SkiaImage, Path, useImage } from "@shopify/react-native-skia";
import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { useDerivedValue, useReducedMotion, useSharedValue, type SharedValue } from "react-native-reanimated";

import { usePage } from "~/components/site/Page";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { colors, gutter } from "~/theme";
import { COLLAGE_ASPECT, collageHeight, collageTiles, pieceBox, shapePath, tileBox } from "./collage";
import { coverProgress, riseIn, screenTop } from "./motion";
import { coverRect, skiaSource } from "./pictures";
import { useContentY } from "./useContentY";

// "The finish we work to" on phones (src/components/home/Finishes.tsx): example photos of painting in
// India cut into shapes that fill one rectangle (collage.ts), drawn with Skia clip paths. Scrolling it
// in raises the tiles in the wave's order, as the website's view timelines do; off under reduced motion.
// The website's hover wave and zoom need a pointer, so phones never see them.

type Tile = (typeof collageTiles)[number];
type Piece = Tile["pieces"][number];

export function Finishes() {
  const { scrollY, viewport, headerHeight } = usePage();
  const reduced = useReducedMotion();
  const { ref, onLayout, y } = useContentY();
  const [width, setWidth] = useState(0);
  // the collage's top inside the section
  const offset = useSharedValue(0);
  const onCollageLayout = (e: LayoutChangeEvent) => {
    offset.value = e.nativeEvent.layout.y;
    setWidth(e.nativeEvent.layout.width);
  };
  const motion = { scrollY, viewport, headerHeight, y, offset, animate: !reduced };

  return (
    <View ref={ref} onLayout={onLayout} collapsable={false} testID="finishes" style={styles.section}>
      <Eyebrow size={11} style={styles.eyebrow}>
        Finishes
      </Eyebrow>
      <H size={30} leading={1.06} style={styles.heading}>
        The finish we <Em>work to.</Em>
      </H>
      <P size={14} leading={1.55} color={colors.muted} style={styles.text}>
        Rang, roller aur mehnat: example photos of painting across India. Photos of our own jobs are added as each one is handed over.
      </P>
      <View style={styles.collage} onLayout={onCollageLayout} testID="collage">
        {width > 0 && (
          <>
            <Canvas style={{ width, height: collageHeight(width) }}>
              {collageTiles.map((t) => (
                <CollageTile key={t.pieces[0].image.src} tile={t} width={width} motion={motion} />
              ))}
            </Canvas>
            <View accessibilityLabel="Example photos of painting in India" style={StyleSheet.absoluteFill}>
              {collageTiles.flatMap((t) => {
                const box = tileBox(t, width);
                return t.pieces.map((p) => {
                  const inner = pieceBox(p.shape, box.width, box.height);
                  return (
                    <View
                      key={p.image.src}
                      accessible
                      accessibilityRole="image"
                      accessibilityLabel={p.image.alt}
                      style={[styles.label, { left: box.x + inner.x, top: box.y + inner.y, width: inner.width, height: inner.height }]}
                    />
                  );
                });
              })}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

type Motion = { scrollY: SharedValue<number>; viewport: number; headerHeight: number; y: SharedValue<number>; offset: SharedValue<number>; animate: boolean };

function CollageTile({ tile, width, motion }: { tile: Tile; width: number; motion: Motion }) {
  const box = tileBox(tile, width);
  const { scrollY, viewport, headerHeight, y, offset, animate } = motion;
  const rise = useDerivedValue(() => {
    if (!animate || y.value < 0) return { opacity: 1, translateY: 0 };
    const top = screenTop(y.value + offset.value + box.y, scrollY.value, headerHeight);
    return riseIn(coverProgress(top, box.height, viewport), tile.wave);
  });
  const opacity = useDerivedValue(() => rise.value.opacity);
  const transform = useDerivedValue(() => [{ translateX: box.x }, { translateY: box.y + rise.value.translateY }]);
  return (
    <Group transform={transform} opacity={opacity}>
      {tile.pieces.map((p) => (
        <CollagePiece key={p.image.src} piece={p} width={box.width} height={box.height} />
      ))}
    </Group>
  );
}

function CollagePiece({ piece, width, height }: { piece: Piece; width: number; height: number }) {
  // fetched at the size it is drawn (the tile box, in points)
  const image = useImage(skiaSource(piece.image.src, width));
  const path = shapePath(piece.shape, width, height);
  const inner = pieceBox(piece.shape, width, height);
  // bg-sand until the photo arrives
  if (!image) return <Path path={path} color={colors.sand} />;
  const rect = coverRect(image.width(), image.height(), inner, piece.position);
  return (
    <Group clip={path}>
      <SkiaImage image={image} x={rect.x} y={rect.y} width={rect.width} height={rect.height} fit="fill" />
    </Group>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: gutter, paddingBottom: 56 },
  eyebrow: { lineHeight: 16.5 },
  heading: { marginTop: 12 },
  text: { marginTop: 10 },
  collage: { marginTop: 20, width: "100%", aspectRatio: COLLAGE_ASPECT },
  label: { position: "absolute" },
});
