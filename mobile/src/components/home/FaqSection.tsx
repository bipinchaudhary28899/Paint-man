import { StyleSheet, View } from "react-native";

import { Container } from "~/components/site/Page";
import { FaqList } from "~/components/site/Sections";
import { Em, H, P } from "~/components/ui/Text";
import { generalFaqs } from "~/shared";
import { colors } from "~/theme";

// "Good questions" on phones (src/components/home/FaqSection.tsx): the heading, the note, then the
// general FAQs as an accordion with the first one open.
export function FaqSection() {
  return (
    <Container style={styles.section}>
      <H size={32} leading={1.06}>
        Good <Em>questions.</Em>
      </H>
      <P size={14} leading={1.55} color={colors.muted} style={styles.note}>
        Aur koi sawaal? Our inspector answers it on the site visit.
      </P>
      <View style={styles.list}>
        <FaqList faqs={generalFaqs} openFirst />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 6, paddingBottom: 56 },
  note: { marginTop: 8, maxWidth: 320 },
  list: { marginTop: 16 },
});
