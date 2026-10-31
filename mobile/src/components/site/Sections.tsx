import { router } from "expo-router";
import { Fragment, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from "react-native";

import { Button } from "~/components/ui/Button";
import { Card, Plus, Swipe } from "~/components/ui/Bits";
import { Collapse } from "~/components/ui/Collapse";
import { Reveal } from "~/components/ui/Reveal";
import { Art, Photo } from "~/components/ui/Media";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { illustrations, liveCityNames, promises, site, workFlow, type FaqItem } from "~/shared";
import { colors, fonts, radii } from "~/theme";
import { LeadForm } from "./LeadForm";
import { Anchor, Container } from "./Page";

// The sections the website repeats across pages, at their phone sizes: breadcrumbs, the inner-page
// hero, the FAQ accordion, the promises swipe row, "How the work gets done", the closing banner and
// the booking section. The sections below a page's hero rise into view as they scroll in (Reveal).

/** Breadcrumbs: "Home / Services / Interior", text-sm medium muted; every crumb but the last is a link. */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <View accessibilityLabel="Breadcrumb" style={styles.crumbs}>
      <Text style={styles.crumb} accessibilityRole="link" onPress={() => router.navigate("/")}>
        Home
      </Text>
      {items.map((item, i) => (
        <Fragment key={item.path}>
          <Text style={styles.crumb} aria-hidden>
            /
          </Text>
          {i === items.length - 1 ? (
            <Text style={styles.crumb}>{item.name}</Text>
          ) : (
            <Text style={styles.crumb} accessibilityRole="link" onPress={() => openHref(item.path)}>
              {item.name}
            </Text>
          )}
        </Fragment>
      ))}
    </View>
  );
}

/** The inner pages' hero (PageHero): breadcrumbs, a 40px serif title, the muted intro, one photo. */
export function PageHero({ title, intro, crumbs, image, children }: { title: ReactNode; intro?: ReactNode; crumbs: { name: string; path: string }[]; image?: { src: string; alt: string }; children?: ReactNode }) {
  return (
    <View style={styles.hero}>
      <Container style={styles.heroInner}>
        <Breadcrumbs items={crumbs} />
        <H size={40} leading={1.04} tracking={-0.02} style={styles.heroTitle}>
          {title}
        </H>
        {intro ? (
          <P size={18} leading={1.65} color={colors.muted} style={styles.heroIntro}>
            {intro}
          </P>
        ) : null}
        {children}
        {image && (
          <View style={styles.heroPhoto}>
            <Photo image={image} aspectRatio={4 / 5} priority="high" />
          </View>
        )}
      </Container>
    </View>
  );
}

/** The FAQ accordion (FaqList on phones): 80px rows, 16px semibold questions, a + that turns to ×, each answer sliding open and shut. */
export function FaqList({ faqs, openFirst = false }: { faqs: readonly FaqItem[]; openFirst?: boolean }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set(openFirst ? [0] : []));
  const toggle = (i: number) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  return (
    <View style={styles.rules}>
      {faqs.map((f, i) => {
        const expanded = open.has(i);
        return (
          <View key={f.q} style={styles.rule}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => toggle(i)} style={styles.question}>
              <Text accessibilityRole="header" style={styles.q}>
                {f.q}
              </Text>
              <Plus open={expanded} size={16} disc />
            </Pressable>
            <Collapse open={expanded} style={styles.answer}>
              <P size={15} leading={1.6} color={colors.muted}>
                {f.a}
              </P>
              {f.link && (
                <Text accessibilityRole="link" style={styles.faqLink} onPress={() => openHref(f.link!.href)}>
                  {f.link.label} →
                </Text>
              )}
            </Collapse>
          </View>
        );
      })}
    </View>
  );
}

