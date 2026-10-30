import { router, Stack, useLocalSearchParams } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";

import { Button } from "~/components/Button";
import { ServiceList } from "~/components/Directory";
import { PointList } from "~/components/Lists";
import { Screen, Section } from "~/components/Screen";
import { Accent, Body, Eyebrow, Heading } from "~/components/Text";
import { webUrl } from "~/lib/config";
import { getCity, servicesIn, site } from "~/shared";
import { colors, fonts, radii } from "~/theme";

// A city: for a live one its localities, weather notes and services; for one coming soon, the
// waitlist (on the website, which takes the request).
export default function CityScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const city = getCity(slug);

  if (!city) {
    return (
      <Screen underHeader>
        <Heading level={1}>
          City not <Accent>found</Accent>
        </Heading>
        <Button label="See where we paint" onPress={() => router.navigate("/services")} style={styles.block} />
      </Screen>
    );
  }

  if (city.status !== "live") {
    return (
      <Screen underHeader testID="city-soon">
        <Stack.Screen options={{ title: city.name }} />
        <Eyebrow>Coming soon</Eyebrow>
        <Heading level={1} style={styles.h1}>
          {site.name} is coming to <Accent>{city.name}</Accent>
        </Heading>
        <Body style={styles.block}>{city.intro}</Body>
        <Button
          label="Join the waitlist on our website"
          onPress={() => void Linking.openURL(webUrl(`/services/house-painting/${city.slug}`))}
          style={styles.block}
        />
      </Screen>
    );
  }

  const book = () => router.navigate({ pathname: "/book", params: { city: city.slug } });

  return (
    <Screen underHeader testID="city">
      <Stack.Screen options={{ title: city.name }} />
      <Eyebrow>{city.region}</Eyebrow>
      <Heading level={1} style={styles.h1}>
        House painting services in <Accent>{city.name}</Accent>
      </Heading>
      <Body style={styles.block}>{city.intro}</Body>
      <Button label={`Book an inspection in ${city.name}`} onPress={book} style={styles.block} />

      <Section>
        <Heading>
          Localities we <Accent>serve</Accent>
        </Heading>
        <View style={styles.areas}>
          {city.areas.map((a) => (
            <Text key={a} style={styles.area}>
              {a}
            </Text>
          ))}
        </View>
        <Body style={styles.block}>Not on the list? Book anyway and we will confirm whether we can reach you.</Body>
      </Section>

      {city.weather.length > 0 && (
        <Section>
          <Heading>
            Weather and <Accent>walls</Accent>
          </Heading>
          <View style={styles.block}>
            <PointList points={city.weather} />
          </View>
        </Section>
      )}

      <Section>
        <Heading>
          Services in <Accent>{city.name}</Accent>
        </Heading>
        <View style={styles.block}>
          <ServiceList services={servicesIn(city)} onOpen={(s) => router.push({ pathname: "/services/[slug]", params: { slug: s } })} />
        </View>
        <Button label={`Book an inspection in ${city.name}`} onPress={book} style={styles.cta} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { marginTop: 10 },
  block: { marginTop: 16 },
  cta: { marginTop: 28 },
  areas: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  area: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    overflow: "hidden",
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.ink,
  },
});
