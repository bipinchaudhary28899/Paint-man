import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router, usePathname } from "expo-router";
import { Linking, Text } from "react-native";
import { makeMutable, type SharedValue } from "react-native-reanimated";

import { navBottom, navReach } from "~/components/site/BottomNav";
import { NavStateProvider } from "~/components/site/nav-state";
import { Anchor, Page, usePage } from "~/components/site/Page";
import { CTA_GAP, CTA_HIDDEN_ROUTES, ctaVisible, FORM_ANCHORS, SCROLL_SLOP, scrollHeading, StickyCta } from "~/components/site/StickyCta";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/about"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

const mockPathname = usePathname as jest.Mock;
const VIEWPORT = 800;
const HEADER = 73;

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname.mockReturnValue("/about");
});

const pill = () => screen.queryByRole("link", { name: "Book a free inspection" });

/** Scrolls the page through each offset in turn, a frame apart, as a finger would (the pill reads the offset once a frame). */
async function scroll(scrollY: SharedValue<number>, ...offsets: number[]) {
  for (const y of offsets) {
    await act(async () => {
      scrollY.value = y;
      await new Promise((r) => setTimeout(r, 34));
    });
  }
}

async function renderCta(details?: { phone: string; whatsapp: string }, toForm?: () => void) {
  const scrollY = makeMutable(0);
  const forms = makeMutable<number[]>([]);
  await render(<StickyCta scrollY={scrollY} viewport={VIEWPORT} headerHeight={HEADER} forms={forms} details={details} toForm={toForm} />);
  return { scrollY, forms };
}

describe("ctaVisible", () => {
  it("shows past the first screen and leaves again near the top, without flickering at the line", () => {
    expect(ctaVisible(0, VIEWPORT, HEADER, [], false)).toBe(false);
    expect(ctaVisible(VIEWPORT, VIEWPORT, HEADER, [], false)).toBe(false);
    expect(ctaVisible(VIEWPORT + 1, VIEWPORT, HEADER, [], false)).toBe(true);
    // once shown it stays until the page is back above 80% of the first screen
    expect(ctaVisible(VIEWPORT * 0.9, VIEWPORT, HEADER, [], true)).toBe(true);
    expect(ctaVisible(VIEWPORT * 0.9, VIEWPORT, HEADER, [], false)).toBe(false);
    expect(ctaVisible(VIEWPORT * 0.7, VIEWPORT, HEADER, [], true)).toBe(false);
  });

  it("steps aside while a booking form is on screen below the header", () => {
    const form = [3000, 3800];
    // the form is still below the screen
    expect(ctaVisible(2000, VIEWPORT, HEADER, form, false)).toBe(true);
    // its top has come up into view (3000 + the header, above 2300 + the screen)
    expect(ctaVisible(2300, VIEWPORT, HEADER, form, false)).toBe(false);
    // the page is inside it
    expect(ctaVisible(3300, VIEWPORT, HEADER, form, true)).toBe(false);
    // it has gone up under the header
    expect(ctaVisible(3900, VIEWPORT, HEADER, form, true)).toBe(true);
    // any of several forms
    expect(ctaVisible(5100, VIEWPORT, HEADER, [...form, 5500, 6000], true)).toBe(false);
  });
});

describe("scrollHeading", () => {
  it("turns only once the page has come back the slop from the furthest point reached", () => {
    const start = { down: true, turn: 0 };
    // reading on down the page
    expect(scrollHeading(start, 900)).toEqual({ down: true, turn: 900 });
    // a small settle back up is not a turn
    expect(scrollHeading({ down: true, turn: 900 }, 900 - SCROLL_SLOP)).toEqual({ down: true, turn: 900 });
    // a real scroll up is
    expect(scrollHeading({ down: true, turn: 900 }, 900 - SCROLL_SLOP - 1)).toEqual({ down: false, turn: 900 - SCROLL_SLOP - 1 });
    // going up, the turn follows the highest point; a jitter down is not a turn
    expect(scrollHeading({ down: false, turn: 700 }, 650)).toEqual({ down: false, turn: 650 });
    expect(scrollHeading({ down: false, turn: 650 }, 650 + SCROLL_SLOP)).toEqual({ down: false, turn: 650 });
    expect(scrollHeading({ down: false, turn: 650 }, 700)).toEqual({ down: true, turn: 700 });
  });
});