/** "What you can count on": the promises as a swipe row of numbered cards, a "1 / 6" counter and dots. */
export function Promises({ heading = true, style }: { heading?: boolean; style?: StyleProp<ViewStyle> }) {
  const { width } = useWindowDimensions();
  const card = Math.min(286, width * 0.8);
  const [active, setActive] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const max = contentSize.width - layoutMeasurement.width;
    const index = contentOffset.x >= max - 1 ? promises.length - 1 : Math.round(contentOffset.x / (card + 12));
    if (index !== active) setActive(index);
  };
  return (
    <Reveal style={style}>
      <View accessibilityLabel={heading ? undefined : "What you can count on"}>
        {heading && (
          <View style={styles.promisesHead}>
            <H size={30} leading={1.06} style={styles.flexShrink}>
              What you can <Em>count on</Em>
            </H>
            <Text style={styles.counter}>
              {active + 1} / {promises.length}
            </Text>
          </View>
        )}
        <View style={heading ? styles.promisesRow : undefined}>
          <Swipe gap={12} snapToInterval={card + 12} snapToAlignment="start" onScroll={onScroll} scrollEventThrottle={16} accessibilityLabel="Promises, swipe for more" contentStyle={styles.swipePad}>
            {promises.map((p, i) => (
              <Card key={p.title} radius={18} style={[styles.promise, { width: card }]}>
                <View style={styles.promiseNo}>
                  <Text style={styles.promiseNoText}>{String(i + 1).padStart(2, "0")}</Text>
                </View>
                <H size={19} leading={1.15}>
                  {p.title}
                </H>
                <P size={14} leading={1.5} color={colors.muted}>
                  {p.text}
                </P>
              </Card>
            ))}
          </Swipe>
        </View>
        <View style={styles.dots} aria-hidden>
          {promises.map((p, i) => (
            <View key={p.title} style={[styles.dot, i === active && styles.dotOn]} />
          ))}
        </View>
      </View>
    </Reveal>
  );
}

type Step = (typeof workFlow)[number];

/** "How the work gets done" on phones: a numbered timeline joined by a hairline, the toolbox beside the heading, a full-width button under it. */
export function WorkFlow({ steps = workFlow, cta, style }: { steps?: readonly Step[]; cta?: { label: string; onPress: () => void }; style?: StyleProp<ViewStyle> }) {
  return (
    <Reveal style={style}>
      <View style={styles.flowHead}>
        <View style={styles.flexShrink}>
          <Eyebrow size={11}>From booking to handover</Eyebrow>
          <H size={30} leading={1.06} style={styles.mt8}>
            How the work <Em>gets done</Em>
          </H>
        </View>
        <Art art={illustrations.toolbox} width={104} />
      </View>
      <View style={styles.flowList}>
        {steps.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <View style={styles.rail}>
              <View style={styles.stepNo}>
                <Text style={styles.stepNoText}>{i + 1}</Text>
              </View>
              {i < steps.length - 1 && <View style={styles.railLine} />}
            </View>
            <View style={styles.stepBody}>
              {s.image && (
                <View style={styles.stepImage}>
                  <Photo image={s.image} aspectRatio={4 / 3} fit="contain" style={styles.stepPhoto} />
                </View>
              )}
              <H size={18} leading={1.2}>
                {s.title}
              </H>
              <P size={14} leading={1.55} color={colors.muted} style={styles.mt4}>
                {s.text}
              </P>
            </View>
          </View>
        ))}
      </View>
      {cta && <Button label={cta.label} onPress={cta.onPress} large height={54} style={styles.mt4} />}
    </Reveal>
  );
}

/** The closing banner on every page: "Let's give your home a fresh coat.", two full-width buttons, the painter standing on the footer. */
export function CtaBanner({ heading, flushTop = false }: { heading?: ReactNode; flushTop?: boolean }) {
  return (
    <Anchor id="book">
      <Reveal style={flushTop ? undefined : styles.ctaTop}>
        <Container>
          <View style={styles.ctaCopy}>
            <Eyebrow size={11}>Free estimate</Eyebrow>
            <H size={38} leading={1.04} tracking={-0.02} style={styles.mt14}>
              {heading ?? (
                <>
                  Let&apos;s give your home a <Em>fresh coat.</Em>
                </>
              )}
            </H>
            <P size={15} leading={1.6} color={colors.inkSoft} style={styles.mt14}>
              Chaliye, shuru karte hain. We&apos;ll inspect, advise on colours and send an itemised quote for your home in {liveCityNames("or")}. You decide from there.
            </P>
            <View style={styles.ctaButtons}>
              <Button label="Get a free estimate" large height={54} onPress={() => openHref("/book")} />
              {site.whatsapp ? (
                <Button label="Chat on WhatsApp" variant="secondary" large height={54} onPress={() => openHref(`https://wa.me/${site.whatsapp}`)} />
              ) : (
                <Button label="Talk to us" variant="secondary" large height={54} onPress={() => openHref("/contact")} />
              )}
            </View>
          </View>
          <Art art={illustrations.painter} width={300} style={styles.painter} />
        </Container>
      </Reveal>
    </Anchor>
  );
}

