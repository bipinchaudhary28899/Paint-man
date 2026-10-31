import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import type { ComponentType } from "react";
import { Linking } from "react-native";
import type { TestInstance } from "test-renderer";

import NotFoundScreen from "~/app/+not-found";
import AccountScreen from "~/app/account/index";
import ProjectScreen from "~/app/account/projects/[id]";
import LoginScreen from "~/app/login";
import AboutScreen from "~/app/about";
import BookScreen from "~/app/book";
import ColourFinderScreen from "~/app/colours";
import ContactScreen from "~/app/contact";
import FaqScreen from "~/app/faq";
import GalleryScreen from "~/app/gallery";
import HomeScreen from "~/app/index";
import PalettesScreen from "~/app/palettes";
import PrivacyScreen from "~/app/privacy-policy";
import ServiceCityScreen from "~/app/services/[slug]/[city]";
import ServiceHubScreen from "~/app/services/[slug]/index";
import HousePaintingCityScreen from "~/app/services/house-painting/[city]";
import HousePaintingScreen from "~/app/services/house-painting/index";
import ServicesScreen from "~/app/services/index";
import ShadeFamilyScreen from "~/app/shade-cards/[brand]/[family]";
import BrandShadeCardScreen from "~/app/shade-cards/[brand]/index";
import ShadeCardsScreen from "~/app/shade-cards/index";
import TermsScreen from "~/app/terms";
import ThankYouScreen from "~/app/thank-you";
import { NavStateProvider } from "~/components/site/nav-state";
import { AuthProvider } from "~/lib/auth-context";
import { clearColourCache } from "~/lib/colours";
import { getCity, getService, palettes, serviceCityTitle } from "~/shared";
import { BAR_TOP, BottomNav } from "~/components/site/BottomNav";
import { over } from "~/lib/contrast";
import { colors } from "~/theme";
import { asha, detail, seedToken, summary } from "../account/helpers";
import { contrastFindings, controlAndImageFindings, headerFindings, isPressable, nameOf, reachable, roleOf, scalingFindings, targetFindings } from "./audit";

// Every screen of the app (src/app/**) put together and read the way VoiceOver and TalkBack read it,
// with the bottom nav over it as in the app: every control has a role and a name, every picture a
// label or none at all (hidden), the page's h1 comes first and once, fixed tap areas are 44pt or more,
// text grows with the phone's text size, and two links or buttons with one name go to one place.
// The colour API answers with data shaped like the website's; Skia draws nothing (its mock).

jest.mock("@shopify/react-native-skia", () => require("../colours/skia-mock"));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
  useIsFocused: jest.fn(() => true),
}));
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  return { __esModule: true, ...actual, default: actual.default, measure: () => null };
});
// in-page jumps are recorded as "#anchor" destinations; the rest of the page's API is the real one
const mockScrollTo = jest.fn();
jest.mock("~/components/site/Page", () => {
  const actual = jest.requireActual("~/components/site/Page");
  return { ...actual, usePage: () => ({ ...actual.usePage(), scrollTo: (id: string) => mockScrollTo(id) }) };
});

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
const swatch = (n: number) => ({ id: `asian-paints:${7900 + n}`, brand: "asian-paints", code: String(7900 + n), query: String(7900 + n), name: `Shade ${n}`, hex: "#e7975b", lrv: 50 });
const card = { slug: "asian-paints", name: "Asian Paints", shortName: "Asian Paints", count: 2221, lrv: { min: 0, max: 96 }, families: [fam("white", 147), fam("blue", 40), fam("black", 3, false)] };
const berger = { ...card, slug: "berger", name: "Berger Paints", shortName: "Berger", families: [fam("white", 120)] };
const paintShade = (n: number) => ({
  id: `asian-paints:${8000 + n}`,
  brand: "asian-paints",
  brandName: "Asian Paints",
  code: String(8000 + n),
  name: `Finder ${n}`,
  hex: "#a1b2c3",
  lrv: 40,
  family: "blue",
  undertone: "cool",
  interior: true,
  exterior: false,
});

