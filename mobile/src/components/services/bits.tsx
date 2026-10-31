import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { LeadForm } from "~/components/site/LeadForm";
import { Anchor, Container } from "~/components/site/Page";
import { Breadcrumbs } from "~/components/site/Sections";
import { Arrow, Card } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { RevealContainer } from "~/components/ui/Reveal";
import { Em, Eyebrow, H, MAX_SCALE, P } from "~/components/ui/Text";
import { goldenText } from "~/lib/contrast";
import { openHref } from "~/lib/links";
import { cityPath, liveCities, type Service } from "~/shared";
import { colors, fonts, radii } from "~/theme";

// Pieces the services and city pages share: links inside text (the website's linkClass and its
// bold variant), the warm gradient word, the service's sticker, the "What's included" list, the
// arrow link with a longer spoken label, the live cities as links, the "Book … online" section with
// the booking form in a card, and the 404 page.

/** Styles for a link inside a line of text (`linkClass`, `font-bold text-ink underline`...). */
export const linkStyles = StyleSheet.create({
  /** font-semibold underline decoration-terracotta: the colour follows the paragraph */
  accent: { fontFamily: fonts.sansSemiBold, textDecorationLine: "underline", textDecorationColor: colors.terracotta },
  /** font-bold text-ink underline */
  bold: { fontFamily: fonts.sansBold, color: colors.ink, textDecorationLine: "underline", textDecorationColor: colors.ink },
  /** underline only (the PaintDB credit) */
  plain: { textDecorationLine: "underline" },
});

/** The side cards beside a service's details: the ink card (on-ink text, golden link underlines) and the white ones (p-7). */
export const asideStyles = StyleSheet.create({
  inkCard: { backgroundColor: colors.ink, padding: 28 },
  sideCard: { padding: 28 },
  onInk: { color: colors.onInk },
  onInkLink: { color: colors.onInk, textDecorationColor: colors.golden },
});

/** A website link inside a paragraph: opens its screen (or the browser) through openHref. */
export function TextLink({ href, children, style = linkStyles.accent }: { href: string; children: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text accessibilityRole="link" style={style} onPress={() => openHref(href)}>
      {children}
    </Text>
  );
}

