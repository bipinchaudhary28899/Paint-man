import { Pressable, StyleSheet, Text, View } from "react-native";

import { Container } from "~/components/site/Page";
import { H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { areaSlug, cityPath, liveCities, liveCityNames, type City } from "~/shared";
import { colors, fonts } from "~/theme";

// "Painting homes across Agra, Mathura and Vrindavan" on phones (src/components/home/AreasSection.tsx
// and AreaLinks.tsx): each live city's name (a link to its page) over its localities as chips, each
// opening that locality on the city page. Phones show "Painters in" once above the lists; every chip
// still carries it for screen readers.

/** A city's locality chips, each linking to its entry on the city page (/services/house-painting/<city>#<area>). */
export function AreaLinks({ city }: { city: City }) {
  return (
    <View style={styles.chips}>
      {city.areas.map((a) => (
        <Pressable
          key={a}
          accessibilityRole="link"
          accessibilityLabel={`Painters in ${a}`}
          onPress={() => openHref(`${cityPath(city)}#${areaSlug(a)}`)}
          style={styles.chip}
        >
          <Text style={styles.chipText}>{a}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function AreasSection() {
  return (
    <Container style={styles.section}>
      <View style={styles.rule}>
        <H size={26} leading={1.12}>
          Painting homes across {liveCityNames()}
        </H>
        <P size={14} leading={1.55} color={colors.muted} style={styles.text}>
          Mohalla list mein nahi hai? If you need painters outside these localities, ask. We&apos;ll tell you honestly if we can supervise your job.
        </P>
        <Text aria-hidden style={styles.label}>
          Painters in
        </Text>
        <View style={styles.cities}>
          {liveCities().map((c) => (
            <View key={c.slug}>
              <Text accessibilityRole="header" style={styles.city}>
                <Text accessibilityRole="link" onPress={() => openHref(cityPath(c))}>
                  {c.name}
                </Text>
              </Text>
              <AreaLinks city={c} />
            </View>
          ))}
        </View>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  section: { paddingBottom: 56 },
  rule: { borderTopWidth: 1, borderColor: colors.line, paddingTop: 36 },
  text: { marginTop: 10 },
  label: { marginTop: 18, fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 16.5, letterSpacing: 1.32, textTransform: "uppercase", color: colors.muted2 },
  cities: { marginTop: 4, gap: 24 },
  city: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 27.5, letterSpacing: -0.33, color: colors.ink },
  chips: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 46, justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 16 },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 21, letterSpacing: -0.08, color: colors.ink },
});