const api: Record<string, unknown> = {
  "/api/v1/colours/brands": { data: [{ slug: "asian-paints", name: "Asian Paints", count: 2221 }, { slug: "berger", name: "Berger Paints", count: 1900 }], meta: { shades: 8539, families: ["white", "blue"] } },
  "/api/v1/colours/paint": { data: [1, 2, 3].map(paintShade), meta: { total: 3, page: 1, pages: 1 } },
  "/api/v1/colours/shade-cards": { data: [card, berger], meta: { shades: 4121 } },
  "/api/v1/colours/shade-cards/asian-paints": { data: { ...card, families: card.families.map((f) => ({ ...f, sample: [1, 2, 3].map(swatch) })) }, meta: {} },
  "/api/v1/colours/shade-cards/asian-paints/white": {
    data: { ...fam("white", 147), brand: "asian-paints", brandName: "Asian Paints", shortName: "Asian Paints", shades: [1, 2, 3, 4].map(swatch) },
    meta: {},
  },
  "/api/v1/palettes": { data: [{ colours: { featureWall: { id: palettes[0].shades[0].id, lrv: 55, closest: [] } } }], meta: {} },
  // the account screens, signed in (the saved token seeded for their routes)
  "/api/v1/me": { data: asha, meta: {} },
  "/api/v1/projects": { data: [summary({ finalPricePaise: 2250000 }), summary({ id: "p-0", stage: "booked", stageLabel: "Booking received" })], meta: {} },
  [`/api/v1/projects/${summary().id}`]: { data: detail(), meta: {} },
};

type Route = { path: string; Screen: ComponentType; h1: RegExp; params?: Record<string, string>; signedIn?: boolean };
const exact = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
const interior = getService("interior-painting")!;
const exterior = getService("exterior-painting")!;
const agra = getCity("agra")!;
const routes: Route[] = [
  { path: "/", Screen: HomeScreen, h1: exact("Your space, painted beautifully. Managed completely.") },
  { path: "/about", Screen: AboutScreen, h1: exact("Managed house painting in Agra, made stress-free") },
  { path: "/book", Screen: BookScreen, h1: exact("Book painters online in Agra") },
  { path: "/colours", Screen: ColourFinderScreen, h1: exact("Find a wall colour in Agra by shade code, brand or name") },
  { path: "/colours?brand=asian-paints", Screen: ColourFinderScreen, h1: exact("Find a wall colour in Agra by shade code, brand or name"), params: { brand: "asian-paints" } },
  { path: "/contact", Screen: ContactScreen, h1: exact("Contact our house painters in Agra") },
  { path: "/faq", Screen: FaqScreen, h1: exact("House painting questions in Agra, answered") },
  { path: "/gallery", Screen: GalleryScreen, h1: exact("Home painting ideas from Indian homes") },
  { path: "/palettes", Screen: PalettesScreen, h1: exact("Wall colour combinations for Agra homes that already work") },
  { path: "/privacy-policy", Screen: PrivacyScreen, h1: exact("Privacy policy") },
  { path: "/terms", Screen: TermsScreen, h1: exact("Terms of service") },
  { path: "/thank-you", Screen: ThankYouScreen, h1: exact("Your request was not sent"), params: { type: "booking" } },
  { path: "/thank-you?sent=1", Screen: ThankYouScreen, h1: exact("Your inspection request is in"), params: { type: "booking", sent: "1", project: "p-1" } },
  { path: "/login", Screen: LoginScreen, h1: exact("Log in to your account") },
  { path: "/account", Screen: AccountScreen, h1: exact("Namaste, Asha"), signedIn: true },
  { path: "/account/projects/[id]", Screen: ProjectScreen, h1: exact("Interior Painting in Kamla Nagar, Agra"), params: { id: summary().id }, signedIn: true },
  { path: "/services", Screen: ServicesScreen, h1: exact("Painting services") },
  { path: "/services/interior-painting", Screen: ServiceHubScreen, h1: exact(interior.title), params: { slug: interior.slug } },
  { path: "/services/exterior-painting", Screen: ServiceHubScreen, h1: exact(exterior.title), params: { slug: exterior.slug } },
  { path: "/services/interior-painting/agra", Screen: ServiceCityScreen, h1: exact(serviceCityTitle(interior, agra)), params: { slug: interior.slug, city: "agra" } },
  { path: "/services/house-painting", Screen: HousePaintingScreen, h1: exact("House painting services, managed") },
  { path: "/services/house-painting/agra", Screen: HousePaintingCityScreen, h1: exact("House painting services in Agra"), params: { city: "agra" } },
  { path: "/services/house-painting/delhi-ncr", Screen: HousePaintingCityScreen, h1: exact("House painting in Delhi NCR is coming soon"), params: { city: "delhi-ncr" } },
  { path: "/shade-cards", Screen: ShadeCardsScreen, h1: exact("Paint shade cards from India's major brands") },
  { path: "/shade-cards/asian-paints", Screen: BrandShadeCardScreen, h1: exact("Asian Paints shade card with colour codes"), params: { brand: "asian-paints" } },
  { path: "/shade-cards/asian-paints/white", Screen: ShadeFamilyScreen, h1: exact("Asian Paints white shades with colour codes"), params: { brand: "asian-paints", family: "white" } },
  { path: "/a-path-with-no-screen", Screen: NotFoundScreen, h1: exact("Page not found.") },
];

