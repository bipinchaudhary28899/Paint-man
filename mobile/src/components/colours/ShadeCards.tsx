import { Pressable, StyleSheet, Text, View } from "react-native";

import { Anchor, Container, usePage } from "~/components/site/Page";
import { Card, LinkArrow, TitleLink } from "~/components/ui/Bits";
import { Em, H, P } from "~/components/ui/Text";
import { formatCount, joinAnd, shadeCardPath, type CardList, type ShadeCard, type ShadeCardWithSamples, type ShadeCredit, type ShadeFamily } from "~/lib/colours";
import { openHref } from "~/lib/links";
import { colors, fonts } from "~/theme";
import { ColourTools } from "./ColourTools";
import { HeroText } from "./Hero";
import { CompareSection, FamilyChip } from "./Sections";
import { PaintDbCredit, ShadeSwatches } from "./ShadeSwatches";

// The brands' shade-card pages on phones (/shade-cards, /shade-cards/<brand>, /shade-cards/<brand>/<family>),
// with the website's copy, built from the same facts the website builds it from (counts, LRV ranges,
// undertones), which the app gets from /api/v1/colours/shade-cards.

// ---------- /shade-cards ----------

/** The hub's intro and colour tools, under its h1. */
export function HubIntro({ list }: { list: CardList }) {
  const names = joinAnd(list.cards.map((c) => c.name));
  return (
    <>
      <HeroText leading={1.65}>
        {formatCount(list.shades)} shades from {names}, the brands we supply and apply. Each card lists every shade with the code printed on the paper card, grouped by colour family
        and ordered light to dark, so you can shortlist before the site visit and quote exact codes.
      </HeroText>
      <ColourTools current="shade-cards" style={styles.tools} />
    </>
  );
}

/** "Choose a shade card": a card per brand with its family strip, counts and links to each family with a page. */
export function HubCards({ list }: { list: CardList }) {
  return (
    <Container style={styles.mt64}>
      <H size={30} leading={1.2}>
        Choose a <Em>shade card</Em>
      </H>
      <View style={styles.cards}>
        {list.cards.map((c) => (
          <Card key={c.slug} style={styles.card}>
            <View style={styles.strip} aria-hidden>
              {c.families.map((f) => (
                <View key={f.family} style={[styles.flex, { backgroundColor: f.swatch }]} />
              ))}
            </View>
            <View style={styles.cardBody}>
              <TitleLink label={`${c.name} shade card`} onPress={() => openHref(shadeCardPath(c.slug))} />
              <P color={colors.muted} style={styles.mt4}>
                {formatCount(c.count)} shades in {c.families.length} colour families, LRV {c.lrv.min} to {c.lrv.max}.
              </P>
              <View style={styles.familyLinks} accessibilityLabel={`${c.shortName} colour families`}>
                {c.families
                  .filter((f) => f.hasPage)
                  .map((f) => (
                    <Pressable key={f.family} accessibilityRole="link" onPress={() => openHref(shadeCardPath(c.slug, f.family))} style={styles.familyLink}>
                      <Text style={styles.familyLinkText}>
                        {f.label} <Text style={styles.familyCount}>{f.count}</Text>
                      </Text>
                    </Pressable>
                  ))}
              </View>
            </View>
          </Card>
        ))}
      </View>
      <View style={styles.mt32}>
        <PaintDbCredit credit={list.credit} />
      </View>
    </Container>
  );
}

// ---------- /shade-cards/<brand> ----------

/** The brand page's intro paragraphs and the chips that scroll to each family. */
export function CardIntro({ card }: { card: ShadeCardWithSamples }) {
  const { scrollTo } = usePage();
  return (
    <>
      <HeroText leading={1.65}>
        {formatCount(card.count)} shades from the {card.name} shade card, in the order of the paper card: {card.families.length} colour families from white to black, each from light to
        dark. Every swatch carries the code to quote to a painter or a paint shop. Tap one to see it on a room wall in the colour finder.
      </HeroText>
      <HeroText size={16} leading={1.65} first={false}>
        LRV (light reflectance value) runs from {card.lrv.min} to {card.lrv.max} on this card: the higher the number, the more light the wall gives back. A high LRV keeps a small or
        north-facing room bright; a low one suits a feature wall.
      </HeroText>
      <View accessibilityLabel={`${card.shortName} colour families`} style={styles.chips}>
        {card.families.map((f) => (
          <FamilyChip key={f.family} label={f.label} count={f.count} dot={f.swatch} onPress={() => scrollTo(f.family)} />
        ))}
      </View>
    </>
  );
}

