import { Pressable, StyleSheet, Text, View } from "react-native";

import { serviceLine } from "~/components/services/ServiceCarousel";
import { ServiceSticker } from "~/components/services/bits";
import { Container } from "~/components/site/Page";
import { Arrow, LinkArrow } from "~/components/ui/Bits";
import { Photo } from "~/components/ui/Media";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { servicePath, services, type Service } from "~/shared";
import { colors, fonts, radii } from "~/theme";

// "Every wall in the house": the eyebrow, the heading and the website's line, then every service as a
// row (the website's phone rows): its photo, coloured sticker, name and one short line, the whole row
// opening its hub, all four in view at once, and "All services" under them. The rows only link: booking
// is the page's one main button.

function ServiceRow({ service }: { service: Service }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${service.name}: ${serviceLine(service)}`}
      onPress={() => openHref(servicePath(service))}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Photo image={service.image} width={96} aspectRatio={1} priority="low" recyclingKey={service.slug} style={styles.photo} decorative />
      <View style={styles.text}>
        <ServiceSticker service={service} />
        <Text style={styles.name}>{service.name}</Text>
        <Text style={styles.line} numberOfLines={2}>
          {serviceLine(service)}
        </Text>
      </View>
      <Arrow size={18} color={colors.terracotta} />
    </Pressable>
  );
}

export function ServicesSection() {
  return (
    <Container style={styles.section}>
      <Eyebrow size={11} style={styles.eyebrow}>
        What we paint
      </Eyebrow>
      <H size={30} leading={1.06} style={styles.mt12}>
        Every wall in the <Em>house.</Em>
      </H>
      <P size={15} leading={1.6} color={colors.muted} style={[styles.mt12, styles.intro]}>
        Andar ho ya bahar: house painting inside and out, and quick repaints of rental homes, each starting with an on-site inspection and an itemised quote.
      </P>
      <View accessibilityLabel="Services" style={styles.rows}>
        {services.map((s) => (
          <ServiceRow key={s.slug} service={s} />
        ))}
      </View>
      <LinkArrow label="All services" onPress={() => openHref("/services")} style={styles.mt8} />
    </Container>
  );
}

const styles = StyleSheet.create({
  // the hero's picture fades into the canvas above this
  section: { paddingTop: 40, paddingBottom: 56 },
  eyebrow: { lineHeight: 16.5 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  intro: { maxWidth: 460 },
  rows: { marginTop: 20, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.paper, padding: 10, paddingRight: 16 },
  pressed: { backgroundColor: colors.creamWash },
  photo: { width: 96, height: 96, borderRadius: radii.md, overflow: "hidden" },
  text: { flex: 1, gap: 4, alignItems: "flex-start" },
  name: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 24, color: colors.ink },
  line: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.muted },
});
