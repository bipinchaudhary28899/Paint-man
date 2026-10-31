import { StyleSheet, Text, View } from "react-native";

import { Anchor, Container, usePage } from "~/components/site/Page";
import { BookingSection, CtaBanner, Promises } from "~/components/site/Sections";
import { Card } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { RevealContainer } from "~/components/ui/Reveal";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { areaSlug, cityPath, serviceCityTitle, servicePath, services, servicesIn, site, type City } from "~/shared";
import { colors, fonts } from "~/theme";
import { ArrowLink, BlockLink, chip, CreamHero, HeroTitle, linkStyles, LiveCityLinks, LocalityChip, SectionHead, TextLink } from "./bits";
import { CardTitle } from "./HousePainting";

// A city's main painting page on a phone (src/app/(site)/services/house-painting/[city]/page.tsx):
// the cream hero with a chip per locality (each jumping to its row), the booking form (#book-visit),
// the services in the city, the promises, the localities (#localities, and #<area> on each row), the
// site visit step by step, what the weather means for walls, planning links and the closing banner.
// A city that is not live yet gets the waitlist page (ComingSoon) instead.

/** How the site visit runs in this city (the page's own four steps). */
export const cityVisitSteps = (city: City) => [
  {
    title: "Book a site visit",
    text: `Fill in the form with your number and locality. We call you back during working hours (${site.hoursDisplay}) to confirm the visit.`,
  },
  {
    title: "The inspector visits",
    text: "They measure the walls and ceilings, check for damp, cracks and peeling paint, and bring shade cards so you see colours in your own light.",
  },
  {
    title: "You get an itemised quotation",
    text: "Scope, paint brand and range, inclusions, exclusions and the payment schedule, in writing. Nothing is booked until you approve it.",
  },
  {
    title: "Supervised painting, then a walkthrough",
    text: `The crew works to the approved quotation anywhere in ${city.name}. Any change in scope is priced and approved first, and the job closes with a quality check and a walkthrough with you.`,
  },
];

const planLinks = [
  { href: "/colours", title: "Colour finder", text: "Search the shade cards of Asian Paints, Berger, Nerolac and Nippon Paint by code, name or hex." },
  { href: "/palettes", title: "Wall colour combinations", text: "A feature wall, its matching white and an accent, shown on a room." },
  { href: "/services/house-painting", title: "How we paint homes", text: "Every service, the process and what moves the price, in any city." },
  { href: "/faq", title: "Painting FAQs", text: "Booking, pricing, timelines and what happens during the job." },
];

const crumbsFor = (city: City) => [
  { name: "Services", path: "/services" },
  { name: "House painting", path: "/services/house-painting" },
  { name: city.name, path: cityPath(city) },
];

/** The city page for a live city, or the waitlist page for one coming soon. */
export function CityPage({ city }: { city: City }) {
  return city.status === "live" ? <LiveCity city={city} /> : <ComingSoon city={city} />;
}

