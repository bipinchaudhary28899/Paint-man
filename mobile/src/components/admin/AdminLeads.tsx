import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { Loading } from "~/components/account/Account";
import { Container } from "~/components/site/Page";
import { Card, LinkArrow } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { Field, Input, Select } from "~/components/ui/Field";
import { Eyebrow, H, MAX_SCALE } from "~/components/ui/Text";
import { adminPath, LEAD_TYPES, telUrl, type AdminLead, type LeadsMeta } from "~/lib/admin";
import { useAdmin } from "~/lib/admin-context";
import { errorMessage } from "~/lib/auth";
import { LEAD_STATUSES, type LeadStatus } from "~/shared";
import { colors, fonts, radii } from "~/theme";
import { AdminHeader, adminStyles, InfoRow, LoadFailed, useRequireAdmin } from "./AdminKit";

// The website's /admin leads table on a phone: the four counts, search and the type, city and status
// filters (GET /api/admin/leads), and each lead as a card: who, when, the phone to call, the address
// and job, the message, where it came from, the follow-up status (choosing another saves it at once,
// PATCH /api/admin/leads/{id}) and its project. Twenty at a time, with Show more.

const PER_PAGE = 20;
const SEARCH_DELAY_MS = 350;

type Filters = { q: string; type: string; city: string; status: string };
const NO_FILTERS: Filters = { q: "", type: "", city: "", status: "" };

type Load = { status: "loading" } | { status: "ready"; items: AdminLead[]; meta: LeadsMeta } | { status: "error"; message: string };

const TYPE_NAMES: Record<string, string> = { booking: "Booking", visit: "Quick site visit", waitlist: "Waitlist", contact: "Message" };
const STATUS_OPTIONS = (Object.entries(LEAD_STATUSES) as [LeadStatus, string][]).map(([value, label]) => ({ value, label }));

