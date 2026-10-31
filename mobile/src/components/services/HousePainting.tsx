import { StyleSheet, Text, View } from "react-native";

import { Container, usePage } from "~/components/site/Page";
import { BookingSection, CtaBanner, Promises, WorkFlow } from "~/components/site/Sections";
import { Card, TitleLink } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { RevealContainer } from "~/components/ui/Reveal";
import { Em, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { cities, cityPath, liveCities, servicePath, services, site } from "~/shared";
import { colors, fonts } from "~/theme";
import { CreamHero, HeroTitle, linkStyles, SectionHead, TextLink } from "./bits";

// The national house-painting hub on a phone (src/app/(site)/services/house-painting/page.tsx): the
// cream hero with the live cities, the booking form (#book-visit), every service, the promises,
// how the work gets done, the cities live and coming, and the closing banner.

/** A card heading that links to its page (an h3 holding a link on the website); a one-line title still gets a 44pt tap area. */
export function CardTitle({ href, children }: { href: string; children: string }) {
  return <TitleLink label={children} onPress={() => openHref(href)} />;
}

export function HousePaintingHub() {
  const { scrollTo } = usePage();
  const live = liveCities();
  const soon = cities.filter((c) => c.status === "soon").map((c) => c.name);

  return (
    <>
      <CreamHero
        crumbs={[
          { name: "Services", path: "/services" },
          { name: "House painting", path: "/services/house-painting" },
        ]}
      >
        <HeroTitle style={styles.mt20}>
          House painting services, <Em>managed</Em>
        </HeroTitle>
        <P size={18} leading={1.65} color={colors.muted} style={styles.mt20}>
          {site.name} paints homes, rented flats and small shops, from a single wall, a door or the window grills to the whole house, without you managing painters: an on-site inspection, a line-by-line quotation, branded paint and a supervised crew until the final walkthrough. We paint in{" "}
          {live.map((c, i) => (
            <Text key={c.slug}>
              {i > 0 && ", "}
              <TextLink href={cityPath(c)} style={linkStyles.bold}>
                {c.name}
              </TextLink>
            </Text>
          ))}{" "}
          today, with {soon.join(" and ")} next.
        </P>
        <Button label="Book a site visit" large onPress={() => scrollTo("book-visit")} style={styles.heroButton} />
      </CreamHero>

      <BookingSection
        heading={
          <>
            Book a site visit <Em>online</Em>
          </>
        }
        text="Share a few details and we call you back to fix the visit. The inspector measures your walls, brings shade cards and sends an itemised quotation. Nothing is booked until you approve it."
      />

      <RevealContainer style={styles.mt64}>
        <SectionHead eyebrow="Services">
          What we <Em>paint</Em>
        </SectionHead>
        <View style={styles.cards}>
          {services.map((s) => (
            <Card key={s.slug} style={styles.card}>
              <CardTitle href={servicePath(s)}>{s.title}</CardTitle>
              <P leading={1.6} color={colors.muted} style={styles.mt8}>
                {s.intro}
              </P>
              <P size={14} leading={1.43} color={colors.muted} style={styles.mt12}>
                {s.suitableFor.slice(0, 3).join(" · ")}
              </P>
            </Card>
          ))}
        </View>
      </RevealContainer>

      <Container style={styles.mt96}>
        <Promises />
      </Container>

      <Container style={styles.mt96}>
        <WorkFlow cta={{ label: "Book a site visit", onPress: () => scrollTo("book-visit") }} />
      </Container>

      <RevealContainer style={styles.mt96}>
        <SectionHead eyebrow="Cities">
          House painting by <Em>city</Em>
        </SectionHead>
        <View style={styles.cards}>
          {cities.map((c) => (
            <Card key={c.slug} style={styles.card}>
              <Text style={styles.region}>{c.region}</Text>
              <View style={styles.mt4}>
                <CardTitle href={cityPath(c)}>{`House painting in ${c.name}`}</CardTitle>
              </View>
              <P size={14} leading={1.43} color={colors.muted} style={styles.mt8}>
                {c.status === "live" ? `${c.areas.length} localities served. Book a site visit online.` : "Coming soon: join the waitlist."}
              </P>
            </Card>
          ))}
        </View>
      </RevealContainer>

      <CtaBanner
        heading={
          <>
            Ready to repaint? <Em>Book a site visit.</Em>
          </>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt20: { marginTop: 20 },
  mt64: { marginTop: 64 },
  mt96: { marginTop: 96 },
  heroButton: { marginTop: 32, alignSelf: "flex-start" },
  cards: { marginTop: 32, gap: 20 },
  card: { padding: 24 },
  region: { fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 1.44, textTransform: "uppercase", color: colors.muted },
});
