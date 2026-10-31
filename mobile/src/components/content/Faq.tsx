import { StyleSheet, View } from "react-native";

import { Container } from "~/components/site/Page";
import { FaqList } from "~/components/site/Sections";
import { Reveal } from "~/components/ui/Reveal";
import { H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { generalFaqs, services } from "~/shared";
import { colors } from "~/theme";
import { InlineLink, TapLink } from "./Inline";

// The FAQ page under its hero (src/app/(site)/faq/page.tsx): the general questions, each service's
// questions with a link to how that service works, and the note on choosing colours.

export function FaqDirectory() {
  return (
    <Container style={styles.page}>
      <H size={24} leading={32 / 24}>
        General
      </H>
      <View style={styles.mt20}>
        <FaqList faqs={generalFaqs} />
      </View>
      {services.map((s) => (
        <Reveal key={s.slug}>
          <H size={24} leading={32 / 24} style={styles.mt48}>
            {s.name}
          </H>
          <View style={styles.mt20}>
            <FaqList faqs={s.faqs} />
          </View>
          <TapLink label={`How ${s.name.toLowerCase()} works →`} onPress={() => openHref(`/services/${s.slug}`)} textStyle={styles.serviceLink} style={styles.mt16} />
        </Reveal>
      ))}
      <H size={24} leading={32 / 24} style={styles.mt48}>
        Choosing colours
      </H>
      <P leading={1.625} color={colors.muted} style={styles.mt16}>
        Browse <InlineLink href="/palettes">ready colour combinations</InlineLink> for bedrooms, living rooms and exteriors, search{" "}
        <InlineLink href="/colours">wall colour shades by code</InlineLink> and see each one on a room; the inspector then brings the real shade cards to your home.
      </P>
    </Container>
  );
}

const styles = StyleSheet.create({
  page: { marginTop: 56 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
  mt48: { marginTop: 48 },
  serviceLink: { fontSize: 14, lineHeight: 20, color: colors.ink },
});
