// Shared test setup: the native date picker has no test renderer of its own, so it becomes a plain
// view that tests drive through its onChange prop.
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  const { createElement } = jest.requireActual("react");
  return { __esModule: true, default: (props: Record<string, unknown>) => createElement(View, { ...props, testID: props.testID ?? "date-picker" }) };
});

// Safe-area insets without a provider (the library's own Jest mock: zero insets, a 390×844 frame).
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

// react-native-maps needs its native module, so the map becomes a plain view that passes its props
// through (tests fire regionChangeComplete and press on it). animateToRegion is a recorded mock that
// moves the map at once and reports the move as the native map does (start, then complete).
// pointForCoordinate answers with `centrePoint` (set by a test), or rejects when it is unset, as a map
// that cannot answer yet would.
type MockRegion = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
type MockMapProps = { ref?: unknown; onRegionChangeStart?: (r: MockRegion, d: object) => void; onRegionChangeComplete?: (r: MockRegion, d: object) => void } & Record<string, unknown>;
jest.mock("react-native-maps", () => {
  const { View } = jest.requireActual("react-native");
  const { createElement, useImperativeHandle, useRef } = jest.requireActual("react");
  const animateToRegion = jest.fn();
  const centrePoint: { value?: { x: number; y: number } } = {};
  function MapView({ ref, ...props }: MockMapProps) {
    const latest = useRef(props);
    latest.current = props;
    useImperativeHandle(ref, () => ({
      animateToRegion: (region: MockRegion, duration?: number) => {
        animateToRegion(region, duration);
        latest.current.onRegionChangeStart?.(region, { isGesture: false });
        latest.current.onRegionChangeComplete?.(region, { isGesture: false });
      },
      pointForCoordinate: () => (centrePoint.value ? Promise.resolve(centrePoint.value) : Promise.reject(new Error("map not ready"))),
    }));
    return createElement(View, { ...props, testID: props.testID ?? "map-view" });
  }
  return { __esModule: true, default: MapView, animateToRegion, centrePoint };
});

// expo-location's calls are mocks every suite can drive; the default is a phone that never answers
// (nothing asks for location unless a test taps for it).
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3, High: 4 },
  requestForegroundPermissionsAsync: jest.fn(() => new Promise(() => {})),
  hasServicesEnabledAsync: jest.fn(async () => true),
  getCurrentPositionAsync: jest.fn(() => new Promise(() => {})),
  getLastKnownPositionAsync: jest.fn(async () => null),
  geocodeAsync: jest.fn(async () => []),
  reverseGeocodeAsync: jest.fn(async () => []),
}));

// The secure store keeps the session token: an in-memory map per test (`__store` lets a test seed
// or read it). Its calls are recorded mocks.
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
  };
});
beforeEach(() => (jest.requireMock("expo-secure-store") as { __store: Map<string, string> }).__store.clear());

// The quotation PDF: expo-file-system's File and Paths as plain objects (a File's uri joins its
// parts), with downloadFileAsync a recorded mock answering the destination file; expo-sharing's
// calls are recorded mocks of a phone that can share.
jest.mock("expo-file-system", () => {
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === "string" ? p : p.uri)).join("/");
    }
    static downloadFileAsync = jest.fn(async (_url: string, destination: unknown) => destination);
  }
  return { File, Paths: { cache: { uri: "file:///cache" } } };
});
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));
