import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button } from "~/components/Button";
import { Card } from "~/components/Card";
import { ContactActions } from "~/components/ContactActions";
import { CityCards, ServiceTiles } from "~/components/Directory";
import { FaqList } from "~/components/FaqList";
import { PointList, StepList } from "~/components/Lists";
import { Art, Photo, Wordmark } from "~/components/Media";
import { Screen, Section } from "~/components/Screen";
import { Accent, Body, Eyebrow, Heading, Muted, Strong } from "~/components/Text";
import { cities, generalFaqs, illustrations, images, liveCityNames, promises, services, site, workFlow } from "~/shared";

const openService = (slug: string) => router.navigate({ pathname: "/services/[slug]", params: { slug } });
const openCity = (slug: string) => router.navigate({ pathname: "/services/city/[slug]", params: { slug } });
const book = () => router.navigate("/book");

export default function Home() {
  return (
    <Screen testID="home">
      <Wordmark />

      <Section>
        <Eyebrow>Book house painters online</Eyebrow>
        <Heading level={1} style={styles.h1}>
          Your space, painted beautifully. Managed <Accent>completely.</Accent>
        </Heading>
        <Body style={styles.intro}>
          Ek deewar ho ya poora ghar: a single wall, a door, windows and grills, or the whole house, just tell us what needs paint. We inspect, quote line by line, bring
          genuine branded paint and a supervised crew, and hand back a spotless home.{" "}
          <Strong>{site.yearsPainting} saal se gharon ko rang rahe hain, ab online bhi.</Strong> Now painting in {liveCityNames()}.
        </Body>
        <View style={styles.actions}>
          <Button label="Book a free inspection" onPress={book} />
          <Button label="Find a shade" variant="secondary" onPress={() => router.navigate("/colours")} />
        </View>
        <Card tone="chalk" style={styles.artPanel}>
          <Art art={illustrations.paintBrands} />
        </Card>
        <ContactActions />
      </Section>

      <Section>
        <Heading>
          What you can <Accent>count on</Accent>
        </Heading>
        <View style={styles.block}>
          <PointList points={promises} />
        </View>
      </Section>

      <Section>
        <Photo image={images.weatheredWall} aspectRatio={4 / 3} />
        <Muted style={styles.kicker}>Hum sirf paint nahi karte.</Muted>
        <Heading>
          We diagnose <Accent>first.</Accent>
        </Heading>
        <Body style={styles.block}>
          Before anyone opens a tin, our inspector reads the wall: moisture, hairline cracks, flaking and old paint that won't hold. What we find goes on your quotation as
          separate lines, so you pay for repairs you can see, and never for surprises.
        </Body>
      </Section>

      <Section>
        <Heading>
          Every wall in the <Accent>house.</Accent>
        </Heading>
        <Body style={styles.block}>Andar ho ya bahar: house painting inside and out, and quick repaints of rental homes, each starting with an on-site inspection and an itemised quote.</Body>
        <View style={styles.block}>
          <ServiceTiles services={services} onOpen={openService} />
        </View>
      </Section>

      <Section>
        <Heading>
          How the work <Accent>gets done</Accent>
        </Heading>
        <View style={styles.block}>
          <StepList steps={workFlow} />
        </View>
      </Section>

      <Section>
        <Heading>
          Where we <Accent>paint</Accent>
        </Heading>
        <View style={styles.block}>
          <CityCards cities={cities} onOpen={openCity} />
        </View>
      </Section>

      <Section>
        <Heading>
          Good <Accent>questions.</Accent>
        </Heading>
        <View style={styles.block}>
          <FaqList items={generalFaqs} />
        </View>
      </Section>

      <Section>
        <Card tone="sand" style={styles.closing}>
          <Art art={illustrations.painter} style={styles.painter} />
          <Heading>
            Aap ready, hum <Accent>ready.</Accent>
          </Heading>
          <Body style={styles.block}>A free inspection and a full, itemised estimate before any work starts. Zero advance payment.</Body>
          <Button label="Book a free inspection" onPress={book} style={styles.block} />
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { marginTop: 14 },
  intro: { marginTop: 16 },
  actions: { marginTop: 22, gap: 10 },
  artPanel: { marginTop: 24, marginBottom: 16, padding: 12 },
  block: { marginTop: 16 },
  kicker: { marginTop: 18, fontSize: 17 },
  closing: { padding: 22 },
  painter: { width: "70%", alignSelf: "center", marginBottom: 12 },
});
