import { BlurView } from "expo-blur";
import { useIsFocused } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Button } from "~/components/ui/Button";
import { Skeleton, SkeletonGroup } from "~/components/ui/Skeleton";
import { P } from "~/components/ui/Text";
import {
  AUTO_LOAD_PAGES,
  familyLabel,
  formatCount,
  isSort,
  searchShades,
  shadeParam,
  type BrandList,
  type PaintBrand,
  type PaintShade,
  type ShadeCredit,
  type Sort,
} from "~/lib/colours";
import { openHref } from "~/lib/links";
import { shadeDisplayName, site } from "~/shared";
import { colors, fonts, gutter, HEADER_HEIGHT, radii } from "~/theme";
import { ChoicePill } from "./Pills";
import { PreviewSheet } from "./PreviewSheet";
import { BrandTile, swatchHeight, TILE_GAP } from "./ShadeTiles";
import type { Load } from "./useLoad";
import { useStickyScroll } from "./useStickyScroll";

// The shade finder on phones: 8,500+ real shades from India's major paint brands (PaintDB), searched
// on the server one page at a time (/api/v1/colours/paint). A bar pinned under the header holds the
// brands as a row of pills and the search field, so both stay in reach down the whole list; under it
// the colour families as swatch-dot pills, the order, and the shades in a three-column grid. A tap on a
// shade opens the large preview as a bottom sheet (swipe it down to close), where picking goes on.
// While the brands or a first page of shades are on their way, skeletons hold their shape.

/** What the preview shows for the selected shade (the website's View). */
export type ShadeView = { name: string; code: string; hex: string; lrv: number; meta: string; note: string; bookHref: string };

// PaintDB keeps a brand's suffix on some names ("Malibu Green-n"); visitors see the clean name.
export const brandView = (s: PaintShade): ShadeView => ({
  name: shadeDisplayName(s.name),
  code: `${s.brandName} ${s.code}`,
  hex: s.hex,
  lrv: s.lrv,
  meta: `${s.hex.toUpperCase()} · LRV ${s.lrv} · ${familyLabel(s.family)} · ${s.undertone}`,
  note: s.interior && s.exterior ? "Made for interior and exterior walls." : s.exterior ? "An exterior shade." : "An interior shade.",
  bookHref: `/book?shade=${encodeURIComponent(s.id)}`,
});

/** A representative swatch per PaintDB colour family, for the family pills. */
const FAMILY_SWATCH: Record<string, string> = {
  white: "#f6f3ec", beige: "#e3d3b8", yellow: "#f0cf63", orange: "#ee9a57", pink: "#eaa3a8", red: "#c4473f",
  purple: "#8c6fa8", blue: "#6c93c4", green: "#7fa77a", gray: "#a3a39e", brown: "#8a5a3c", black: "#2a2a28",
};

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "shade", label: "Shade card (light → dark)" },
  { value: "code", label: "Shade code" },
  { value: "name", label: "Name (A–Z)" },
];

/** Shade tiles per row. */
export const COLUMNS = 3;
/** The width of one tile in a row of COLUMNS across a screen `screenWidth` wide, inside the page's gutters. */
export const tileWidth = (screenWidth: number) => (screenWidth - gutter * 2 - TILE_GAP * (COLUMNS - 1)) / COLUMNS;
/** The space under the pinned bar. */
const BAR_GAP = 12;

type Props = {
  initialQuery?: string;
  initialBrand?: string;
  initialFamily?: string;
  initialSort?: string;
  brands: PaintBrand[];
  brandFamilies: string[];
  brandTotal: number;
  credit: ShadeCredit;
  /** Pages the list loads by itself; after that the Show more button takes over. */
  autoLoadPages?: number;
};