export function AdminLeads() {
  useRequireAdmin();
  const admin = useAdmin();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [more, setMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const signedIn = admin.status === "signedIn";

  // the search waits for a pause in typing
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === text.trim() ? f : { ...f, q: text.trim() })), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    const path = adminPath("/api/admin/leads", { ...filters, page, perPage: PER_PAGE });
    admin
      .request<AdminLead[]>(path)
      .then((res) => {
        if (!live) return;
        const meta = res.meta as unknown as LeadsMeta;
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

  function clear() {
    setText("");
    change(NO_FILTERS);
  }

  /** A status saved on a card: the list shows it at once. */
  function saved(id: string, status: LeadStatus) {
    setLoad((prev) => (prev.status === "ready" ? { ...prev, items: prev.items.map((l) => (l.id === id ? { ...l, status, statusLabel: LEAD_STATUSES[status] } : l)) } : prev));
  }

  const filtered = text.trim() !== "" || filters.type !== "" || filters.city !== "" || filters.status !== "";

  return (
    <Container style={styles.page}>
      <AdminHeader title="Leads" current="leads" onRefresh={refresh} />
      {load.status === "loading" || !signedIn ? (
        <Loading label="Loading leads" />
      ) : load.status === "error" ? (
        <LoadFailed title="Couldn't load leads" message={load.message} onRetry={refresh} />
      ) : (
        <>
          <Stats meta={load.meta} />
          <View style={styles.filters}>
            <Input value={text} onChangeText={setText} placeholder="Search name, phone, address…" accessibilityLabel="Search leads" autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
            <Select label="Lead type" value={filters.type} options={LEAD_TYPES} placeholder="All types" onChange={(type) => change({ type })} />
            {load.meta.options.cities.length > 1 && (
              <Select label="City" value={filters.city} options={load.meta.options.cities.map((c) => ({ value: c, label: c }))} placeholder="All cities" onChange={(city) => change({ city })} />
            )}
            <Select label="Status" value={filters.status} options={STATUS_OPTIONS} placeholder="Any status" onChange={(status) => change({ status })} />
            <View style={styles.count}>
              <Text style={adminStyles.muted} accessibilityLiveRegion="polite">
                {load.meta.total === load.meta.stats.total ? `${load.meta.total} lead${load.meta.total === 1 ? "" : "s"}` : `${load.meta.total} of ${load.meta.stats.total} shown`}
              </Text>
              {filtered && <Button label="Clear filters" variant="secondary" small onPress={clear} />}
            </View>
          </View>

          {load.items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{load.meta.stats.total === 0 ? "No leads yet. Bookings from the website and the app appear here as they arrive." : "No leads match these filters."}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {load.items.map((l) => (
                <LeadCard key={l.id} lead={l} onSaved={saved} />
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

function Stats({ meta }: { meta: LeadsMeta }) {
  const stats = [
    { label: "Total leads", value: meta.stats.total, tint: colors.creamWash },
    { label: "Inspection bookings", value: meta.stats.bookings, tint: colors.sageWash },
    { label: "Messages", value: meta.stats.messages, tint: colors.roseWash },
    { label: "Status: New", value: meta.stats.new, tint: colors.peachWash },
  ];
  return (
    <View style={styles.stats}>
      {stats.map((s) => (
        <View key={s.label} style={[styles.stat, { backgroundColor: s.tint }]} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
          <Text style={styles.statLabel} maxFontSizeMultiplier={MAX_SCALE.fixed}>
            {s.label}
          </Text>
          <Text style={styles.statValue}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** One lead: who and when, how to reach them, the job, and the status control. */
export function LeadCard({ lead, onSaved }: { lead: AdminLead; onSaved: (id: string, status: LeadStatus) => void }) {
  const admin = useAdmin();
  const [pending, setPending] = useState<LeadStatus | null>(null);
  const [error, setError] = useState("");

  async function change(next: string) {
    if (!next || next === lead.status) return;
    setPending(next as LeadStatus);
    setError("");
    try {
      await admin.request(`/api/admin/leads/${encodeURIComponent(lead.id)}`, { method: "PATCH", body: { status: next } });
      onSaved(lead.id, next as LeadStatus);
    } catch (err) {
      setError(`Not saved: ${errorMessage(err)}`);
    } finally {
      setPending(null);
    }
  }

  return (
    <Card style={styles.card}>
      <Eyebrow size={11}>{TYPE_NAMES[lead.type] ?? lead.type}</Eyebrow>
      <H size={22} balance={false} style={styles.name}>
        {lead.name}
      </H>
      <Text style={adminStyles.muted}>{lead.received}</Text>
      <Text accessibilityRole="link" accessibilityLabel={`Call ${lead.name}, ${lead.phone}`} onPress={() => void Linking.openURL(telUrl(lead.phone))} style={[adminStyles.link, styles.phone]}>
        {lead.phone}
      </Text>
      <View style={styles.rows}>
        {lead.address !== "" && <InfoRow label="Address">{lead.address}</InfoRow>}
        {lead.propertyType !== "" && <InfoRow label="Property">{lead.propertyType}</InfoRow>}
        {lead.service !== "" && <InfoRow label="Service">{lead.service}</InfoRow>}
        {lead.jobSize !== "" && <InfoRow label="Job size">{lead.jobSize}</InfoRow>}
        {lead.crew !== "" && <InfoRow label="Est. area & crew">{lead.crew}</InfoRow>}
        {lead.preferredDate !== "" && <InfoRow label="Preferred date">{lead.preferredDate}</InfoRow>}
        {lead.message !== "" && <InfoRow label="Message">{lead.message}</InfoRow>}
        <InfoRow label="Source">{lead.channel === "app" ? `App · ${lead.source}` : lead.source}</InfoRow>
      </View>
      <View style={styles.status}>
        <Field label="Status">
          <Select label={`Status of ${lead.name}`} value={pending ?? lead.status} options={STATUS_OPTIONS} placeholder={lead.statusLabel || "New"} allowBlank={false} onChange={(s) => void change(s)} />
        </Field>
        {pending && <Text style={adminStyles.muted}>Saving…</Text>}
        {error !== "" && (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        )}
      </View>
      {lead.projectId && <LinkArrow label="Open project" onPress={() => router.push(`/admin/projects/${lead.projectId}` as never)} style={styles.project} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: 64 },
  stats: { marginTop: 20, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { flexBasis: "47%", flexGrow: 1, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.line, padding: 14 },
  statLabel: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 15, letterSpacing: 1.1, textTransform: "uppercase", color: colors.muted },
  statValue: { marginTop: 4, fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, color: colors.ink },
  filters: { marginTop: 22, gap: 12 },
  count: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44 },
  empty: { marginTop: 20, borderRadius: radii.lg, borderWidth: 1, borderStyle: "dashed", borderColor: colors.lineStrong, padding: 28 },
  emptyText: { textAlign: "center", fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.muted },
  list: { marginTop: 18, gap: 14 },
  card: { padding: 18 },
  name: { marginTop: 6 },
  phone: { marginTop: 8, fontSize: 16, lineHeight: 24, alignSelf: "flex-start", minHeight: 44, textAlignVertical: "center", paddingVertical: 10 },
  rows: { marginTop: 4 },
  status: { marginTop: 12, gap: 6 },
  error: { fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 18, color: colors.danger },
  project: { marginTop: 8 },
  more: { marginTop: 18 },
});
