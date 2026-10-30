import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { CityCards, ServiceList } from "~/components/Directory";
import { Screen, Section } from "~/components/Screen";
import { Accent, Body, Heading } from "~/components/Text";
import { cities, liveCityNames, services } from "~/shared";

export default function Services() {
  return (
    <Screen testID="services">
      <Heading level={1}>
        Painting <Accent>services</Accent>
      </Heading>
      <Body style={styles.intro}>
        Interiors, exteriors and rental repaints in {liveCityNames()}. Every job starts with an on-site inspection and an itemised quotation, and nothing is booked until you
        approve it.
      </Body>
      <View style={styles.block}>
        <ServiceList services={services} onOpen={(slug) => router.push({ pathname: "/services/[slug]", params: { slug } })} />
      </View>

      <Section>
        <Heading>
          Where we <Accent>work</Accent>
        </Heading>
        <View style={styles.block}>
          <CityCards cities={cities} onOpen={(slug) => router.push({ pathname: "/services/city/[slug]", params: { slug } })} />
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 14 },
  block: { marginTop: 20 },
});
