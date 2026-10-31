import { StyleSheet, Text, View } from "react-native";

import { Container, usePage } from "~/components/site/Page";
import { CtaBanner, FaqList, PageHero } from "~/components/site/Sections";
import { Card } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { Reveal } from "~/components/ui/Reveal";
import { Em, H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { cities, cityPath, serviceCityTitle, servicePath, services, type Service } from "~/shared";
import { colors, fonts } from "~/theme";
import { asideStyles, BlockLink, BookInspection, Included, TextLink } from "./bits";
import { accentCity, ServiceDetails } from "./ServiceDetails";

// A service hub on a phone (src/app/(site)/services/[slug]/page.tsx): how this work is done anywhere,
// with no city in the copy. The hero with its booking button, what's included, the long-form
// details, who it suits and its FAQs; then the side cards (where we offer it, other services, house
// painting by city), the booking form (#book-inspection) and the closing banner.

export function ServiceHub({ service }: { service: Service }) {
  const { scrollTo } = usePage();
  const others = services.filter((s) => s.slug !== service.slug);
  const offeredIn = cities.filter((c) => c.slug in service.local);
  const lower = service.name.toLowerCase();

  return (
    <>
      <PageHero
        crumbs={[
          { name: "Services", path: "/services" },
          { name: service.name, path: servicePath(service) },
        ]}
        title={accentCity(service.title)}
        intro={service.intro}
        image={service.image}
      >
        <Button label="Book a site visit →" onPress={() => openHref(`/book?service=${service.slug}`)} style={styles.heroButton} />
      </PageHero>

      <Container style={styles.main}>
        <Included service={service} />
        <P size={14} leading={1.43} color={colors.muted} style={styles.mt16}>
          The exact scope for your property is written in your quotation.
        </P>

        <ServiceDetails service={service} />

        <H size={30} leading={1.2} style={styles.mt56}>
          Suitable <Em>for</Em>
        </H>
        <View style={styles.suits}>
          {service.suitableFor.map((s) => (
            <View key={s} style={styles.suit}>
              <Text style={styles.suitText}>{s}</Text>
            </View>
          ))}
        </View>

        <H size={30} leading={1.2} style={styles.mt56}>
          {service.name} <Em>FAQs</Em>
        </H>
        <View style={styles.mt24}>
          <FaqList faqs={service.faqs} />
        </View>

        <Reveal>
          <View style={styles.aside}>
            <Card style={asideStyles.inkCard}>
              <H size={24} leading={1.333} style={asideStyles.onInk}>
                Where we offer it
              </H>
              <View style={styles.offered}>
                {offeredIn.map((c) => (
                  <BlockLink key={c.slug} href={servicePath(service, c)} label={serviceCityTitle(service, c)} textStyle={asideStyles.onInkLink} />
                ))}
              </View>
              <Button label="Book a site visit" onPress={() => scrollTo("book-inspection")} style={styles.mt24} />
            </Card>
            <Card style={asideStyles.sideCard}>
              <H size={18} leading={1.556}>
                Other services
              </H>
              <View style={styles.others}>
                {others.map((o) => (
                  <BlockLink key={o.slug} href={servicePath(o)} label={o.title} />
                ))}
              </View>
            </Card>
            <Card style={asideStyles.sideCard}>
              <H size={18} leading={1.556}>
                House painting by city
              </H>
              <View style={styles.cityLinks}>
                {[...cities.map((c) => ({ href: cityPath(c), label: `House painting in ${c.name}` })), { href: "/faq", label: "Painting FAQs" }].map((l, i, all) => (
                  <View key={l.href} style={styles.cityLink}>
                    <BlockLink href={l.href} label={l.label} textStyle={styles.smallLink} />
                    {i < all.length - 1 && (
                      <Text aria-hidden style={styles.sep}>
                        ·
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </Card>
          </View>
        </Reveal>
      </Container>

      <BookInspection
        service={service}
        heading={
          <>
            Book {lower} <Em>online</Em>
          </>
        }
      >
        <P size={14} leading={1.43} color={colors.muted} style={styles.mt16}>
          Prefer the full booking page? <TextLink href={`/book?service=${service.slug}`}>Open it here</TextLink>.
        </P>
      </BookInspection>
      <CtaBanner
        heading={
          <>
            Ready for {lower}? <Em>Book a site visit.</Em>
          </>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
  mt56: { marginTop: 56 },
  heroButton: { marginTop: 32, alignSelf: "flex-start" },
  main: { marginTop: 64 },
  suits: { marginTop: 20, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  suit: { borderRadius: 999, backgroundColor: colors.creamWash, paddingHorizontal: 16, paddingVertical: 8 },
  suitText: { fontFamily: fonts.sansBold, fontSize: 14, lineHeight: 20, color: colors.ink },
  aside: { marginTop: 48, gap: 24 },
  offered: { marginTop: 12, gap: 4 },
  others: { marginTop: 12, gap: 8 },
  cityLinks: { marginTop: 12, flexDirection: "row", flexWrap: "wrap" },
  cityLink: { flexDirection: "row", alignItems: "center" },
  smallLink: { fontSize: 14, lineHeight: 20 },
  sep: { marginHorizontal: 8, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
});