/** The bottom nav's bar is an SVG shape: its labels are read against the bar's lightest charcoal (BAR_TOP, also in contrast.test.ts). */
const drawn = { "bottom-nav": over(BAR_TOP, colors.canvas) };

/**
 * Issues found in files outside this change's reach, reported to the lead. Listed here so the suite
 * stays green while they wait, and checked exactly, so the test fails (and the entry goes) once fixed.
 */
/** Findings in files still to be fixed, by route (each must match exactly, so a fix shows up as a failure to delete it). None today. */
const known: Record<string, string[]> = {};

beforeEach(() => {
  jest.clearAllMocks();
  clearColourCache();
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  globalThis.fetch = jest.fn(async (url: string) => {
    const body = api[new URL(url).pathname];
    if (!body) return { ok: false, status: 404, json: async () => ({ apiVersion: "v1", kind: "error", label: "x", error: { code: "not_found", message: "Not found" } }) };
    return { ok: true, status: 200, json: async () => ({ apiVersion: "v1", kind: "x", label: "x", ...(body as object) }) };
  }) as never;
});

async function show({ path, Screen, params = {}, signedIn = false }: Route) {
  (usePathname as jest.Mock).mockReturnValue(path.split("?")[0]);
  (useLocalSearchParams as jest.Mock).mockReturnValue(params);
  if (signedIn) seedToken();
  await render(
    <AuthProvider>
      <NavStateProvider>
        <Screen />
        <BottomNav />
      </NavStateProvider>
    </AuthProvider>,
  );
  await act(() => new Promise((r) => setTimeout(r, 30)));
  return screen.container as TestInstance;
}

const NOWHERE = "(no navigation)";

const hrefOf = (arg: unknown): string => {
  if (typeof arg === "string") return arg;
  const { pathname, params = {} } = arg as { pathname: string; params?: Record<string, string> };
  const { section, ...rest } = params;
  const q = new URLSearchParams(rest).toString();
  return `${pathname}${q ? `?${q}` : ""}${section ? `#${section}` : ""}`;
};

/** Where a press went: the screen it opened, the page it opened in the browser, or the anchor it scrolled to. */
function destinations(): string[] {
  return [
    ...(router.push as jest.Mock).mock.calls.map(([a]) => hrefOf(a)),
    ...(router.navigate as jest.Mock).mock.calls.map(([a]) => hrefOf(a)),
    ...(Linking.openURL as jest.Mock).mock.calls.map(([a]) => String(a)),
    ...mockScrollTo.mock.calls.map(([id]) => `#${id}`),
  ];
}

