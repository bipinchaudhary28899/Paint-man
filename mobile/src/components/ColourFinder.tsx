import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError, NETWORK_MESSAGE } from "~/lib/api";
import {
  familyLabel,
  fetchBrands,
  searchShades,
  shadeLabel,
  shadeUse,
  textOnSwatch,
  type BrandList,
  type PaintShade,
  type ShadeCredit,
} from "~/lib/colours";
import { colors, fonts, gutter, radii } from "~/theme";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { Body, Muted } from "./Text";

// The colour finder: search 8,500+ brand shades by name, code or hex, narrow to a brand and a
// colour family, open a shade and book an inspection with it. Data from the website's public API;
// the PaintDB credit (CC BY 4.0) shows under the results whenever shades are on screen.

type Results = { shades: PaintShade[]; total: number; page: number; pages: number; credit: ShadeCredit };
type Status = "loading" | "ready" | "more" | "error";

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : NETWORK_MESSAGE);
const isAbort = (err: unknown) => err instanceof Error && err.name === "AbortError";

type Props = {
  onBook: (shade: PaintShade) => void;
  /** Wait after the last keystroke before searching. */
  debounceMs?: number;
};

export function ColourFinder({ onBook, debounceMs = 350 }: Props) {
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const [brand, setBrand] = useState<string>();
  const [family, setFamily] = useState<string>();
  const [catalogue, setCatalogue] = useState<BrandList>();
  const [results, setResults] = useState<Results>();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<PaintShade>();

  // the search runs once typing pauses
  useEffect(() => {
    const t = setTimeout(() => setTerm(text.trim()), debounceMs);
    return () => clearTimeout(t);
  }, [text, debounceMs]);

  // brands and families for the chips (once, and again on a retry if they failed)
  useEffect(() => {
    if (catalogue) return;
    const ctrl = new AbortController();
    fetchBrands(ctrl.signal).then(setCatalogue, () => undefined);
    return () => ctrl.abort();
  }, [catalogue, attempt]);

  // page 1 of every new search
  useEffect(() => {
    const ctrl = new AbortController();
    setStatus("loading");
    setError("");
    searchShades({ q: term, brand, family }, ctrl.signal).then(
      (r) => {
        setResults(r);
        setStatus("ready");
      },
      (err) => {
        if (isAbort(err)) return;
        setError(errorMessage(err));
        setStatus("error");
      },
    );
    return () => ctrl.abort();
  }, [term, brand, family, attempt]);

  async function loadMore() {
    if (!results) return;
    setStatus("more");
    try {
      const next = await searchShades({ q: term, brand, family, page: results.page + 1 });
      setResults({ ...next, shades: [...results.shades, ...next.shades] });
      setStatus("ready");
    } catch (err) {
      setError(errorMessage(err));
      setStatus("error");
    }
  }

  const pickBrand = (slug?: string) => {
    setBrand(slug);
    setFamily(undefined);
  };
  const brandName = catalogue?.brands.find((b) => b.slug === brand)?.name;
  const shown = status !== "loading" && results ? results : undefined;

  return (
    <View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Shade name, code or hex (e.g. 8386)"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Search shades"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        maxLength={80}
        style={styles.search}
      />

      {catalogue && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
          <Chip label="All brands" selected={!brand} onPress={() => pickBrand(undefined)} />
          {catalogue.brands.map((b) => (
            <Chip key={b.slug} label={b.name} selected={brand === b.slug} onPress={() => pickBrand(b.slug)} />
          ))}
        </ScrollView>
      )}
      {catalogue && brand && catalogue.families.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
          <Chip label="All colours" selected={!family} onPress={() => setFamily(undefined)} />
          {catalogue.families.map((f) => (
            <Chip key={f} label={familyLabel(f)} selected={family === f} onPress={() => setFamily(f)} />
          ))}
        </ScrollView>
      )}

      {status === "loading" && (
        <View style={styles.state} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.terracotta} />
          <Muted>Loading shades…</Muted>
        </View>
      )}

      {status === "error" && (
        <View style={styles.errorBox} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
          <Button label="Try again" variant="secondary" onPress={() => setAttempt((a) => a + 1)} />
        </View>
      )}

      {shown && (
        <>
          <Muted style={styles.count} accessibilityLiveRegion="polite">
            {shown.total.toLocaleString("en-IN")} shade{shown.total === 1 ? "" : "s"}
            {term ? ` matching "${term}"` : ""}
            {brandName ? ` from ${brandName}` : ""}
            {family ? ` in ${family}` : ""}
          </Muted>
          {shown.total === 0 && <Body>No shades found. Try a shade code from the card, a name, or a hex like #bbc8b2.</Body>}
          <View style={styles.grid}>
            {shown.shades.map((s) => (
              <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={shadeLabel(s)} onPress={() => setOpen(s)} style={styles.cell}>
                <View style={[styles.swatch, { backgroundColor: s.hex }]} />
                <Text style={styles.name} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.code} numberOfLines={1}>
                  {s.brandName} {s.code}
                </Text>
              </Pressable>
            ))}
          </View>
          {(shown.page < shown.pages || status === "more") && (
            <Button label="Show more shades" busyLabel="Loading…" busy={status === "more"} variant="secondary" onPress={loadMore} style={styles.more} />
          )}
          <Credit credit={shown.credit} />
        </>
      )}

      <Modal visible={open !== undefined} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(undefined)}>
        {open && (
          <ShadeDetail
            shade={open}
            onClose={() => setOpen(undefined)}
            onBook={() => {
              setOpen(undefined);
              onBook(open);
            }}
            credit={results?.credit}
          />
        )}
      </Modal>
    </View>
  );
}

