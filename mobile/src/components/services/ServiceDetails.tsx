import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Reveal } from "~/components/ui/Reveal";
import { openHref } from "~/lib/links";
import { Em, H, P } from "~/components/ui/Text";
import { formatSqft, getPalette, PAINTDB, jobSize, paletteBrands, shadeDisplayName, site, type Palette, type PaletteShade, type Service } from "~/shared";
import { colors, fonts } from "~/theme";
import { BlockLink, linkStyles, Tick, TextLink } from "./bits";

// The long-form body of a service hub (src/components/services/ServiceDetails.tsx): how the job
// runs, the paint system, what moves the price, timing with the crew table, aftercare and the
// palettes that suit it, each a real heading with its one italic accent word, at phone sizes.


/** "Interior Wall Painting Services in Agra" with the city as the heading's one italic accent; a title with no city accents its last word. */
export function accentCity(title: string, city: string = site.city): ReactNode {
  const suffix = ` in ${city}`;
  if (title.endsWith(suffix)) {
    return (
      <>
        {title.slice(0, -city.length)}
        <Em>{city}</Em>
      </>
    );
  }
  const cut = title.lastIndexOf(" ");
  if (cut < 0) return <Em>{title}</Em>;
  return (
    <>
      {title.slice(0, cut + 1)}
      <Em>{title.slice(cut + 1)}</Em>
    </>
  );
}

/** The colour finder searching one brand shade by its shade-card code. */
export const finderSearchHref = (s: Pick<PaletteShade, "brand" | "code">) => `/colours?${new URLSearchParams({ brand: s.brand, q: s.code })}`;

/** Column shares of the crew table at phone width (107 / 136 / 108 px of 351 on the website). */
const COLUMNS = [107, 136, 108];

function Cell({ i, children }: { i: number; children: ReactNode }) {
  return <View style={[styles.cell, { flexGrow: COLUMNS[i] }]}>{children}</View>;
}

/** Rough crew sizing for a full repaint of one floor (JobSizeTable): a rounded table with its caption under it. */
export function JobSizeTable({ examples }: { examples: { home: string; carpetArea: number }[] }) {
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.thead]}>
        {["Home", "Walls and ceilings", "Typical crew"].map((h, i) => (
          <Cell key={h} i={i}>
            <Text style={styles.th}>{h}</Text>
          </Cell>
        ))}
      </View>
      {examples.map((e) => {
        const j = jobSize(e.carpetArea);
        return (
          <View key={e.home} style={[styles.row, styles.rule]}>
            <Cell i={0}>
              <Text style={styles.th}>{e.home}</Text>
              <Text style={styles.tdMuted}>{formatSqft(j.carpetArea)} carpet</Text>
            </Cell>
            <Cell i={1}>
              <Text style={styles.td}>about {formatSqft(j.paintArea)}</Text>
              <Text style={styles.tdMuted} numberOfLines={1}>
                {j.painterDays} painter-days
              </Text>
            </Cell>
            <Cell i={2}>
              <Text style={styles.td}>{j.painters} painters</Text>
              <Text style={styles.tdMuted}>for {j.duration}</Text>
            </Cell>
          </View>
        );
      })}
      <Text style={styles.caption}>
        Rule of thumb for a full repaint (putty, primer and two coats) of one floor. The crew grows with the home, so the job length stays about the same. The inspector measures exactly on site.
      </Text>
    </View>
  );
}

/** A brand shade as a chip: swatch, name and code, opening its search in the colour finder. */
function ShadeChip({ shade }: { shade: PaletteShade }) {
  const name = shadeDisplayName(shade.name);
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${name} ${shade.code}`} onPress={() => openHref(finderSearchHref(shade))} style={styles.chip}>
      <View aria-hidden style={[styles.swatch, { backgroundColor: shade.hex }]} />
      <Text style={styles.chipText}>
        {name} <Text style={styles.chipCode}>{shade.code}</Text>
      </Text>
    </Pressable>
  );
}

/** "Shades that suit": the service's palettes with their shade chips, the PaintDB credit and links to the finder and the combinations. */
export function ServiceShades({ service }: { service: Service }) {
  const palettes = service.shades.palettes.map(getPalette).filter((p): p is Palette => p !== undefined);
  return (
    <Reveal style={styles.section}>
      <H size={30} leading={1.2}>
        Shades that <Em>suit</Em>
      </H>
      <P leading={1.625} color={colors.muted} style={styles.mt16}>
        {service.shades.intro}
      </P>
      <View style={styles.palettes}>
        {palettes.map((p) => (
          <View key={p.slug} style={styles.box}>
            <Pressable accessibilityRole="link" onPress={() => openHref(`/palettes#${p.slug}`)} style={styles.paletteName}>
              <H size={20} leading={1.4}>
                {p.name}
              </H>
            </Pressable>
            <P size={14} leading={1.43} color={colors.muted} style={styles.mt4}>
              {p.mood} · {paletteBrands(p).join(" and ")} shades
            </P>
            <View style={styles.chips}>
              {p.shades.map((s) => (
                <ShadeChip key={s.id} shade={s} />
              ))}
            </View>
          </View>
        ))}
      </View>
      <P size={12} leading={1.625} color={colors.muted} style={styles.mt12}>
        Brand shades: <TextLink href={PAINTDB.source} style={linkStyles.plain}>PaintDB</TextLink>, licensed{" "}
        <TextLink href={PAINTDB.licenseUrl} style={linkStyles.plain}>
          CC BY 4.0
        </TextLink>
        . On-screen colours approximate each brand&apos;s published shade.
      </P>
      <View style={styles.more}>
        <BlockLink href="/colours" label="Browse every wall colour shade" textStyle={styles.moreLink} />
        <BlockLink href="/palettes" label="All colour combinations" textStyle={styles.moreLink} />
      </View>
    </Reveal>
  );
}

