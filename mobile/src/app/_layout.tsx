import { DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from "@expo-google-fonts/dm-serif-display";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import { Tabs } from "expo-router/tabs";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { TabBar } from "~/components/TabBar";
import { colors } from "~/theme";

SplashScreen.preventAutoHideAsync();

// Four tabs, as the website's phone nav: Home, Services (with cities), Colours and Estimate (booking).
export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas } }}>
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="services" options={{ title: "Services" }} />
        <Tabs.Screen name="colours" options={{ title: "Colours" }} />
        <Tabs.Screen name="book" options={{ title: "Estimate" }} />
      </Tabs>
    </>
  );
}