/** The PaintDB attribution and licence link, required wherever the shades are shown. */
export function Credit({ credit }: { credit: ShadeCredit }) {
  return (
    <View style={styles.credit}>
      <Muted style={styles.creditText}>
        {credit.attribution}.{" "}
        <Text accessibilityRole="link" style={styles.creditLink} onPress={() => void Linking.openURL(credit.licenseUrl)}>
          View the licence
        </Text>
      </Muted>
      <Muted style={styles.creditText}>{credit.note}</Muted>
    </View>
  );
}

function ShadeDetail({ shade, onClose, onBook, credit }: { shade: PaintShade; onClose: () => void; onBook: () => void; credit?: ShadeCredit }) {
  const ink = textOnSwatch(shade.hex);
  const rows: [string, string][] = [
    ["Brand", shade.brandName],
    ["Shade code", shade.code],
    ["Hex", shade.hex.toUpperCase()],
    ["Light reflectance (LRV)", String(shade.lrv)],
    ["Family", `${familyLabel(shade.family)}${shade.undertone ? `, ${shade.undertone}` : ""}`],
    ["Use", shadeUse(shade)],
  ];
  return (
    <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
      <View style={[styles.big, { backgroundColor: shade.hex }]} accessibilityLabel={`Swatch of ${shadeLabel(shade)}`}>
        <Text accessibilityRole="header" style={[styles.bigName, { color: ink }]}>
          {shade.name}
        </Text>
        <Text style={[styles.bigCode, { color: ink }]}>
          {shade.brandName} {shade.code}
        </Text>
      </View>
      <View style={styles.rows}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.detailRow}>
            <Muted>{k}</Muted>
            <Text style={styles.detailValue}>{v}</Text>
          </View>
        ))}
      </View>
      <Muted style={styles.approx}>Colours on screen are approximate. The inspector brings the brand's shade card so you can see it on your own wall.</Muted>
      <Button label="Book an inspection with this shade" onPress={onBook} style={styles.sheetButton} />
      <Button label="Close" variant="secondary" onPress={onClose} style={styles.sheetButton} />
      {credit && <Credit credit={credit} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 52,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  bleed: { marginHorizontal: -gutter, marginTop: 12 },
  chips: { paddingHorizontal: gutter, gap: 8 },
  state: { paddingVertical: 32, alignItems: "center", gap: 10 },
  errorBox: { marginTop: 20, gap: 12, padding: 16, borderRadius: radii.md, backgroundColor: colors.sand },
  errorText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.danger },
  count: { marginTop: 18, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  cell: { width: "50%", paddingHorizontal: 6, marginBottom: 16 },
  swatch: { aspectRatio: 1.25, borderRadius: radii.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  name: { marginTop: 8, fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  code: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  more: { marginTop: 4 },
  credit: { marginTop: 20, gap: 4 },
  creditText: { fontSize: 12, lineHeight: 18 },
  creditLink: { textDecorationLine: "underline", color: colors.ink },
  sheet: { flex: 1, backgroundColor: colors.canvas },
  sheetContent: { padding: gutter, paddingBottom: 48 },
  big: { height: 240, borderRadius: radii.lg, padding: 20, justifyContent: "flex-end", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  bigName: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 36 },
  bigCode: { fontFamily: fonts.sansSemiBold, fontSize: 15, marginTop: 2 },
  rows: { marginTop: 18, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  detailValue: { flexShrink: 1, textAlign: "right", fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.ink },
  approx: { marginTop: 16, fontSize: 14 },
  sheetButton: { marginTop: 12 },
});
