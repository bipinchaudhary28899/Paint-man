import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Button } from "~/components/Button";
import { Chip } from "~/components/Chip";
import { FaqList } from "~/components/FaqList";
import { DashList, PointList, StepList } from "~/components/Lists";
import { Photo } from "~/components/Media";
import { Screen, Section } from "~/components/Screen";
import { Accent, AccentLast, Body, Heading } from "~/components/Text";
import { getService, liveCities } from "~/shared";
import { gutter } from "~/theme";

// One service: the hub copy true in every city, and a city's own notes and questions when one is picked.
export default function ServiceScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const service = getService(slug);
  const [citySlug, setCitySlug] = useState<string>();

  if (!service) {
    return (
      <Screen underHeader>
        <Heading level={1}>
          Service not <Accent>found</Accent>
        </Heading>
        <Button label="See all services" onPress={() => router.navigate("/services")} style={styles.block} />
      </Screen>
    );
  }

  const cities = liveCities().filter((c) => c.slug in service.local);
  const city = cities.find((c) => c.slug === citySlug);
  const local = city ? service.local[city.slug] : undefined;
  const book = () => router.navigate({ pathname: "/book", params: { service: service.leadService, ...(city && { city: city.slug }) } });

  return (
    <Screen underHeader testID="service">
      <Stack.Screen options={{ title: service.shortName }} />
      <View style={styles.bleed}>
        <Photo image={service.image} aspectRatio={3 / 2} />
      </View>
      <Heading level={1} style={styles.h1}>
        <AccentLast text={city ? `${service.title} in ${city.name}` : service.title} />
      </Heading>

      {cities.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBleed} contentContainerStyle={styles.chips}>
          <Chip label="Every city" selected={!city} onPress={() => setCitySlug(undefined)} />
          {cities.map((c) => (
            <Chip key={c.slug} label={c.name} selected={city?.slug === c.slug} onPress={() => setCitySlug(c.slug)} />
          ))}
        </ScrollView>
      )}

      <Body style={styles.block}>{local ? local.intro : service.intro}</Body>
      <Button label={`Book ${service.shortName.toLowerCase()} painting`} onPress={book} style={styles.block} />

      {local && local.notes.length > 0 && (
        <Section>
          <Heading>
            Painting in <Accent>{city!.name}</Accent>
          </Heading>
          <View style={styles.block}>
            <PointList points={local.notes} />
          </View>
        </Section>
      )}

      <Section>
        <Heading>
          What's <Accent>included</Accent>
        </Heading>
        <View style={styles.block}>
          <DashList items={service.includes} />
        </View>
        <Heading level={3} style={styles.sub}>
          Suitable for
        </Heading>
        <View style={styles.block}>
          <DashList items={service.suitableFor} />
        </View>
      </Section>

      <Section>
        <Heading>
          How the job <Accent>runs</Accent>
        </Heading>
        <View style={styles.block}>
          <StepList steps={service.process.map((p) => ({ title: p.step, text: p.detail }))} />
        </View>
      </Section>

      <Section>
        <Heading>
          Preparation and <Accent>paint</Accent>
        </Heading>
        <View style={styles.block}>
          <PointList points={service.paintSystem} />
        </View>
      </Section>

      <Section>
        <Heading>
          What moves the <Accent>price</Accent>
        </Heading>
        <View style={styles.block}>
          <PointList points={service.costFactors} />
        </View>
      </Section>

      <Section>
        <Heading>
          How long it <Accent>takes</Accent>
        </Heading>
        {service.timeline.map((p) => (
          <Body key={p} style={styles.block}>
            {p}
          </Body>
        ))}
        <Heading level={3} style={styles.sub}>
          Aftercare
        </Heading>
        <View style={styles.block}>
          <DashList items={service.aftercare} />
        </View>
      </Section>

      <Section>
        <Heading>
          Common <Accent>questions</Accent>
        </Heading>
        <View style={styles.block}>
          <FaqList items={[...(local?.faqs ?? []), ...service.faqs]} />
        </View>
        <Button label={`Book ${service.shortName.toLowerCase()} painting`} onPress={book} style={styles.cta} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -gutter, marginTop: -12 },
  h1: { marginTop: 20 },
  chipBleed: { marginHorizontal: -gutter, marginTop: 16 },
  chips: { paddingHorizontal: gutter, gap: 8 },
  block: { marginTop: 16 },
  sub: { marginTop: 28 },
  cta: { marginTop: 24 },
});