export function ColourFinder({ initialQuery = "", initialBrand, initialFamily, initialSort, brands, brandFamilies, brandTotal, credit, autoLoadPages = AUTO_LOAD_PAGES }: Props) {
  const startBrand = brands.some((b) => b.slug === initialBrand) ? initialBrand! : "";
  const [q, setQ] = useState(initialQuery);
  const [brand, setBrand] = useState(startBrand);
  // a colour family only narrows a brand's card
  const [family, setFamily] = useState(startBrand && initialFamily && brandFamilies.includes(initialFamily) ? initialFamily : "");
  const [sort, setSort] = useState<Sort>(isSort(initialSort) ? initialSort : "shade");
  const [items, setItems] = useState<PaintShade[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  // bumped by "Try again" after a failed load, which runs the first-page load once more
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<PaintShade | null>(null);
  const [expanded, setExpanded] = useState(false);
  const showBrandGrid = !brand && !q.trim();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const brandRow = useRef<ComponentRef<typeof ScrollView>>(null);

  // A brand is a filter: the pills switch it in place and the search stays. All brands drops the family.
  const chooseBrand = (slug: string) => {
    setBrand(slug);
    if (!slug) setFamily("");
  };
  // a brand opened from a link may sit off the row's right edge: bring its pill into view
  const revealPill = (e: LayoutChangeEvent) => brandRow.current?.scrollTo({ x: Math.max(0, e.nativeEvent.layout.x - gutter), animated: false });

  // first page whenever the brand, colour family, order or search changes
  useEffect(() => {
    if (showBrandGrid) return;
    let live = true;
    setState("loading");
    setItems([]);
    const t = setTimeout(
      async () => {
        try {
          const res = await searchShades({ q, brand, family, sort, page: 1 });
          if (!live) return;
          setItems(res.shades);
          setTotal(res.total);
          setPage(res.page);
          setPages(res.pages);
          setState("idle");
        } catch {
          if (live) setState("error");
        }
      },
      q.trim() ? 250 : 0,
    );
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [showBrandGrid, q, brand, family, sort, attempt]);

  // the next page, by the list nearing its end or Show more
  const loadingMore = useRef(false);
  const loadMore = useCallback(async () => {
    if (loadingMore.current || page >= pages || state !== "idle" || showBrandGrid) return;
    loadingMore.current = true;
    try {
      const res = await searchShades({ q, brand, family, sort, page: page + 1 });
      setItems((list) => {
        const seen = new Set(list.map((i) => i.id));
        return [...list, ...res.shades.filter((s) => !seen.has(s.id))];
      });
      setPage(res.page);
      setPages(res.pages);
    } catch {
      setState("error");
    } finally {
      loadingMore.current = false;
    }
  }, [page, pages, state, showBrandGrid, q, brand, family, sort]);

  // a tap on a tile selects the shade and opens the large preview
  const open = useCallback((s: PaintShade) => {
    setSelected(s);
    setExpanded(true);
  }, []);
  const closeSheet = useCallback(() => setExpanded(false), []);

  const brandInfo = brands.find((b) => b.slug === brand);
  const active = selected && items.some((s) => s.id === selected.id) ? selected : null;
  const view = active ? brandView(active) : null;

  const focused = useIsFocused();
  const { container, item, pinnedStyle } = useStickyScroll({
    pinned: true,
    focused,
    stickTop: insets.top + HEADER_HEIGHT,
    screenHeight: height,
    gapBelow: BAR_GAP,
    watchEnd: !showBrandGrid && page < autoLoadPages && page < pages && state === "idle",
    nearEndPx: 800,
    onNearEnd: () => void loadMore(),
    listKey: items.length,
  });

  const tile = tileWidth(width);
  const brandWidth = (width - gutter * 2 - 8) / 2;
  const searchLabel = brandInfo ? `Search ${brandInfo.name} by code, name or hex` : "Search all brands by code, name or hex";

  return (
    <Animated.View ref={container} collapsable={false}>
      {/* the bar: brands and search, pinned under the header while the finder is on screen */}
      <Animated.View ref={item} collapsable={false} style={[styles.bar, pinnedStyle]} testID="finder-bar">
        <BlurView intensity={24} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.barWash]} />
        <ScrollView
          ref={brandRow}
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityLabel="Paint brands"
          style={styles.brandRow}
          contentContainerStyle={styles.brandRowContent}
        >
          {[{ slug: "", name: "All brands" }, ...brands].map((b) => (
            <ChoicePill
              key={b.slug || "all"}
              label={b.name}
              selected={brand === b.slug}
              onPress={() => chooseBrand(b.slug)}
              onLayout={b.slug && brand === b.slug ? revealPill : undefined}
            />
          ))}
        </ScrollView>
        <View style={styles.search}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={brandInfo ? `Search ${brandInfo.name}: code, name, hex` : "Search all brands: code, name, hex"}
            placeholderTextColor={colors.muted2}
            accessibilityLabel={searchLabel}
            autoComplete="off"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={[styles.input, q !== "" && styles.inputClearable]}
          />
          {q !== "" && (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear the search" onPress={() => setQ("")} hitSlop={4} style={styles.clear}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" aria-hidden>
                <Path d="M6 6l12 12M18 6L6 18" />
              </Svg>
            </Pressable>
          )}
        </View>
      </Animated.View>

      {brandInfo && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.families} contentContainerStyle={styles.familiesRow} accessibilityLabel="Primary colour">
          {["", ...brandFamilies].map((f) => (
            <ChoicePill
              key={f || "all"}
              label={f ? familyLabel(f) : "All colours"}
              dot={f ? (FAMILY_SWATCH[f] ?? "#ccc") : undefined}
              selected={family === f}
              onPress={() => setFamily(f)}
            />
          ))}
        </ScrollView>
      )}
      {brandInfo && !q.trim() && (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort</Text>
          <SortSelect value={sort} onChange={setSort} />
        </View>
      )}

      {showBrandGrid ? (
        <>
          <Text style={styles.status}>
            {brandTotal > 0 ? `${formatCount(brandTotal)} shades from ${brands.length} brands. ` : ""}Pick a brand to see its shade card, or search them all at once.
          </Text>
          <View style={styles.brandGrid} accessibilityLabel="Paint brands, with their shade counts">
            {brands.map((b) => (
              <Pressable
                key={b.slug}
                accessibilityRole="button"
                accessibilityLabel={`${b.name}, ${formatCount(b.count)} shades`}
                onPress={() => chooseBrand(b.slug)}
                style={({ pressed }) => [styles.brandCard, { width: brandWidth }, pressed && styles.brandCardPressed]}
              >
                <Text style={styles.brandCardName}>{b.name}</Text>
                <Text style={styles.brandCardCount}>{formatCount(b.count)} shades</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          {state === "loading" && items.length === 0 ? (
            <GridSkeleton tile={tile} />
          ) : (
            <Text style={styles.status} accessibilityLiveRegion="polite">
              {state === "error"
                ? "Brand shades are unavailable right now. Check your connection and try again."
                : total === 0
                  ? "No shade matches that. Try a code like 7982, a name, or a hex like #bbc8b2."
                  : `${formatCount(total)} shade${total === 1 ? "" : "s"}${q ? ` for “${q}”` : ""}${family ? ` · ${familyLabel(family)}` : ""}. Tap one to see it on the wall.`}
            </Text>
          )}
          {state === "error" && <Button label="Try again" variant="secondary" onPress={() => setAttempt((a) => a + 1)} style={styles.retry} />}
          <View style={styles.grid} accessibilityLabel="Brand shades">
            {items.map((s) => (
              <BrandTile key={s.id} shade={s} selected={active?.id === s.id} width={tile} onSelect={open} />
            ))}
          </View>
          {page < pages && state !== "error" && items.length > 0 && (
            <Button label={`Show more (${formatCount(total - items.length)} left)`} variant="secondary" onPress={() => void loadMore()} style={styles.more} />
          )}
        </>
      )}
      <Credit credit={credit} />

      {expanded && view && active && (
        <PreviewSheet
          view={view}
          shades={items.map((s) => ({ id: s.id, name: shadeDisplayName(s.name), code: s.code, hex: s.hex }))}
          selectedId={active.id}
          onSelect={(id) => setSelected(items.find((s) => s.id === id) ?? null)}
          onClose={closeSheet}
          onNearEnd={() => void loadMore()}
        />
      )}
    </Animated.View>
  );
}

type FinderParams = { brand?: string; q?: string; family?: string; sort?: string; shade?: string };

/**
 * The finder with its starting brand, search, colour family and order from the screen's params
 * (/colours?brand=berger&q=3P0050, /colours?brand=asian-paints&family=blue&sort=code), once the
 * brand list has loaded. An old visualizer link's `shade=asian-paints:8386` opens that shade.
 */
export function ColourFinderFromParams({ list, params }: { list: Load<BrandList>; params: FinderParams }) {
  if (list.error) {
    return (
      <View>
        <Text style={styles.status} accessibilityLiveRegion="polite">
          Brand shades are unavailable right now. Check your connection and try again.
        </Text>
        <Button label="Try again" variant="secondary" onPress={list.retry} style={styles.retry} />
      </View>
    );
  }
  if (!list.data) return <FinderSkeleton />;
  const fromShade = !params.brand && !params.q ? shadeParam(params.shade) : undefined;
  const initial = {
    initialQuery: fromShade?.q ?? params.q,
    initialBrand: fromShade?.brand ?? params.brand,
    initialFamily: params.family,
    initialSort: params.sort,
  };
  const { brands, families, shades, credit } = list.data;
  return <ColourFinder key={JSON.stringify(Object.values(initial))} {...initial} brands={brands} brandFamilies={families} brandTotal={shades} credit={credit} />;
}

/** The brands on their way: the bar's row of brand pills and the search field, the count line and the brand cards, in skeleton. */
function FinderSkeleton() {
  const { width } = useWindowDimensions();
  const brandWidth = (width - gutter * 2 - 8) / 2;
  return (
    <SkeletonGroup label="Loading shades" testID="finder-skeleton">
      <View style={styles.skeletonPills}>
        {[92, 112, 86, 104, 96].map((w, i) => (
          <Skeleton key={i} height={44} width={w} radius={radii.pill} />
        ))}
      </View>
      <Skeleton height={48} radius={radii.md} style={styles.skeletonSearch} />
      <Skeleton height={14} width="72%" style={styles.skeletonStatus} />
      <View style={styles.brandGrid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={64} width={brandWidth} radius={16} />
        ))}
      </View>
    </SkeletonGroup>
  );
}

