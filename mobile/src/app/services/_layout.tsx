import { Stack } from "expo-router";

import { colors, fonts } from "~/theme";

// The Services tab: the hub, then a service or a city pushed on top (the tab bar stays).
export default function ServicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        headerTintColor: colors.terracotta,
        headerTitleStyle: { fontFamily: fonts.sansBold, color: colors.ink },
        headerBackTitle: "Back",
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
