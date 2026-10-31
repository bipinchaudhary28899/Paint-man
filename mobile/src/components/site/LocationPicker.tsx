import { useEffect, useRef, useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { type MapPressEvent, type Region } from "react-native-maps";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "~/components/ui/Button";
import { Skeleton } from "~/components/ui/Skeleton";
import { Eyebrow } from "~/components/ui/Text";
import {
  centreOf,
  fillFromPlace,
  locate,
  locateProblem,
  LOOKUP_FAILED,
  lookUpPlace,
  opensSettings,
  roundLatLng,
  STREET_DELTA,
  type LatLng,
  type LocateProblem,
  type MapRegion,
  type Place,
} from "~/lib/location";
import { liveCities } from "~/shared";
import { colors, fonts, gutter, radii } from "~/theme";

// The booking form's map picker (owner: "give him drag and drop feature to pin point the exact
// location"). A full-screen map with a pin fixed at its centre: the visitor drags the map under the
// pin, which lifts while the map moves and drops with a small settle when it stops, so it feels like
// dragging the pin itself. A tap on the map moves it there too. When the map settles, the address
// under the pin is looked up (after a short pause, so a drag is one lookup) and shown in the card,
// with "Confirm this location". "Locate me" goes back to the phone's position, asking for permission
// only then if the map was opened without it. The pin is drawn with views (a functional control, not
// an icon) and hidden from screen readers; the address fields on the form stay the accessible path.

/** The pause after the map stops before the address is looked up. */
export const LOOKUP_DEBOUNCE_MS = 400;
/** How far the pin rises while the map moves. */
export const PIN_LIFT = 16;
/** How far the card's rounded top reaches over the map (the map runs on under it). */
const CARD_OVERLAP = 24;
const MOVE_MS = 350;

export type PinResult = { coords: LatLng; place: Place | null };

type Props = {
  /** where the map opens: the phone's position, the spot pinned before, or a city */
  start: MapRegion;
  /** the phone's position when the visitor has shared it ("Locate me" goes there, and the map shows it) */
  gps?: LatLng;
  onConfirm: (pin: PinResult) => void;
  onClose: () => void;
  /** "Locate me" found the phone (the form remembers it for next time) */
  onLocated?: (coords: LatLng) => void;
};

/** One lookup per spot about a metre across. */
const keyOf = ({ lat, lng }: LatLng) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

/** Looks up the address under a spot once per spot (a failed lookup is tried again the next time). */
function cachedLookup() {
  const known = new Map<string, Promise<Place | null>>();
  return (at: LatLng): Promise<Place | null> => {
    const key = keyOf(at);
    const hit = known.get(key);
    if (hit) return hit;
    const found = lookUpPlace(at);
    known.set(key, found);
    void found.then((place) => {
      if (!place) known.delete(key);
    });
    return found;
  };
}

const lift = { duration: 140, easing: Easing.out(Easing.quad) };
const fall = { duration: 160, easing: Easing.in(Easing.quad) };
const bounce = { duration: 90, easing: Easing.out(Easing.quad) };

/** The pin: a terracotta head over a short stem whose tip marks the spot, and its shadow on the map. */
function Pin({ raised }: { raised: SharedValue<number> }) {
  const pinStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -PIN_LIFT * raised.value }] }));
  const shadowStyle = useAnimatedStyle(() => ({ opacity: 0.35 - 0.15 * raised.value, transform: [{ scale: 1 - 0.4 * raised.value }] }));
  return (
    <View style={styles.pinBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Animated.View style={[styles.pinShadow, shadowStyle]} testID="pin-shadow" />
      <Animated.View style={[styles.pin, pinStyle]} testID="location-pin">
        <View style={styles.pinHead}>
          <View style={styles.pinDot} />
        </View>
        <View style={styles.pinStem} />
      </Animated.View>
    </View>
  );
}

