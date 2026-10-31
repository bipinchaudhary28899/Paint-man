import { usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { Arrow, Chevron } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { Collapse, Turn } from "~/components/ui/Collapse";
import { contactLinks } from "~/lib/contact";
import { openHref, routeFor } from "~/lib/links";
import { headerSection, navMenus, site, type NavLink, type NavMenu, type NavNode } from "~/shared";
import { colors, fonts, HEADER_HEIGHT, radii } from "~/theme";
import { WHATSAPP_GREEN, WhatsAppLogo } from "./StickyCta";

// The phone menu: a hairline three-bar button in the sticky header opens a drawer that slides in from
// the right over the dimmed page. It holds the website's own menus (nav.ts: Services, Cities as region ›
// city › localities, Colours), then FAQ, About and Contact, and at the bottom "Book a free inspection"
// with call and WhatsApp when site.ts has numbers for them. Sections slide open and shut in place (their
// chevrons turning), the page
// being viewed is marked, and every link opens its screen through openHref and closes the drawer. The
// backdrop, the close control and Android's back button close it too.

/** The pages listed under the menus. */
export const DRAWER_PAGES: readonly NavLink[] = [
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const PANEL_MAX = 380;
const slide = { duration: 300, easing: Easing.bezier(0.2, 0.8, 0.2, 1), reduceMotion: ReduceMotion.System };

/** Whether a menu href is the page being viewed (an in-page #anchor never is: it is a place on a page). */
export function isCurrentHref(href: string, pathname: string): boolean {
  return !href.includes("#") && routeFor(href)?.pathname === pathname;
}

/** The header's menu button: three hairline bars in a round hairline pill, 44pt. */
export function MenuButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      hitSlop={4}
      testID="menu-button"
      style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
    >
      <View style={styles.bars} aria-hidden>
        <View style={styles.bar} />
        <View style={styles.bar} />
        <View style={[styles.bar, styles.barShort]} />
      </View>
    </Pressable>
  );
}

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  /** glides the page to one of its anchors (the page's scrollTo), for a link to a #place on the page already open */
  scrollTo?: (id: string) => void;
  /** the business details: site.ts by default (tests pass numbers to show the call and WhatsApp pills) */
  details?: { phone: string; whatsapp: string };
};

