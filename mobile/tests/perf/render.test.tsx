import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import type { TestInstance } from "test-renderer";

import { ColourFinder } from "~/components/colours/ColourFinder";
import { FamilyShades } from "~/components/colours/ShadeCards";
import { AHEAD_PX, estimatedRowHeight, FIRST_ROWS, MORE_ROWS, nextRows, ShadeSwatches } from "~/components/colours/ShadeSwatches";
import { ServiceCarousel } from "~/components/services/ServiceCarousel";
import { clearColourCache, FALLBACK_CREDIT, type PaintShade, type ShadeFamily, type Swatch } from "~/lib/colours";
import { services } from "~/shared";

// How much each screen draws, and what a change makes React draw again: a 524-shade family page
// draws its first rows only and the rest as they near the screen; choosing a shade in the finder
// redraws that tile alone; the service carousel's dots never redraw the cards. A host view keeps its
// props object until its component renders again, so an unchanged object means "not re-rendered".

jest.mock("@shopify/react-native-skia", () => require("../colours/skia-mock"));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/shade-cards/asian-paints/white"),
  useLocalSearchParams: jest.fn(() => ({})),
  useIsFocused: jest.fn(() => true),
}));
// where the grid is on screen, measured on the UI thread each frame (Jest has no layout of its own)
const mockMeasure = jest.fn();
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  return { __esModule: true, ...actual, default: actual.default, measure: (...args: unknown[]) => mockMeasure(...args) };
});

const SCREEN = 1334; // React Native's Jest window height
const swatch = (n: number): Swatch => ({ id: `asian-paints:${n}`, brand: "asian-paints", code: String(n), query: String(n), name: `White ${n}`, hex: "#f4f1ea", lrv: 90 - (n % 60) });
const family = (count: number): ShadeFamily => ({
  family: "white",
  label: "White",
  count,
  hasPage: true,
  lrv: { min: 30, max: 90 },
  lightest: { id: "a:1", code: "L152", name: "Cream Pie", hex: "#f6f3e8", lrv: 90 },
  darkest: { id: "a:2", code: "8778", name: "Walnut Cream", hex: "#d4c2b2", lrv: 30 },
  undertones: ["neutral"],
  swatch: "#f4f1ea",
  brand: "asian-paints",
  brandName: "Asian Paints",
  shortName: "Asian Paints",
  shades: Array.from({ length: count }, (_, i) => swatch(i + 1)),
});

const drawn = () => screen.queryAllByTestId("swatch").length;
/** Lets `n` frames run (the UI-thread watcher, the batches), each in its own act so React commits between them. */
async function frames(n = 10) {
  for (let i = 0; i < n; i++) await act(() => new Promise((r) => setTimeout(r, 20)));
}
/** The host props object of each element, by key: the same object after a change means it did not render again. */
const snapshot = (els: TestInstance[], key: (el: TestInstance) => string) => new Map(els.map((el) => [key(el), el.props]));
const rerendered = (before: Map<string, unknown>, els: TestInstance[], key: (el: TestInstance) => string) => els.filter((el) => before.get(key(el)) !== el.props).map(key);

let screenReader = false;
beforeEach(() => {
  jest.clearAllMocks();
  screenReader = false;
  jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockImplementation(async () => screenReader);
  // far below the screen: nothing near
  mockMeasure.mockReturnValue({ x: 0, y: 0, width: 393, height: 2000, pageX: 0, pageY: 5000 });
});

