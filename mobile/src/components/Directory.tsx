import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { City, Service } from "~/shared";
import { colors, fonts, gutter, radii } from "~/theme";
import { Photo } from "./Media";
import { Body, Eyebrow, Muted } from "./Text";

// The services and cities as tappable entries. Screens pass `onOpen` (a router push), so these
// stay plain components.

/** Services in a row that swipes sideways (home). */
export function ServiceTiles({ services, onOpen }: { services: readonly Service[]; onOpen: (slug: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.tiles}>
      {services.map((s) => (
        <Pressable key={s.slug} accessibilityRole="link" accessibilityLabel={s.name} onPress={() => onOpen(s.slug)} style={styles.tile}>
          <Photo image={s.image} aspectRatio={4 / 5} />
          <Text style={styles.tileName}>{s.name}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** Services one under another, each with its photo and intro (the services tab). */
export function ServiceList({ services, onOpen }: { services: readonly Service[]; onOpen: (slug: string) => void }) {
  return (
    <View style={styles.list}>
      {services.map((s) => (
        <Pressable key={s.slug} accessibilityRole="link" accessibilityLabel={s.name} onPress={() => onOpen(s.slug)} style={styles.row}>
          <Photo image={s.image} aspectRatio={16 / 10} />
          <Text style={styles.rowName}>{s.name}</Text>
          <Body style={styles.rowText}>{s.intro}</Body>
          <Text style={styles.more}>What's included →</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** "Now painting · 10 localities" or "Coming soon". */
export const cityStatus = (city: City) => (city.status === "live" ? `Now painting · ${city.areas.length} localities` : "Coming soon");

/** City cards: live cities with a few of their localities, then the cities coming soon. */
export function CityCards({ cities, onOpen }: { cities: readonly City[]; onOpen: (slug: string) => void }) {
  const ordered = [...cities.filter((c) => c.status === "live"), ...cities.filter((c) => c.status !== "live")];
  return (
    <View style={styles.cards}>
      {ordered.map((c) => (
        <Pressable
          key={c.slug}
          accessibilityRole="link"
          accessibilityLabel={`${c.name}, ${cityStatus(c)}`}
          onPress={() => onOpen(c.slug)}
          style={({ pressed }) => [styles.card, c.status !== "live" && styles.cardSoon, pressed && styles.cardPressed]}
        >
          <Eyebrow>{c.region}</Eyebrow>
          <Text style={styles.cityName}>{c.name}</Text>
          <Text style={[styles.status, c.status === "live" && styles.statusLive]}>{cityStatus(c)}</Text>
          {c.areas.length > 0 && (
            <Muted numberOfLines={1} style={styles.areas}>
              {c.areas.slice(0, 4).join(", ")}
              {c.areas.length > 4 ? "…" : ""}
            </Muted>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -gutter },
  tiles: { paddingHorizontal: gutter, gap: 12 },
  tile: { width: 168 },
  tileName: { marginTop: 10, fontFamily: fonts.serif, fontSize: 19, lineHeight: 23, color: colors.ink },
  list: { gap: 36 },
  row: {},
  rowName: { marginTop: 14, fontFamily: fonts.serif, fontSize: 24, lineHeight: 28, color: colors.ink },
  rowText: { marginTop: 6, fontSize: 15, lineHeight: 23 },
  more: { marginTop: 8, fontFamily: fonts.sansBold, fontSize: 15, color: colors.terracotta, minHeight: 24 },
  cards: { gap: 12 },
  card: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, backgroundColor: colors.paper, padding: 18, minHeight: 44 },
  cardSoon: { backgroundColor: colors.chalk },
  cardPressed: { borderColor: colors.lineStrong },
  cityName: { marginTop: 6, fontFamily: fonts.serif, fontSize: 26, lineHeight: 30, color: colors.ink },
  status: { marginTop: 4, fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.muted },
  statusLive: { color: colors.sageDeep },
  areas: { marginTop: 6, fontSize: 14 },
});
