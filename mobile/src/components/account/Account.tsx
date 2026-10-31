import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Container } from "~/components/site/Page";
import { Card } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { Field, Input } from "~/components/ui/Field";
import { Skeleton, SkeletonGroup } from "~/components/ui/Skeleton";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { ApiError } from "~/lib/api";
import { errorMessage, firstName, formatPhone } from "~/lib/auth";
import { useAuth } from "~/lib/auth-context";
import { formatDay, formatRupees, projectTitle, spokenRupees, summaryExplanation, type ProjectSummary } from "~/lib/projects";
import { FIELD_MESSAGES } from "~/shared";
import { colors, fonts, radii } from "~/theme";

// The account screen (the website's /account): a greeting, the customer's painting projects as cards
// (stage, what it means, last update, the final price once a quotation is approved), their name
// (editable) and verified mobile number, signing out, and deleting the account after a confirm step
// that says plainly what happens to their bookings. Signed out, it opens the login screen, which
// comes back here.

/** Signed out (or the session expired): the login screen, coming back to `next` afterwards. Off while `leaving` is set (signing out on purpose). */
export function useRequireSignIn(next: string, leaving?: { readonly current: boolean }): void {
  const { status } = useAuth();
  useEffect(() => {
    if (status === "signedOut" && !leaving?.current) router.replace({ pathname: "/login", params: { next } } as never);
  }, [status, next, leaving]);
}

/** A screen's content while the session or its data loads: soft skeleton blocks, announced as loading. */
export function Loading({ label }: { label: string }) {
  return (
    <SkeletonGroup label={label} style={styles.loading}>
      <Skeleton height={14} width="40%" />
      <Skeleton height={40} width="85%" />
      <Skeleton height={120} radius={radii.lg} />
      <Skeleton height={120} radius={radii.lg} />
    </SkeletonGroup>
  );
}

type Projects = { status: "loading" } | { status: "ready"; items: ProjectSummary[] } | { status: "error"; message: string };

/** Signing out or deleting the account on purpose: `true` before it (so the screen goes home, not to the login screen), `false` if it failed. */
type Leaving = (on: boolean) => void;

export function Account() {
  const auth = useAuth();
  const leaving = useRef(false);
  useRequireSignIn("/account", leaving);
  const setLeaving: Leaving = (on) => {
    leaving.current = on;
  };
  if (auth.status !== "signedIn") {
    return (
      <Container style={styles.page}>
        <Loading label="Loading your account" />
      </Container>
    );
  }
  return <AccountBody setLeaving={setLeaving} />;
}

function AccountBody({ setLeaving }: { setLeaving: Leaving }) {
  const auth = useAuth();
  const { user } = auth;
  const [projects, setProjects] = useState<Projects>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    auth
      .request<ProjectSummary[]>("/api/v1/projects")
      .then((res) => live && setProjects({ status: "ready", items: Array.isArray(res.data) ? res.data : [] }))
      .catch((err: unknown) => live && setProjects({ status: "error", message: errorMessage(err) }));
    // signed in offline at launch: the account's name and number load now
    if (!user) auth.refresh().catch(() => undefined);
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loads once, and again on "Try again"
  }, [attempt]);

  async function signOut() {
    setLeaving(true);
    await auth.signOut();
    router.navigate("/");
  }

  const name = firstName(user?.name);
  return (
    <Container style={styles.page}>
      <Eyebrow>Your account</Eyebrow>
      <H size={40} leading={1.04} tracking={-0.02} style={styles.title}>
        {name ? (
          <>
            Namaste, <Em>{name}</Em>
          </>
        ) : (
          <>
            Your <Em>account</Em>
          </>
        )}
      </H>
      <P size={18} leading={1.6} color={colors.muted} style={styles.intro}>
        Your painting projects and your details, in one place.
      </P>

      <H size={28} leading={1.2} style={styles.section}>
        My projects
      </H>
      <ProjectList projects={projects} onRetry={() => setAttempt((a) => a + 1)} onRetryStart={() => setProjects({ status: "loading" })} />

      <H size={28} leading={1.2} style={styles.section}>
        Your details
      </H>
      <Card style={styles.card}>
        {/* starts again once an account restored offline has loaded its name */}
        <NameForm key={user ? "loaded" : "waiting"} />
        <View style={styles.phoneRow}>
          <Text style={styles.label}>Mobile number</Text>
          <Text style={styles.phone}>{user ? formatPhone(user.phone) : "…"}</Text>
          <Text style={styles.note}>Confirmed by SMS. To use another number, log in with it.</Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button label="Log out" variant="secondary" onPress={() => void signOut()} />
      </View>
      <DeleteAccount setLeaving={setLeaving} />
    </Container>
  );
}

