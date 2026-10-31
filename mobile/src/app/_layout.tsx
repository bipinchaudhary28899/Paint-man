import { DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from "@expo-google-fonts/dm-serif-display";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import { BottomNav } from "~/components/site/BottomNav";
import { LaunchAnimation } from "~/components/site/LaunchAnimation";
import { NavStateProvider } from "~/components/site/nav-state";
import { AuthProvider } from "~/lib/auth-context";
import { colors } from "~/theme";

SplashScreen.preventAutoHideAsync();

// A screen that throws shows the website's error notice (src/app/(site)/error.tsx) inside the page.
export { ScreenError as ErrorBoundary } from "~/components/content/NotFound";

// The app is the website on a phone: one stack of pages at the website's own paths (src/app mirrors
// src/app/(site)), each with the sticky header and the footer, and the phone nav fixed over them.
// AuthProvider restores the customer's session (the token in the secure store) for every screen.
export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // the opening animation plays over the app as the (plain cream) native splash hides
  const [launching, setLaunching] = useState(true);
  const launched = useCallback(() => setLaunching(false), []);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AuthProvider>
      <NavStateProvider>
        <View style={{ flex: 1, backgroundColor: colors.canvas }}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
          <BottomNav />
          {launching && <LaunchAnimation onDone={launched} />}
        </View>
      </NavStateProvider>
    </AuthProvider>
  );
}
