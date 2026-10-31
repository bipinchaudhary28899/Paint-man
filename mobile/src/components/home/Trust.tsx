import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { Container } from "~/components/site/Page";
import { Card } from "~/components/ui/Bits";
import { Photo } from "~/components/ui/Media";
import { Reveal } from "~/components/ui/Reveal";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { images, promises, site } from "~/shared";
import { colors, fonts, gutter, radii } from "~/theme";

// Why Paint Saathi, in one section: "Painting, without the project management" with the one-contact line,
// the years we have been painting (site.yearsPainting) in a hairline row, the "Hum sirf paint nahi karte.
// We diagnose first." panel (the weathered wall, what the inspector reads, the four checks), then the six
// promises as a two-column grid of short tiles, each block rising in as it scrolls into view. Only what
// the owner states: no ratings, counts or badges.

/** What the inspection checks (the website's Diagnose section). */
export const checks = ["Moisture reading", "Crack mapping", "Old-paint adhesion", "Wall measurement"];

/** The first sentence of a piece of copy (a promise's one line on its tile), or all of it when it is one sentence. */
export function firstSentence(text: string): string {
  return text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;
}

const TILE_GAP = 10;

export function Trust() {
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - 2 * gutter - TILE_GAP) / 2);
  const years = site.yearsPainting;
  return (
    <Container style={styles.section}>
      <Reveal>
        <Eyebrow size={11} style={styles.eyebrow}>
          The {site.name} way
        </Eyebrow>
        <H size={30} leading={1.08} style={styles.mt12}>
          Painting, <Em>without</Em> the project management.
        </H>
        <P size={15} leading={1.6} color={colors.muted} style={styles.mt12}>
          Sab kuch ek hi jagah se. You deal with us, not with painters, paint shops and suppliers separately.
        </P>

        <View style={styles.years}>
          <Text style={styles.yearsFigure}>
            {years} <Text style={styles.yearsWord}>saal</Text>
          </Text>
          <P size={13} leading={1.5} color={colors.inkSoft} style={styles.yearsText}>
            Hum naye nahi hain: painting homes for {years} years, and now you can book us online.
          </P>
        </View>
      </Reveal>

      <Reveal style={styles.panel}>
        <View style={styles.panelInner}>
          <Photo image={images.weatheredWall} position={{ left: "62%", bottom: 0 }} style={styles.wall} />
          <View style={styles.panelBody}>
            <P size={15} leading={1.5} color={colors.muted}>
              Hum sirf paint nahi karte.
            </P>
            <H size={28} leading={1.05} tracking={-0.02} style={styles.mt4}>
              We <Em style={styles.onSand}>diagnose</Em> first.
            </H>
            <P size={14} leading={1.6} color={colors.inkSoft} style={styles.mt12}>
              Before anyone opens a tin, our inspector reads the wall: moisture, hairline cracks, flaking and old paint that won&apos;t hold. What we find goes on
              your quotation as separate lines, so you pay for repairs you can see, and never for surprises.
            </P>
            <View style={styles.checks} accessibilityLabel="What the inspection checks">
              {checks.map((c) => (
                <View key={c} style={styles.check}>
                  <Text style={styles.checkText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Reveal>

      <Reveal>
        <Text style={styles.label}>What you can count on</Text>
        <View style={styles.grid}>
          {promises.map((p, i) => (
            <Card key={p.title} radius={radii.lg} style={[styles.tile, { width: tile }]}>
              <View style={styles.no}>
                <Text style={styles.noText}>{String(i + 1).padStart(2, "0")}</Text>
              </View>
              <H size={17} leading={1.18}>
                {p.title}
              </H>
              <P size={13} leading={1.5} color={colors.muted}>
                {firstSentence(p.text)}
              </P>
            </Card>
          ))}
        </View>
      </Reveal>
    </Container>
  );
}

const styles = StyleSheet.create({
  // the accent on the sand panel: terracotta-light there is 2.66:1, terracotta 3.79:1 (large text needs 3:1)
  onSand: { color: colors.terracotta },
  section: { paddingBottom: 56 },
  eyebrow: { lineHeight: 16.5 },
  mt4: { marginTop: 4 },
  mt12: { marginTop: 12 },
  years: { marginTop: 20, flexDirection: "row", alignItems: "center", gap: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 14 },
  yearsFigure: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, letterSpacing: -0.8, color: colors.ink },
  yearsWord: { fontFamily: fonts.serifItalic, color: colors.terracottaLight },
  yearsText: { flex: 1 },
  panel: { marginTop: 20 },
  panelInner: { overflow: "hidden", borderRadius: radii.xl, backgroundColor: colors.sand },
  wall: { height: 140 },
  panelBody: { padding: 20 },
  checks: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  check: { borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "rgba(248, 245, 239, 0.9)", borderWidth: 1, borderColor: colors.lineSoft },
  checkText: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18, color: colors.ink },
  label: { marginTop: 28, fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 16.5, letterSpacing: 1.32, textTransform: "uppercase", color: colors.muted2 },
  grid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: TILE_GAP },
  tile: { padding: 14, gap: 8 },
  no: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.creamWash, alignItems: "center", justifyContent: "center" },
  noText: { fontFamily: fonts.serif, fontSize: 12, color: colors.terracotta },
});
