import { useEffect, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { LeadForm } from "~/components/site/LeadForm";
import { FaqList } from "~/components/site/Sections";
import { Card } from "~/components/ui/Bits";
import { Reveal } from "~/components/ui/Reveal";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { bookPrefill, brandShadeQuery, fetchBrandShade, shadeToLookUp, type BookQuery, type BrandShadeSummary } from "~/lib/prefill";
import { bookingFaqs, bookingSteps, site } from "~/shared";
import { colors, fonts } from "~/theme";
import { boldInk, CityLinks, InlineLink } from "./Inline";

// The booking page's pieces (src/app/(site)/book/page.tsx) at its phone sizes: the prefilled form in
// its card (BookPrefill), "What happens next", "Prefer to talk?", the four booking steps and the
// booking questions, each rising in as it scrolls into view.

/**
 * The brand shade a booking was opened with (?shade=asian-paints:8386), looked up through the colour
 * API: `pending` while the answer is on its way, then the shade if it was found (nothing for a bad id,
 * one that is not found, offline or any error).
 */
export function useShadeLookup(id: string | null): { shade?: BrandShadeSummary; pending: boolean } {
  const [answer, setAnswer] = useState<{ id: string; shade?: BrandShadeSummary } | null>(null);
  const valid = id !== null && brandShadeQuery(id) !== null;
  useEffect(() => {
    if (!id || !valid) return;
    const ctl = new AbortController();
    fetchBrandShade(id, ctl.signal).then(
      (shade) => !ctl.signal.aborted && setAnswer({ id, shade }),
      () => !ctl.signal.aborted && setAnswer({ id }),
    );
    return () => ctl.abort();
  }, [id, valid]);
  const current = answer?.id === id ? answer : null;
  return { shade: current?.shade, pending: valid && !current };
}

/** BookPrefill: the two-step booking form with the service, palette or brand shade the visitor came from filled in (shown on its first step, as a skeleton while the shade is looked up). */
export function BookForm({ query }: { query: BookQuery }) {
  const { shade, pending } = useShadeLookup(shadeToLookUp(query));
  const { defaultService, defaultMessage } = bookPrefill(query, shade);
  // The form keeps its own state, so a prefill (including a shade that arrives after the lookup) remounts it.
  return (
    <Card style={styles.formCard}>
      <LeadForm key={`${defaultService ?? ""}|${defaultMessage ?? ""}`} type="booking" defaultService={defaultService} defaultMessage={defaultMessage} carrying={pending} />
    </Card>
  );
}

/** The three steps after booking, each number on its own tint (bg-sunshine, bg-pink, bg-cobalt). */
const next = [
  { text: "We call you to confirm your requirements and inspection time.", tint: colors.golden },
  { text: "Our inspector visits, measures the walls and checks their condition.", tint: colors.blush },
  { text: "You receive an itemised quotation. Nothing is booked until you approve it.", tint: colors.sageDeep },
];

/** "What happens next": the cream card of numbered steps. */
export function NextSteps({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Reveal style={style}>
      <Card style={styles.next}>
        <H size={24} leading={32 / 24}>
          What happens next
        </H>
        <View style={styles.nextList}>
          {next.map((n, i) => (
            <View key={n.text} style={styles.nextRow}>
              <View aria-hidden style={[styles.badge, { backgroundColor: n.tint }]}>
                <Text style={[styles.badgeText, n.tint === colors.sageDeep && styles.badgeTextOnDark]}>{i + 1}</Text>
              </View>
              <P leading={1.625} style={styles.nextText}>
                {n.text}
              </P>
            </View>
          ))}
        </View>
      </Card>
    </Reveal>
  );
}

type Phone = { phone: string; phoneDisplay: string; hoursDisplay: string };

/** "Prefer to talk?": the dashed box; the number once the website has one, else a call back from the form. */
export function PreferToTalk({ details = site, style }: { details?: Phone; style?: StyleProp<ViewStyle> }) {
  const hours = details.hoursDisplay.toLowerCase();
  return (
    <Reveal style={style}>
      <View style={styles.talk}>
        <Text style={styles.talkTitle}>Prefer to talk?</Text>
        {details.phone ? (
          <P size={14} leading={20 / 14} color={colors.muted} style={styles.mt8}>
            Call{" "}
            <InlineLink href={`tel:${details.phone}`} style={styles.phoneLink}>
              {details.phoneDisplay || details.phone}
            </InlineLink>
            , {hours}.
          </P>
        ) : (
          <P size={14} leading={20 / 14} color={colors.muted} style={styles.mt8}>
            Leave your number in the form and we&apos;ll call you back, {hours}.
          </P>
        )}
      </View>
    </Reveal>
  );
}

/** "How booking painters online works": the four steps as cards 20pt apart. */
export function BookingSteps({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Reveal style={style}>
      <H size={30} leading={1.2}>
        How booking painters online <Em>works</Em>
      </H>
      <View style={styles.steps}>
        {bookingSteps.map((s, i) => (
          <Card key={s.title} style={styles.step}>
            <Text style={styles.stepNo}>0{i + 1}</Text>
            <H size={20} leading={1.4} style={styles.mt8}>
              {s.title}
            </H>
            <P size={14} leading={1.625} color={colors.muted} style={styles.mt8}>
              {s.text}
            </P>
          </Card>
        ))}
      </View>
    </Reveal>
  );
}

/** "Booking questions": the eyebrow, heading and links, then the booking FAQs. */
export function BookingFaq({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Reveal style={style}>
      <Eyebrow>Before you book</Eyebrow>
      <H size={30} leading={1.2} style={styles.mt12}>
        Booking <Em>questions</Em>
      </H>
      <P color={colors.muted} style={styles.mt16}>
        More answers on the{" "}
        <InlineLink href="/faq" style={boldInk}>
          painting FAQ
        </InlineLink>
        , or see the areas we serve in <CityLinks linkStyle={boldInk} />.
      </P>
      <View style={styles.mt40}>
        <FaqList faqs={bookingFaqs} />
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt40: { marginTop: 40 },
  formCard: { marginTop: 40, padding: 20 },
  next: { backgroundColor: colors.creamWash, padding: 28 },
  nextList: { marginTop: 20, gap: 16 },
  nextRow: { flexDirection: "row", gap: 16 },
  badge: { width: 48, height: 48, flexShrink: 0, borderRadius: 16, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  badgeText: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 28, letterSpacing: -0.3, color: colors.ink },
  // ink on deep sage is 2.79:1; cream is 5.07:1
  badgeTextOnDark: { color: colors.onSage },
  nextText: { flex: 1, paddingTop: 4 },
  talk: { borderRadius: 28, borderWidth: 1, borderStyle: "dashed", borderColor: colors.lineStrong, padding: 24 },
  talkTitle: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 28, letterSpacing: -0.27, color: colors.ink },
  phoneLink: { fontFamily: fonts.sansBold, color: colors.terracotta, textDecorationLine: "none" },
  steps: { marginTop: 32, gap: 20 },
  step: { padding: 24 },
  stepNo: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, letterSpacing: -0.21, color: colors.terracotta },
});