export function NavDrawer({ open, onClose, scrollTo = () => undefined, details = site }: DrawerProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panel = Math.min(PANEL_MAX, Math.round(width * 0.88));
  // mounted from the moment it opens until its slide out has finished
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const progress = useSharedValue(0);
  // the section of the page being viewed starts open
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => {
    const section = headerSection(pathname);
    return new Set(section ? [section] : []);
  });

  useEffect(() => {
    if (open) progress.value = withTiming(1, slide);
    else
      progress.value = withTiming(0, slide, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      });
  }, [open, progress]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - progress.value) * (panel + 32) }] }));

  if (!mounted) return null;

  const toggle = (key: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // a link to the page already open closes the drawer (and glides to its #anchor, if it has one)
  const go = (href: string) => {
    onClose();
    const route = routeFor(href);
    if (route && route.pathname === pathname) {
      if (route.params.section) scrollTo(route.params.section);
      return;
    }
    openHref(href);
  };

  const contact = contactLinks(details);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose} testID="nav-drawer-modal">
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} testID="drawer-backdrop" accessibilityElementsHidden importantForAccessibility="no" />
        </Animated.View>

        <Animated.View accessibilityViewIsModal onAccessibilityEscape={onClose} accessibilityLabel="Menu" testID="nav-drawer" style={[styles.panel, { width: panel, paddingTop: insets.top }, panelStyle]}>
          <View style={styles.head}>
            <Text style={styles.eyebrow}>Menu</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={onClose} hitSlop={4} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={1.6} strokeLinecap="round" aria-hidden>
                <Path d="M6 6l12 12M18 6L6 18" />
              </Svg>
            </Pressable>
          </View>

          <ScrollView style={styles.flex} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {navMenus().map((menu) => (
              <MenuSection key={menu.label} menu={menu} pathname={pathname} expanded={expanded} toggle={toggle} go={go} />
            ))}
            {DRAWER_PAGES.map((p) => {
              const current = isCurrentHref(p.href, pathname);
              return (
                <Pressable
                  key={p.href}
                  accessibilityRole="link"
                  accessibilityLabel={p.label}
                  accessibilityState={{ selected: current }}
                  onPress={() => go(p.href)}
                  style={({ pressed }) => [styles.sectionRow, styles.section, pressed && styles.rowPressed]}
                >
                  <Text style={[styles.sectionName, current && styles.current]}>{p.label}</Text>
                  {current && <View style={styles.dot} />}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.foot, { paddingBottom: Math.max(16, insets.bottom) }]}>
            <Button label="Book a free inspection" accessibilityRole="link" onPress={() => go("/book")} />
            {contact.length > 0 && (
              <View style={styles.contact}>
                {contact.map((c) => (
                  <Button
                    key={c.kind}
                    label={c.label}
                    small
                    variant="secondary"
                    accessibilityRole="link"
                    leading={c.kind === "whatsapp" ? <WhatsAppLogo size={18} color={WHATSAPP_GREEN} /> : undefined}
                    onPress={() => void Linking.openURL(c.url)}
                    style={styles.contactPill}
                  />
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

type SectionProps = { menu: NavMenu; pathname: string; expanded: ReadonlySet<string>; toggle: (key: string) => void; go: (href: string) => void };

/** One menu (Services, Cities, Colours): its serif name and a chevron, opening its links in place, then "All …" for its hub. */
function MenuSection({ menu, pathname, expanded, toggle, go }: SectionProps) {
  const open = expanded.has(menu.label);
  const here = headerSection(pathname) === menu.label;
  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={menu.label}
        accessibilityState={{ expanded: open }}
        onPress={() => toggle(menu.label)}
        style={({ pressed }) => [styles.sectionRow, pressed && styles.rowPressed]}
      >
        <Text style={[styles.sectionName, here && styles.current]}>{menu.label}</Text>
        <Turn open={open}>
          <Chevron size={16} strokeWidth={1.8} color={here ? colors.terracotta : colors.ink} />
        </Turn>
      </Pressable>
      <Collapse open={open} style={styles.links}>
        {menu.groups.map((g, i) => (
          <View key={g.heading ?? i} style={i > 0 ? styles.group : undefined}>
            {g.heading && <Text style={styles.groupHeading}>{g.heading}</Text>}
            {g.links.map((l) => (
              <LinkRow key={l.href} link={l} current={isCurrentHref(l.href, pathname)} go={go} />
            ))}
          </View>
        ))}
        {menu.tree?.map((region, i) => (
          <View key={region.label} style={i > 0 ? styles.group : undefined}>
            <Text style={styles.groupHeading}>{region.label}</Text>
            {(region.children ?? []).map((city) => (
              <CityRow key={city.label} city={city} pathname={pathname} open={expanded.has(`city:${city.label}`)} toggle={() => toggle(`city:${city.label}`)} go={go} />
            ))}
          </View>
        ))}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`All ${menu.label.toLowerCase()}`}
          accessibilityState={{ selected: isCurrentHref(menu.href, pathname) }}
          onPress={() => go(menu.href)}
          style={styles.hub}
        >
          <Text style={styles.hubText}>All {menu.label.toLowerCase()}</Text>
          <Arrow size={16} color={colors.terracotta} />
        </Pressable>
      </Collapse>
    </View>
  );
}

/** A link with its note under it ("Coming soon", "8,500+ shades…"); the page being viewed is terracotta with a dot. */
function LinkRow({ link, current, go, compact = false }: { link: NavLink | NavNode; current: boolean; go: (href: string) => void; compact?: boolean }) {
  const href = link.href!;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={link.note ? `${link.label}, ${link.note}` : link.label}
      accessibilityState={{ selected: current }}
      onPress={() => go(href)}
      style={({ pressed }) => [compact ? styles.localityRow : styles.linkRow, pressed && styles.rowPressed]}
    >
      <View style={styles.flex}>
        <Text style={[compact ? styles.localityText : styles.linkText, current && styles.current]}>{link.label}</Text>
        {link.note && <Text style={styles.note}>{link.note}</Text>}
      </View>
      {current && <View style={styles.dot} />}
    </Pressable>
  );
}

/** A city: its page, and for a live city a chevron that opens its localities one level deeper. */
function CityRow({ city, pathname, open, toggle, go }: { city: NavNode; pathname: string; open: boolean; toggle: () => void; go: (href: string) => void }) {
  const areas = city.children ?? [];
  return (
    <View>
      <View style={styles.cityRow}>
        <View style={styles.flex}>
          <LinkRow link={city} current={isCurrentHref(city.href!, pathname)} go={go} />
        </View>
        {areas.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Localities in ${city.label}`}
            accessibilityState={{ expanded: open }}
            onPress={toggle}
            style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
          >
            <Turn open={open}>
              <Chevron size={14} strokeWidth={1.8} />
            </Turn>
          </Pressable>
        )}
      </View>
      {areas.length > 0 && (
        <Collapse open={open} style={styles.localitiesGap}>
          <View style={styles.localities} accessibilityLabel={`${city.label} localities`}>
            {areas.map((a) => (
              <View key={a.label} style={styles.localityCell}>
                <LinkRow link={a} current={false} go={go} compact />
              </View>
            ))}
          </View>
        </Collapse>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { backgroundColor: "rgba(36, 37, 34, 0.06)" },
  rowPressed: { opacity: 0.6 },
  menuButton: { width: 44, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  bars: { width: 20, gap: 5, alignItems: "flex-end" },
  bar: { width: 20, height: 1.5, borderRadius: 1, backgroundColor: colors.ink },
  barShort: { width: 13 },
  root: { flex: 1 },
  dim: { backgroundColor: "rgba(36, 37, 34, 0.45)" },
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radii.xxl,
    borderBottomLeftRadius: radii.xxl,
    overflow: "hidden",
    boxShadow: "-16px 0px 40px -12px rgba(36, 37, 34, 0.4)",
  },
  head: { minHeight: HEADER_HEIGHT - 1, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderColor: colors.lineSoft },
  eyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 12, letterSpacing: 1.92, textTransform: "uppercase", color: colors.muted },
  close: { marginRight: -4, width: 44, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  section: { borderBottomWidth: 1, borderColor: colors.line },
  sectionRow: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionName: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, letterSpacing: -0.36, color: colors.ink },
  current: { color: colors.terracotta },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.terracotta },
  links: { paddingBottom: 16 },
  group: { marginTop: 12 },
  groupHeading: { marginTop: 4, marginBottom: 2, fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 16, letterSpacing: 1.32, textTransform: "uppercase", color: colors.muted2 },
  linkRow: { minHeight: 46, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 10 },
  linkText: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 21, color: colors.ink },
  note: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.muted },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggle: { width: 44, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  localitiesGap: { paddingBottom: 8 },
  localities: { marginLeft: 12, paddingLeft: 12, borderLeftWidth: 1, borderColor: colors.line, flexDirection: "row", flexWrap: "wrap" },
  localityCell: { width: "50%" },
  localityRow: { minHeight: 44, paddingRight: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  localityText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 19, color: colors.inkSoft },
  hub: { marginTop: 4, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  hubText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.terracotta },
  foot: { paddingTop: 16, paddingHorizontal: 24, gap: 10, borderTopWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.canvas },
  contact: { flexDirection: "row", gap: 10 },
  contactPill: { flex: 1 },
});
