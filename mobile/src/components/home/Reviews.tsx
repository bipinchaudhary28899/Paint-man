import { StyleSheet, Text, View } from "react-native";

import { Container } from "~/components/site/Page";
import { Card } from "~/components/ui/Bits";
import { Reveal } from "~/components/ui/Reveal";
import { Em, H, P } from "~/components/ui/Text";
import { reviewMonth, reviewPlace, reviewsToShow, type ShownReviews } from "~/shared";
import { colors, fonts } from "~/theme";

// "What customers say" (the website's Reviews section): real customers' words from the website's
// src/config/reviews.ts, stacked, each with the name, locality, job and month. Left out entirely
// until there is one, except in a development build, where the marked samples show the layout.

export function Reviews({ shown = reviewsToShow(undefined, __DEV__) }: { shown?: ShownReviews }) {
  if (shown.items.length === 0) return null;
  return (
    <Container style={styles.section}>
      <Reveal>
        <H size={30} leading={1.08}>
          What customers <Em>say</Em>
        </H>
        {shown.sample && (
          <View style={styles.sample}>
            <P size={13} leading={1.5} color={colors.muted}>
              Sample reviews, shown only in a development build. Add real customers&apos; words to src/config/reviews.ts and these go away.
            </P>
          </View>
        )}
      </Reveal>
      <View style={styles.list}>
        {shown.items.map((r, i) => (
          <Reveal key={`${r.name}-${r.date}-${i}`}>
            <Card radius={18} style={styles.card} accessible accessibilityLabel={`${r.name}, ${reviewPlace(r)}, ${r.job}, ${reviewMonth(r.date)}: ${r.quote}`}>
              <P size={15} leading={1.6} color={colors.inkSoft}>
                {r.quote}
              </P>
              <View style={styles.by}>
                <Text style={styles.name}>
                  {r.name}
                  <Text style={styles.place}>, {reviewPlace(r)}</Text>
                </Text>
                <Text style={styles.place}>
                  {r.job} · {reviewMonth(r.date)}
                </Text>
              </View>
            </Card>
          </Reveal>
        ))}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  section: { paddingBottom: 56 },
  sample: { marginTop: 14, borderWidth: 1, borderStyle: "dashed", borderColor: colors.lineStrong, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  list: { marginTop: 22, gap: 12 },
  card: { padding: 18, gap: 14 },
  by: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 12, gap: 2 },
  name: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 21, color: colors.ink },
  place: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.muted },
});