/** The booking section on phones: one white card with the heading, the paint can in its corner, the text, then the form (two short steps for a booking) with the note under its button. */
export function BookingSection({
  id = "book-visit",
  heading,
  text,
  note,
  type = "booking",
  defaultMessage,
  defaultService,
  defaultCity,
  style,
}: {
  id?: string;
  heading: ReactNode;
  text: ReactNode;
  note?: ReactNode;
  type?: "booking" | "contact";
  defaultMessage?: string;
  defaultService?: string;
  /** a live city's slug to start the form with (a city's own page) */
  defaultCity?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Anchor id={id} margin={112}>
      <Reveal style={[styles.bookingTop, style]}>
        <Container>
          <Card radius={radii.xl} style={styles.bookingCard}>
            <H size={30} leading={1.08} style={styles.bookingHeading}>
              {heading}
            </H>
            {typeof text === "string" ? (
              <P size={14} leading={1.6} color={colors.muted} style={styles.mt12}>
                {text}
              </P>
            ) : (
              <View style={styles.mt12}>{text}</View>
            )}
            <Art art={illustrations.paintCan} width={88} style={styles.can} />
            <View style={styles.mt20}>
              <LeadForm type={type} defaultMessage={defaultMessage} defaultService={defaultService} defaultCity={defaultCity} footnote={note} />
            </View>
          </Card>
        </Container>
      </Reveal>
    </Anchor>
  );
}

const styles = StyleSheet.create({
  flexShrink: { flexShrink: 1 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt14: { marginTop: 14 },
  mt20: { marginTop: 20 },
  crumbs: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  crumb: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20, color: colors.muted },
  hero: { borderBottomWidth: 1, borderColor: colors.lineSoft },
  heroInner: { paddingVertical: 56 },
  heroTitle: { marginTop: 24 },
  heroIntro: { marginTop: 24 },
  heroPhoto: {
    marginTop: 48,
    maxWidth: 448,
    width: "100%",
    shadowColor: colors.ink,
    shadowOpacity: 0.5,
    shadowRadius: 45,
    shadowOffset: { width: 0, height: 25 },
  },
  rules: { borderTopWidth: 1, borderColor: colors.line },
  rule: { borderBottomWidth: 1, borderColor: colors.line },
  question: { minHeight: 80, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  q: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 21.6, letterSpacing: -0.08, color: colors.ink },
  answer: { paddingBottom: 18, maxWidth: 600 },
  faqLink: {
    marginTop: 4,
    minHeight: 44,
    lineHeight: 44,
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.ink,
    textDecorationLine: "underline",
    textDecorationColor: colors.terracotta,
  },
  promisesHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  counter: { flexShrink: 0, fontFamily: fonts.sansMedium, fontSize: 12, color: colors.muted2 },
  promisesRow: { marginTop: 20 },
  swipePad: { paddingBottom: 4 },
  promise: { padding: 18, gap: 10 },
  promiseNo: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.creamWash, alignItems: "center", justifyContent: "center" },
  promiseNoText: { fontFamily: fonts.serif, fontSize: 13, color: colors.terracotta },
  dots: { marginTop: 14, flexDirection: "row", gap: 6 },
  dot: { height: 4, width: 6, borderRadius: 2, backgroundColor: "rgba(36, 37, 34, 0.2)" },
  dotOn: { width: 22, backgroundColor: colors.terracotta },
  flowHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  flowList: { marginTop: 24 },
  step: { flexDirection: "row", gap: 14 },
  rail: { width: 32, alignItems: "center" },
  stepNo: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center" },
  stepNoText: { fontFamily: fonts.serif, fontSize: 15, color: colors.onInk },
  railLine: { flex: 1, width: 1, marginVertical: 6, backgroundColor: colors.line },
  stepBody: { flex: 1, minWidth: 0, paddingTop: 4, paddingBottom: 22 },
  stepImage: { marginBottom: 12, borderRadius: 20, overflow: "hidden", backgroundColor: colors.sand },
  stepPhoto: { backgroundColor: "transparent" },
  ctaTop: { marginTop: 64 },
  ctaCopy: { paddingBottom: 16 },
  ctaButtons: { marginTop: 24, gap: 10 },
  painter: { alignSelf: "center", maxWidth: 300 },
  bookingTop: { marginTop: 80 },
  // 20pt sides leave room for the city pills on one line
  bookingCard: { padding: 20 },
  bookingHeading: { maxWidth: 210 },
  can: { position: "absolute", right: 14, top: 14 },
});
