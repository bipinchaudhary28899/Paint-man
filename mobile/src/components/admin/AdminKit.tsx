import { router } from "expo-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { Eyebrow, H, MAX_SCALE } from "~/components/ui/Text";
import { errorMessage } from "~/lib/auth";
import { useAdmin } from "~/lib/admin-context";
import { colors, fonts, radii } from "~/theme";

// What every admin screen shares: the sign-in guard, the header (title, who is signed in, Refresh,
// Sign out and the Leads / Projects switch), a section card, label/value rows, the line that says
// how an action went, and the hook that runs one admin action and reloads the screen's data after.

/** Signed out (or the admin session ended): the admin sign-in screen. */
export function useRequireAdmin(): void {
  const { status } = useAdmin();
  useEffect(() => {
    if (status === "signedOut") router.replace("/admin/login" as never);
  }, [status]);
}

const SECTIONS = [
  { key: "leads", href: "/admin", label: "Leads" },
  { key: "projects", href: "/admin/projects", label: "Projects" },
] as const;

export type AdminSection = (typeof SECTIONS)[number]["key"];

/** The top of every signed-in admin screen. */
export function AdminHeader({ title, current, onRefresh, children }: { title: string; current: AdminSection; onRefresh?: () => void; children?: ReactNode }) {
  const admin = useAdmin();
  return (
    <View style={styles.header}>
      <Eyebrow>Admin</Eyebrow>
      <H size={32} style={styles.title}>
        {title}
      </H>
      <Text style={styles.signedIn} maxFontSizeMultiplier={MAX_SCALE.large}>
        Signed in as {admin.username ?? "admin"}
        {onRefresh && (
          <>
            {" · "}
            <Text accessibilityRole="link" onPress={onRefresh} style={styles.refresh}>
              Refresh
            </Text>
          </>
        )}
      </Text>
      {children}
      <View style={styles.headerRow}>
        <View accessibilityRole="tablist" style={styles.tabs}>
          {SECTIONS.map((s) => {
            const on = s.key === current;
            return (
              <Pressable
                key={s.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => !on && router.navigate(s.href as never)}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Text style={[styles.tabText, on && styles.tabTextOn]} maxFontSizeMultiplier={MAX_SCALE.fixed}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Button
          label="Sign out"
          variant="secondary"
          small
          onPress={() => {
            void admin.signOut();
            router.replace("/admin/login" as never);
          }}
        />
      </View>
    </View>
  );
}

/** A section of an admin screen: a card with its heading. */
export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card style={styles.panel}>
      <View style={styles.panelTop}>
        <H size={24} balance={false} style={styles.panelTitle}>
          {title}
        </H>
        {action}
      </View>
      {children}
    </Card>
  );
}

/** One label and value, hairline above (the website's admin <dl> rows). */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={typeof children === "string" ? `${label}: ${children}` : undefined}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof children === "string" ? <Text style={styles.rowValue}>{children}</Text> : <View style={styles.rowBody}>{children}</View>}
    </View>
  );
}

/** How an action went: the failure in danger, or the success line (announced either way). */
export function Notice({ error, done }: { error?: string; done?: string }) {
  if (error) {
    return (
      <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
        {error}
      </Text>
    );
  }
  if (done) {
    return (
      <Text style={styles.done} accessibilityLiveRegion="polite">
        {done}
      </Text>
    );
  }
  return null;
}

/** Small muted help under a field. */
export function Help({ children }: { children: ReactNode }) {
  return <Text style={styles.help}>{children}</Text>;
}

/** A screen's data could not load: the reason and Try again. */
export function LoadFailed({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.failed}>
      <Text style={styles.failedTitle}>{title}</Text>
      <Text style={styles.failedText}>{message}</Text>
      <Button label="Try again" variant="secondary" small onPress={onRetry} style={styles.failedButton} />
    </View>
  );
}

export type AdminAction = {
  /** sends one request; resolves to its `data`, or null when it failed (the reason is in `error`) */
  run: <T = unknown>(method: "POST" | "PUT" | "PATCH", path: string, body: unknown, success: string, opts?: { reload?: boolean }) => Promise<T | null>;
  busy: boolean;
  error: string;
  done: string;
  setError: (message: string) => void;
  setDone: (message: string) => void;
};

/** One admin action's state: busy while it runs, then its success line or failure; `reload` after a success. */
export function useAdminAction(reload?: () => void): AdminAction {
  const admin = useAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const run = useCallback(
    async <T,>(method: "POST" | "PUT" | "PATCH", path: string, body: unknown, success: string, { reload: again = true } = {}) => {
      setBusy(true);
      setError("");
      setDone("");
      try {
        const res = await admin.request<T>(path, { method, body });
        setDone(success);
        if (again) reload?.();
        return res.data;
      } catch (err) {
        setError(errorMessage(err));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [admin, reload],
  );
  return { run, busy, error, done, setError, setDone };
}

export const adminStyles = StyleSheet.create({
  fields: { gap: 14, marginTop: 14 },
  pair: { flexDirection: "row", gap: 12 },
  flex: { flex: 1 },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  divider: { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line, gap: 14 },
  muted: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.muted },
  text: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.ink },
  strong: { fontFamily: fonts.sansSemiBold, color: colors.ink },
  link: { fontFamily: fonts.sansSemiBold, color: colors.terracotta, textDecorationLine: "underline" },
});

const styles = StyleSheet.create({
  header: { paddingTop: 28, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { marginTop: 8 },
  signedIn: { marginTop: 6, fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.muted },
  refresh: { fontFamily: fonts.sansSemiBold, color: colors.ink, textDecorationLine: "underline" },
  headerRow: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  tabs: { flexDirection: "row", gap: 20 },
  tab: { minHeight: 44, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabOn: { borderBottomColor: colors.terracotta },
  tabText: { fontFamily: fonts.sansSemiBold, fontSize: 16, color: colors.muted },
  tabTextOn: { color: colors.ink },
  panel: { padding: 20, marginTop: 18 },
  panelTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  panelTitle: { flexShrink: 1 },
  row: { flexDirection: "row", gap: 12, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.line },
  rowLabel: { width: 112, fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.muted },
  rowValue: { flex: 1, fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.ink },
  rowBody: { flex: 1 },
  // danger on white is 5.35:1
  error: { borderRadius: 8, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.paper, padding: 12, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.danger },
  done: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.fern },
  help: { marginTop: 6, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.muted },
  failed: { marginTop: 24, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.roseWash, padding: 20 },
  failedTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: colors.ink },
  failedText: { marginTop: 6, fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.ink },
  failedButton: { marginTop: 14, alignSelf: "flex-start" },
});
