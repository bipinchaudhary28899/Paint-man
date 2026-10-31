import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { Dimensions, Linking } from "react-native";

import { brandView, ColourFinder, ColourFinderFromParams, COLUMNS, tileWidth } from "~/components/colours/ColourFinder";
import { closesSheet, isDownward, PreviewSheet } from "~/components/colours/PreviewSheet";
import { swatchHeight, TILE_GAP } from "~/components/colours/ShadeTiles";
import type { Load } from "~/components/colours/useLoad";
import { ApiError } from "~/lib/api";
import { clearColourCache, FALLBACK_CREDIT, type BrandList, type PaintShade } from "~/lib/colours";
import { site } from "~/shared";
import { drag } from "./touch";

jest.mock("@shopify/react-native-skia", () => require("./skia-mock"));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/colours"),
  useLocalSearchParams: jest.fn(() => ({})),
  useIsFocused: jest.fn(() => true),
}));

// The finder measures itself on each frame (the pinned bar, the list's end); Jest has no layout,
// so each test says where the finder is on screen.
const mockMeasure = jest.fn();
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  return { __esModule: true, ...actual, default: actual.default, measure: (...args: unknown[]) => mockMeasure(...args) };
});

const make = (n: number, over: Partial<PaintShade> = {}): PaintShade => ({
  id: `asian-paints:${1000 + n}`,
  brand: "asian-paints",
  brandName: "Asian Paints",
  code: String(1000 + n),
  name: `Shade ${n}`,
  hex: "#bbc8b2",
  lrv: 50 + (n % 40),
  family: "green",
  undertone: "Cool Green",
  interior: true,
  exterior: n % 2 === 0,
  ...over,
});

const pepper = make(0, { id: "asian-paints:8386", code: "8386", name: "Pepper Leaf-n", lrv: 55 });
const brands = [
  { slug: "asian-paints", name: "Asian Paints", count: 2221 },
  { slug: "berger", name: "Berger Paints", count: 1575 },
];
const families = ["white", "green", "plaid"];

type Page = { data: PaintShade[]; total?: number; page?: number; pages?: number };
const reply = ({ data, total = data.length, page = 1, pages = 1 }: Page) =>
  ({ ok: true, status: 200, json: async () => ({ apiVersion: "v1", kind: "paint-colour", label: "x", data, meta: { total, page, pages } }) }) as Response;
const fetchMock = jest.fn();
const asked = () => fetchMock.mock.calls.map((c) => new URL(c[0] as string).searchParams);
const lastAsk = () => asked().at(-1)!;

const finder = (props: Partial<Parameters<typeof ColourFinder>[0]> = {}) =>
  render(<ColourFinder brands={brands} brandFamilies={families} brandTotal={8539} credit={FALLBACK_CREDIT} {...props} />);

/** Lets the debounce, the request and a frame or two run. */
const settle = (ms = 300) => act(() => new Promise((r) => setTimeout(r, ms)));

beforeEach(() => {
  jest.clearAllMocks();
  clearColourCache();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  // far down the page: nothing near the end, nothing to pin
  mockMeasure.mockReturnValue({ x: 0, y: 0, width: 393, height: 4000, pageX: 0, pageY: 2000 });
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
});