/** A page of shades on its way: the count line and three rows of tiles (a block of colour over a name and code), in skeleton. */
function GridSkeleton({ tile }: { tile: number }) {
  return (
    <SkeletonGroup label="Loading shades" testID="grid-skeleton">
      <Skeleton height={14} width="58%" style={styles.skeletonStatus} />
      <View style={styles.grid}>
        {Array.from({ length: COLUMNS * 3 }, (_, i) => (
          <View key={i} style={[styles.skeletonTile, { width: tile }]}>
            <Skeleton height={swatchHeight(tile)} radius={0} />
            <View style={styles.skeletonTileBody}>
              <Skeleton height={12} width="82%" />
              <Skeleton height={10} width="46%" />
            </View>
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

/** The CC BY 4.0 credit under the finder. */
function Credit({ credit }: { credit: ShadeCredit }) {
  return (
    <P size={12} leading={1.625} color={colors.muted} style={styles.credit}>
      Brand shades:{" "}
      <Text accessibilityRole="link" style={styles.underline} onPress={() => openHref(credit.source)}>
        PaintDB
      </Text>
      , licensed{" "}
      <Text accessibilityRole="link" style={styles.underline} onPress={() => openHref(credit.licenseUrl)}>
        CC BY 4.0
      </Text>
      . On-screen colours approximate each brand&apos;s published shade. {site.name} isn&apos;t affiliated with these brands; the inspector brings the real shade card.
    </P>
  );
}

/** The order select: the field's look at the finder's compact size (44pt, 14px), opening a sheet of the three orders. */
function SortSelect({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const chosen = SORT_OPTIONS.find((o) => o.value === value)!;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Sort" accessibilityValue={{ text: chosen.label }} onPress={() => setOpen(true)} style={styles.select}>
        <Text style={styles.selectText} numberOfLines={1}>
          {chosen.label}
        </Text>
        <View style={styles.chevron}>
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={1.6}>
            <Path d="M6 9l6 6 6-6" />
          </Svg>
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="sort-backdrop"
          />
          <View accessibilityViewIsModal onAccessibilityEscape={() => setOpen(false)} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.sheetTitle}>Sort</Text>
            {SORT_OPTIONS.map((o) => (
              <Pressable
                key={o.value}
                accessibilityRole="button"
                accessibilityState={{ selected: o.value === value }}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={styles.option}
              >
                <Text style={[styles.optionText, o.value === value && styles.optionOn]}>{o.label}</Text>
              </Pressable>
            ))}
            <Button label="Cancel" variant="secondary" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    zIndex: 20,
    elevation: 2,
    marginHorizontal: -gutter,
    marginBottom: BAR_GAP,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: colors.lineSoft,
    overflow: "hidden",
  },
  barWash: { backgroundColor: "rgba(248, 245, 239, 0.95)" },
  brandRow: { flexGrow: 0 },
  brandRowContent: { paddingHorizontal: gutter, gap: 8 },
  search: { marginTop: 10, marginHorizontal: gutter, justifyContent: "center" },
  input: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  inputClearable: { paddingRight: 48 },
  clear: { position: "absolute", right: 2, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  families: { marginHorizontal: -gutter, flexGrow: 0 },
  familiesRow: { paddingHorizontal: gutter, paddingVertical: 2, gap: 8 },
  sortRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  sortLabel: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.muted },
  select: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingLeft: 16,
    paddingRight: 46,
    paddingVertical: 6,
  },
  selectText: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.ink },
  chevron: { position: "absolute", right: 16 },
  skeletonPills: { marginTop: 10, flexDirection: "row", gap: 8, overflow: "hidden" },
  skeletonSearch: { marginTop: 10 },
  skeletonStatus: { marginTop: 19, marginBottom: 3 },
  skeletonTile: { overflow: "hidden", borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  skeletonTileBody: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 10, gap: 6 },
  status: { marginTop: 16, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, letterSpacing: -0.07, color: colors.muted },
  retry: { marginTop: 12, alignSelf: "flex-start" },
  brandGrid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  brandCard: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    padding: 12,
  },
  brandCardPressed: { backgroundColor: colors.creamWash },
  brandCardName: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 20, letterSpacing: -0.24, color: colors.ink },
  brandCardCount: { marginTop: 2, fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 16, color: colors.muted },
  grid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: TILE_GAP },
  more: { marginTop: 20 },
  credit: { marginTop: 20 },
  underline: { textDecorationLine: "underline" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(36, 37, 34, 0.4)" },
  sheet: { maxHeight: "80%", backgroundColor: colors.canvas, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: gutter, gap: 12 },
  sheetTitle: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  option: { minHeight: 52, justifyContent: "center", borderBottomWidth: 1, borderColor: colors.line },
  optionText: { fontFamily: fonts.sans, fontSize: 16, color: colors.ink },
  optionOn: { fontFamily: fonts.sansBold, color: colors.terracotta },
});
