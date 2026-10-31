import { StyleSheet, View } from "react-native";

import { Container, usePage } from "~/components/site/Page";
import { CtaBanner, FaqList, PageHero } from "~/components/site/Sections";
import { Card } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { Reveal } from "~/components/ui/Reveal";
import { Em, H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { areaSlug, cityPath, getCity, getService, serviceCityTitle, servicePath, servicesIn, site, type City, type Service, type ServiceLocal } from "~/shared";
import { colors } from "~/theme";
import { asideStyles, BlockLink, BookInspection, chip, Included, LocalityChip, TextLink } from "./bits";
import { accentCity } from "./ServiceDetails";

// A service in one city on a phone (src/app/(site)/services/[slug]/[city]/page.tsx): the local
// intro, what's included, what to know about this work there, the localities (each opening the city
// page at its anchor) and the city's own questions; the quote card and more in the city; the
// booking form (#book-inspection) and the closing banner.

export type ServiceInCity = { service: Service; city: City; local: ServiceLocal };

/** The service, city and local copy for /services/<slug>/<city>, or undefined where the website 404s. */
export function findServiceCity(slug: string | undefined, citySlug: string | undefined): ServiceInCity | undefined {
  const service = slug ? getService(slug) : undefined;
  const city = citySlug ? getCity(citySlug) : undefined;
  const local = service && city ? service.local[city.slug] : undefined;
  return service && city && local ? { service, city, local } : undefined;
}

export function ServiceCity({ service, city, local }: ServiceInCity) {
  const { scrollTo } = usePage();
  const others = servicesIn(city).filter((s) => s.slug !== service.slug);
  const lower = service.name.toLowerCase();
  const title = serviceCityTitle(service, city);

  return (
    <>
      <PageHero
        crumbs={[
          { name: "Services", path: "/services" },
          { name: service.name, path: servicePath(service) },
          { name: city.name, path: servicePath(service, city) },
        ]}
        title={accentCity(title, city.name)}
        intro={local.intro}
        image={service.image}
      >
        <Button label={`Book a site visit in ${city.name} →`} onPress={() => openHref(`/book?service=${service.slug}`)} style={styles.heroButton} />
      </PageHero>

      <Container style={styles.main}>
        <Included service={service} />
        <P size={14} leading={1.43} color={colors.muted} style={styles.mt16}>
          How each step is done, the paint system layer by layer and what moves the price: <TextLink href={servicePath(service)}>{`how we do ${lower}`}</TextLink>.
        </P>

        <H size={30} leading={1.2} style={styles.mt56}>
          {service.name} in {city.name}: <Em>what to know</Em>
        </H>
        <View style={styles.notes}>
          {local.notes.map((n) => (
            <Card key={n.title} style={styles.note}>
              <H size={20} leading={1.4}>
                {n.title}
              </H>
              <P leading={1.625} color={colors.muted} style={styles.mt8}>
                {n.body}
              </P>
            </Card>
          ))}
        </View>

        <H size={30} leading={1.2} style={styles.mt56}>
          Where we paint in <Em>{city.name}</Em>
        </H>
        <View style={[chip.row, styles.mt20]}>
          {city.areas.map((a) => (
            <LocalityChip key={a} name={a} onPress={() => openHref(`${cityPath(city)}#${areaSlug(a)}`)} />
          ))}
        </View>
        <P size={14} leading={1.43} color={colors.muted} style={styles.mt12}>
          Not on the list? <TextLink href={`/book?service=${service.slug}`}>Book anyway</TextLink> and we&apos;ll tell you whether we can take the job.
        </P>

        {local.faqs.length > 0 && (
          <>
            <H size={30} leading={1.2} style={styles.mt56}>
              {service.name} in {city.name}: <Em>questions</Em>
            </H>
            <View style={styles.mt24}>
              <FaqList faqs={local.faqs} />
            </View>
          </>
        )}

        <Reveal>
          <View style={styles.aside}>
            <Card style={asideStyles.inkCard}>
              <H size={24} leading={1.333} style={asideStyles.onInk}>
                Get an itemised quote
              </H>
              <P color={colors.onInk} style={styles.quoteText}>
                Book a free site visit anywhere in our {city.name} service area. We call back {site.hoursDisplay}.
              </P>
              <Button label="Book a site visit" onPress={() => scrollTo("book-inspection")} style={styles.mt24} />
            </Card>
            {others.length > 0 && (
              <Card style={asideStyles.sideCard}>
                <H size={18} leading={1.556}>
                  More in {city.name}
                </H>
                <View style={styles.more}>
                  {others.map((o) => (
                    <BlockLink key={o.slug} href={servicePath(o, city)} label={serviceCityTitle(o, city)} />
                  ))}
                  <BlockLink href={cityPath(city)} label={`House painting in ${city.name}`} />
                </View>
              </Card>
            )}
          </View>
        </Reveal>
      </Container>

      <BookInspection
        service={service}
        city={city.slug}
        heading={
          <>
            Book {lower} in <Em>{city.name}</Em>
          </>
        }
      />
      <CtaBanner
        heading={
          <>
            Ready for {lower} in <Em>{city.name}?</Em>
          </>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
  mt24: { marginTop: 24 },
  mt56: { marginTop: 56 },
  heroButton: { marginTop: 32, alignSelf: "flex-start" },
  main: { marginTop: 64 },
  notes: { marginTop: 24, gap: 16 },
  note: { padding: 24 },
  aside: { marginTop: 48, gap: 24 },
  quoteText: { marginTop: 8, opacity: 0.7 },
  more: { marginTop: 12, gap: 8 },
});
