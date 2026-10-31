import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { Container, usePage } from "~/components/site/Page";
import { Button } from "~/components/ui/Button";
import { Art } from "~/components/ui/Media";
import { Em, Eyebrow, H, P, Strong } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { illustrations, liveCities, liveCityNames, site } from "~/shared";
import { colors, fonts } from "~/theme";

// The home hero, laid out for a phone's first screen (everything that matters shows under the header
// at 393×852 without scrolling): the live cities as the eyebrow, the headline (the page's one heading)
// with its accent word, one line of copy with the Hinglish "saal se … ab online bhi", a full-width
// "Book a free inspection" that glides to the booking card (#book-visit), a quieter "Explore colours",
// the three facts in a hairline row, and the paint-brands picture across the screen at the bottom of the
// hero, its edges fading into the canvas (the website's CSS mask, drawn as canvas-coloured fades).

const facts = [
  ["Payment", "Zero advance"],
  ["Estimate", "Full, before work starts"],
  ["Work", "Timed and documented"],
] as const;

const clear = "rgba(248, 245, 239, 0)";

export function Hero() {
  const { scrollTo } = usePage();
  const cities = liveCities().map((c) => c.name);
  return (
    <View style={styles.hero}>
      <Container>
        <Eyebrow size={11} style={styles.eyebrow} accessibilityLabel={`Now painting in ${liveCityNames()}`}>
          Now painting in {cities.join(" · ")}
        </Eyebrow>
        <H size={36} leading={1.04} tracking={-0.02} style={styles.title}>
          Your space, painted beautifully. Managed <Em>completely.</Em>
        </H>
        <P size={15} leading={1.55} color={colors.muted} style={styles.intro}>
          Ek deewar ho ya poora ghar, just tell us what needs paint. <Strong>{site.yearsPainting} saal se gharon ko rang rahe hain, ab online bhi.</Strong>
        </P>
        <Button label="Book a free inspection" large height={56} onPress={() => scrollTo("book-visit")} style={styles.book} />
        <Button label="Explore colours" variant="secondary" accessibilityRole="link" onPress={() => openHref("/colours")} style={styles.explore} />
        <View style={styles.facts}>
          {facts.map(([k, v], i) => (
            <View key={k} accessible accessibilityLabel={`${k}: ${v}`} style={[styles.fact, i > 0 && styles.factRule]}>
              <Text style={styles.factKey}>{k}</Text>
              <Text style={styles.factValue}>{v}</Text>
            </View>
          ))}
        </View>
      </Container>
      <View style={styles.art}>
        <Art art={illustrations.paintBrands} />
        <LinearGradient pointerEvents="none" colors={[colors.canvas, clear]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fade, styles.fadeLeft]} />
        <LinearGradient pointerEvents="none" colors={[clear, colors.canvas]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fade, styles.fadeRight]} />
        <LinearGradient pointerEvents="none" colors={[colors.canvas, clear]} style={[styles.fade, styles.fadeTop]} />
        <LinearGradient pointerEvents="none" colors={[clear, colors.canvas]} style={[styles.fade, styles.fadeBottom]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 20, paddingBottom: 8 },
  eyebrow: { lineHeight: 16, letterSpacing: 1.4 },
  title: { marginTop: 12 },
  intro: { marginTop: 12 },
  book: { marginTop: 20 },
  explore: { marginTop: 10 },
  facts: { marginTop: 12, flexDirection: "row", borderTopWidth: 1, borderColor: colors.line, paddingTop: 14 },
  fact: { flex: 1, minWidth: 0, paddingRight: 10 },
  factRule: { borderLeftWidth: 1, borderColor: colors.line, paddingLeft: 12 },
  factKey: { fontFamily: fonts.sansSemiBold, fontSize: 10, lineHeight: 14, letterSpacing: 1.2, textTransform: "uppercase", color: colors.muted },
  factValue: { marginTop: 3, fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 17, letterSpacing: -0.08, color: colors.ink },
  // outside the container, so the picture runs edge to edge
  art: { marginTop: 12 },
  fade: { position: "absolute" },
  fadeLeft: { left: 0, top: 0, bottom: 0, width: "7%" },
  fadeRight: { right: 0, top: 0, bottom: 0, width: "7%" },
  fadeTop: { left: 0, right: 0, top: 0, height: "22%" },
  fadeBottom: { left: 0, right: 0, bottom: 0, height: "12%" },
});