export function LocationPicker({ start, gps, onConfirm, onClose, onLocated }: Props) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const map = useRef<MapView>(null);
  const region = useRef<MapRegion>(start);
  const moving = useRef(false);
  const alive = useRef(true);
  const raised = useSharedValue(0);
  const [resolve] = useState(cachedLookup);
  // the spot under the pin (where the map last stopped) and the address found for a spot
  const [spot, setSpot] = useState<LatLng>(() => centreOf(start));
  const [found, setFound] = useState<{ key: string; place: Place | null }>();
  const [dragging, setDragging] = useState(false);
  const [phone, setPhone] = useState(gps);
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<LocateProblem | null>(null);
  const [confirming, setConfirming] = useState(false);
  // where the map draws its own centre, in points within the map view. Apple Maps centres the region in
  // its safe area (below the status bar), not in its frame, so the pin's tip is stood on the point the map
  // reports for its centre rather than on the middle of the view. Undefined until measured: the middle.
  const [centrePoint, setCentrePoint] = useState<{ x: number; y: number }>();

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // the address under the pin, a short pause after the map stops (a drag is one lookup)
  useEffect(() => {
    let current = true;
    const timer = setTimeout(() => {
      void resolve(spot).then((place) => {
        if (current) setFound({ key: keyOf(spot), place });
      });
    }, LOOKUP_DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [spot, resolve]);

  function raise() {
    if (moving.current) return;
    moving.current = true;
    setDragging(true);
    if (!reduced) raised.value = withTiming(1, lift);
  }

  function drop() {
    if (!moving.current) return;
    moving.current = false;
    setDragging(false);
    if (!reduced) raised.value = withSequence(withTiming(0, fall), withTiming(0.2, bounce), withTiming(0, fall));
  }

  /** Asks the map where it draws the region's centre, and stands the pin there. */
  function measureCentre() {
    const at = region.current;
    void map.current
      ?.pointForCoordinate?.({ latitude: at.latitude, longitude: at.longitude })
      .then((p) => {
        if (!alive.current || !Number.isFinite(p?.x) || !Number.isFinite(p?.y)) return;
        setCentrePoint((now) => (now && Math.abs(now.x - p.x) < 0.5 && Math.abs(now.y - p.y) < 0.5 ? now : { x: p.x, y: p.y }));
      })
      .catch(() => undefined);
  }

  function onSettled(next: Region) {
    region.current = next;
    drop();
    setSpot(centreOf(next));
    measureCentre();
  }

  /** Moves the map so the pin sits on a spot (keeping the zoom unless one is given). */
  function goTo(at: LatLng, delta?: number) {
    const now = region.current;
    map.current?.animateToRegion(
      { latitude: at.lat, longitude: at.lng, latitudeDelta: delta ?? now.latitudeDelta, longitudeDelta: delta ?? now.longitudeDelta },
      reduced ? 0 : MOVE_MS,
    );
  }

  async function locateMe() {
    setProblem(null);
    if (phone) return goTo(phone, STREET_DELTA);
    setLocating(true);
    const located = await locate();
    if (!alive.current) return;
    setLocating(false);
    if (!located.ok) return setProblem(located.problem);
    setPhone(located.coords);
    onLocated?.(located.coords);
    goTo(located.coords, STREET_DELTA);
  }

  /** Confirms the spot under the pin, with its address (looked up now if the pause has not run out yet). */
  async function confirm() {
    setConfirming(true);
    const at = spot;
    const place = await resolve(at);
    if (!alive.current) return;
    setConfirming(false);
    onConfirm({ coords: roundLatLng(at), place });
  }

  const looking = dragging || found?.key !== keyOf(spot);
  const short = !looking && found?.place ? fillFromPlace(found.place, liveCities()).short : "";

  return (
    <Modal visible animationType={reduced ? "none" : "slide"} presentationStyle="fullScreen" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose} testID="location-picker">
      <View style={styles.screen} onAccessibilityEscape={onClose}>
        <View style={styles.mapArea}>
          <MapView
            ref={map}
            style={styles.map}
            initialRegion={start}
            showsUserLocation={phone !== undefined}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            userInterfaceStyle="light"
            onRegionChangeStart={raise}
            onRegionChange={raise}
            onRegionChangeComplete={onSettled}
            onMapReady={measureCentre}
            onPress={(e: MapPressEvent) => goTo(centreOf(e.nativeEvent.coordinate))}
            accessibilityLabel="Map. Move it to put the pin on your home"
          />
          <View style={[styles.map, centrePoint ? styles.pinLayerMeasured : styles.pinLayer]} pointerEvents="none" testID="pin-layer">
            <View style={centrePoint && { position: "absolute", left: centrePoint.x - PIN_HEAD / 2, top: centrePoint.y - (PIN_HEAD + PIN_STEM) }}>
              <Pin raised={raised} />
            </View>
          </View>
          <View style={[styles.topBar, { top: insets.top + 12 }]} pointerEvents="box-none">
            {/* a drag that starts on the hint still moves the map */}
            <View style={styles.hint} pointerEvents="none">
              <Text style={styles.hintText}>Move the map to put the pin on your home</Text>
            </View>
            <Button label="Close" accessibilityLabel="Close the map" variant="secondary" small onPress={onClose} style={styles.onMap} />
          </View>
          <Button
            label="Locate me"
            busyLabel="Finding you…"
            busy={locating}
            variant="secondary"
            small
            onPress={locateMe}
            accessibilityHint="Moves the pin to where your phone is"
            style={[styles.onMap, styles.locate]}
          />
        </View>

        <View style={[styles.card, { paddingBottom: insets.bottom + 16 }]}>
          <Eyebrow>Address under the pin</Eyebrow>
          {looking ? (
            <View accessible accessibilityLabel="Finding the address" accessibilityState={{ busy: true }} style={styles.looking}>
              <Skeleton height={16} width="86%" />
              <Skeleton height={16} width="52%" />
            </View>
          ) : (
            <Text style={short !== "" ? styles.address : styles.muted} accessibilityLiveRegion="polite">
              {short !== "" ? short : LOOKUP_FAILED}
            </Text>
          )}
          {problem && (
            <View style={styles.problem}>
              <Text style={styles.muted} accessibilityLiveRegion="polite">
                {locateProblem(problem, "map")}
              </Text>
              {opensSettings(problem) && (
                <Pressable accessibilityRole="link" onPress={() => void Linking.openSettings()} style={styles.settings}>
                  <Text style={styles.settingsText}>Open Settings</Text>
                </Pressable>
              )}
            </View>
          )}
          <Button label="Confirm this location" busyLabel="Finding the address…" busy={confirming} onPress={confirm} height={54} fontSize={16} />
        </View>
      </View>
    </Modal>
  );
}

