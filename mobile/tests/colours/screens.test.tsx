import { act, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import type { ReactElement } from "react";

import ColourFinderScreen from "~/app/colours";
import ColourCombinationsScreen from "~/app/palettes";
import ShadeFamilyScreen from "~/app/shade-cards/[brand]/[family]";
import BrandShadeCardScreen from "~/app/shade-cards/[brand]/index";
import ShadeCardsScreen from "~/app/shade-cards/index";
import { NavStateProvider } from "~/components/site/nav-state";
import { clearColourCache } from "~/lib/colours";
import { palettes } from "~/shared";

// The five colour screens put together, against answers shaped like the website's API: a check that
// each composes and fills in from its data (the screens themselves sit outside the coverage gate).

jest.mock("@shopify/react-native-skia", () => require("./skia-mock"));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/colours"),
  useLocalSearchParams: jest.fn(() => ({})),
  useIsFocused: jest.fn(() => true),
}));
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  return { __esModule: true, ...actual, default: actual.default, measure: () => null };
});

const mockParams = useLocalSearchParams as jest.Mock;
const fam = (family: string, count: number, hasPage = true) => ({
  family,
  label: family[0].toUpperCase() + family.slice(1),
  count,
  hasPage,
  lrv: { min: 20, max: 90 },
  lightest: { id: "a:1", code: "L152", name: "Cream Pie", hex: "#f6f3e8", lrv: 90 },
  darkest: { id: "a:2", code: "8778", name: "Walnut Cream", hex: "#d4c2b2", lrv: 20 },
  undertones: ["neutral"],
  swatch: "#e2ece1",
});
const swatch = { id: "asian-paints:7982", brand: "asian-paints", code: "7982", query: "7982", name: "Mecca Gold", hex: "#e7975b", lrv: 50 };
const card = { slug: "asian-paints", name: "Asian Paints", shortName: "Asian Paints", count: 2221, lrv: { min: 0, max: 96 }, families: [fam("white", 147), fam("black", 3, false)] };

const routes: Record<string, unknown> = {
  "/api/v1/colours/brands": { data: [{ slug: "asian-paints", name: "Asian Paints", count: 2221 }], meta: { shades: 8539, families: ["white"] } },
  "/api/v1/colours/shade-cards": { data: [card], meta: { shades: 2221 } },
  "/api/v1/colours/shade-cards/asian-paints": { data: { ...card, families: card.families.map((f) => ({ ...f, sample: [swatch] })) }, meta: {} },
  "/api/v1/colours/shade-cards/asian-paints/white": { data: { ...fam("white", 147), brand: "asian-paints", brandName: "Asian Paints", shortName: "Asian Paints", shades: [swatch] }, meta: {} },
  "/api/v1/palettes": { data: [{ colours: { featureWall: { id: palettes[0].shades[0].id, lrv: 55, closest: [] } } }], meta: {} },
};

beforeEach(() => {
  clearColourCache();
  mockParams.mockReturnValue({});
  globalThis.fetch = jest.fn(async (url: string) => {
    const path = new URL(url).pathname;
    const body = routes[path];
    if (!body) return { ok: false, status: 404, json: async () => ({ apiVersion: "v1", kind: "error", label: "x", error: { code: "not_found", message: "Not found" } }) };
    return { ok: true, status: 200, json: async () => ({ apiVersion: "v1", kind: "x", label: "x", ...(body as object) }) };
  }) as never;
});

const show = async (ui: ReactElement) => {
  await render(<NavStateProvider>{ui}</NavStateProvider>);
  await act(() => new Promise((r) => setTimeout(r, 30)));
};

it("/colours: the hero counts the shades and the finder lists the brands", async () => {
  await show(<ColourFinderScreen />);
  expect(screen.getByRole("header", { name: /Find a wall colour in Agra/ })).toBeOnTheScreen();
  expect(screen.getByText(/^8,539 shades from Asian Paints, Berger/)).toBeOnTheScreen();
  expect(screen.getByText("2,221 shades")).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Colour questions" })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Found a shade? See it on your own wall." })).toBeOnTheScreen();
});

it("/palettes: every palette, with the LRV from the API", async () => {
  await show(<ColourCombinationsScreen />);
  expect(screen.getByRole("header", { name: "Wall colour combinations for Agra homes that already work" })).toBeOnTheScreen();
  for (const p of palettes) expect(screen.getByRole("link", { name: p.name })).toBeOnTheScreen();
  expect(screen.getByText(`${palettes[0].shades[0].hex.toUpperCase()} · LRV 55 · ${palettes[0].shades[0].finish}`)).toBeOnTheScreen();
});

it("/shade-cards: the hub fills in from the cards", async () => {
  await show(<ShadeCardsScreen />);
  expect(screen.getByRole("header", { name: "Paint shade cards from India's major brands" })).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: "Asian Paints shade card" })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Shortlisted a few codes? Book the visit" })).toBeOnTheScreen();
});

it("/shade-cards/<brand>: the card, or the website's 404 for a brand it has no card for", async () => {
  mockParams.mockReturnValue({ brand: "asian-paints" });
  await show(<BrandShadeCardScreen />);
  expect(screen.getByRole("header", { name: "Asian Paints shade card with colour codes" })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Asian Paints black shades" })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "See the real Asian Paints card at home" })).toBeOnTheScreen();

  clearColourCache();
  mockParams.mockReturnValue({ brand: "acme" });
  await show(<BrandShadeCardScreen />);
  expect(screen.getByRole("header", { name: "Page not found." })).toBeOnTheScreen();
});

it("/shade-cards/<brand>/<family>: every shade of the family, or the 404", async () => {
  mockParams.mockReturnValue({ brand: "asian-paints", family: "white" });
  await show(<ShadeFamilyScreen />);
  expect(screen.getByRole("header", { name: "Asian Paints white shades with colour codes" })).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: "7982 Mecca Gold, LRV 50" })).toBeOnTheScreen();

  clearColourCache();
  mockParams.mockReturnValue({ brand: "asian-paints", family: "black" });
  await show(<ShadeFamilyScreen />);
  expect(screen.getByRole("header", { name: "Page not found." })).toBeOnTheScreen();
});