function ProjectList({ projects, onRetry, onRetryStart }: { projects: Projects; onRetry: () => void; onRetryStart: () => void }) {
  if (projects.status === "loading") {
    return (
      <SkeletonGroup label="Loading your projects" style={styles.list}>
        <Skeleton height={150} radius={radii.lg} />
      </SkeletonGroup>
    );
  }
  if (projects.status === "error") {
    return (
      <Card style={[styles.card, styles.list]}>
        <P color={colors.muted} accessibilityRole="alert">
          {projects.message}
        </P>
        <Button
          label="Try again"
          small
          variant="secondary"
          onPress={() => {
            onRetryStart();
            onRetry();
          }}
          style={styles.retry}
        />
      </Card>
    );
  }
  if (projects.items.length === 0) {
    return (
      <Card style={[styles.card, styles.list, styles.empty]}>
        <H size={22} leading={1.3}>
          No projects yet
        </H>
        <P color={colors.muted} style={styles.emptyText}>
          Book a free inspection and your project shows here, from our first call to the handover. Bookings made with this number on the website show here too.
        </P>
        <Button label="Book a free inspection" accessibilityRole="link" onPress={() => router.push("/book")} style={styles.emptyButton} />
      </Card>
    );
  }
  return (
    <View style={styles.list}>
      {projects.items.map((p) => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </View>
  );
}

/** One project: its stage, what that means, where and when it was last updated, and the final price once agreed. */
export function ProjectCard({ project }: { project: ProjectSummary }) {
  const { what, where } = projectTitle(project);
  const updated = formatDay(project.updatedAt);
  const price = project.finalPricePaise;
  const spoken = [`${what}${where ? ` in ${where}` : ""}`, project.stageLabel, updated && `Last update ${updated}`, price !== undefined && `Final price ${spokenRupees(price)}`]
    .filter(Boolean)
    .join(". ");
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={spoken}
      accessibilityHint="Opens the project tracker"
      onPress={() => router.push(`/account/projects/${project.id}` as never)}
      style={({ pressed }) => [styles.projectCard, pressed && styles.pressed]}
    >
      <View style={styles.stagePill}>
        <Text style={styles.stagePillText}>{project.stageLabel}</Text>
      </View>
      <Text style={styles.projectTitle}>{what}</Text>
      {where && <Text style={styles.where}>{where}</Text>}
      <Text style={styles.explain}>{summaryExplanation(project.stage)}</Text>
      <View style={styles.cardFoot}>
        {updated !== "" && <Text style={styles.updated}>Last update {updated}</Text>}
        {price !== undefined && (
          <Text style={styles.price}>
            Final price <Text style={styles.priceAmount}>{formatRupees(price)}</Text>
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/** The name on the account, editable (2–80 characters, the website's message). */
function NameForm() {
  const auth = useAuth();
  const [name, setName] = useState(auth.user?.name ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaved(false);
    const value = name.trim();
    if (value.length < 2) return setError(FIELD_MESSAGES.name);
    setError("");
    setSaving(true);
    try {
      await auth.rename(value);
      setSaved(true);
    } catch (err) {
      const field = err instanceof ApiError ? (err.details as { name?: string } | undefined)?.name : undefined;
      setError(field ?? errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const changed = name.trim() !== (auth.user?.name ?? "");
  return (
    <View style={styles.nameForm}>
      <Field label="Your name" error={error}>
        <Input
          value={name}
          onChangeText={(v) => {
            setName(v);
            setSaved(false);
          }}
          accessibilityLabel="Your name"
          error={error || undefined}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={() => void save()}
        />
      </Field>
      <View style={styles.saveRow}>
        <Button label="Save name" small busy={saving} busyLabel="Saving…" disabled={!changed} onPress={() => void save()} />
        {saved && (
          <Text style={styles.saved} accessibilityLiveRegion="polite">
            Saved.
          </Text>
        )}
      </View>
    </View>
  );
}

/** "Delete my account", then a confirm step that says what happens to the bookings. */
function DeleteAccount({ setLeaving }: { setLeaving: Leaving }) {
  const auth = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setError("");
    setDeleting(true);
    setLeaving(true);
    try {
      await auth.deleteAccount();
      router.navigate("/");
    } catch (err) {
      setLeaving(false);
      setError(errorMessage(err));
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <View style={styles.deleteStart}>
        <Button label="Delete my account" variant="secondary" small textColor={colors.danger} onPress={() => setConfirming(true)} />
      </View>
    );
  }
  return (
    <Card style={styles.confirm}>
      <H size={22} leading={1.3}>
        Delete your account?
      </H>
      <P color={colors.inkSoft} style={styles.confirmText}>
        This deletes your login and signs you out on every device. Your bookings stay with us, no longer linked to an account, so a visit or work already arranged still goes
        ahead. Log in again with this number and they are linked to your new account.
      </P>
      {error !== "" && (
        <Text accessibilityRole="alert" style={styles.formError}>
          {error}
        </Text>
      )}
      <View style={styles.confirmActions}>
        <Button label="Yes, delete my account" variant="dark" busy={deleting} busyLabel="Deleting…" onPress={() => void remove()} />
        <Button label="Keep my account" variant="secondary" disabled={deleting} onPress={() => setConfirming(false)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 64 },
  loading: { gap: 16 },
  title: { marginTop: 16 },
  intro: { marginTop: 16 },
  section: { marginTop: 48 },
  list: { marginTop: 20, gap: 16 },
  card: { padding: 20 },
  retry: { marginTop: 12, alignSelf: "flex-start" },
  empty: { gap: 0 },
  emptyText: { marginTop: 10 },
  emptyButton: { marginTop: 20, alignSelf: "flex-start" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  projectCard: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.paper, padding: 20, gap: 6 },
  stagePill: { alignSelf: "flex-start", borderRadius: radii.pill, backgroundColor: colors.sand, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 6 },
  stagePillText: { fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: colors.ink },
  projectTitle: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, letterSpacing: -0.36, color: colors.ink },
  where: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 21, color: colors.inkSoft },
  explain: { marginTop: 4, fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.muted },
  cardFoot: { marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderColor: colors.lineSoft, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  updated: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.muted },
  price: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.muted },
  priceAmount: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink },
  nameForm: { gap: 12 },
  saveRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  saved: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.fern },
  phoneRow: { marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderColor: colors.lineSoft, gap: 4 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.ink },
  phone: { fontFamily: fonts.sansMedium, fontSize: 17, lineHeight: 24, color: colors.ink },
  note: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.muted },
  actions: { marginTop: 40, flexDirection: "row" },
  deleteStart: { marginTop: 16, flexDirection: "row" },
  confirm: { marginTop: 16, padding: 20, backgroundColor: colors.creamWash },
  confirmText: { marginTop: 10 },
  confirmActions: { marginTop: 18, gap: 10 },
  formError: { marginTop: 14, borderRadius: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.danger, padding: 12, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.danger },
});
