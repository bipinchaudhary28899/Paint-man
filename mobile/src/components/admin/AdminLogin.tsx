import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { Container } from "~/components/site/Page";
import { Card, LinkArrow } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { Field, Input, type InputHandle } from "~/components/ui/Field";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { errorMessage } from "~/lib/auth";
import { useAdmin } from "~/lib/admin-context";
import { site } from "~/shared";
import { colors, fonts } from "~/theme";

// The website's /admin/login in the app: the admin username and password (the same ones as on the
// website), checked by POST /api/admin/session with the website's lockout. No browser: the admin
// screens open here. Phones capitalise and correct a text field's first word; the username field
// turns both off, so "owner" is never sent as "Owner".

export function AdminLogin() {
  const admin = useAdmin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<InputHandle>(null);

  useEffect(() => {
    if (admin.status === "signedIn") router.replace("/admin" as never);
  }, [admin.status]);

  async function submit() {
    if (busy) return;
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await admin.signIn(username, password);
      setPassword("");
      router.replace("/admin" as never);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Container style={styles.page}>
      <Eyebrow>{site.name} team</Eyebrow>
      <H size={40} leading={1.04} tracking={-0.02} style={styles.title}>
        Admin <Em>sign-in</Em>
      </H>
      <P size={17} leading={1.6} color={colors.muted} style={styles.intro}>
        Leads, projects, inspections and quotations. Use the admin username and password you use on the website.
      </P>
      <Card style={styles.card}>
        <Field label="Username">
          <Input
            value={username}
            onChangeText={setUsername}
            accessibilityLabel="Username"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="username"
            textContentType="username"
            maxLength={100}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
          />
        </Field>
        <Field label="Password">
          <Input
            ref={passwordRef}
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="Password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            maxLength={200}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
        </Field>
        {error !== "" && (
          <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <Button label="Sign in" busy={busy} busyLabel="Signing in…" onPress={() => void submit()} height={54} fontSize={16} />
      </Card>
      <LinkArrow label="Customer log in" onPress={() => router.replace("/login" as never)} style={styles.back} />
    </Container>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 64 },
  title: { marginTop: 16 },
  intro: { marginTop: 16 },
  card: { marginTop: 28, padding: 20, gap: 14 },
  // danger on white is 5.35:1
  error: { borderRadius: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.danger, padding: 12, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.danger },
  back: { marginTop: 20 },
});
