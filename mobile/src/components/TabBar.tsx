import type { BottomTabBarProps } from "expo-router/tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { colors, fonts, radii } from "~/theme";

// The website's phone nav (src/components/MobileCtaBar.tsx): a charcoal bar of four tabs, the
// active one carrying a round dab of its own colour around its icon. These four icons are the only
// icons in the app, at the owner's request.

type TabLook = { hue: string; on: string; icon: React.ReactNode };

const looks: Record<string, TabLook> = {
  index: {
    hue: colors.sage,
    on: colors.onInk,
    icon: (
      <>
        <Path d="M4 11l8-7 8 7" />
        <Path d="M6 10v10h12V10" />
      </>
    ),
  },
  services: {
    hue: colors.golden,
    on: colors.ink,
    icon: (
      <>
        <Rect x="4" y="4" width="7" height="7" rx="2" />
        <Rect x="13" y="4" width="7" height="7" rx="2" />
        <Rect x="4" y="13" width="7" height="7" rx="2" />
        <Rect x="13" y="13" width="7" height="7" rx="2" />
      </>
    ),
  },
  colours: {
    hue: colors.terracottaLight,
    on: colors.onInk,
    icon: (
      <>
        <Path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 1-2 1-3a9 9 0 0 0-7-9z" />
        <Circle cx="8" cy="10" r="1" />
        <Circle cx="12" cy="7" r="1" />
        <Circle cx="16" cy="10" r="1" />
      </>
    ),
  },
  book: {
    hue: colors.canvas,
    on: colors.ink,
    icon: (
      <>
        <Rect x="4" y="5" width="16" height="15" rx="2" />
        <Path d="M4 10h16M8 3v4M16 3v4" />
      </>
    ),
  },
};

export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const look = looks[route.name] ?? looks.index;
          const onPress = () => {
            const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              testID={`tab-${route.name}`}
              onPress={onPress}
              style={styles.tab}
            >
              <View style={[styles.dab, focused && { backgroundColor: look.hue }]}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={focused ? look.on : colors.onInkMuted} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  {look.icon}
                </Svg>
              </View>
              <Text style={[styles.label, focused && styles.labelOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16 },
  bar: {
    flexDirection: "row",
    height: 68,
    borderRadius: radii.pill,
    backgroundColor: "rgba(36, 37, 34, 0.96)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: colors.ink,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  dab: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 0.4, color: colors.onInkMuted },
  labelOn: { color: colors.onInk },
});