/** A link on its own line, at least 44px tall (`inline-flex min-h-11 items-center` + underline). */
export function BlockLink({ href, label, style, textStyle }: { href: string; label: string; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={() => openHref(href)} style={[styles.blockLink, style]}>
      <Text style={[styles.blockLinkText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

// the deepened text golden at the end, so the last letters read at 3:1 or more (the brand golden is 1.7:1 on canvas)
const WARM = [colors.sage, colors.terracottaLight, goldenText] as const;

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** The colour at `t` (0–1) along .text-gradient-warm (sage → terracotta-light → text golden). */
export function warmAt(t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (WARM.length - 1);
  const i = Math.min(WARM.length - 2, Math.floor(x));
  const a = channels(WARM[i]);
  const b = channels(WARM[i + 1]);
  const mix = a.map((v, k) => Math.round(v + (b[k] - v) * (x - i)));
  return `#${mix.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** .text-gradient-warm inside a heading: each letter takes the gradient's colour at its place in the word. */
export function GradientWord({ children }: { children: string }) {
  const letters = [...children];
  return (
    <Text>
      {letters.map((ch, i) => (
        <Text key={i} style={{ color: warmAt((i + 0.5) / letters.length) }}>
          {ch}
        </Text>
      ))}
    </Text>
  );
}

const ACCENT_BG: Record<string, string> = { "bg-terracotta": colors.terracotta, "bg-sage-deep": colors.sageDeep, "bg-golden": colors.golden, "bg-ink": colors.ink };
const ACCENT_TEXT: Record<string, string> = { "text-on-ink": colors.onInk, "text-ink": colors.ink };

/** A service's `accent` classes ("bg-terracotta text-on-ink") as the sticker's colours. */
export function accentColours(accent: string): { background: string; text: string } {
  const parts = accent.split(/\s+/);
  return {
    background: parts.map((p) => ACCENT_BG[p]).find(Boolean) ?? "rgba(248, 245, 239, 0.9)",
    text: parts.map((p) => ACCENT_TEXT[p]).find(Boolean) ?? colors.ink,
  };
}

/** The .sticker on a service photo, in the service's accent colours; pinned over the photo, its text stops growing at 1.3×. */
export function ServiceSticker({ service, style }: { service: Service; style?: StyleProp<ViewStyle> }) {
  const { background, text } = accentColours(service.accent);
  return (
    <View style={[styles.sticker, { backgroundColor: background }, style]}>
      <Text maxFontSizeMultiplier={MAX_SCALE.fixed} style={[styles.stickerText, { color: text }]}>
        {service.shortName}
      </Text>
    </View>
  );
}

/** A ✓ line (text-success tick): the service card's includes and the aftercare list. */
export function Tick({ children, size = 16, leading = 26, weight = "regular", gap = 12 }: { children: string; size?: number; leading?: number; weight?: "regular" | "semibold"; gap?: number }) {
  const text = { fontSize: size, lineHeight: leading, fontFamily: weight === "semibold" ? fonts.sansSemiBold : fonts.sans };
  return (
    <View style={[styles.tickRow, { gap }]}>
      <Text aria-hidden style={[text, styles.tick]}>
        ✓
      </Text>
      <Text style={[text, styles.tickText]}>{children}</Text>
    </View>
  );
}

/** "What's included" (the warm gradient word) and the service's includes as rounded white rows with a terracotta dot. */
export function Included({ service }: { service: Service }) {
  return (
    <View>
      <H size={30} leading={1.2}>
        What&apos;s <GradientWord>included</GradientWord>
      </H>
      <View style={styles.included}>
        {service.includes.map((inc) => (
          <View key={inc} style={styles.includedRow}>
            <View aria-hidden style={styles.dot} />
            <P weight="semibold" style={styles.flex}>
              {inc}
            </P>
          </View>
        ))}
      </View>
    </View>
  );
}

/** .link-arrow at 15px: a label, the arrow, 44px tall; `spoken` is the fuller label a screen reader hears ("Book a slot in Tajganj"). */
export function ArrowLink({ label, spoken, onPress, style }: { label: string; spoken?: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={spoken ?? label} onPress={onPress} hitSlop={4} style={[styles.arrowLink, style]}>
      <Text style={styles.arrowLinkText}>{label}</Text>
      <Arrow size={16} />
    </Pressable>
  );
}

/** "Agra, Mathura and Vrindavan" with each name linking to its city page (LiveCityLinks), inside a paragraph. */
export function LiveCityLinks({ style = linkStyles.accent, conjunction = "and" }: { style?: StyleProp<TextStyle>; conjunction?: "and" | "or" }) {
  const live = liveCities();
  return (
    <>
      {live.map((c, i) => (
        <Text key={c.slug}>
          {i > 0 && (i === live.length - 1 ? ` ${conjunction} ` : ", ")}
          <TextLink href={cityPath(c)} style={style}>
            {c.name}
          </TextLink>
        </Text>
      ))}
    </>
  );
}

/** The services' own booking block (#book-inspection): the heading, the text, an optional line, then LeadForm in a white card. */
export function BookInspection({ heading, service, city, children }: { heading: ReactNode; service: Service; city?: string; children?: ReactNode }) {
  return (
    <Anchor id="book-inspection">
      <RevealContainer style={styles.bookTop}>
        <H size={32} leading={1.08}>
          {heading}
        </H>
        <P size={16} leading={1.625} color={colors.muted} style={styles.mt16}>
          Share a few details and we&apos;ll call to fix a time for the inspection. The inspector measures your walls, brings shade cards and sends an itemised quotation. Nothing is booked until you approve it.
        </P>
        {children}
        <Card style={styles.formCard}>
          <LeadForm type="booking" defaultService={service.leadService} defaultCity={city} />
        </Card>
      </RevealContainer>
    </Anchor>
  );
}

/** The cream-wash hero of the house-painting pages: breadcrumbs, then the page's own heading and copy (py-12, a hairline under it unless `rule` is off). */
export function CreamHero({ crumbs, rule = true, children }: { crumbs: { name: string; path: string }[]; rule?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.creamHero, rule && styles.creamRule]}>
      <Container>
        <Breadcrumbs items={crumbs} />
        {children}
      </Container>
    </View>
  );
}

/** The house-painting pages' h1: 40px serif, leading 1.04, tracking -0.02em. */
export function HeroTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <H size={40} leading={1.04} tracking={-0.02} style={style}>
      {children}
    </H>
  );
}

/** A section opener on the city pages: the eyebrow, then a 30px heading 12px under it. */
export function SectionHead({ eyebrow, children, style }: { eyebrow: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Eyebrow style={styles.eyebrow}>{eyebrow}</Eyebrow>
      <H size={30} leading={1.2} style={styles.mt12}>
        {children}
      </H>
    </View>
  );
}

/** A locality as a rounded chip (min-h-11 rounded-full border bg-paper px-4 text-sm semibold). */
export function LocalityChip({ name, onPress }: { name: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={name} onPress={onPress} style={chip.box}>
      <Text style={chip.text}>{name}</Text>
    </Pressable>
  );
}

export const chip = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  box: { minHeight: 44, justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 16 },
  text: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.ink },
});

const notFoundLinks = [
  { href: "/services", label: "Painting services" },
  { href: "/colours", label: "Colour finder" },
  { href: "/faq", label: "Questions and answers" },
  { href: "/contact", label: "Contact us" },
];

/** The website's 404 (src/app/not-found.tsx), for a service or city the website has no page for. */
export function NotFound() {
  return (
    <Container style={styles.notFound}>
      <H size={40} leading={1.05} tracking={-0.02} style={styles.center}>
        Page not <Em>found.</Em>
      </H>
      <P size={18} leading={1.65} color={colors.muted} style={[styles.center, styles.mt20]}>
        Arre, yeh page nahi mila. The page you&apos;re looking for doesn&apos;t exist or has moved. These pages are a good place to pick up again.
      </P>
      <View style={styles.notFoundLinks}>
        {notFoundLinks.map((l) => (
          <BlockLink key={l.href} href={l.href} label={l.label} textStyle={styles.notFoundLink} />
        ))}
      </View>
      <View style={styles.notFoundButtons}>
        <Button label="Back to home" variant="secondary" onPress={() => openHref("/")} />
        <Button label="Book an inspection" onPress={() => openHref("/book")} />
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: "center" },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
  creamHero: { backgroundColor: colors.creamWash, paddingVertical: 48 },
  creamRule: { borderBottomWidth: 1, borderColor: colors.line },
  eyebrow: { lineHeight: 18 },
  blockLink: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  blockLinkText: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 24, color: colors.ink, textDecorationLine: "underline", textDecorationColor: colors.terracotta },
  sticker: { borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 14 },
  stickerText: { fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 11, letterSpacing: 1.32, textTransform: "uppercase" },
  tickRow: { flexDirection: "row" },
  tick: { color: colors.fern },
  tickText: { flex: 1, color: colors.ink, letterSpacing: -0.08 },
  included: { marginTop: 24, gap: 12 },
  includedRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, padding: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.terracotta },
  arrowLink: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, alignSelf: "flex-start" },
  arrowLinkText: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22.5, color: colors.ink },
  bookTop: { marginTop: 80 },
  formCard: { marginTop: 40, padding: 24 },
  notFound: { paddingVertical: 96, alignItems: "center" },
  notFoundLinks: { marginTop: 32, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 24, rowGap: 4 },
  notFoundLink: { fontFamily: fonts.sansMedium, fontSize: 15, textDecorationColor: colors.lineStrong },
  notFoundButtons: { marginTop: 32, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 },
});