// links and buttons (the bottom nav's tabs are chrome with a role of their own)
const controls = (root: TestInstance) => reachable(root).filter((n) => isPressable(n) && ["link", "button"].includes(roleOf(n)));

/** Same-named links and buttons, each pressed in turn, with where each went. */
async function sameNames(root: TestInstance) {
  const groups = new Map<string, number>();
  for (const n of controls(root)) groups.set(nameOf(n), (groups.get(nameOf(n)) ?? 0) + 1);
  const out: { name: string; went: string[] }[] = [];
  for (const [name, count] of groups) {
    if (count < 2) continue;
    const went: string[] = [];
    for (let i = 0; i < count; i++) {
      jest.clearAllMocks();
      const target = controls(screen.container as TestInstance).filter((n) => nameOf(n) === name)[i];
      if (target) await fireEvent.press(target);
      went.push(destinations().join(" + ") || NOWHERE);
    }
    out.push({ name, went });
  }
  return out;
}

/**
 * Names shared by links or buttons that go to different places (pressed one by one). A control that
 * goes nowhere (a toggle, a choice) is not a place: a footer section's "Services" toggle may share its
 * name with a "Services" link.
 */
async function sameNameFindings(root: TestInstance): Promise<string[]> {
  const out: string[] = [];
  for (const { name, went } of await sameNames(root)) {
    const places = new Set(went.filter((w) => w !== NOWHERE));
    if (places.size > 1) out.push(`"${name}" goes to ${places.size} different places`);
  }
  return out;
}

describe.each(routes.map((r) => [r.path, r] as const))("%s", (_path, route) => {
  it("reads well to a screen reader, taps well and grows with the text size", async () => {
    const root = await show(route);
    const nodes = reachable(root);
    const findings = [
      ...controlAndImageFindings(nodes),
      ...headerFindings(nodes, route.h1),
      ...targetFindings(nodes),
      ...scalingFindings(nodes),
      ...contrastFindings(root, colors.canvas, drawn),
      ...(await sameNameFindings(root)),
    ];
    expect(findings).toEqual(known[route.path] ?? []);
    // the screen has controls at all (the audit read a real page)
    expect(nodes.filter(isPressable).length).toBeGreaterThan(4);
  });
});

describe("over a screen", () => {
  it("the open menu drawer reads well too", async () => {
    await show(routes[0]);
    await fireEvent.press(screen.getByRole("button", { name: "Open menu" }));
    await act(() => new Promise((r) => setTimeout(r, 30)));
    // a Modal is a window of its own on the phone: a screen reader reaches only what is in it
    const root = screen.getByTestId("nav-drawer-modal") as TestInstance;
    const nodes = reachable(root);
    expect(nodes.filter(isPressable).map(nameOf)).toContain("Close menu");
    expect(nodes.filter(isPressable).map(nameOf)).not.toContain("Open menu");
    expect([...controlAndImageFindings(nodes), ...targetFindings(nodes), ...scalingFindings(nodes), ...contrastFindings(root, colors.canvas)]).toEqual([]);
  });

  it("a shade's preview sheet in the finder reads well too", async () => {
    await show(routes.find((r) => r.params?.brand === "asian-paints" && r.path.startsWith("/colours"))!);
    await fireEvent.press(screen.getAllByRole("button", { name: /^Finder 1 8001$/ })[0]);
    await act(() => new Promise((r) => setTimeout(r, 30)));
    const nodes = reachable(screen.container as TestInstance);
    expect(nodes.filter(isPressable).length).toBeGreaterThan(2);
    expect([...controlAndImageFindings(nodes), ...targetFindings(nodes), ...scalingFindings(nodes)]).toEqual([]);
  });
});