/** Process, paint system, cost factors, timing, aftercare and shades for one service. */
export function ServiceDetails({ service }: { service: Service }) {
  const lower = service.name.toLowerCase();
  const [firstTimeline, ...restTimeline] = service.timeline;
  return (
    <>
      <Reveal style={styles.section}>
        <H size={30} leading={1.2}>
          How {lower} runs, step by <Em>step</Em>
        </H>
        <View style={[styles.rules, styles.mt24]}>
          {service.process.map((p, i) => (
            <View key={p.step} style={styles.step}>
              <View aria-hidden style={styles.stepNo}>
                <Text style={styles.stepNoText}>{i + 1}</Text>
              </View>
              <View style={styles.flex}>
                <H size={20} leading={1.4}>
                  {p.step}
                </H>
                <P leading={1.625} color={colors.muted} style={styles.mt4}>
                  {p.detail}
                </P>
              </View>
            </View>
          ))}
        </View>
      </Reveal>

      <Reveal style={styles.section}>
        <H size={30} leading={1.2}>
          Surface preparation and the paint <Em>system</Em>
        </H>
        <View style={styles.boxes}>
          {service.paintSystem.map((p) => (
            <View key={p.title} style={styles.box}>
              <H size={20} leading={1.4}>
                {p.title}
              </H>
              <P leading={1.625} color={colors.muted} style={styles.mt8}>
                {p.body}
              </P>
            </View>
          ))}
        </View>
      </Reveal>

      <Reveal style={styles.section}>
        <H size={30} leading={1.2}>
          What affects the <Em>cost</Em>
        </H>
        <P leading={1.625} color={colors.muted} style={styles.mt16}>
          The inspector measures and checks your walls, and the quotation lists each of these as its own line, so you can see what moves the price before you approve it.
        </P>
        <View style={[styles.rules, styles.mt24]}>
          {service.costFactors.map((c) => (
            <View key={c.title} style={styles.factor}>
              <P weight="bold">{c.title}</P>
              <P leading={1.625} color={colors.muted}>
                {c.body}
              </P>
            </View>
          ))}
        </View>
        <P size={14} leading={1.43} color={colors.muted} style={styles.mt16}>
          More on pricing and timing in our <TextLink href="/faq">house painting FAQs</TextLink>.
        </P>
      </Reveal>

      <Reveal style={styles.section}>
        <H size={30} leading={1.2}>
          How long it <Em>takes</Em>
        </H>
        <P leading={1.625} color={colors.muted} style={styles.mt16}>
          {firstTimeline}
        </P>
        {service.sizeExamples && <JobSizeTable examples={service.sizeExamples} />}
        {restTimeline.map((t) => (
          <P key={t} leading={1.625} color={colors.muted} style={styles.mt16}>
            {t}
          </P>
        ))}
      </Reveal>

      <Reveal style={styles.section}>
        <H size={30} leading={1.2}>
          Aftercare and <Em>cleanup</Em>
        </H>
        <View style={styles.aftercare}>
          {service.aftercare.map((a) => (
            <Tick key={a}>{a}</Tick>
          ))}
        </View>
      </Reveal>

      <ServiceShades service={service} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
  section: { marginTop: 56 },
  rules: { borderTopWidth: 1, borderColor: colors.line },
  step: { flexDirection: "row", gap: 20, paddingVertical: 20, borderBottomWidth: 1, borderColor: colors.line },
  stepNo: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sand, alignItems: "center", justifyContent: "center" },
  stepNoText: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 28, color: colors.ink },
  boxes: { marginTop: 24, gap: 16 },
  box: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, padding: 20 },
  factor: { paddingVertical: 16, gap: 4, borderBottomWidth: 1, borderColor: colors.line },
  aftercare: { marginTop: 24, gap: 12 },
  table: { marginTop: 24, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "flex-start" },
  thead: { backgroundColor: colors.creamWash },
  rule: { borderTopWidth: 1, borderColor: colors.line },
  cell: { flexBasis: 0, paddingHorizontal: 12, paddingVertical: 12 },
  th: { fontFamily: fonts.sansBold, fontSize: 14, lineHeight: 20, color: colors.ink },
  td: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.ink },
  tdMuted: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  caption: { borderTopWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingVertical: 12, fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
  palettes: { marginTop: 24, gap: 16 },
  paletteName: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  chips: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12 },
  swatch: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.line },
  chipText: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.ink },
  chipCode: { fontFamily: fonts.sans, color: colors.muted },
  more: { marginTop: 24, flexDirection: "row", flexWrap: "wrap", columnGap: 24, rowGap: 4 },
  moreLink: { fontFamily: fonts.sansBold, fontSize: 14, lineHeight: 20 },
});
