import { Pressable, StyleSheet, Text, View } from "react-native";

import { CtaBanner, PageHero } from "~/components/site/Sections";
import { RevealContainer } from "~/components/ui/Reveal";
import { Em, H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { cities, images, liveCities, servicePath, servicesIn } from "~/shared";
import { colors, fonts } from "~/theme";
import { chip, LiveCityLinks, TextLink } from "./bits";
import { ServiceCarousel } from "./ServiceCarousel";

// /services on a phone (src/app/(site)/services/page.tsx): the hero, every service as a swipe row of
// cards (photo with its sticker, name, one line, "View service" and "Book site visit"), each live city
// with its service pages as chips, then three short notes on colours, price and where we work, and the
// closing banner.

/** Each live city with a chip per service it has a page for (/services/<service>/<city>). */
function ServicesByCity() {
  return (
    <RevealContainer style={styles.byCity}>
      <H size={24} leading={1.333}>
        Services in your <Em>city</Em>
      </H>
      <View style={styles.cityList}>
        {liveCities().map((c) => (
          <View key={c.slug}>
            <Text accessibilityRole="header" style={styles.city}>
              {c.name}
            </Text>
            <View style={[chip.row, styles.chips]}>
              {servicesIn(c).map((s) => (
                <Pressable key={s.slug} accessibilityRole="link" accessibilityLabel={`${s.name} in ${c.name}`} onPress={() => openHref(servicePath(s, c))} style={chip.box}>
                  <Text style={chip.text}>{s.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>
    </RevealContainer>
  );
}

export function ServicesIndex() {
  const soon = cities.filter((c) => c.status === "soon").map((c) => c.name);
  return (
    <>
      <PageHero
        crumbs={[{ name: "Services", path: "/services" }]}
        title={
          <>
            Painting <Em>services</Em>
          </>
        }
        intro="From a single wall or a door to the whole house, every job follows the same process: site inspection, itemised quote, supervised painting and a final walkthrough with you."
        image={images.uniformSpraying}
      />
      <RevealContainer style={styles.list}>
        <ServiceCarousel book />
      </RevealContainer>
      <ServicesByCity />

      <RevealContainer containerStyle={styles.notes}>
        <View>
          <H size={24} leading={1.333}>
            Choosing <Em>colours</Em>
          </H>
          <P leading={1.625} color={colors.muted} style={styles.mt12}>
            Start from <TextLink href="/palettes">ready colour combinations</TextLink>, or search <TextLink href="/colours">wall colour shades by code</TextLink>. The inspector brings the shade cards to your home.
          </P>
        </View>
        <View>
          <H size={24} leading={1.333}>
            Price and <Em>timing</Em>
          </H>
          <P leading={1.625} color={colors.muted} style={styles.mt12}>
            How the price is worked out, how long a 2 BHK takes and how brands are chosen: see the <TextLink href="/faq">house painting FAQs</TextLink>.
          </P>
        </View>
        <View>
          <H size={24} leading={1.333}>
            Where we <Em>work</Em>
          </H>
          <P leading={1.625} color={colors.muted} style={styles.mt12}>
            Homes, rental flats and shops across <LiveCityLinks />, with {soon.join(" and ")} coming next.
          </P>
        </View>
      </RevealContainer>
      <CtaBanner />
    </>
  );
}

const styles = StyleSheet.create({
  mt12: { marginTop: 12 },
  list: { marginTop: 48 },
  byCity: { marginTop: 56 },
  cityList: { marginTop: 16, gap: 20 },
  city: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: colors.ink },
  chips: { marginTop: 10 },
  notes: { marginTop: 64, gap: 40 },
});