/** Each family of the card: its heading and facts, the link to its page, and its swatches. */
export function CardFamilies({ card }: { card: ShadeCardWithSamples }) {
  return (
    <>
      {card.families.map((f) => (
        <Container key={f.family} style={styles.mt64}>
          <Anchor id={f.family}>
            <H size={30} leading={1.2}>
              {card.shortName} <Em>{f.family}</Em> shades
            </H>
            <P color={colors.muted} leading={1.6} style={styles.mt8}>
              {f.count} on the card, LRV {f.lrv.max} to {f.lrv.min}, mostly {f.undertones.join(" or ")} undertones.
              {f.hasPage ? ` ${f.sample.length} of them, lightest to darkest:` : ""}
            </P>
            {f.hasPage && (
              <LinkArrow label={`All ${f.count} ${f.family} shades`} onPress={() => openHref(shadeCardPath(card.slug, f.family))} textStyle={styles.arrowText} style={styles.mt16} />
            )}
          </Anchor>
          <View style={styles.mt24}>
            <ShadeSwatches shades={f.sample} label={`${card.shortName} ${f.family} shades`} />
          </View>
        </Container>
      ))}
    </>
  );
}

/** "Other shade cards": the other brands, then the finder, then the credit. */
export function OtherCards({ card, cards, credit }: { card: Pick<ShadeCard, "slug">; cards: ShadeCard[]; credit: ShadeCredit }) {
  const items = [
    ...cards.filter((c) => c.slug !== card.slug).map((c) => ({ label: `${c.name} shade card`, href: shadeCardPath(c.slug), text: `${formatCount(c.count)} shades` })),
    { label: "Colour finder", href: "/colours", text: "Search every card at once by code, name or hex" },
  ];
  return (
    <CompareSection
      heading={
        <>
          Other <Em>shade cards</Em>
        </>
      }
      items={items}
    >
      <PaintDbCredit credit={credit} />
    </CompareSection>
  );
}

// ---------- /shade-cards/<brand>/<family> ----------

/** The family page's intro and the chips to the card's other families. */
export function FamilyIntro({ family: f, card }: { family: ShadeFamily; card?: ShadeCard }) {
  return (
    <>
      <HeroText leading={1.65}>
        All {f.count} {f.family} shades on the {f.brandName} card, from light to dark. LRV runs from {f.lrv.max} ({f.lightest.name}) down to {f.lrv.min} ({f.darkest.name}); most have a{" "}
        {f.undertones.join(" or ")} undertone. Each swatch shows the code to quote to a painter or a paint shop. Tap one to see it on a room wall.
      </HeroText>
      {card && (
        <View accessibilityLabel={`Other ${f.shortName} colour families`} style={styles.chips}>
          {card.families.map((x) =>
            x.family === f.family ? (
              <FamilyChip key={x.family} label={x.label} current />
            ) : (
              <FamilyChip key={x.family} label={x.label} onPress={() => openHref(x.hasPage ? shadeCardPath(card.slug, x.family) : `${shadeCardPath(card.slug)}#${x.family}`)} />
            ),
          )}
        </View>
      )}
    </>
  );
}

/** Every shade of the family, light to dark. */
export function FamilyShades({ family: f }: { family: ShadeFamily }) {
  return (
    <Container style={styles.mt48}>
      <H size={30} leading={1.2}>
        {f.count} {f.shortName} <Em>{f.family}</Em> shades, light to dark
      </H>
      <View style={styles.mt24}>
        <ShadeSwatches shades={f.shades} label={`${f.shortName} ${f.family} shades`} />
      </View>
    </Container>
  );
}

/** "{Family} shades from other brands": the same family on the other cards, then this whole card. */
export function SameFamily({ family: f, cards, credit }: { family: ShadeFamily; cards: ShadeCard[]; credit: ShadeCredit }) {
  const card = cards.find((c) => c.slug === f.brand);
  const others = cards.filter((c) => c.slug !== f.brand && c.families.some((x) => x.family === f.family && x.hasPage));
  const items = [
    ...others.map((c) => ({ label: `${c.shortName} ${f.family} shades`, href: shadeCardPath(c.slug, f.family), text: `${c.families.find((x) => x.family === f.family)!.count} on the ${c.name} card` })),
    { label: `The whole ${f.brandName} card`, href: shadeCardPath(f.brand), text: card ? `${formatCount(card.count)} shades in ${card.families.length} families` : "" },
  ];
  return (
    <CompareSection
      heading={
        <>
          {f.label} shades from <Em>other brands</Em>
        </>
      }
      items={items}
    >
      <PaintDbCredit credit={credit} />
    </CompareSection>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
  mt32: { marginTop: 32 },
  mt48: { marginTop: 48 },
  mt64: { marginTop: 64 },
  tools: { marginTop: 32 },
  cards: { marginTop: 32, gap: 20 },
  card: { overflow: "hidden" },
  strip: { height: 64, flexDirection: "row" },
  cardBody: { padding: 24 },
  familyLinks: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", columnGap: 16 },
  familyLink: { minHeight: 44, justifyContent: "center" },
  familyLinkText: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 22.5, letterSpacing: -0.08, color: colors.ink },
  familyCount: { fontFamily: fonts.sans, color: colors.muted },
  chips: { marginTop: 32, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  arrowText: { fontSize: 15 },
});