describe("a shade-card family page with 524 shades", () => {
  it("draws its first rows only, and keeps the room of the rest", async () => {
    await render(<FamilyShades family={family(524)} />);
    await frames();
    expect(drawn()).toBe(FIRST_ROWS * 3);
    expect(drawn()).toBeLessThanOrEqual(24);
    const rows = Math.ceil(524 / 3);
    const spacer = screen.getByTestId("swatches-to-come");
    expect(spacer.props.style.height).toBeCloseTo((rows - FIRST_ROWS) * (estimatedRowHeight((750 - 40 - 16) / 3) + 8));
    // every drawn swatch is a named link
    expect(screen.getAllByRole("link", { name: /^\d+ White \d+, LRV \d+$/ })).toHaveLength(FIRST_ROWS * 3);
  });

  it("draws more rows as the drawn ones near the screen's bottom, and stops once they reach past it", async () => {
    // the visitor has scrolled the grid's top 2000pt above the screen; each drawn row is ~100pt tall
    let rows = FIRST_ROWS;
    mockMeasure.mockImplementation(() => {
      rows = screen.queryAllByTestId("swatch").length / 3;
      return { x: 0, y: 0, width: 393, height: rows * 100, pageX: 0, pageY: -2000 };
    });
    await render(<ShadeSwatches shades={family(524).shades} label="Asian Paints white shades" />);
    await frames(40);
    // rows are added MORE_ROWS at a time until the drawn grid ends AHEAD_PX below the screen
    let expected = FIRST_ROWS;
    while (-2000 + expected * 100 - SCREEN < AHEAD_PX) expected = nextRows(expected, 524);
    expect(drawn()).toBe(expected * 3);
    expect(rows).toBe(expected);
    expect(drawn()).toBeLessThan(524);
    expect((expected - FIRST_ROWS) % MORE_ROWS).toBe(0);
    // the watcher has nothing more to ask for: the frames after it leave the grid as it is
    mockMeasure.mockReturnValue({ x: 0, y: 0, width: 393, height: 2000, pageX: 0, pageY: 5000 });
  });

  it("draws every row when it is near the end of the card, and then stops watching", async () => {
    mockMeasure.mockReturnValue({ x: 0, y: 0, width: 393, height: 500, pageX: 0, pageY: 0 });
    await render(<ShadeSwatches shades={family(524).shades} label="Asian Paints white shades" />);
    await frames(60);
    expect(drawn()).toBe(524);
    expect(screen.queryByTestId("swatches-to-come")).toBeNull();
  });

  it("draws the whole card a batch a frame for a screen reader, so swiping never skips a shade", async () => {
    screenReader = true;
    await render(<ShadeSwatches shades={family(524).shades} label="Asian Paints white shades" />);
    await frames(60);
    expect(drawn()).toBe(524);
  });

  it("never redraws the swatches already drawn when more rows come", async () => {
    mockMeasure.mockReturnValue({ x: 0, y: 0, width: 393, height: 500, pageX: 0, pageY: 0 });
    await render(<ShadeSwatches shades={family(90).shades} label="Asian Paints white shades" />);
    const key = (el: TestInstance) => el.props.accessibilityLabel as string;
    const first = screen.getAllByTestId("swatch");
    const before = snapshot(first, key);
    await frames(40);
    expect(drawn()).toBe(90);
    expect(rerendered(before, screen.getAllByTestId("swatch").slice(0, first.length), key)).toEqual([]);
  });
});

describe("the colour finder's grid", () => {
  const shade = (n: number): PaintShade => ({
    id: `asian-paints:${1000 + n}`,
    brand: "asian-paints",
    brandName: "Asian Paints",
    code: String(1000 + n),
    name: `Shade ${n}`,
    hex: "#bbc8b2",
    lrv: 50,
    family: "green",
    undertone: "Cool Green",
    interior: true,
    exterior: false,
  });
  const shades = Array.from({ length: 60 }, (_, i) => shade(i));

  beforeEach(() => {
    clearColourCache();
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ apiVersion: "v1", kind: "paint-colour", label: "x", data: shades, meta: { total: 60, page: 1, pages: 1 } }),
    })) as never;
  });

  it("redraws only the tiles whose selection changes when a shade is chosen", async () => {
    await render(
      <ColourFinder initialBrand="asian-paints" brands={[{ slug: "asian-paints", name: "Asian Paints", count: 2221 }]} brandFamilies={["green"]} brandTotal={2221} credit={FALLBACK_CREDIT} />,
    );
    await frames(15);
    const tiles = () => screen.getAllByTestId(/^tile-/);
    const key = (el: TestInstance) => el.props.testID as string;
    expect(tiles()).toHaveLength(60);

    let before = snapshot(tiles(), key);
    await fireEvent.press(screen.getByTestId("tile-asian-paints:1010"));
    expect(rerendered(before, tiles(), key)).toEqual(["tile-asian-paints:1010"]);

    // choosing another shade redraws the one leaving the selection and the one joining it
    before = snapshot(tiles(), key);
    await fireEvent.press(screen.getByTestId("tile-asian-paints:1020"));
    expect(rerendered(before, tiles(), key).sort()).toEqual(["tile-asian-paints:1010", "tile-asian-paints:1020"]);
  });
});

describe("the service carousel", () => {
  it("moves its dots and counter as it scrolls without redrawing the cards", async () => {
    await render(<ServiceCarousel book />);
    const key = (el: TestInstance) => el.props.accessibilityLabel as string;
    const links = () => screen.getAllByRole("link", { name: /^View / });
    const before = snapshot(links(), key);
    await fireEvent.scroll(screen.getByLabelText("Services, swipe for more"), {
      nativeEvent: { contentOffset: { x: 340, y: 0 }, contentSize: { width: 1500, height: 400 }, layoutMeasurement: { width: 393, height: 400 } },
    });
    expect(screen.getByLabelText(`Service 2 of ${services.length}`)).toBeOnTheScreen();
    expect(rerendered(before, links(), key)).toEqual([]);
  });
});
