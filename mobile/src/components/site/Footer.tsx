import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Chevron } from "~/components/ui/Bits";
import { Collapse, Turn } from "~/components/ui/Collapse";
import { Logo } from "~/components/ui/Media";
import { openHref } from "~/lib/links";
import { footerColumns, liveCities, promises, site } from "~/shared";
import { colors, fonts, gutter, NAV_CLEARANCE } from "~/theme";
import { usePage } from "./Page";

// The website's footer on phones (src/components/Footer.tsx): the link hub on ink. The stacked
// reversed logo, the tagline in golden italic, a line about the service, "Visit & call", then the link
// columns as an accordion (one open at a time: each row slides its links open, its chevron turning, a
// hairline between rows), the localities of each live city, the legal links, and "Back to top".

const hairline = "rgba(248, 245, 239, 0.12)";

type Details = {
  address: { street: string; postalCode: string };
  city: string;
  region: string;
  hoursDisplay: string;
  phone: string;
  phoneDisplay: string;
  email: string;
};

/** `details` defaults to the business details in site.ts (tests pass their own to show the phone and email lines). */
export function Footer({ details = site }: { details?: Details }) {
  const columns = footerColumns();
  const year = new Date().getFullYear();
  return (
    <View style={styles.footer} testID="footer">
      <View style={styles.brand}>
        <Logo name="stackedReversed" height={64} />
        <Text style={styles.tagline}>{site.tagline}</Text>
        <Text style={styles.text}>
          Walls, doors, windows and grills, one wall or the whole house: inspected, quoted line by line and supervised. {promises[0].title}, a full estimate before work starts.
        </Text>
        <View style={styles.address}>
          <Text style={styles.label}>Visit &amp; call</Text>
          <Text style={styles.addressLine}>
            {details.address.street ? `${details.address.street}, ${details.city} ${details.address.postalCode}` : `${details.city}, ${details.region}`}
          </Text>
          {details.phone !== "" && (
            <Text style={styles.addressLine} accessibilityRole="link" onPress={() => openHref(`tel:${details.phone}`)}>
              {details.phoneDisplay || details.phone}
            </Text>
          )}
          {details.email !== "" && (
            <Text style={styles.addressLine} accessibilityRole="link" onPress={() => openHref(`mailto:${details.email}`)}>
              {details.email}
            </Text>
          )}
          <Text style={styles.addressLine}>{details.hoursDisplay}</Text>
        </View>
      </View>

      <FooterNav columns={columns} />

      <View style={styles.strip}>
        {liveCities().map((c) => (
          <Text key={c.slug} style={styles.small}>
            Painting in {c.name}: {c.areas.join(" · ")}
          </Text>
        ))}
        <View style={styles.legal}>
          <Text accessibilityRole="link" style={[styles.small, styles.legalLink]} onPress={() => openHref("/privacy-policy")}>
            Privacy policy
          </Text>
          <Text accessibilityRole="link" style={[styles.small, styles.legalLink]} onPress={() => openHref("/terms")}>
            Terms of service
          </Text>
          <Text style={[styles.small, styles.legalLink]}>
            © {year} {site.legalName || site.name}
          </Text>
          <Pressable accessibilityRole="link" onPress={() => openHref("/admin")} style={styles.staffHit}>
            <View style={styles.staff}>
              <Text style={styles.small}>Staff login</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <BackToTop />
    </View>
  );
}

type Column = { heading: string; links: { href: string; label: string }[] };

/** The link columns as one accordion: opening a row closes the one that was open. */
function FooterNav({ columns }: { columns: Column[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <View style={styles.nav} accessibilityLabel="Footer">
      {columns.map((col) => (
        <FooterRow key={col.heading} column={col} open={open === col.heading} onToggle={() => setOpen((o) => (o === col.heading ? null : col.heading))} />
      ))}
    </View>
  );
}

function FooterRow({ column, open, onToggle }: { column: Column; open: boolean; onToggle: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={column.heading}
        accessibilityState={{ expanded: open }}
        accessibilityHint={open ? undefined : `Shows the ${column.heading.toLowerCase()} links`}
        onPress={onToggle}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <Text style={styles.summaryText}>{column.heading}</Text>
        <Turn open={open}>
          <Chevron color={colors.golden} />
        </Turn>
      </Pressable>
      <Collapse open={open} style={styles.links}>
        {column.links.map((l) => (
          <Pressable key={l.href} accessibilityRole="link" onPress={() => openHref(l.href)} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <Text style={styles.linkText}>{l.label}</Text>
          </Pressable>
        ))}
      </Collapse>
    </View>
  );
}

/** "Back to top": a hairline pill at the foot of the footer that scrolls the page to its top. */
function BackToTop() {
  const { scrollToTop } = usePage();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back to top" onPress={scrollToTop} hitSlop={4} style={({ pressed }) => [styles.top, pressed && styles.topPressed]}>
      <Chevron color={colors.golden} up size={12} />
      <Text style={styles.topText}>Back to top</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: { backgroundColor: colors.ink, paddingBottom: NAV_CLEARANCE },
  brand: { paddingHorizontal: gutter, paddingTop: 40 },
  tagline: { marginTop: 8, fontFamily: fonts.serifItalic, fontSize: 18, lineHeight: 25, color: colors.golden },
  text: { marginTop: 14, fontFamily: fonts.sans, fontSize: 14, lineHeight: 22.4, color: colors.onInkMuted },
  address: { marginTop: 20 },
  label: { marginBottom: 2, fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 1.54, textTransform: "uppercase", color: colors.golden },
  addressLine: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 26.6, color: colors.onInkMuted },
  nav: { marginTop: 24, marginHorizontal: gutter, borderTopWidth: 1, borderColor: hairline },
  row: { borderBottomWidth: 1, borderColor: hairline },
  summary: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  pressed: { opacity: 0.6 },
  summaryText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.onInk },
  links: { paddingBottom: 12 },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: { fontFamily: fonts.sans, fontSize: 15, color: colors.onInkMuted },
  strip: { paddingHorizontal: gutter, paddingTop: 20, gap: 4 },
  small: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 19.2, color: colors.onInkMuted },
  legal: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 20 },
  legalLink: { minHeight: 44, lineHeight: 44 },
  staffHit: { minHeight: 44, justifyContent: "center" },
  staff: { borderRadius: 999, borderWidth: 1, borderColor: "rgba(248, 245, 239, 0.2)", paddingHorizontal: 12, paddingVertical: 4 },
  top: {
    marginTop: 28,
    alignSelf: "center",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248, 245, 239, 0.24)",
    paddingHorizontal: 20,
  },
  topPressed: { backgroundColor: "rgba(248, 245, 239, 0.08)" },
  topText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.onInk },
});
