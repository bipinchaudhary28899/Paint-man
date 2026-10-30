import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";

import { ColourFinder } from "~/components/ColourFinder";
import { NETWORK_MESSAGE } from "~/lib/api";
import type { PaintShade } from "~/lib/colours";

const shade = (code: string, name: string, hex: string): PaintShade => ({
  id: `asian-paints:${code}`,
  brand: "asian-paints",
  brandName: "Asian Paints",
  code,
  name,
  hex,
  lrv: 55,
  family: "green",
  undertone: "Cool Green",
  interior: true,
  exterior: false,
});
const pepper = shade("8386", "Pepper Leaf", "#bbc8b2");
const night = shade("9999", "Night Sky", "#1d2b4f");

const credit = {
  attribution: "Shade data: PaintDB (paintdb.com), CC BY 4.0",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  note: "Hex values approximate each brand's published colours.",
};
const brands = [
  { slug: "asian-paints", name: "Asian Paints", count: 2221 },
  { slug: "berger", name: "Berger Paints", count: 1575 },
];

const ok = (data: unknown, meta: Record<string, unknown>) => ({ ok: true, status: 200, json: async () => ({ apiVersion: "v1", kind: "x", label: "x", data, meta }) }) as Response;
const fetchMock = jest.fn();
const urls = () => fetchMock.mock.calls.map(([u]) => new URL(u as string));
const searches = () => urls().filter((u) => u.pathname === "/api/v1/colours/paint");

/** The API: brands, then two pages of shades (or an empty result for "zzz"). `failNext` fails the next shade search. */
function mockApi() {
  const state = { failNext: false, failBrands: false };
  fetchMock.mockImplementation(async (url: string) => {
    const u = new URL(url);
    if (u.pathname === "/api/v1/colours/brands") {
      if (state.failBrands) throw new TypeError("offline");
      return ok(brands, { shades: 8539, families: ["white", "green"], ...credit });
    }
    if (state.failNext) {
      state.failNext = false;
      throw new TypeError("offline");
    }
    if (u.searchParams.get("q") === "zzz") return ok([], { total: 0, page: 1, pages: 1, ...credit });
    const page = Number(u.searchParams.get("page"));
    return ok(page === 1 ? [pepper] : [night], { total: 2, page, pages: 2, ...credit });
  });
  return state;
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

describe("ColourFinder", () => {
  it("lists shades with the PaintDB credit and its licence link", async () => {
    mockApi();
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await render(<ColourFinder onBook={jest.fn()} debounceMs={0} />);
    expect(await screen.findByRole("button", { name: "Asian Paints 8386 Pepper Leaf" })).toBeOnTheScreen();
    expect(screen.getByText("2 shades")).toBeOnTheScreen();
    expect(screen.getByText(/Shade data: PaintDB \(paintdb\.com\), CC BY 4\.0/)).toBeOnTheScreen();
    expect(screen.getByText(credit.note)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "View the licence" }));
    expect(open).toHaveBeenCalledWith(credit.licenseUrl);
  });

  it("searches what the visitor types", async () => {
    mockApi();
    await render(<ColourFinder onBook={jest.fn()} debounceMs={0} />);
    await screen.findByText("2 shades");
    await fireEvent.changeText(screen.getByLabelText("Search shades"), " 8386 ");
    await waitFor(() => expect(searches().at(-1)?.searchParams.get("q")).toBe("8386"));
    expect(await screen.findByText('2 shades matching "8386"')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Search shades"), "zzz");
    expect(await screen.findByText(/No shades found/)).toBeOnTheScreen();
  });

  it("narrows to a brand, then a colour family inside it", async () => {
    mockApi();
    await render(<ColourFinder onBook={jest.fn()} debounceMs={0} />);
    await fireEvent.press(await screen.findByRole("button", { name: "Berger Paints" }));
    await waitFor(() => expect(searches().at(-1)?.searchParams.get("brand")).toBe("berger"));
    await fireEvent.press(await screen.findByRole("button", { name: "Green" }));
    await waitFor(() => expect(searches().at(-1)?.searchParams.get("family")).toBe("green"));
    expect(await screen.findByText("2 shades from Berger Paints in green")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "All colours" }));
    await waitFor(() => expect(searches().at(-1)?.searchParams.get("family")).toBeNull());
    await fireEvent.press(screen.getByRole("button", { name: "All brands" }));
    await waitFor(() => expect(searches().at(-1)?.searchParams.get("brand")).toBeNull());
    expect(screen.queryByRole("button", { name: "Green" })).toBeNull();
  });

  it("loads the next page under the first", async () => {
    mockApi();
    await render(<ColourFinder onBook={jest.fn()} debounceMs={0} />);
    await fireEvent.press(await screen.findByRole("button", { name: "Show more shades" }));
    expect(await screen.findByRole("button", { name: "Asian Paints 9999 Night Sky" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Asian Paints 8386 Pepper Leaf" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Show more shades" })).toBeNull();
  });

  it("says when the network fails, and tries again on request", async () => {
    const api = mockApi();
    api.failNext = true;
    api.failBrands = true;
    await render(<ColourFinder onBook={jest.fn()} debounceMs={0} />);
    expect(await screen.findByText(NETWORK_MESSAGE)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "All brands" })).toBeNull();
    api.failBrands = false;
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("2 shades")).toBeOnTheScreen();
    expect(await screen.findByRole("button", { name: "All brands" })).toBeOnTheScreen();
  });

  it("shows an API error's own message, including on a later page", async () => {
    const api = mockApi();
    await render(<ColourFinder onBook={jest.fn()} debounceMs={0} />);
    await screen.findByText("2 shades");
    fetchMock.mockImplementationOnce(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ apiVersion: "v1", kind: "error", label: "x", error: { code: "invalid_page", message: "page must be a positive integer." } }),
    }));
    await fireEvent.press(screen.getByRole("button", { name: "Show more shades" }));
    expect(await screen.findByText("page must be a positive integer.")).toBeOnTheScreen();
    expect(api.failNext).toBe(false);
  });

  it("opens a shade and books an inspection with it", async () => {
    mockApi();
    const onBook = jest.fn();
    await render(<ColourFinder onBook={onBook} debounceMs={0} />);
    await fireEvent.press(await screen.findByRole("button", { name: "Asian Paints 8386 Pepper Leaf" }));
    expect(screen.getByRole("header", { name: "Pepper Leaf" })).toBeOnTheScreen();
    expect(screen.getByText("#BBC8B2")).toBeOnTheScreen();
    expect(screen.getByText("Green, Cool Green")).toBeOnTheScreen();
    expect(screen.getByText("Interior")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("header", { name: "Pepper Leaf" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Asian Paints 8386 Pepper Leaf" }));
    await fireEvent.press(screen.getByRole("button", { name: "Book an inspection with this shade" }));
    expect(onBook).toHaveBeenCalledWith(pepper);
  });
});
