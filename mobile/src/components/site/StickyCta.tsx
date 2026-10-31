import { usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { Button } from "~/components/ui/Button";
import { MAX_SCALE } from "~/components/ui/Text";
import { contactLinks } from "~/lib/contact";
import { openHref } from "~/lib/links";
import { site } from "~/shared";
import { navReach } from "./BottomNav";

// The floating "Book a free inspection" pill: past the first screen of a page it rises just above the
// bottom nav whenever the visitor scrolls back up, and slides away while they scroll down (so it never
// sits over the buttons and shades they are reading towards) and again near the top. It stays off the
// pages that are themselves the booking or contact form (/book, /thank-you, /contact) and steps aside
// while a booking form is on screen, so it never covers the form it points to. With a WhatsApp number
// in site.ts a round WhatsApp button sits beside it; with only a phone number, a "Call" pill. Neither
// shows while those numbers are empty (contactLinks).

/** Pages where the pill never shows: the booking page, its thank-you page and the contact page. */
export const CTA_HIDDEN_ROUTES = ["/book", "/thank-you", "/contact"] as const;

/** The page anchors that hold a booking or contact form (BookingSection, the services' block, the city waitlist, the contact form). */
export const FORM_ANCHORS: readonly string[] = ["book-visit", "book-inspection", "waitlist", "send-message"];

/** The pill's height and its gap above the nav: the room a page leaves at its end so the pill covers nothing there. */
export const CTA_HEIGHT = 52;
export const CTA_GAP = 12;

/** WhatsApp's own green, for its button only. */
export const WHATSAPP_GREEN = "#25D366";

/**
 * Whether the pill shows, on the UI thread, from the scroll offset `y` and the screen height. It
 * appears once the page has scrolled past its first screen and leaves again above 80% of it (so it
 * does not flicker at the line), and it steps aside while any booking form is on screen below the
 * header. `forms` holds each form's top and bottom in the page's content, flat: [top, bottom, …].
 */
export function ctaVisible(y: number, viewport: number, headerHeight: number, forms: readonly number[], shown: boolean): boolean {
  "worklet";
  if (y <= viewport * (shown ? 0.8 : 1)) return false;
  for (let i = 0; i + 1 < forms.length; i += 2) {
    if (forms[i] + headerHeight < y + viewport && forms[i + 1] > y) return false;
  }
  return true;
}

/** How far the page must move one way before the pill counts it as a change of direction (finger jitter and small settles do not). */
export const SCROLL_SLOP = 12;

/** Which way the page is going: `down` (reading on) or up, and `turn`, the furthest point reached since it last changed direction. */
export type ScrollHeading = { down: boolean; turn: number };

/**
 * The page's direction after it moves to `y`: it turns once it has come back SCROLL_SLOP or more from
 * the furthest point reached the other way. A page starts heading down from the top.
 */
export function scrollHeading(prev: ScrollHeading, y: number): ScrollHeading {
  "worklet";
  if (prev.down) return y < prev.turn - SCROLL_SLOP ? { down: false, turn: y } : { down: true, turn: Math.max(prev.turn, y) };
  return y > prev.turn + SCROLL_SLOP ? { down: true, turn: y } : { down: false, turn: Math.min(prev.turn, y) };
}

/** The WhatsApp logo (the owner asked for it on its button), white on the brand's green by default. */
export function WhatsAppLogo({ size = 26, color = "#ffffff" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden testID="whatsapp-logo">
      <Path
        fill={color}
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"
      />
    </Svg>
  );
}

const slide = { duration: 280, easing: Easing.bezier(0.2, 0.8, 0.2, 1), reduceMotion: ReduceMotion.System };

type Props = {
  /** the page's scroll offset (usePage().scrollY) */
  scrollY: SharedValue<number>;
  /** the screen height */
  viewport: number;
  /** what the sticky header covers at the top */
  headerHeight: number;
  /** the booking forms' [top, bottom, …] in the page's content */
  forms: SharedValue<number[]>;
  /** the business details: site.ts by default (tests pass numbers to show the WhatsApp and Call states) */
  details?: { phone: string; whatsapp: string };
  /** glides to this page's own booking form (one that already knows the page's city or service); without one the pill opens /book */
  toForm?: () => void;
};

export function StickyCta({ scrollY, viewport, headerHeight, forms, details = site, toForm }: Props) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(false);
  const visible = useSharedValue(false);
  const heading = useSharedValue<ScrollHeading>({ down: true, turn: 0 });
  const progress = useSharedValue(0);
  const off = (CTA_HIDDEN_ROUTES as readonly string[]).includes(pathname);

  useAnimatedReaction(
    () => ({ y: scrollY.value, f: forms.value }),
    ({ y, f }) => {
      heading.value = scrollHeading(heading.value, y);
      // out of the way while the visitor reads on down the page; back as soon as they scroll up
      const now = !off && !heading.value.down && ctaVisible(y, viewport, headerHeight, f, visible.value);
      if (now === visible.value) return;
      visible.value = now;
      scheduleOnRN(setShown, now);
    },
  );

  useEffect(() => {
    progress.value = withTiming(shown ? 1 : 0, slide);
  }, [shown, progress]);

  const style = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * (CTA_HEIGHT + CTA_GAP) }] }));

  if (off) return null;
  // WhatsApp when there is a number for it, else a call when there is a phone number, else the pill alone
  const links = contactLinks(details);
  const chat = links.find((l) => l.kind === "whatsapp") ?? links.find((l) => l.kind === "call");

  return (
    <Animated.View
      testID="sticky-cta"
      pointerEvents={shown ? "box-none" : "none"}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? "auto" : "no-hide-descendants"}
      style={[styles.bar, { bottom: navReach(insets.bottom) + CTA_GAP }, style]}
    >
      <Button label="Book a free inspection" maxFontSizeMultiplier={MAX_SCALE.fixed} accessibilityRole="link" onPress={() => (toForm ? toForm() : openHref("/book"))} style={[styles.pill, styles.lift]} />
      {chat?.kind === "whatsapp" && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Chat on WhatsApp"
          onPress={() => void Linking.openURL(chat.url)}
          style={({ pressed }) => [styles.whatsapp, styles.lift, pressed && styles.pressed]}
        >
          <WhatsAppLogo />
        </Pressable>
      )}
      {chat?.kind === "call" && (
        <Button label="Call" accessibilityLabel="Call us" maxFontSizeMultiplier={MAX_SCALE.fixed} variant="dark" accessibilityRole="link" onPress={() => void Linking.openURL(chat.url)} style={[styles.pill, styles.lift]} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  pill: { minHeight: CTA_HEIGHT, flexShrink: 1 },
  // one soft shadow under each floating control (a close contact shadow and a wider, softer one)
  lift: { boxShadow: "0px 2px 4px rgba(36, 37, 34, 0.18), 0px 14px 28px -10px rgba(36, 37, 34, 0.5)" },
  whatsapp: { width: CTA_HEIGHT, height: CTA_HEIGHT, borderRadius: CTA_HEIGHT / 2, backgroundColor: WHATSAPP_GREEN, alignItems: "center", justifyContent: "center" },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
});
