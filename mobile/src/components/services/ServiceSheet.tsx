import { useEffect } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "~/components/ui/Button";
import { Photo } from "~/components/ui/Media";
import { H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { servicePath, type Service } from "~/shared";
import { colors, fonts, gutter, radii } from "~/theme";
import { ServiceLabel } from "./bits";

// A service card opened into its details (owner: a card "can lift slightly when tapped, then expand
// into its details"): a sheet that springs up from the bottom with the service's photo, its
// description, everything it includes, and the two ways on: the service's page, or booking a visit
// for it. The backdrop, the Close link and the phone's back button close it. With reduced motion the
// sheet is simply there.

/** The sheet rises with a little bounce and settles in about half a second. */
const SHEET_SPRING = { damping: 18, stiffness: 170, mass: 0.8 };

export function ServiceSheet({ service, onClose }: { service: Service; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const rise = useSharedValue(reduced ? 0 : height * 0.6);

  useEffect(() => {
    if (!reduced) rise.set(withSpring(0, SHEET_SPRING));
  }, [reduced, rise]);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value }] }));

  /** Closes the sheet and opens a page. */
  const go = (href: string) => {
    onClose();
    openHref(href);
  };

  return (
    <Modal visible transparent animationType={reduced ? "none" : "fade"} statusBarTranslucent onRequestClose={onClose} testID="service-sheet">
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the details" testID="service-sheet-backdrop" />
      <Animated.View style={[styles.sheet, { maxHeight: height * 0.88, paddingBottom: insets.bottom + 20 }, sheetStyle]} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.photo}>
            <Photo image={service.image} width={width - 2 * gutter} aspectRatio={16 / 9} recyclingKey={`${service.slug}-details`} />
          </View>
          <ServiceLabel service={service} style={styles.label} />
          <H size={28} leading={1.12} style={styles.title}>
            {service.name}
          </H>
          <P size={15} leading={1.6} color={colors.muted} style={styles.description}>
            {service.description}
          </P>

          <Text accessibilityRole="header" style={styles.includesTitle}>
            What&apos;s included
          </Text>
          <View style={styles.includes}>
            {service.includes.map((item) => (
              <Text key={item} style={styles.include}>
                {item}
              </Text>
            ))}
          </View>

          <View style={styles.actions}>
            <Button label="View service" accessibilityRole="link" accessibilityLabel={`View ${service.name}`} onPress={() => go(servicePath(service))} />
            <Button
              variant="secondary"
              label="Book a free site visit"
              accessibilityLabel={`Book a free site visit for ${service.name.toLowerCase()}`}
              onPress={() => go(`/book?service=${service.slug}`)}
            />
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.close} hitSlop={4}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(36, 37, 34, 0.45)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.canvas, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, overflow: "hidden" },
  content: { padding: gutter, paddingTop: 22 },
  photo: { borderRadius: radii.lg, overflow: "hidden" },
  label: { marginTop: 18 },
  title: { marginTop: 6 },
  description: { marginTop: 10 },
  includesTitle: { marginTop: 22, fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: "uppercase", color: colors.terracotta },
  includes: { marginTop: 8 },
  include: { paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.ink },
  actions: { marginTop: 22, gap: 10 },
  close: { minHeight: 44, alignSelf: "center", justifyContent: "center", paddingHorizontal: 12 },
  closeText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink, textDecorationLine: "underline" },
});
