import { Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Anchor, Container, usePage } from "~/components/site/Page";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Bits";
import { Reveal } from "~/components/ui/Reveal";
import { Skeleton, SkeletonGroup } from "~/components/ui/Skeleton";
import { Eyebrow, H, P, Strong } from "~/components/ui/Text";
import { finderHref, type PaletteShadeFacts, type ShadeCredit } from "~/lib/colours";
import { openHref } from "~/lib/links";
import { shadeDisplayName, site, type Palette, type PaletteShade } from "~/shared";
import { colors, fonts, radii } from "~/theme";
import { WallPreview } from "./WallPreview";

// The palettes page on phones: the "jump to a palette" chips, then one card per palette with its
// feature wall on the room first (so the palette is seen before it is read) and the 60/30/10 strip,
// then its rooms, name, mood, description, the three shades by role (each with its LRV and the
// closest Berger and Nerolac shades on screen, from /api/v1/palettes, held by skeleton lines until
// they arrive), the inspector's tip and the booking button; each card rises in as it scrolls into
// view. The palettes themselves are the website's own (src/config/palettes.ts).

const roles = ["Feature wall", "Other walls & ceiling", "Accent"] as const;

/** The chips under the hero that scroll to each palette. */
export function PaletteJump({ palettes }: { palettes: Palette[] }) {
  const { scrollTo } = usePage();
  return (
    <View accessibilityLabel="Jump to a palette" style={styles.jump}>
      {palettes.map((p) => (
        <Pressable key={p.slug} accessibilityRole="link" onPress={() => scrollTo(p.slug)} style={styles.jumpChip}>
          <Text style={styles.jumpText}>{p.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ShadeRow({ s, role, facts, loading }: { s: PaletteShade; role: string; facts?: PaletteShadeFacts; loading: boolean }) {
  const lrv = facts?.lrv ?? undefined;
  const closest = facts?.closest ?? [];
  const waiting = loading && !facts;
  return (
    <View style={styles.shade}>
      <View style={[styles.shadeSwatch, { backgroundColor: s.hex }]} aria-hidden />
      <View style={styles.shadeBody}>
        <Text style={styles.role}>{role}</Text>
        <Text accessibilityRole="header" style={styles.shadeName}>
          {shadeDisplayName(s.name)}{" "}
          <Text style={styles.shadeCode}>
            {s.brandName} {s.code}
          </Text>
        </Text>
        <Text style={styles.shadeMeta}>
          {s.hex.toUpperCase()}
          {lrv !== undefined ? ` · LRV ${lrv}` : ""} · {s.finish}
        </Text>
        {waiting && (
          <SkeletonGroup label="Loading the LRV and closest matches" style={styles.factsSkeleton}>
            <Skeleton height={12} width="92%" />
            <Skeleton height={12} width="64%" />
          </SkeletonGroup>
        )}
        {closest.length > 0 && (
          <Text style={styles.closest}>
            Closest on screen:{" "}
            {closest.map((m, k) => (
              <Fragment key={m.id}>
                {k > 0 && "; "}
                {m.code !== null ? (
                  <Text accessibilityRole="link" style={styles.closestLink} onPress={() => openHref(finderHref({ brand: m.brand, code: m.code! }))}>
                    {m.brandName} {m.name} {m.code}
                  </Text>
                ) : (
                  `${m.brandName} ${m.name}`
                )}{" "}
                ({m.match.toLowerCase()})
              </Fragment>
            ))}
          </Text>
        )}
        <Pressable accessibilityRole="link" onPress={() => openHref(finderHref(s))} style={styles.finder}>
          <Text style={styles.finderText}>
            See {s.brandName} {s.code} in the finder
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PaletteCard({ palette: p, facts, loading = false }: { palette: Palette; facts: Record<string, PaletteShadeFacts>; loading?: boolean }) {
  const [feature] = p.shades;
  const featureLrv = facts[feature.id]?.lrv ?? undefined;
  return (
    <Anchor id={p.slug}>
      <Reveal>
        <Card style={styles.card}>
          {/* phones: the room preview comes first */}
          <View style={styles.preview}>
            <WallPreview colour={{ name: shadeDisplayName(feature.name), code: `${feature.brandName} ${feature.code}`, hex: feature.hex, lrv: featureLrv }} />
            <View style={styles.bar} aria-hidden>
              <View style={{ flex: 3, backgroundColor: p.shades[0].hex }} />
              <View style={{ flex: 2, backgroundColor: p.shades[1].hex }} />
              <View style={{ flex: 1, backgroundColor: p.shades[2].hex }} />
            </View>
          </View>
          <View style={styles.copy}>
            <Eyebrow>{p.rooms.join(" · ")}</Eyebrow>
            <H size={28} leading={1.5} style={styles.mt8}>
              {p.name}
            </H>
            <Text style={styles.mood}>{p.mood}</Text>
            <P size={16} leading={1.625} style={styles.mt12}>
              {p.description}
            </P>
            <View style={styles.shades} accessibilityLabel={`Shades in ${p.name}`}>
              {p.shades.map((s, j) => (
                <ShadeRow key={s.id} s={s} role={roles[j]} facts={facts[s.id]} loading={loading} />
              ))}
            </View>
            <P size={13} leading={1.625} style={styles.tip}>
              <Strong>Inspector&apos;s tip:</Strong> {p.tip}
            </P>
            <Button label="Book an inspection with this palette" accessibilityLabel={`Book an inspection with the ${p.name} palette`} onPress={() => openHref(`/book?palette=${p.slug}`)} style={styles.mt20} />
          </View>
        </Card>
      </Reveal>
    </Anchor>
  );
}

/** Every palette card, then the credit (PaintDB for the LRV and the matches). `loading`: the LRVs and matches are still on their way (skeletons hold their lines). */
export function PaletteList({
  palettes,
  facts,
  credit,
  loading = false,
}: {
  palettes: Palette[];
  facts: Record<string, PaletteShadeFacts>;
  credit: Pick<ShadeCredit, "source" | "licenseUrl">;
  loading?: boolean;
}) {
  return (
    <Container style={styles.list}>
      {palettes.map((p) => (
        <PaletteCard key={p.slug} palette={p} facts={facts} loading={loading} />
      ))}
      <P size={12} leading={1.625} color={colors.muted}>
        Brand shades:{" "}
        <Text accessibilityRole="link" style={styles.underline} onPress={() => openHref(credit.source)}>
          PaintDB
        </Text>
        , licensed{" "}
        <Text accessibilityRole="link" style={styles.underline} onPress={() => openHref(credit.licenseUrl)}>
          CC BY 4.0
        </Text>
        . On-screen colours approximate each brand&apos;s published shade, and the closest Berger and Nerolac shades are screen matches to confirm on the card. {site.name}
        {" "}isn&apos;t affiliated with these brands.
      </P>
    </Container>
  );
}

const styles = StyleSheet.create({
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt20: { marginTop: 20 },
  jump: { marginTop: 32, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  jumpChip: { minHeight: 44, justifyContent: "center", borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 16 },
  jumpText: { fontFamily: fonts.sansBold, fontSize: 14, lineHeight: 20, letterSpacing: -0.07, color: colors.ink },
  list: { marginTop: 32, gap: 32 },
  card: { overflow: "hidden" },
  preview: { borderBottomWidth: 1, borderColor: colors.line, backgroundColor: colors.chalk, padding: 12 },
  bar: { marginTop: 12, height: 24, flexDirection: "row", overflow: "hidden", borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line },
  copy: { padding: 20 },
  mood: { marginTop: 4, fontFamily: fonts.serifItalic, fontSize: 20, lineHeight: 28, letterSpacing: -0.2, color: colors.sageDeep },
  shades: { marginTop: 20, gap: 12 },
  shade: { flexDirection: "row", gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, padding: 12 },
  shadeSwatch: { width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  shadeBody: { flex: 1, minWidth: 0 },
  role: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: "uppercase", color: colors.muted },
  shadeName: { marginTop: 2, fontFamily: fonts.serif, fontSize: 18, lineHeight: 22.5, letterSpacing: -0.27, color: colors.ink },
  shadeCode: { fontFamily: fonts.sansSemiBold, fontSize: 14, letterSpacing: -0.07, color: colors.muted },
  shadeMeta: { marginTop: 4, fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 16, color: colors.muted },
  factsSkeleton: { marginTop: 8, gap: 6 },
  closest: { marginTop: 4, fontFamily: fonts.sans, fontSize: 12, lineHeight: 19.5, color: colors.muted },
  closestLink: { textDecorationLine: "underline", textDecorationColor: colors.lineStrong },
  finder: { marginTop: 4, minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  finderText: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, letterSpacing: -0.07, color: colors.ink, textDecorationLine: "underline", textDecorationColor: colors.terracotta },
  tip: { marginTop: 20, borderRadius: 16, backgroundColor: colors.creamWash, padding: 12, overflow: "hidden" },
  underline: { textDecorationLine: "underline" },
});
