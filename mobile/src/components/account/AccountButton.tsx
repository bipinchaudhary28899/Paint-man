import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { Button } from "~/components/ui/Button";
import { MAX_SCALE } from "~/components/ui/Text";
import { initials } from "~/lib/auth";
import { useAuth } from "~/lib/auth-context";
import { colors, fonts, radii } from "~/theme";

// The account control in the sticky header, beside the menu button: a "Log in" pill when signed out;
// signed in, a round button with the customer's initials (a "My account" pill while the account has
// no name yet). Both open their screen. Nothing shows while the saved session is being read at launch,
// and the login screen leaves out its own "Log in" pill.

/** Where the account link goes and what it is called, for the header and the drawer; null while the session is read. */
export function useAccountLink(): { href: "/account" | "/login"; label: "My account" | "Log in" } | null {
  const { status } = useAuth();
  if (status === "loading") return null;
  return status === "signedIn" ? { href: "/account", label: "My account" } : { href: "/login", label: "Log in" };
}

export function AccountButton() {
  const { user } = useAuth();
  const link = useAccountLink();
  const pathname = usePathname();
  if (!link || pathname === "/login") return null;
  const letters = link.href === "/account" ? initials(user?.name) : null;
  const go = () => router.push(link.href);
  if (letters) {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={link.label}
        accessibilityState={{ selected: pathname === "/account" }}
        onPress={go}
        hitSlop={4}
        testID="account-initials"
        style={({ pressed }) => [styles.initials, pressed && styles.pressed]}
      >
        <Text maxFontSizeMultiplier={MAX_SCALE.fixed} style={styles.initialsText}>
          {letters}
        </Text>
      </Pressable>
    );
  }
  return <Button label={link.label} small variant="secondary" accessibilityRole="link" maxFontSizeMultiplier={MAX_SCALE.fixed} onPress={go} style={styles.pill} />;
}

const styles = StyleSheet.create({
  initials: { width: 44, height: 44, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.sand, alignItems: "center", justifyContent: "center" },
  initialsText: { fontFamily: fonts.sansBold, fontSize: 15, letterSpacing: 0.3, color: colors.ink },
  pressed: { opacity: 0.75 },
  pill: { paddingHorizontal: 16 },
});
