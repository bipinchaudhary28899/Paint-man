import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";

import { Container } from "~/components/site/Page";
import { Button } from "~/components/ui/Button";
import { LinkArrow } from "~/components/ui/Bits";
import { Em, Eyebrow, H, MAX_SCALE, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { areaSlug, cities, cityPath, liveCities, liveCityNames, type City } from "~/shared";
import { colors, fonts, radii } from "~/theme";

// "Where we paint": the live cities as a switch, and one card for the chosen city: its name and
// region, how many localities a supervisor covers there, those localities in two columns (each opens
// its entry on the city page), and two actions (book in that city, see the city's page). Under it the
// website's "Mohalla list mein nahi hai?" line and the cities coming next. One city at a time, so the
// section stays a screen tall however many localities there are.

/** The first sentence of a city's intro ("Interior, exterior and rental painting across 10 localities of Agra, …"). */
export const firstSentence = (text: string) => {
  const end = text.search(/[.!?](\s|$)/);
  return end < 0 ? text : text.slice(0, end + 1);
};

/** A city's localities as link rows in two columns, each opening its entry on the city page. */
export function AreaLinks({ city }: { city: City }) {
  return (
    <View style={styles.areas}>
      {city.areas.map((a) => (
        <Pressable
          key={a}
          accessibilityRole="link"
          accessibilityLabel={`Painters in ${a}`}
          onPress={() => openHref(`${cityPath(city)}#${areaSlug(a)}`)}
          style={({ pressed }) => [styles.area, pressed && styles.areaPressed]}
        >
          <View style={styles.dot} />
          <Text style={styles.areaText} numberOfLines={1}>
            {a}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The switch between live cities: a sand track with the chosen city filled ink. */
function CitySwitch({ live, chosen, onChoose }: { live: readonly City[]; chosen: string; onChoose: (slug: string) => void }) {
  return (
    <View style={styles.track} accessibilityRole="tablist" accessibilityLabel="Cities">
      {live.map((c) => {
        const on = c.slug === chosen;
        return (
          <Pressable
            key={c.slug}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChoose(c.slug)}
            style={[styles.tab, on && styles.tabOn]}
          >
            <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE.fixed}>
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CityCard({ city }: { city: City }) {
  return (
    <Animated.View key={city.slug} entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)} style={styles.card} testID={`areas-card-${city.slug}`}>
      <View style={styles.cardHead}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={styles.city}>
            {city.name}
          </Text>
          <Text style={styles.meta}>
            {city.areas.length} localities · {city.region}
          </Text>
        </View>
        <View style={styles.status}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText} maxFontSizeMultiplier={MAX_SCALE.fixed}>
            Now painting
          </Text>
        </View>
      </View>
      <P size={14} leading={1.55} color={colors.muted} style={styles.intro}>
        {firstSentence(city.intro)}
      </P>
      <AreaLinks city={city} />
      <View style={styles.actions}>
        <Button label={`Book in ${city.name}`} small accessibilityRole="link" onPress={() => openHref(`${cityPath(city)}#book-visit`)} style={styles.book} />
        <LinkArrow label={`See painting in ${city.name}`} onPress={() => openHref(cityPath(city))} />
      </View>
    </Animated.View>
  );
}

export function AreasSection() {
  const live = liveCities();
  const [chosen, setChosen] = useState(live[0]?.slug ?? "");
  const city = live.find((c) => c.slug === chosen) ?? live[0];
  const soon = cities.filter((c) => c.status !== "live").map((c) => c.name);
  if (!city) return null;
  return (
    <Container style={styles.section}>
      <Eyebrow size={11}>Where we paint</Eyebrow>
      <H size={30} leading={1.08} style={styles.heading} accessibilityLabel={`Painting homes across ${liveCityNames()}`}>
        Painting <Em>homes</Em> across {liveCityNames()}
      </H>

      {live.length > 1 && <CitySwitch live={live} chosen={city.slug} onChoose={setChosen} />}
      <CityCard city={city} />

      <View style={styles.footnote}>
        <P size={14} leading={1.55} color={colors.inkSoft}>
          <Text style={styles.footnoteLead}>Mohalla list mein nahi hai? </Text>
          If you need painters outside these localities, ask. We&apos;ll tell you honestly if we can supervise your job.
        </P>
        <LinkArrow label="Ask us" onPress={() => openHref("/contact")} style={styles.ask} color={colors.terracotta} />
      </View>
      {soon.length > 0 && (
        <Text style={styles.soon}>
          Coming next: {soon.length > 1 ? `${soon.slice(0, -1).join(", ")} and ${soon[soon.length - 1]}` : soon[0]}
        </Text>
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 56, paddingBottom: 56 },
  flex: { flex: 1, minWidth: 0 },
  heading: { marginTop: 10 },
  track: { marginTop: 20, flexDirection: "row", padding: 4, gap: 4, borderRadius: radii.pill, backgroundColor: colors.sand },
  tab: { flex: 1, minHeight: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  tabOn: { backgroundColor: colors.ink, boxShadow: "0px 6px 14px -8px rgba(36, 37, 34, 0.6)" },
  tabText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  tabTextOn: { color: colors.onInk },
  card: {
    marginTop: 14,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    backgroundColor: colors.paper,
    padding: 20,
    boxShadow: "0px 28px 50px -34px rgba(36, 37, 34, 0.45)",
  },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  city: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 34, letterSpacing: -0.45, color: colors.ink },
  meta: { marginTop: 2, fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18, color: colors.muted },
  status: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radii.pill, backgroundColor: colors.sageWash, paddingVertical: 6, paddingHorizontal: 10 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.fern },
  // fern on the sage wash is 4.78:1 (deep sage was 4.44:1, under the 4.5 body text needs)
  statusText: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.fern },
  intro: { marginTop: 12 },
  areas: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderColor: colors.line },
  area: { width: "50%", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingRight: 8, borderBottomWidth: 1, borderColor: colors.line },
  areaPressed: { opacity: 0.6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.terracotta },
  areaText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  actions: { marginTop: 18, flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 16, rowGap: 6 },
  book: { paddingHorizontal: 22 },
  footnote: { marginTop: 20, borderRadius: radii.lg, backgroundColor: colors.creamWash, padding: 16 },
  footnoteLead: { fontFamily: fonts.sansSemiBold, color: colors.ink },
  ask: { marginTop: 2 },
  soon: { marginTop: 14, fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 18, color: colors.muted },
});