function LiveCity({ city }: { city: City }) {
  const { scrollTo } = usePage();
  const offered = servicesIn(city);

  return (
    <>
      <CreamHero crumbs={crumbsFor(city)}>
        <HeroTitle style={styles.mt20}>
          House painting services in <Em>{city.name}</Em>
        </HeroTitle>
        <P size={18} leading={1.65} color={colors.muted} style={styles.mt20}>
          {city.intro}
        </P>
        <View accessibilityLabel={`Jump to a locality in ${city.name}`} style={[chip.row, styles.mt32]}>
          {city.areas.map((a) => (
            <LocalityChip key={a} name={a} onPress={() => scrollTo(areaSlug(a))} />
          ))}
        </View>
        <Button label="Book a site visit" large onPress={() => scrollTo("book-visit")} style={styles.heroButton} />
      </CreamHero>

      <BookingSection
        defaultCity={city.slug}
        heading={
          <>
            Book a site visit in <Em>{city.name}</Em>
          </>
        }
        text={`Share a few details and we call you back during working hours (${site.hoursDisplay}) to fix the visit. The inspector measures your walls, brings shade cards and sends an itemised quotation. Nothing is booked until you approve it.`}
      />

      <RevealContainer style={styles.mt64}>
        <SectionHead eyebrow="Services">
          Painting services in <Em>{city.name}</Em>
        </SectionHead>
        <View style={styles.cards}>
          {offered.map((s) => (
            <Card key={s.slug} style={styles.card}>
              <CardTitle href={servicePath(s, city)}>{serviceCityTitle(s, city)}</CardTitle>
              <P leading={1.6} color={colors.muted} style={styles.mt8}>
                {s.local[city.slug].intro}
              </P>
              <ArrowLink label={`${s.name} in ${city.name}`} onPress={() => openHref(servicePath(s, city))} style={styles.mt16} />
            </Card>
          ))}
        </View>
      </RevealContainer>

      <Container style={styles.mt96}>
        <Promises />
      </Container>

      <RevealContainer style={styles.mt96}>
        <Eyebrow style={styles.eyebrow}>Localities</Eyebrow>
        <Anchor id="localities" style={styles.mt12}>
          <H size={30} leading={1.2}>
            Where we <Em>paint</Em> in {city.name}
          </H>
        </Anchor>
        <P leading={1.65} color={colors.muted} style={styles.mt16}>
          Every locality gets the same process: an on-site inspection, an itemised quotation and the same supervised crew as anywhere else in {city.name}. Not on the list?{" "}
          <TextLink href="/book" style={linkStyles.bold}>
            Book anyway
          </TextLink>{" "}
          and we&apos;ll tell you honestly whether we can take the job.
        </P>
        <View style={[styles.rules, styles.mt32]}>
          {city.areas.map((a) => (
            <Anchor key={a} id={areaSlug(a)} style={styles.area}>
              <H size={24} leading={1.333}>
                {a}
              </H>
              <Button label="Book a slot" accessibilityLabel={`Book a slot in ${a}`} accessibilityRole="link" variant="secondary" small onPress={() => openHref("/book")} style={styles.slot} />
            </Anchor>
          ))}
        </View>
      </RevealContainer>

      <RevealContainer style={styles.mt96}>
        <SectionHead eyebrow="One process everywhere">
          What the site visit <Em>involves</Em>
        </SectionHead>
        <P leading={1.65} color={colors.muted} style={styles.mt16}>
          The same steps whether you live in {city.areas[0]} or {city.areas[city.areas.length - 1]}, for a single bedroom or a whole house.
        </P>
        <View style={[styles.rules, styles.mt48]}>
          {cityVisitSteps(city).map((s, i) => (
            <View key={s.title} style={styles.step}>
              <Text aria-hidden style={styles.stepNo}>
                {i + 1}
              </Text>
              <View style={styles.flex}>
                <H size={20} leading={1.4}>
                  {s.title}
                </H>
                <P leading={1.65} color={colors.muted} style={styles.mt4}>
                  {s.text}
                </P>
              </View>
            </View>
          ))}
        </View>
      </RevealContainer>

      {city.weather.length > 0 && (
        <RevealContainer style={styles.mt96}>
          <SectionHead eyebrow={`Painting in ${city.name}`}>
            What {city.name}&apos;s weather means for your <Em>walls</Em>
          </SectionHead>
          <View style={styles.cards}>
            {city.weather.map((c) => (
              <Card key={c.title} style={styles.card}>
                <H size={24} leading={1.333}>
                  {c.title}
                </H>
                <P leading={1.65} color={colors.muted} style={styles.mt8}>
                  {c.text}
                </P>
                {c.link && <ArrowLink label={c.link.label} onPress={() => openHref(c.link!.href)} style={styles.mt8} />}
              </Card>
            ))}
          </View>
        </RevealContainer>
      )}

      <RevealContainer style={styles.mt96}>
        <SectionHead eyebrow="Before the visit">
          Plan the job and the <Em>colours</Em>
        </SectionHead>
        <P leading={1.65} color={colors.muted} style={styles.mt16}>
          Shortlist shades before the inspector comes, so the shade cards they bring are the ones you want to see.
        </P>
        <View style={styles.mt48}>
          {planLinks.map((p) => (
            <View key={p.href} style={styles.plan}>
              <BlockLink href={p.href} label={p.title} textStyle={styles.planLink} />
              <P size={14} leading={1.6} color={colors.muted}>
                {p.text}
              </P>
            </View>
          ))}
        </View>
      </RevealContainer>

      <CtaBanner
        heading={
          <>
            Painting a home in {city.name}? <Em>Book the visit.</Em>
          </>
        }
      />
    </>
  );
}

/** A city we are preparing to open: what is coming, the waitlist form (a contact request) and where we paint today. */
export function ComingSoon({ city }: { city: City }) {
  return (
    <>
      <CreamHero crumbs={crumbsFor(city)} rule={false}>
        <Eyebrow style={[styles.eyebrow, styles.mt24]}>Coming soon</Eyebrow>
        <HeroTitle style={styles.mt12}>
          House painting in <Em>{city.name}</Em> is coming soon
        </HeroTitle>
        <P size={18} leading={1.65} color={colors.muted} style={styles.mt20}>
          {city.intro}
        </P>
        <P leading={1.65} color={colors.muted} style={styles.mt24}>
          Today we paint in <LiveCityLinks style={linkStyles.bold} />. See how the work is done:{" "}
          {services.map((s, i) => (
            <Text key={s.slug}>
              {i > 0 && ", "}
              <TextLink href={servicePath(s)} style={linkStyles.bold}>
                {s.name.toLowerCase()}
              </TextLink>
            </Text>
          ))}
          .
        </P>
      </CreamHero>
      {/* the last section on this page (no closing banner), so it keeps its own space above the footer */}
      <BookingSection
        id="waitlist"
        type="contact"
        style={styles.waitlist}
        defaultMessage={`Please call me when you start painting in ${city.name}.`}
        heading={
          <>
            Join the <Em>{city.name}</Em> waitlist
          </>
        }
        text={`We're not painting in ${city.name} yet. Leave your number and we'll call you when bookings open there.`}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
  mt24: { marginTop: 24 },
  mt32: { marginTop: 32 },
  mt48: { marginTop: 48 },
  mt64: { marginTop: 64 },
  mt96: { marginTop: 96 },
  eyebrow: { lineHeight: 18 },
  heroButton: { marginTop: 32, alignSelf: "flex-start" },
  slot: { marginVertical: 4 },
  cards: { marginTop: 32, gap: 20 },
  card: { padding: 24 },
  rules: { borderTopWidth: 1, borderColor: colors.line },
  area: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  step: { flexDirection: "row", gap: 20, paddingVertical: 24, borderBottomWidth: 1, borderColor: colors.line },
  stepNo: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: colors.terracotta },
  plan: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  planLink: { textDecorationLine: "none" },
  waitlist: { marginBottom: 96 },
});
