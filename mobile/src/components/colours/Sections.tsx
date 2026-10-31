import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Container } from "~/components/site/Page";
import { Button } from "~/components/ui/Button";
import { Collapse, Turn } from "~/components/ui/Collapse";
import { Reveal } from "~/components/ui/Reveal";
import { Skeleton, SkeletonGroup, SkeletonLines } from "~/components/ui/Skeleton";
import { Eyebrow, H, P } from "~/components/ui/Text";
import type { ApiError } from "~/lib/api";
import { openHref } from "~/lib/links";
import { colors, fonts, radii } from "~/theme";

// Pieces the colour pages share: the finder's "Colour questions" (rounded question cards that open
// in place, sliding open and shut), the shade cards' "Compare brands" lists, the family chips, and what
// a screen shows while its data loads (skeletons in its shape) or after it failed.

type Faq = { q: string; a: string };

/** "Before you pick / Colour questions": white rounded cards, a serif question and an ink + that turns terracotta and to × when open. */
export function ColourFaqs({ faqs, style }: { faqs: Faq[]; style?: StyleProp<ViewStyle> }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const toggle = (i: number) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  return (
    <Reveal style={style}>
      <Container>
        <Eyebrow>Before you pick</Eyebrow>
        <H size={30} leading={1.2} style={styles.mt12}>
          Colour questions
        </H>
        <View style={styles.faqs}>
          {faqs.map((f, i) => {
            const expanded = open.has(i);
            return (
              <View key={f.q} style={[styles.faq, expanded && styles.faqOpen]}>
                <Pressable accessibilityRole="button" accessibilityLabel={f.q} accessibilityState={{ expanded }} onPress={() => toggle(i)} style={styles.summary}>
                  <Text accessibilityRole="header" style={styles.question}>
                    {f.q}
                  </Text>
                  <View style={[styles.plus, expanded && styles.plusOpen]} aria-hidden>
                    <Turn open={expanded} degrees={45}>
                      <Text style={styles.plusText}>+</Text>
                    </Turn>
                  </View>
                </Pressable>
                <Collapse open={expanded} style={styles.answer}>
                  <P size={16} leading={1.625} color={colors.muted}>
                    {f.a}
                  </P>
                </Collapse>
              </View>
            );
          })}
        </View>
      </Container>
    </Reveal>
  );
}

type CompareItem = { label: string; href: string; text: string };

/** "Compare brands": an eyebrow, an h2 with its accent, a ruled list of links with a line under each, then whatever follows (the credit). */
export function CompareSection({ heading, items, children }: { heading: ReactNode; items: CompareItem[]; children?: ReactNode }) {
  return (
    <Reveal style={styles.compare}>
      <Container>
        <Eyebrow>Compare brands</Eyebrow>
        <H size={30} leading={1.2} style={styles.mt12}>
          {heading}
        </H>
        <View style={styles.compareList}>
          {items.map((it) => (
            <View key={it.href} style={styles.compareItem}>
              <Pressable accessibilityRole="link" onPress={() => openHref(it.href)} style={styles.compareLink}>
                <Text style={styles.compareLabel}>{it.label}</Text>
              </Pressable>
              <Text style={styles.compareText}>{it.text}</Text>
            </View>
          ))}
        </View>
        <View style={styles.mt24}>{children}</View>
      </Container>
    </Reveal>
  );
}

/** A rounded family chip (min 44pt): a dot of the family's colour, its name and count; `current` is the ink chip of the page you are on. */
export function FamilyChip({ label, count, dot, current = false, onPress }: { label: string; count?: number; dot?: string; current?: boolean; onPress?: () => void }) {
  const body = (
    <>
      {dot && <View style={[styles.chipDot, { backgroundColor: dot }]} aria-hidden />}
      <Text style={[styles.chipText, current && styles.chipTextOn]}>{label}</Text>
      {count !== undefined && <Text style={[styles.chipText, styles.chipCount]}>{count}</Text>}
    </>
  );
  return current ? (
    <View style={[styles.chip, styles.chipOn]} accessibilityState={{ selected: true }} accessible>
      {body}
    </View>
  ) : (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.chip}>
      {body}
    </Pressable>
  );
}

/**
 * While a shade-card screen's data loads, its shape in skeletons (the intro's lines, then a card's strip
 * of colour families and a few swatches with their codes), announced as `loading`; after a failure,
 * what went wrong and Try again (or, for a 404, `notFound`).
 */
export function LoadState({ error, retry, loading, notFound }: { error?: ApiError; retry: () => void; loading: string; notFound?: ReactNode }) {
  if (error?.status === 404 && notFound) return <View style={styles.load}>{notFound}</View>;
  if (!error) {
    return (
      <SkeletonGroup label={loading} style={styles.load} testID="load-skeleton">
        <SkeletonLines lines={3} height={16} gap={10} />
        <Skeleton height={28} radius={radii.pill} style={styles.mt24} />
        <View style={styles.skeletonSwatches}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.skeletonSwatch}>
              <Skeleton height={72} radius={12} />
              <Skeleton height={11} width="70%" />
            </View>
          ))}
        </View>
      </SkeletonGroup>
    );
  }
  return (
    <View style={styles.load}>
      <Text style={styles.loadText} accessibilityLiveRegion="polite">
        {error.message}
      </Text>
      <Button label="Try again" variant="secondary" onPress={retry} style={styles.retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  mt12: { marginTop: 12 },
  mt24: { marginTop: 24 },
  faqs: { marginTop: 40, gap: 12 },
  faq: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, padding: 20 },
  faqOpen: { backgroundColor: colors.creamWash },
  summary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  question: { flex: 1, fontFamily: fonts.serif, fontSize: 18, lineHeight: 28, letterSpacing: -0.27, color: colors.ink },
  plus: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  plusOpen: { backgroundColor: colors.terracotta },
  answer: { paddingTop: 12 },
  plusText: { fontFamily: fonts.sans, fontSize: 20, lineHeight: 28, color: colors.onInk },
  compare: { marginTop: 96 },
  compareList: { marginTop: 40 },
  compareItem: { borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 12 },
  compareLink: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  compareLabel: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 24, letterSpacing: -0.08, color: colors.ink },
  compareText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, letterSpacing: -0.07, color: colors.muted },
  chip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
  },
  chipOn: { borderWidth: 0, backgroundColor: colors.ink },
  chipDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.line },
  chipText: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, letterSpacing: -0.07, color: colors.ink },
  chipTextOn: { color: colors.onInk },
  chipCount: { fontFamily: fonts.sans, color: colors.muted },
  load: { paddingVertical: 24 },
  skeletonSwatches: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  skeletonSwatch: { width: "30%", flexGrow: 1, gap: 6 },
  loadText: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.muted },
  retry: { marginTop: 12, alignSelf: "flex-start" },
});
