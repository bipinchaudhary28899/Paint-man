import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text } from "react-native";

import { Card } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { H, P } from "~/components/ui/Text";
import { errorMessage } from "~/lib/auth";
import { useAuth } from "~/lib/auth-context";
import { pushState, registerForPush, type PushState } from "~/lib/push";
import { colors, fonts } from "~/theme";

// "Updates on your phone" on the account screen: push notifications of the project's stages, asked
// for only when the customer taps "Turn on updates" (never on launch). Allowed: a line says so.
// Refused: a link to the app's settings, the only place it can be turned back on. In a build without
// push (no Expo project yet) the card is not shown.

const COPY: Record<Exclude<PushState, "unavailable">, string> = {
  ask: "Get a notification when we confirm your visit, schedule the inspection, share your quotation or schedule the work.",
  on: "This phone gets a notification each time your project moves on.",
  blocked: "Notifications are off for this app. Turn them on in Settings to get your project's updates.",
};

export function ProjectUpdates() {
  const { request } = useAuth();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    pushState().then(
      (s) => live && setState(s),
      () => live && setState("unavailable"),
    );
    return () => {
      live = false;
    };
  }, []);

  if (!state || state === "unavailable") return null;

  async function turnOn() {
    setError("");
    setBusy(true);
    try {
      setState(await registerForPush(request, { ask: true }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={styles.card} testID="project-updates">
      <H size={22} leading={1.3}>
        Updates on your phone
      </H>
      <P size={14} leading={1.55} color={colors.muted} style={styles.text}>
        {COPY[state]}
      </P>
      {state === "ask" && <Button label="Turn on updates" busyLabel="Turning on…" busy={busy} onPress={() => void turnOn()} style={styles.button} />}
      {state === "blocked" && (
        <Pressable accessibilityRole="link" onPress={() => void Linking.openSettings()} style={styles.link}>
          <Text style={styles.linkText}>Open Settings</Text>
        </Pressable>
      )}
      {error !== "" && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, padding: 20 },
  text: { marginTop: 6 },
  button: { marginTop: 14 },
  link: { marginTop: 8, minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  linkText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.terracotta, textDecorationLine: "underline" },
  error: { marginTop: 10, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.danger },
});