describe("all brands, no search", () => {
  it("offers the brands as pills and as cards with their counts, and asks nothing of the server", async () => {
    await finder();
    expect(screen.getByText("8,539 shades from 2 brands. Pick a brand to see its shade card, or search them all at once.")).toBeOnTheScreen();
    const pills = within(screen.getByLabelText("Paint brands"));
    expect(pills.getByRole("button", { name: "All brands" })).toBeSelected();
    expect(pills.getByRole("button", { name: "Asian Paints" })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "Berger Paints, 1,575 shades" })).toBeOnTheScreen();
    expect(screen.getByText("1,575 shades")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Search all brands: code, name, hex")).toBeOnTheScreen();
    expect(screen.getByLabelText("Search all brands by code, name or hex")).toBeOnTheScreen();
    // the colour families and the order belong to a brand
    expect(screen.queryByLabelText("Primary colour")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sort" })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens a brand in place from its card or its pill, keeping a chosen order", async () => {
    fetchMock.mockResolvedValue(reply({ data: [pepper] }));
    await finder({ initialSort: "code" });
    await fireEvent.press(screen.getByRole("button", { name: "Berger Paints, 1,575 shades" }));
    await settle(50);
    expect(lastAsk().get("brand")).toBe("berger");
    expect(lastAsk().get("sort")).toBe("code");
    expect(within(screen.getByLabelText("Paint brands")).getByRole("button", { name: "Berger Paints" })).toBeSelected();
    expect(screen.getByLabelText("Search Berger Paints by code, name or hex")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Asian Paints" }));
    await settle(50);
    expect(lastAsk().get("brand")).toBe("asian-paints");
    // a filter, not a new screen
    expect(router.push).not.toHaveBeenCalled();
  });

  it("leaves the count out until it is known, and ignores an unknown brand", async () => {
    await finder({ brandTotal: 0, initialBrand: "acme", initialFamily: "green" });
    expect(screen.getByText("Pick a brand to see its shade card, or search them all at once.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "All brands" })).toBeSelected();
  });

  it("credits PaintDB and its licence, with the site's name", async () => {
    await finder();
    expect(screen.getByText(new RegExp(`${site.name} isn't affiliated with these brands`))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "PaintDB" }));
    expect(Linking.openURL).toHaveBeenCalledWith(FALLBACK_CREDIT.source);
    await fireEvent.press(screen.getByRole("link", { name: "CC BY 4.0" }));
    expect(Linking.openURL).toHaveBeenCalledWith(FALLBACK_CREDIT.licenseUrl);
  });

  it("keeps the brands and the search in a bar pinned under the header", async () => {
    // scrolled 300pt past the header: the bar moves down with the page to stay under it
    mockMeasure.mockReturnValue({ x: 0, y: 0, width: 393, height: 4000, pageX: 0, pageY: -227 });
    await finder();
    await settle(50);
    const bar = screen.getByTestId("finder-bar");
    expect(within(bar).getByRole("button", { name: "All brands" })).toBeOnTheScreen();
    expect(within(bar).getByLabelText("Search all brands by code, name or hex")).toBeOnTheScreen();
  });
});

describe("inside a brand", () => {
  it("loads the card's first page into a three-column grid", async () => {
    let answer: (r: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (answer = r)));
    await finder({ initialBrand: "asian-paints" });
    // three rows of tiles in skeleton until the page arrives
    expect(screen.getByLabelText("Loading shades")).toBeBusy();
    expect(within(screen.getByTestId("grid-skeleton")).getAllByTestId("skeleton", { includeHiddenElements: true })).toHaveLength(1 + 9 * 3);
    await act(async () => answer(reply({ data: [pepper, make(1)], total: 2 })));
    await settle(50);
    expect(lastAsk().get("brand")).toBe("asian-paints");
    expect(lastAsk().get("perPage")).toBe("48");
    expect(screen.getByText("2 shades. Tap one to see it on the wall.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Asian Paints" })).toBeSelected();
    expect(screen.getByLabelText("Search Asian Paints by code, name or hex")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Search Asian Paints: code, name, hex")).toBeOnTheScreen();
    // PaintDB's suffix is dropped from the name; nothing is picked until a tap
    const tile = screen.getByRole("button", { name: "Pepper Leaf 8386" });
    expect(tile).not.toBeSelected();
    expect(tile).toHaveStyle({ width: tileWidth(Dimensions.get("window").width) });
    expect(screen.queryByTestId("preview-sheet")).toBeNull();
  });

  it("opens a tapped shade in the bottom sheet and books with it, closing the sheet first", async () => {
    fetchMock.mockResolvedValue(reply({ data: [pepper, make(1)] }));
    await finder({ initialBrand: "asian-paints" });
    await settle(50);
    await fireEvent.press(screen.getByRole("button", { name: "Shade 1 1001" }));
    const sheet = within(screen.getByTestId("preview-sheet"));
    expect(sheet.getByRole("header", { name: "Shade 1" })).toBeOnTheScreen();
    expect(sheet.getByLabelText("A cosy living room, repainted in Shade 1")).toBeOnTheScreen();
    expect(screen.getByTestId("tile-asian-paints:1001")).toBeSelected();
    await fireEvent.press(sheet.getByRole("button", { name: "Book an inspection with this shade" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/book", params: { shade: "asian-paints:1001" } });
    expect(screen.queryByTestId("preview-sheet")).toBeNull();
  });

  it("switches brand in place keeping the search and family; All brands drops the family", async () => {
    fetchMock.mockResolvedValue(reply({ data: [pepper] }));
    await finder({ initialBrand: "asian-paints", initialFamily: "green" });
    await settle(50);
    expect(lastAsk().get("family")).toBe("green");
    await fireEvent.changeText(screen.getByLabelText("Search Asian Paints by code, name or hex"), "leaf");
    await fireEvent.press(screen.getByRole("button", { name: "Berger Paints" }));
    await settle(400);
    expect(lastAsk().get("brand")).toBe("berger");
    expect(lastAsk().get("family")).toBe("green");
    expect(lastAsk().get("q")).toBe("leaf");
    await fireEvent.press(screen.getByRole("button", { name: "All brands" }));
    await settle(400);
    expect(lastAsk().get("brand")).toBeNull();
    expect(lastAsk().get("family")).toBeNull();
    expect(lastAsk().get("q")).toBe("leaf");
    expect(screen.queryByLabelText("Primary colour")).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("brings a brand opened from a link into view in the pill row", async () => {
    fetchMock.mockResolvedValue(reply({ data: [pepper] }));
    await finder({ initialBrand: "berger" });
    await settle(50);
    const pill = screen.getByRole("button", { name: "Berger Paints" });
    expect(pill.props.onLayout).toEqual(expect.any(Function));
    await fireEvent(pill, "layout", { nativeEvent: { layout: { x: 260, y: 0, width: 120, height: 44 } } });
    await fireEvent(pill, "layout", { nativeEvent: { layout: { x: 10, y: 0, width: 120, height: 44 } } });
    // the other pills do not move the row
    expect(screen.getByRole("button", { name: "Asian Paints" }).props.onLayout).toBeUndefined();
  });

  it("narrows by a primary colour pill, orders the card and clears the search", async () => {
    fetchMock.mockResolvedValue(reply({ data: [pepper] }));
    await finder({ initialBrand: "asian-paints", initialFamily: "plaid", initialSort: "name" });
    await settle(50);
    expect(lastAsk().get("sort")).toBe("name");
    await fireEvent.press(screen.getByRole("button", { name: "Green" }));
    await settle(50);
    expect(lastAsk().get("family")).toBe("green");
    expect(screen.getByRole("button", { name: "Green" })).toBeSelected();
    expect(screen.getByText("1 shade · Green. Tap one to see it on the wall.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Sort" }));
    await fireEvent.press(screen.getByRole("button", { name: "Shade code" }));
    await settle(50);
    expect(lastAsk().get("sort")).toBe("code");
    await fireEvent.press(screen.getByRole("button", { name: "Sort" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    // the dimmed page behind the sheet closes it too (hidden from screen readers, which use the escape gesture)
    await fireEvent.press(screen.getByRole("button", { name: "Sort" }));
    await fireEvent.press(screen.getByTestId("sort-backdrop", { includeHiddenElements: true }));
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "All colours" }));
    await settle(50);
    expect(lastAsk().get("family")).toBeNull();
    expect(screen.getByRole("button", { name: "All colours" })).toBeSelected();

    expect(screen.queryByRole("button", { name: "Clear the search" })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText("Search Asian Paints by code, name or hex"), "8386");
    await fireEvent.press(screen.getByRole("button", { name: "Clear the search" }));
    expect(screen.getByLabelText("Search Asian Paints by code, name or hex")).toHaveDisplayValue("");
    expect(screen.queryByRole("button", { name: "Clear the search" })).toBeNull();
  });

  it("searches as you type, after a pause, and says when nothing matches", async () => {
    fetchMock.mockResolvedValue(reply({ data: [] }));
    await finder({ initialBrand: "asian-paints" });
    await settle(50);
    await fireEvent.changeText(screen.getByLabelText("Search Asian Paints by code, name or hex"), "zzz");
    // the order is hidden while searching
    expect(screen.queryByRole("button", { name: "Sort" })).toBeNull();
    await settle(400);
    expect(lastAsk().get("q")).toBe("zzz");
    expect(screen.getByText("No shade matches that. Try a code like 7982, a name, or a hex like #bbc8b2.")).toBeOnTheScreen();
  });

  it("names the search in the count", async () => {
    fetchMock.mockResolvedValue(reply({ data: [pepper], total: 1 }));
    await finder({ initialQuery: "pepper" });
    await settle(400);
    expect(screen.getByText("1 shade for “pepper”. Tap one to see it on the wall.")).toBeOnTheScreen();
    expect(lastAsk().get("brand")).toBeNull();
  });

  it("says when shades cannot load, and tries again", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await finder({ initialBrand: "asian-paints" });
    await settle(50);
    expect(screen.getByText("Brand shades are unavailable right now. Check your connection and try again.")).toBeOnTheScreen();
    fetchMock.mockResolvedValue(reply({ data: [pepper] }));
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    await settle(50);
    expect(screen.getByText("1 shade. Tap one to see it on the wall.")).toBeOnTheScreen();
  });

  it("shows more on request, without repeating a shade", async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: [pepper, make(1)], total: 4, pages: 2 }));
    await finder({ initialBrand: "asian-paints" });
    await settle(50);
    fetchMock.mockResolvedValueOnce(reply({ data: [make(1), make(2), make(3)], total: 4, page: 2, pages: 2 }));
    await fireEvent.press(screen.getByRole("button", { name: "Show more (2 left)" }));
    await settle(50);
    expect(lastAsk().get("page")).toBe("2");
    expect(screen.getAllByRole("button", { name: /^Shade \d/ })).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /Show more/ })).toBeNull();
  });

  it("stops at the first failed extra page", async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: [pepper], total: 2, pages: 2 }));
    await finder({ initialBrand: "asian-paints" });
    await settle(50);
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await fireEvent.press(screen.getByRole("button", { name: "Show more (1 left)" }));
    await settle(50);
    expect(screen.getByText("Brand shades are unavailable right now. Check your connection and try again.")).toBeOnTheScreen();
  });

  it("loads the next page by itself when the list's end comes near", async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: [pepper], total: 2, pages: 2 }));
    await finder({ initialBrand: "asian-paints" });
    await settle(50);
    fetchMock.mockResolvedValueOnce(reply({ data: [make(5)], total: 2, page: 2, pages: 2 }));
    // the finder's end is now on screen
    mockMeasure.mockReturnValue({ x: 0, y: 0, width: 393, height: 1000, pageX: 0, pageY: -300 });
    await settle(100);
    expect(lastAsk().get("page")).toBe("2");
    expect(screen.getByRole("button", { name: "Shade 5 1005" })).toBeOnTheScreen();
  });

  it("does not load by itself past the automatic pages", async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: [pepper], total: 2, pages: 2 }));
    mockMeasure.mockReturnValue({ x: 0, y: 0, width: 393, height: 1000, pageX: 0, pageY: -300 });
    await finder({ initialBrand: "asian-paints", autoLoadPages: 1 });
    await settle(100);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("the large preview, a bottom sheet", () => {
  const openSheet = async () => {
    fetchMock.mockResolvedValue(reply({ data: [pepper, make(1)], total: 3, pages: 2 }));
    await finder({ initialBrand: "asian-paints" });
    await settle(50);
    await fireEvent.press(screen.getByRole("button", { name: "Pepper Leaf 8386" }));
    return screen.getByTestId("preview-sheet");
  };
  const gone = () => waitFor(() => expect(screen.queryByTestId("preview-sheet")).toBeNull());

  it("shows the shade on the room and keeps picking in the strip", async () => {
    await openSheet();
    expect(screen.getByRole("header", { name: "Pepper Leaf" })).toBeOnTheScreen();
    expect(screen.getByText("Asian Paints 8386 · #BBC8B2 · LRV 55 · Green · Cool Green")).toBeOnTheScreen();

    const strip = screen.getByLabelText("Shades");
    await fireEvent.press(within(strip).getByRole("button", { name: "Shade 1 1001" }));
    expect(screen.getByRole("header", { name: "Shade 1" })).toBeOnTheScreen();
    expect(screen.getByTestId("tile-asian-paints:1001")).toBeSelected();

    // swiping near the strip's end asks for more shades
    fetchMock.mockResolvedValueOnce(reply({ data: [make(2)], total: 3, page: 2, pages: 2 }));
    await fireEvent.scroll(strip, { nativeEvent: { contentOffset: { x: 100, y: 0 }, layoutMeasurement: { width: 393, height: 56 }, contentSize: { width: 500, height: 56 } } });
    await settle(50);
    expect(lastAsk().get("page")).toBe("2");
    // far from the end it asks nothing
    await fireEvent.scroll(strip, { nativeEvent: { contentOffset: { x: 0, y: 0 }, layoutMeasurement: { width: 100, height: 56 }, contentSize: { width: 2000, height: 56 } } });
  });

  it("closes from × and from the dimmed page above it", async () => {
    await openSheet();
    await fireEvent.press(screen.getByRole("button", { name: "Close the large preview" }));
    await gone();
    // the shade stays picked in the grid
    expect(screen.getByTestId("tile-asian-paints:8386")).toBeSelected();

    await fireEvent.press(screen.getByRole("button", { name: "Pepper Leaf 8386" }));
    await fireEvent.press(screen.getByTestId("sheet-backdrop", { includeHiddenElements: true }));
    await gone();
  });

  it("closes when dragged down far enough", async () => {
    const sheet = await openSheet();
    // sideways is the strip's, not the sheet's
    expect(await drag(sheet, [[30, 2]])).toBe(false);
    const points: [number, number][] = Array.from({ length: 15 }, (_, i) => [0, 10 * (i + 1)]);
    expect(await drag(sheet, points)).toBe(true);
    await gone();
  });

  it("closes when flicked down, and springs back from a short slow drag", async () => {
    const sheet = await openSheet();
    await drag(sheet, [
      [0, 10],
      [0, 15],
      [0, 20],
      [0, 25],
      [0, 30],
    ]);
    await settle(400);
    expect(screen.getByTestId("preview-sheet")).toBeOnTheScreen();
    // a drag the system takes away springs back too
    expect(sheet.props.onResponderTerminationRequest()).toBe(false);
    await act(async () => sheet.props.onResponderTerminate({ touchHistory: {} }));
    await settle(400);
    expect(screen.getByTestId("preview-sheet")).toBeOnTheScreen();

    await drag(screen.getByTestId("preview-sheet"), [
      [0, 10],
      [0, 50],
    ]);
    await gone();
  });

  it("closes once: while it slides away, other ways to close it do nothing more", async () => {
    const onClose = jest.fn();
    const view = { name: "Pepper Leaf", code: "Asian Paints 8386", hex: "#bbc8b2", lrv: 55, meta: "#BBC8B2 · LRV 55", bookHref: "/book" };
    await render(<PreviewSheet view={view} shades={[]} selectedId="none" onSelect={jest.fn()} onClose={onClose} />);
    await fireEvent.press(screen.getByRole("button", { name: "Close the large preview" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    await fireEvent.press(screen.getByTestId("sheet-backdrop", { includeHiddenElements: true }));
    expect(await drag(screen.getByTestId("preview-sheet"), [[0, 30]])).toBe(false);
    await settle(400);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("the finder from the screen's params", () => {
  const list = (over: Partial<Load<BrandList>> = {}): Load<BrandList> => ({ retry: jest.fn(), loading: !over.data && !over.error, ...over });
  const data: BrandList = { brands, families, shades: 8539, credit: FALLBACK_CREDIT };

  it("waits for the brands, then opens the brand and search the params name", async () => {
    const view = await render(<ColourFinderFromParams list={list()} params={{}} />);
    // the bar's brand pills and search, the count line and the brand cards, in skeleton
    expect(screen.getByLabelText("Loading shades")).toBeBusy();
    expect(screen.getAllByTestId("skeleton", { includeHiddenElements: true }).length).toBeGreaterThan(8);
    fetchMock.mockResolvedValue(reply({ data: [pepper] }));
    await view.rerender(<ColourFinderFromParams list={list({ data })} params={{ brand: "asian-paints", q: "8386", family: "green", sort: "code" }} />);
    await settle(400);
    expect(lastAsk().get("q")).toBe("8386");
    expect(lastAsk().get("brand")).toBe("asian-paints");
  });

  it("opens an old visualizer link's shade", async () => {
    fetchMock.mockResolvedValue(reply({ data: [pepper] }));
    await render(<ColourFinderFromParams list={list({ data })} params={{ shade: "asian-paints:8386" }} />);
    await settle(400);
    expect(lastAsk().get("brand")).toBe("asian-paints");
    expect(lastAsk().get("q")).toBe("8386");
  });

  it("says when the brands cannot load, and tries again", async () => {
    const retry = jest.fn();
    await render(<ColourFinderFromParams list={list({ error: new ApiError("network", "x"), retry })} params={{}} />);
    expect(screen.getByText("Brand shades are unavailable right now. Check your connection and try again.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
  });
});

describe("helpers", () => {
  it("describes a shade as the website's preview does", () => {
    expect(brandView(pepper)).toEqual({
      name: "Pepper Leaf",
      code: "Asian Paints 8386",
      hex: "#bbc8b2",
      lrv: 55,
      meta: "#BBC8B2 · LRV 55 · Green · Cool Green",
      note: "Made for interior and exterior walls.",
      bookHref: "/book?shade=asian-paints%3A8386",
    });
    expect(brandView(make(2, { interior: false })).note).toBe("An exterior shade.");
    expect(brandView(make(1)).note).toBe("An interior shade.");
  });

  it("fits three tiles and their two gaps between the page's gutters", () => {
    expect(COLUMNS).toBe(3);
    expect(tileWidth(393) * 3 + TILE_GAP * 2).toBeCloseTo(393 - 40);
    expect(swatchHeight(100)).toBe(68);
  });

  it("tells a drag down from a sideways one, and when it closes the sheet", () => {
    expect(isDownward(2, 10)).toBe(true);
    expect(isDownward(0, 4)).toBe(false);
    expect(isDownward(12, 10)).toBe(false);
    expect(isDownward(0, -20)).toBe(false);
    expect(closesSheet(140, 0.1)).toBe(true);
    expect(closesSheet(30, 1.2)).toBe(true);
    expect(closesSheet(30, 0.3)).toBe(false);
  });

  it("waits for layout before pinning anything", async () => {
    mockMeasure.mockReturnValue(null);
    fetchMock.mockResolvedValue(reply({ data: [pepper] }));
    await finder({ initialBrand: "asian-paints" });
    await settle(80);
    await waitFor(() => expect(screen.getByTestId("finder-bar")).toBeOnTheScreen());
  });
});
