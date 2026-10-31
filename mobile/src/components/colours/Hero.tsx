import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { Container } from "~/components/site/Page";
import { Breadcrumbs } from "~/components/site/Sections";
import { H, P } from "~/components/ui/Text";
import { colors } from "~/theme";

// The colour pages' heroes: a washed band (sky-wash on the finder, cream-wash elsewhere) under a
// hairline, with the website's blurred colour glows (.glow: a disc blurred 70px) on the finder and
// palettes, the breadcrumbs, a serif h1, the muted intro and whatever follows (the colour tools).

/** How much of the glow's colour is left at each share of its radius: a 70px-blurred disc's falloff. */
const FALLOFF: [number, number][] = [
  [0, 0.93],
  [0.24, 0.88],
  [0.48, 0.5],
  [0.7, 0.15],
  [0.91, 0.02],
  [1, 0],
];
/** How far the blur spreads the disc beyond its edge. */
const SPREAD = 170;

type Place = { top?: number; right?: number; bottom?: number; left?: number | `${number}%` };

/** One .glow: a `size`px disc of `color` at `opacity`, placed like the website's absolutely positioned one, softened by a radial gradient. */
export function Glow({ color, size, opacity, place }: { color: string; size: number; opacity: number; place: Place }) {
  const box = size + SPREAD * 2;
  const id = `glow-${color.replace("#", "")}`;
  const at = (v: number | undefined) => (v === undefined ? undefined : v - SPREAD);
  return (
    <View
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        width: box,
        height: box,
        top: at(place.top),
        right: at(place.right),
        bottom: at(place.bottom),
        left: typeof place.left === "string" ? place.left : at(place.left),
        marginLeft: typeof place.left === "string" ? -SPREAD : undefined,
      }}
    >
      <Svg width={box} height={box}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            {FALLOFF.map(([offset, a]) => (
              <Stop key={offset} offset={offset} stopColor={color} stopOpacity={a * opacity} />
            ))}
          </RadialGradient>
        </Defs>
        <Circle cx={box / 2} cy={box / 2} r={box / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

type Props = {
  crumbs: { name: string; path: string }[];
  /** the h1 (left out while a screen's data loads) */
  title?: ReactNode;
  /** the finder and palettes: text-4xl/[1.05]; the shade cards: 40px/1.04 */
  titleSize?: number;
  titleLeading?: number;
  intro?: ReactNode;
  /** text-lg leading-relaxed (1.625) on the finder and palettes, leading-[1.65] on the shade cards */
  introLeading?: number;
  wash?: "sky" | "cream";
  glows?: { color: string; size: number; opacity: number; place: Place }[];
  children?: ReactNode;
};

export function ColourHero({ crumbs, title, titleSize = 36, titleLeading = 1.05, intro, introLeading = 1.625, wash = "cream", glows = [], children }: Props) {
  return (
    <View style={[styles.hero, { backgroundColor: wash === "sky" ? colors.sageWash : colors.creamWash }]}>
      {glows.map((g) => (
        <Glow key={g.color} {...g} />
      ))}
      <Container style={styles.inner}>
        <Breadcrumbs items={crumbs} />
        {title ? (
          <H size={titleSize} leading={titleLeading} style={styles.title}>
            {title}
          </H>
        ) : null}
        {typeof intro === "string" ? (
          <P size={18} leading={introLeading} color={colors.muted} style={styles.intro}>
            {intro}
          </P>
        ) : (
          intro
        )}
        {children}
      </Container>
    </View>
  );
}

/** The intro paragraph, for an intro with links or more than one paragraph. */
export function HeroText({ children, size = 18, leading = 1.625, first = true }: { children: ReactNode; size?: number; leading?: number; first?: boolean }) {
  return (
    <P size={size} leading={leading} color={colors.muted} style={first ? styles.intro : styles.introNext}>
      {children}
    </P>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: "hidden", borderBottomWidth: 1, borderColor: colors.line },
  inner: { paddingVertical: 48 },
  title: { marginTop: 20 },
  intro: { marginTop: 20 },
  introNext: { marginTop: 16 },
});
