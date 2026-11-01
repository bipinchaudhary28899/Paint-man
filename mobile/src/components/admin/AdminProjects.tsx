import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Loading } from "~/components/account/Account";
import { Container } from "~/components/site/Page";
import { Arrow } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { Input, Select } from "~/components/ui/Field";
import { H } from "~/components/ui/Text";
import { adminPath, telUrl, type AdminProjectSummary, type ProjectsMeta } from "~/lib/admin";
import { useAdmin } from "~/lib/admin-context";
import { errorMessage } from "~/lib/auth";
import { formatRupees, formatVisit } from "~/lib/projects";
import { MAIN_STAGES, OFF_LINE_STAGES, STAGE_LABELS } from "~/shared";
import { colors, fonts, radii } from "~/theme";
import { AdminHeader, adminStyles, LoadFailed, useRequireAdmin } from "./AdminKit";

// The website's /admin/projects on a phone: search by name or phone, filter by stage and city (GET
// /api/admin/projects), and each project as a card (customer, service and place, stage, last update,
// final price) that opens it. Most recently updated first, twenty at a time, with Show more.

const PER_PAGE = 20;
const SEARCH_DELAY_MS = 350;

type Filters = { q: string; stage: string; city: string };
const NO_FILTERS: Filters = { q: "", stage: "", city: "" };

type Load = { status: "loading" } | { status: "ready"; items: AdminProjectSummary[]; meta: ProjectsMeta } | { status: "error"; message: string };

export const STAGE_OPTIONS = [...MAIN_STAGES, ...OFF_LINE_STAGES].map((s) => ({ value: s, label: STAGE_LABELS[s] }));

export function AdminProjects() {
  useRequireAdmin();
  const admin = useAdmin();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [more, setMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const signedIn = admin.status === "signedIn";

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === text.trim() ? f : { ...f, q: text.trim() })), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    admin
      .request<AdminProjectSummary[]>(adminPath("/api/admin/projects", { ...filters, page, perPage: PER_PAGE }))
      .then((res) => {
        if (!live) return;
        const meta = res.meta as unknown as ProjectsMeta;
        setLoad((prev) => ({ status: "ready", items: page > 1 && prev.status === "ready" ? [...prev.items, ...res.data] : res.data, meta }));
      })
      .catch((err) => live && setLoad({ status: "error", message: errorMessage(err) }))
      .finally(() => live && setMore(false));
    return () => {
      live = false;
    };
    // `admin` changes identity every render; the call depends only on the session being there
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, filters, page, attempt]);

  const refresh = useCallback(() => {
    setPage(1);
    setAttempt((n) => n + 1);
  }, []);

  function change(next: Partial<Filters>) {
    setPage(1);
    setLoad({ status: "loading" });
    setFilters((f) => ({ ...f, ...next }));
  }

  const filtered = text.trim() !== "" || filters.stage !== "" || filters.city !== "";

  return (
    <Container style={styles.page}>
      <AdminHeader title="Projects" current="projects" onRefresh={refresh} />
      {load.status === "loading" || !signedIn ? (
        <Loading label="Loading projects" />
      ) : load.status === "error" ? (
        <LoadFailed title="Couldn't load projects" message={load.message} onRetry={refresh} />
      ) : (
        <>
          <View style={styles.filters}>
            <Input value={text} onChangeText={setText} placeholder="Search name or phone…" accessibilityLabel="Search projects by name or phone" autoCapitalize="none" autoCorrect={false} returnKeyType="search" maxLength={80} />
            <Select label="Stage" value={filters.stage} options={STAGE_OPTIONS} placeholder="Any stage" onChange={(stage) => change({ stage })} />
            <Select label="City" value={filters.city} options={load.meta.cities.map((c) => ({ value: c.slug, label: c.name }))} placeholder="All cities" onChange={(city) => change({ city })} />
            <View style={styles.count}>
              <Text style={adminStyles.muted} accessibilityLiveRegion="polite">
                {load.meta.total} project{load.meta.total === 1 ? "" : "s"}
              </Text>
              {filtered && (
                <Button
                  label="Clear filters"
                  variant="secondary"
                  small
                  onPress={() => {
                    setText("");
                    change(NO_FILTERS);
                  }}
                />
              )}
            </View>
          </View>
          {load.items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{filtered ? "No projects match these filters." : "No projects yet. Every booking opens one, in “Booking received”."}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {load.items.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </View>
          )}
          {load.meta.page < load.meta.pages && (
            <Button
              label="Show more"
              variant="secondary"
              busy={more}
              busyLabel="Loading…"
              onPress={() => {
                setMore(true);
                setPage((p) => p + 1);
              }}
              style={styles.more}
            />
          )}
        </>
      )}
    </Container>
  );
}

function ProjectRow({ project: p }: { project: AdminProjectSummary }) {
  const place = [p.locality, p.city].filter(Boolean).join(", ");
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${p.name}, ${p.stageLabel}`}
        onPress={() => router.push(`/admin/projects/${p.id}` as never)}
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}
      >
        <View style={styles.flex}>
          <H size={21} balance={false}>
            {p.name}
          </H>
          <Text style={styles.stage}>{p.stageLabel}</Text>
          <Text style={adminStyles.muted}>{[p.service ?? "Painting", place].filter(Boolean).join(" · ")}</Text>
          <Text style={adminStyles.muted}>
            Updated {formatVisit(p.updatedAt)}
            {p.finalPricePaise !== undefined ? ` · Final price ${formatRupees(p.finalPricePaise)}` : ""}
          </Text>
        </View>
        <Arrow size={18} color={colors.muted} />
      </Pressable>
      <Text accessibilityRole="link" accessibilityLabel={`Call ${p.name}, ${p.phone}`} onPress={() => void Linking.openURL(telUrl(p.phone))} style={[adminStyles.link, styles.phone]}>
        {p.phone}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: 64 },
  filters: { marginTop: 22, gap: 12 },
  count: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44 },
  empty: { marginTop: 20, borderRadius: radii.lg, borderWidth: 1, borderStyle: "dashed", borderColor: colors.lineStrong, padding: 28 },
  emptyText: { textAlign: "center", fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.muted },
  list: { marginTop: 18, gap: 14 },
  card: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.paper, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6 },
  open: { flexDirection: "row", alignItems: "center", gap: 12 },
  pressed: { opacity: 0.7 },
  flex: { flex: 1, gap: 2 },
  stage: { marginTop: 4, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.terracotta },
  phone: { fontSize: 15, minHeight: 44, paddingVertical: 11, alignSelf: "flex-start" },
  more: { marginTop: 18 },
});
