import { StyleSheet } from "react-native";

import { ServiceCarousel } from "~/components/services/ServiceCarousel";
import { Container } from "~/components/site/Page";
import { LinkArrow } from "~/components/ui/Bits";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { colors } from "~/theme";

// "Every wall in the house": the eyebrow, the heading and the website's line, then every service as a
// swipe row of cards (ServiceCarousel), each opening its hub, and "All services" under the row.
export function ServicesSection() {
  return (
    <Container style={styles.section}>
      <Eyebrow size={11} style={styles.eyebrow}>
        What we paint
      </Eyebrow>
      <H size={30} leading={1.06} style={styles.mt12}>
        Every wall in the <Em>house.</Em>
      </H>
      <P size={15} leading={1.6} color={colors.muted} style={[styles.mt12, styles.intro]}>
        Andar ho ya bahar: house painting inside and out, and quick repaints of rental homes, each starting with an on-site inspection and an itemised quote.
      </P>
      <ServiceCarousel style={styles.carousel} />
      <LinkArrow label="All services" onPress={() => openHref("/services")} style={styles.mt8} />
    </Container>
  );
}

const styles = StyleSheet.create({
  // the hero's picture fades into the canvas above this
  section: { paddingTop: 40, paddingBottom: 56 },
  eyebrow: { lineHeight: 16.5 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  intro: { maxWidth: 460 },
  carousel: { marginTop: 20 },
});