describe("the sticky booking pill", () => {
  it("past the first screen, keeps out of the way while the page scrolls down and rises when it scrolls up", async () => {
    const { scrollY } = await renderCta();
    await screen.findByTestId("sticky-cta", { includeHiddenElements: true });
    expect(pill()).toBeNull();
    expect(screen.getByRole("link", { name: "Book a free inspection", includeHiddenElements: true })).toBeOnTheScreen();

    // reading on down past the first screen: it stays away (it would cover what the visitor reads towards)
    await scroll(scrollY, 600, 1200, 1800);
    expect(pill()).toBeNull();
    // back up a little: it rises
    await scroll(scrollY, 1700);
    await waitFor(() => expect(pill()).toBeOnTheScreen());
    // on down again: it slides away
    await scroll(scrollY, 1750, 1900);
    await waitFor(() => expect(pill()).toBeNull());
    await scroll(scrollY, 1500);
    await waitFor(() => expect(pill()).toBeOnTheScreen());
    await fireEvent.press(pill()!);
    expect(router.push).toHaveBeenCalledWith({ pathname: "/book", params: {} });

    // up near the top: it leaves
    await scroll(scrollY, 100);
    await waitFor(() => expect(pill()).toBeNull());
  });

  it("glides to the page's own booking form instead, when the page has one", async () => {
    const toForm = jest.fn();
    const { scrollY } = await renderCta(undefined, toForm);
    await scroll(scrollY, 1800, 1500);
    await waitFor(() => expect(pill()).toBeOnTheScreen());
    await fireEvent.press(pill()!);
    expect(toForm).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("steps aside while a booking form is on screen", async () => {
    const { scrollY, forms } = await renderCta();
    await scroll(scrollY, 1800, 1500);
    await waitFor(() => expect(pill()).toBeOnTheScreen());
    await act(() => {
      forms.value = [1700, 2600];
    });
    await waitFor(() => expect(pill()).toBeNull());
    // past the form (gone up under the header), scrolling back up a little: back again
    await scroll(scrollY, 3000, 2700);
    await waitFor(() => expect(pill()).toBeOnTheScreen());
  });

  it("sits just above the bottom nav and its dab", async () => {
    await renderCta();
    const bar = await screen.findByTestId("sticky-cta", { includeHiddenElements: true });
    expect(bar).toHaveStyle({ bottom: navReach(0) + CTA_GAP });
    expect(navReach(0)).toBe(navBottom(0) + 64 + 28);
    expect(navReach(34)).toBe(34 + 64 + 28);
  });

  it.each(CTA_HIDDEN_ROUTES)("never shows on %s", async (route) => {
    mockPathname.mockReturnValue(route);
    const { scrollY } = await renderCta();
    await act(() => {
      scrollY.value = 5000;
    });
    expect(screen.queryByTestId("sticky-cta", { includeHiddenElements: true })).toBeNull();
  });

  it("has no call or WhatsApp control while site.ts has no numbers", async () => {
    await renderCta();
    await screen.findByTestId("sticky-cta", { includeHiddenElements: true });
    expect(screen.queryByLabelText("Chat on WhatsApp", { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByLabelText("Call us", { includeHiddenElements: true })).toBeNull();
  });

  it("adds a round WhatsApp button once there is a WhatsApp number (in preference to a call)", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const { scrollY } = await renderCta({ phone: "+911234567890", whatsapp: "911234567890" });
    await scroll(scrollY, 1800, 1500);
    const chat = await screen.findByRole("link", { name: "Chat on WhatsApp" });
    expect(screen.getByTestId("whatsapp-logo", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: "Call us" })).toBeNull();
    await fireEvent.press(chat);
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/911234567890\?text=/));
  });

  it("adds a Call pill when there is only a phone number", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const { scrollY } = await renderCta({ phone: "+911234567890", whatsapp: "" });
    await scroll(scrollY, 1800, 1500);
    const call = await screen.findByRole("link", { name: "Call us" });
    expect(screen.getByText("Call")).toBeOnTheScreen();
    await fireEvent.press(call);
    expect(open).toHaveBeenCalledWith("tel:+911234567890");
  });
});

describe("the pill on a page", () => {
  // every host view's measureLayout (the preset's shared mock), answered per test
  const measureLayout: jest.Mock = jest.requireActual("@react-native/jest-preset/jest/MockNativeMethods").default.measureLayout;
  let page: { scrollY: SharedValue<number>; viewport: number } | undefined;
  function Probe() {
    page = usePage();
    return null;
  }

  afterEach(() => measureLayout.mockImplementation(() => undefined));

  it("rides over the page with room left at its end, and keeps off the page's booking form", async () => {
    measureLayout.mockImplementation((_container, onSuccess: (x: number, y: number, w: number, h: number) => void) => onSuccess(0, 3000, 390, 900));
    await render(
      <NavStateProvider>
        <Page>
          <Anchor id={FORM_ANCHORS[0]}>
            <Text>form</Text>
          </Anchor>
          <Probe />
        </Page>
      </NavStateProvider>,
    );
    expect(screen.getByTestId("cta-room", { includeHiddenElements: true })).toBeOnTheScreen();
    await fireEvent(screen.getByText("form").parent!, "layout", { nativeEvent: { layout: { x: 0, y: 3000, width: 390, height: 900 } } });
    await scroll(page!.scrollY, page!.viewport + 300, page!.viewport + 100);
    await waitFor(() => expect(pill()).toBeOnTheScreen());
    // scrolled back up to the form: the pill gives way
    await scroll(page!.scrollY, 4500, 3000);
    await waitFor(() => expect(pill()).toBeNull());
  });

  it("is left off the booking page, with no room kept for it", async () => {
    mockPathname.mockReturnValue("/book");
    await render(
      <NavStateProvider>
        <Page>
          <Text>booking</Text>
        </Page>
      </NavStateProvider>,
    );
    expect(screen.queryByTestId("sticky-cta", { includeHiddenElements: true })).toBeNull();
    expect(screen.queryByTestId("cta-room", { includeHiddenElements: true })).toBeNull();
  });
});
