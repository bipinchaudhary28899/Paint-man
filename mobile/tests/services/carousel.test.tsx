import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { getAnimatedStyle } from "react-native-reanimated";
import { router } from "expo-router";

import { cardInView, ServiceCarousel, serviceLine } from "~/components/services/ServiceCarousel";
import { servicePath, services } from "~/shared";

// reduced motion, switched on by one test (Reanimated's hooks cannot be spied on)
const mockReducedMotion = { on: false };
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: () => mockReducedMotion.on };
});
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

beforeEach(() => jest.clearAllMocks());

const scroll = (x: number, content = 1500, viewport = 393) => ({
  nativeEvent: { contentOffset: { x, y: 0 }, contentSize: { width: content, height: 400 }, layoutMeasurement: { width: viewport, height: 400 } },
});

describe("a service's one line", () => {
  it("is the description up to its colon, ending in a full stop", () => {
    expect(serviceLine({ description: "Interior wall painting without managing painters yourself: on-site inspection." })).toBe(
      "Interior wall painting without managing painters yourself.",
    );
    expect(serviceLine({ description: "One plain sentence." })).toBe("One plain sentence.");
    for (const s of services) expect(serviceLine(s).length).toBeLessThan(s.description.length + 1);
  });
});

describe("the card in view", () => {
  it("snaps to the nearest card, the last at the end, and stays in range", () => {
    expect(cardInView(0, 333, 1000, 4)).toBe(0);
    expect(cardInView(160, 333, 1000, 4)).toBe(0);
    expect(cardInView(180, 333, 1000, 4)).toBe(1);
    expect(cardInView(999.5, 333, 1000, 4)).toBe(3);
    expect(cardInView(-40, 333, 1000, 4)).toBe(0);
    // a row that does not scroll (every card fits) stays on the first
    expect(cardInView(0, 333, 0, 4)).toBe(0);
    expect(cardInView(2000, 333, 0, 4)).toBe(3);
  });
});

describe("ServiceCarousel", () => {
  it("shows a card per service with its photo, sticker, name, line and a pill to open it", async () => {
    await render(<ServiceCarousel />);
    for (const s of services) {
      expect(screen.getByLabelText(s.image.alt)).toBeOnTheScreen();
      expect(screen.getByText(s.shortName)).toBeOnTheScreen();
      expect(screen.getByRole("header", { name: s.name })).toBeOnTheScreen();
      expect(screen.getByText(serviceLine(s))).toBeOnTheScreen();
    }
    await fireEvent.press(screen.getByRole("link", { name: `View ${services[1].name}` }));
    expect(router.push).toHaveBeenCalledWith({ pathname: servicePath(services[1]), params: {} });
    expect(screen.queryByRole("button", { name: /^Book a free site visit for/ })).toBeNull();
  });

  it("counts the card in view as the row is swiped", async () => {
    await render(<ServiceCarousel />);
    const row = screen.getByLabelText("Services, swipe for more");
    expect(screen.getByLabelText(`Service 1 of ${services.length}`)).toHaveTextContent(`1 / ${services.length}`);
    // the test screen is 750 wide, so a card is 340 with a 12 gap
    await fireEvent.scroll(row, scroll(352));
    expect(screen.getByText(`2 / ${services.length}`)).toBeOnTheScreen();
    await fireEvent.scroll(row, scroll(1107));
    expect(screen.getByText(`${services.length} / ${services.length}`)).toBeOnTheScreen();
    await fireEvent.scroll(row, scroll(1107));
    expect(screen.getByText(`${services.length} / ${services.length}`)).toBeOnTheScreen();
  });

  it("adds a booking pill per card where it is asked for", async () => {
    await render(<ServiceCarousel book />);
    const pills = screen.getAllByRole("button", { name: /^Book a free site visit for/ });
    expect(pills).toHaveLength(services.length);
    await fireEvent.press(screen.getByRole("button", { name: `Book a free site visit for ${services[0].name.toLowerCase()}` }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/book", params: { service: services[0].slug } });
  });
});

describe("a service card, pressed and opened", () => {
  const card = (slug: string) => screen.getByTestId(`service-card-${slug}`);
  const lifted = (slug: string) => (getAnimatedStyle as unknown as (el: unknown) => { transform: { translateY: number }[] })(card(slug).parent!.parent!).transform[0].translateY;
  const settle = () => act(() => new Promise((r) => setTimeout(r, 500)));

  it("lifts a little while pressed and settles back when let go", async () => {
    await render(<ServiceCarousel />);
    const s = services[0];
    await fireEvent(card(s.slug), "pressIn");
    await settle();
    expect(lifted(s.slug)).toBeCloseTo(-4, 0);
    await fireEvent(card(s.slug), "pressOut");
    await settle();
    expect(lifted(s.slug)).toBeCloseTo(0, 0);
  });

  it("opens into its details: the description, everything it includes and the ways on", async () => {
    await render(<ServiceCarousel />);
    const s = services[1];
    expect(card(s.slug)).toHaveProp("accessibilityLabel", `${s.name}: what's included`);
    await fireEvent.press(card(s.slug));
    const sheet = within(screen.getByTestId("service-sheet"));
    expect(sheet.getByText(s.description)).toBeOnTheScreen();
    expect(sheet.getByRole("header", { name: "What's included" })).toBeOnTheScreen();
    for (const item of s.includes) expect(sheet.getByText(item)).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole("button", { name: `Book a free site visit for ${s.name.toLowerCase()}` }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/book", params: { service: s.slug } });
    expect(screen.queryByTestId("service-sheet")).toBeNull();
  });

  it("closes from its Close link, the backdrop and the back button, and opens the service's page", async () => {
    await render(<ServiceCarousel />);
    const s = services[2];
    await fireEvent.press(card(s.slug));
    await fireEvent.press(within(screen.getByTestId("service-sheet")).getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("service-sheet")).toBeNull();
    await fireEvent.press(card(s.slug));
    // the backdrop is for fingers: screen readers stay in the sheet (accessibilityViewIsModal) and use Close
    await fireEvent.press(screen.getByTestId("service-sheet-backdrop", { includeHiddenElements: true }));
    expect(screen.queryByTestId("service-sheet")).toBeNull();
    await fireEvent.press(card(s.slug));
    await fireEvent(screen.getByTestId("service-sheet"), "requestClose");
    expect(screen.queryByTestId("service-sheet")).toBeNull();
    await fireEvent.press(card(s.slug));
    await fireEvent.press(within(screen.getByTestId("service-sheet")).getByRole("link", { name: `View ${s.name}` }));
    expect(router.push).toHaveBeenCalledWith({ pathname: servicePath(s), params: {} });
  });

  it("stays still under reduced motion", async () => {
    mockReducedMotion.on = true;
    try {
      await render(<ServiceCarousel />);
      const s = services[0];
      expect(StyleSheet.flatten(card(s.slug).parent!.parent!.props.style)?.transform).toBeUndefined();
      await fireEvent(card(s.slug), "pressIn");
      await fireEvent.press(card(s.slug));
      expect(screen.getByTestId("service-sheet")).toHaveProp("animationType", "none");
    } finally {
      mockReducedMotion.on = false;
    }
  });
});

