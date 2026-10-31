import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Container, Page } from "~/components/site/Page";
import { Button } from "~/components/ui/Button";
import { Em, H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { colors, fonts } from "~/theme";
import { ButtonRow } from "./Inline";

// The website's 404 (src/app/not-found.tsx) and the notice a page shows when it breaks
// (src/app/(site)/error.tsx with ErrorNotice), inside the site's header and footer so a lost visitor
// keeps the whole navigation.

const links = [
  { href: "/services", label: "Painting services" },
  { href: "/colours", label: "Colour finder" },
  { href: "/faq", label: "Questions and answers" },
  { href: "/contact", label: "Contact us" },
];

/** "Page not found.": the apology, four pages to pick up from, home and booking. */
export function NotFoundContent() {
  return (
    <Container style={styles.page}>
      <H size={40} leading={1.05} tracking={-0.02} style={styles.center}>
        Page not <Em>found.</Em>
      </H>
      <P size={18} leading={1.65} color={colors.muted} style={[styles.mt20, styles.center]}>
        Arre, yeh page nahi mila. The page you&apos;re looking for doesn&apos;t exist or has moved. These pages are a good place to pick up again.
      </P>
      <View style={styles.links}>
        {links.map((l) => (
          <Pressable key={l.href} accessibilityRole="link" onPress={() => openHref(l.href)} style={styles.link}>
            <Text style={styles.linkText}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
      <ButtonRow center style={styles.mt32}>
        <Button label="Back to home" variant="secondary" accessibilityRole="link" onPress={() => router.navigate("/")} />
        <Button label="Book an inspection" accessibilityRole="link" onPress={() => openHref("/book")} />
      </ButtonRow>
    </Container>
  );
}

/** ErrorNotice: a plain apology, a retry that renders the page again, and the ways on (home, booking). No error details. */
export function ErrorNotice({ retry }: { retry: () => void }) {
  return (
    <Container style={styles.page}>
      <H size={36} leading={1.05} tracking={-0.02} style={styles.center}>
        Something went <Em>wrong.</Em>
      </H>
      <P size={18} leading={1.65} color={colors.muted} style={[styles.mt20, styles.center]}>
        Kuch gadbad ho gayi. This page didn&apos;t load properly. Try again, or carry on from the home page; your booking form is always one tap away.
      </P>
      <ButtonRow center style={styles.mt32}>
        <Button label="Try again" onPress={() => retry()} />
        <Button label="Go to the home page" variant="secondary" accessibilityRole="link" onPress={() => router.navigate("/")} />
        <Button label="Book a site visit" variant="secondary" accessibilityRole="link" onPress={() => openHref("/book")} />
      </ButtonRow>
    </Container>
  );
}

/** A screen's ErrorBoundary (Expo Router renders it when the screen throws): the notice inside the page's header and footer. */
export function ScreenError({ retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <Page>
      <ErrorNotice retry={() => void retry()} />
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { paddingVertical: 96 },
  center: { textAlign: "center" },
  mt20: { marginTop: 20 },
  mt32: { marginTop: 32 },
  links: { marginTop: 32, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 24, rowGap: 4 },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22.5, letterSpacing: -0.075, color: colors.ink, textDecorationLine: "underline", textDecorationColor: colors.lineStrong },
});
