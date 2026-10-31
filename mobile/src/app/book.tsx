import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { BookForm, BookingFaq, BookingSteps, NextSteps, PreferToTalk } from "~/components/content/Book";
import { Blob } from "~/components/content/Decor";
import { GradientText } from "~/components/content/Inline";
import { Container, Page } from "~/components/site/Page";
import { Breadcrumbs, Promises } from "~/components/site/Sections";
import { H, P } from "~/components/ui/Text";
import { site } from "~/shared";
import { colors } from "~/theme";

export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The website's /book (src/app/(site)/book/page.tsx) at phone width: the sand blob behind, the title,
// the booking form (prefilled from ?service=, ?palette= or ?shade=, as BookPrefill does), what happens
// next, "Prefer to talk?", the promises, how booking works and the booking questions.
export default function BookScreen() {
  const { service, palette, shade } = useLocalSearchParams<{ service?: string; palette?: string; shade?: string }>();
  return (
    <Page>
      <View style={styles.wrap}>
        <Blob color={colors.sand} size={448} style={styles.blob} />
        <Container style={styles.page}>
          <Breadcrumbs items={[{ name: "Book painters online", path: "/book" }]} />
          <H size={36} leading={1.05} style={styles.title}>
            Book painters online in <GradientText>{site.city}</GradientText>
          </H>
          <P size={18} leading={28 / 18} color={colors.muted} style={styles.intro}>
            Share a few details and book a free site inspection. We&apos;ll call you back to confirm a convenient time for the visit.
          </P>
          <BookForm query={{ service, palette, shade }} />
          <NextSteps style={styles.next} />
          <PreferToTalk style={styles.talk} />
          <Promises style={styles.section} />
          <BookingSteps style={styles.section} />
          <BookingFaq style={styles.section} />
        </Container>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  blob: { position: "absolute", left: -160, top: 80, opacity: 0.5 },
  page: { paddingVertical: 40 },
  title: { marginTop: 24 },
  intro: { marginTop: 16 },
  next: { marginTop: 48 },
  talk: { marginTop: 24 },
  section: { marginTop: 80 },
});