const PIN_HEAD = 30;
const PIN_STEM = 14;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  mapArea: { flex: 1 },
  // the map runs on under the card's rounded top; the pin marks the map's own centre
  map: { position: "absolute", top: 0, left: 0, right: 0, bottom: -CARD_OVERLAP },
  pinLayer: { alignItems: "center", justifyContent: "center" },
  // once the map has said where its centre is, the pin box (whose centre is the stem's tip) is placed on it
  pinLayerMeasured: {},
  // twice the pin's height, so the stem's tip is the box's centre
  pinBox: { width: PIN_HEAD, height: 2 * (PIN_HEAD + PIN_STEM), alignItems: "center" },
  pin: { alignItems: "center" },
  pinHead: {
    width: PIN_HEAD,
    height: PIN_HEAD,
    borderRadius: PIN_HEAD / 2,
    backgroundColor: colors.terracotta,
    borderWidth: 2,
    borderColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  pinDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.canvas },
  pinStem: { width: 3, height: PIN_STEM, borderBottomLeftRadius: 1.5, borderBottomRightRadius: 1.5, backgroundColor: colors.ink },
  pinShadow: { position: "absolute", top: PIN_HEAD + PIN_STEM - 3, left: (PIN_HEAD - 16) / 2, width: 16, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  topBar: { position: "absolute", left: gutter, right: gutter, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  hint: { flex: 1, minHeight: 44, justifyContent: "center", borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 14, paddingVertical: 10 },
  hintText: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 19, color: colors.ink },
  onMap: { backgroundColor: colors.paper },
  locate: { position: "absolute", right: gutter, bottom: 14 },
  card: {
    zIndex: 1,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    backgroundColor: colors.canvas,
    paddingHorizontal: gutter,
    paddingTop: 20,
    gap: 12,
  },
  looking: { gap: 8, paddingVertical: 2 },
  address: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 23, color: colors.ink },
  muted: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  problem: { gap: 2 },
  settings: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  settingsText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.terracotta, textDecorationLine: "underline" },
});
