import { memo, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from "react-native";

import { Card, Swipe } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { Photo } from "~/components/ui/Media";
import { H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { servicePath, services, type Service } from "~/shared";
import { colors, fonts, gutter, radii } from "~/theme";
import { ServiceSticker } from "./bits";

// The services as a swipe row of cards (the home page's "Every wall in the house" and /services): one
// card fills the screen less a peek of the next, each snaps into place, and dots with a "1 / 4" counter
// say where you are. A card is the service's photo (the card frames it), its coloured sticker, its name,
// one short line and a pill opening the service; on /services a second pill books a visit for it.

const GAP = 12;
/** How much of the next card shows at the screen's edge. */
const PEEK = 32;
const MAX_CARD = 340;

/** Photo crops the website gives a service's picture (object-position). */
const photoPosition: Record<string, { left: `${number}%`; top: `${number}%` }> = {
  "exterior-painting": { left: "50%", top: "70%" },
};

/**
 * A service's one short line: its description up to the colon ("Interior wall painting without managing
 * painters yourself."), or the whole description when it has none.
 */
export function serviceLine(service: Pick<Service, "description">): string {
  const [lead] = service.description.split(":");
  return /[.!?]$/.test(lead) ? lead : `${lead}.`;
}

/** The card in view for a scroll offset: the nearest snap point, and the last card once the row is at its end. */
export function cardInView(x: number, interval: number, maxScroll: number, count: number): number {
  if (maxScroll > 0 && x >= maxScroll - 1) return count - 1;
  return Math.min(count - 1, Math.max(0, Math.round(x / interval)));
}

/** One card; memoised, so the dots following the scroll never re-render the cards. */
const ServiceCard = memo(function ServiceCard({ service, width, book }: { service: Service; width: number; book: boolean }) {
  return (
    <Card radius={radii.xl} style={[styles.card, { width }]}>
      <View>
        {/* fetched at the card's width; low priority: the carousel sits below the page's first screen */}
        <Photo image={service.image} width={width} aspectRatio={16 / 10} position={photoPosition[service.slug]} priority="low" recyclingKey={service.slug} />
        <ServiceSticker service={service} style={styles.sticker} />
      </View>
      <View style={styles.body}>
        <H size={24} leading={1.12} balance={false}>
          {service.name}
        </H>
        <P size={14} leading={1.55} color={colors.muted} style={styles.line}>
          {serviceLine(service)}
        </P>
        <View style={styles.actions}>
          <Button
            small
            label="View service"
            accessibilityRole="link"
            accessibilityLabel={`View ${service.name}`}
            onPress={() => openHref(servicePath(service))}
          />
          {book && (
            <Button
              small
              variant="secondary"
              label="Book site visit"
              accessibilityLabel={`Book a site visit for ${service.name.toLowerCase()}`}
              onPress={() => openHref(`/book?service=${service.slug}`)}
            />
          )}
        </View>
      </View>
    </Card>
  );
});

/** Every service as a snapping swipe row with dots and a counter. `book` adds a "Book site visit" pill to each card. */
export function ServiceCarousel({ book = false, style }: { book?: boolean; style?: StyleProp<ViewStyle> }) {
  const { width } = useWindowDimensions();
  const card = Math.min(MAX_CARD, width - 2 * gutter - PEEK);
  const interval = card + GAP;
  const [active, setActive] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const index = cardInView(contentOffset.x, interval, contentSize.width - layoutMeasurement.width, services.length);
    if (index !== active) setActive(index);
  };
  return (
    <View style={style}>
      <Swipe
        gap={GAP}
        snapToInterval={interval}
        snapToAlignment="start"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        accessibilityLabel="Services, swipe for more"
        contentStyle={styles.row}
      >
        {services.map((s) => (
          <ServiceCard key={s.slug} service={s} width={card} book={book} />
        ))}
      </Swipe>
      <View style={styles.footer}>
        <View style={styles.dots} aria-hidden>
          {services.map((s, i) => (
            <View key={s.slug} style={[styles.dot, i === active && styles.dotOn]} />
          ))}
        </View>
        <Text style={styles.counter} accessibilityLabel={`Service ${active + 1} of ${services.length}`}>
          {active + 1} / {services.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // room under the cards for the hairline to show
  row: { paddingBottom: 2 },
  card: { overflow: "hidden" },
  sticker: { position: "absolute", left: 14, top: 14 },
  body: { flex: 1, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 },
  line: { marginTop: 8 },
  // the pills sit at the foot of every card, so a row of cards of different lengths lines up
  actions: { marginTop: "auto", paddingTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  footer: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dots: { flexDirection: "row", gap: 6 },
  dot: { height: 4, width: 6, borderRadius: 2, backgroundColor: "rgba(36, 37, 34, 0.2)" },
  dotOn: { width: 22, backgroundColor: colors.terracotta },
  counter: { fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 16, color: colors.muted2 },
});
