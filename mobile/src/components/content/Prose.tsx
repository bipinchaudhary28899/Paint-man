import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Breadcrumbs } from "~/components/site/Sections";
import { Container } from "~/components/site/Page";
import { H } from "~/components/ui/Text";
import { colors, fonts } from "~/theme";

// The legal pages' layout (privacy policy, terms): breadcrumbs, a 30px title and the .prose-page
// styles from the website's globals.css (28px DM Serif h2s 36pt apart, muted 16/28 paragraphs and
// disc lists, 12pt between blocks).

/** The page: container-page py-10, breadcrumbs, the h1, then the prose. */
export function ProsePage({ title, path, children }: { title: string; path: string; children: ReactNode }) {
  return (
    <Container style={styles.page}>
      <Breadcrumbs items={[{ name: title, path }]} />
      <H size={30} leading={1.2} style={styles.title}>
        {title}
      </H>
      <View>{children}</View>
    </Container>
  );
}

/** .prose-page h2 */
export function ProseH2({ children }: { children: ReactNode }) {
  return (
    <H size={28} leading={1.5} style={styles.h2}>
      {children}
    </H>
  );
}

/** .prose-page p */
export function ProseP({ children }: { children: ReactNode }) {
  return <Text style={[styles.text, styles.block]}>{children}</Text>;
}

/** .prose-page ul: a disc before each item, the text 20pt in. */
export function ProseList({ items }: { items: readonly string[] }) {
  return (
    <View style={styles.block}>
      {items.map((item) => (
        <View key={item} style={styles.item}>
          <Text aria-hidden style={[styles.text, styles.disc]}>
            •
          </Text>
          <Text style={[styles.text, styles.flex]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingVertical: 40 },
  title: { marginTop: 24 },
  h2: { marginTop: 36 },
  block: { marginTop: 12 },
  text: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 28, letterSpacing: -0.08, color: colors.muted },
  item: { flexDirection: "row" },
  disc: { width: 20, paddingLeft: 4 },
});
