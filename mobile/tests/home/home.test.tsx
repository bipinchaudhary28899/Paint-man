import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { Linking } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { HomeSections } from "~/components/home/HomeSections";
import { stageLabels, stages, wallShade } from "~/components/home/PinnedReveal";
import { NavStateProvider } from "~/components/site/nav-state";
import { Page, usePage } from "~/components/site/Page";
import { plainText } from "~/components/ui/Text";
import { generalFaqs, images, liveCities, liveCityNames, PAINTDB, promises, services, site, workFlow } from "~/shared";
import { skiaImages } from "./skia-mock";

jest.mock("@shopify/react-native-skia", () => require("./skia-mock"));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// every host view's measureLayout (the preset's shared mock), answered per test
const measureLayout: jest.Mock = jest.requireActual("@react-native/jest-preset/jest/MockNativeMethods").default.measureLayout;
let page: { scrollY: SharedValue<number>; viewport: number; headerHeight: number } | undefined;

function Probe() {
  page = usePage();
  return null;
}

async function renderHome() {
  await render(
    <NavStateProvider>
      <Page sections={["top", "services", "colour", "book"]}>
        <HomeSections />
        <Probe />
      </Page>
    </NavStateProvider>,
  );
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

beforeEach(() => {
  jest.clearAllMocks();
  skiaImages.loaded = true;
  measureLayout.mockImplementation(() => undefined);
});

describe("the home page", () => {
  it("opens with the hero: the live cities, one heading, one line of copy, the booking button, colours and the facts", async () => {
    await renderHome();
    const names = liveCities().map((c) => c.name);
    expect(screen.getByText(`Now painting in ${names.join(" · ")}`)).toHaveProp("accessibilityLabel", `Now painting in ${liveCityNames()}`);
    expect(screen.getByRole("header", { name: "Your space, painted beautifully. Managed completely." })).toBeOnTheScreen();
    expect(screen.getByText(`${site.yearsPainting} saal se gharon ko rang rahe hain, ab online bhi.`)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Explore colours" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/colours", params: {} });
    for (const fact of ["Payment: Zero advance", "Estimate: Full, before work starts", "Work: Timed and documented"]) expect(screen.getByLabelText(fact)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Paint tins from brands sold in India/)).toBeOnTheScreen();
    // the hero's button and the journey's glide to the booking card on this page (tests/home/hero.test.tsx)
    await fireEvent.press(screen.getByRole("button", { name: "Book a free inspection" }));
    await fireEvent.press(screen.getByRole("button", { name: "Book a site visit" }));
    expect(router.push).not.toHaveBeenCalledWith(expect.objectContaining({ pathname: "/book" }));
  });

  it("puts the booking form right after the hero, with the zero-advance note", async () => {
    await renderHome();
    expect(screen.getByRole("header", { name: "Book a site visit online" })).toBeOnTheScreen();
    expect(screen.getByText(new RegExp(`^Bas kuch details bhejiye: we call you back during working hours \\(${site.hoursDisplay}\\)`))).toBeOnTheScreen();
    expect(screen.getByText(`${promises[0].title}, and nothing is booked until you approve the estimate.`)).toBeOnTheScreen();
  });

  it("runs the reveal with the scroll: pinned under the header, filling the walls stage by stage", async () => {
    measureLayout.mockImplementation((_container, onSuccess: (x: number, y: number) => void) => onSuccess(0, 2000));
    await renderHome();
    expect(screen.getByRole("header", { name: "Watch the colour go on." })).toBeOnTheScreen();
    for (const s of stages) expect(screen.getAllByText(s.title).length).toBeGreaterThan(0);
    for (const l of stageLabels) expect(screen.getAllByText(l).length).toBeGreaterThan(0);
    expect(screen.getByText(wallShade.code)).toBeOnTheScreen();
    expect(screen.getByLabelText(`Living room with the walls being painted ${wallShade.name}`)).toBeOnTheScreen();

    const track = screen.getByTestId("reveal-track");
    await fireEvent(track, "layout", { nativeEvent: { layout: { x: 0, y: 2000, width: 390, height: 3 * page!.viewport } } });
    await fireEvent(screen.getByLabelText(`Living room with the walls being painted ${wallShade.name}`), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 350, height: 480 } },
    });
    expect(track).toHaveStyle({ height: 3 * page!.viewport });
    await settle();
    expect(screen.getByText("0%", { includeHiddenElements: true })).toBeOnTheScreen();

    // halfway down the runway
    await act(() => {
      page!.scrollY.value = 2000 + page!.viewport;
    });
    await settle();
    expect(screen.queryByText("0%", { includeHiddenElements: true })).toBeNull();

    // past the end: the walls are finished
    await act(() => {
      page!.scrollY.value = 2000 + 10 * page!.viewport;
    });
    await settle();
    expect(screen.getByText("100%", { includeHiddenElements: true })).toBeOnTheScreen();
    const canvas = screen.getByTestId("reveal-canvas");
    expect(within(canvas).getAllByTestId("skia-blend-color").map((b) => (b.props.skia as { color: string }).color)).toEqual(["#cfc9bf", wallShade.hex]);
  });

  it("runs the sections in the phone order: services, trust, journey, colour, areas, booking, questions", async () => {
    await renderHome();
    const order = [
      "Your space, painted beautifully. Managed completely.",
      "Every wall in the house.",
      "Painting, without the project management.",
      "How the work gets done",
      "Find a shade that feels like you.",
      "The finish we work to.",
      `Painting homes across ${liveCityNames()}`,
      "Book a site visit online",
      "Good questions.",
      "Let's give your home a fresh coat.",
    ];
    const headers = screen.getAllByRole("header").map((h) => plainText(h.props.children));
    const at = order.map((name) => headers.indexOf(name));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it("shows every service as a swipe card opening its hub, then all services", async () => {
    await renderHome();
    expect(screen.getByRole("header", { name: "Every wall in the house." })).toBeOnTheScreen();
    expect(screen.getByLabelText("Services, swipe for more")).toBeOnTheScreen();
    expect(screen.getByText(`1 / ${services.length}`)).toBeOnTheScreen();
    for (const s of services) {
      expect(screen.getByRole("header", { name: s.name })).toBeOnTheScreen();
      expect(screen.getByLabelText(s.image.alt)).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole("link", { name: `View ${s.name}` }));
      expect(router.push).toHaveBeenCalledWith({ pathname: `/services/${s.slug}`, params: {} });
    }
    // the home cards open the service; booking is the form further down
    expect(screen.queryByRole("button", { name: /^Book a site visit for/ })).toBeNull();
    await fireEvent.press(screen.getByRole("link", { name: "All services" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/services", params: {} });
  });

  it("keeps why-us to one section: the years, the diagnosis and the six promises", async () => {
    await renderHome();
    expect(screen.getByText(`The ${site.name} way`)).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Painting, without the project management." })).toBeOnTheScreen();
    expect(screen.getByText(`Hum naye nahi hain: painting homes for ${site.yearsPainting} years, and now you can book us online.`)).toBeOnTheScreen();
    expect(screen.getByText("Hum sirf paint nahi karte.")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "We diagnose first." })).toBeOnTheScreen();
    expect(screen.getByLabelText(images.weatheredWall.alt)).toBeOnTheScreen();
    expect(screen.getByText("What you can count on")).toBeOnTheScreen();
    for (const p of promises) expect(screen.getByRole("header", { name: p.title })).toBeOnTheScreen();
    // the sections it replaces are gone
    expect(screen.queryByRole("header", { name: "From enquiry to fresh walls in five steps." })).toBeNull();
  });

  it("walks through the work in one stepper, ending with the booking button", async () => {
    await renderHome();
    expect(screen.getByRole("header", { name: "How the work gets done" })).toBeOnTheScreen();
    expect(screen.getByText("Ek team, ek quotation, ek hi contact: from the first call to the final walkthrough.")).toBeOnTheScreen();
    for (const [i, s] of workFlow.entries()) expect(screen.getByRole("button", { name: `Step ${i + 1} of ${workFlow.length}: ${s.title}` })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: `Step 1 of ${workFlow.length}: ${workFlow[0].title}` })).toBeExpanded();
    await fireEvent.press(screen.getByRole("button", { name: `Step 7 of ${workFlow.length}: ${workFlow[6].title}` }));
    expect(screen.getByRole("button", { name: `Step 7 of ${workFlow.length}: ${workFlow[6].title}` })).toBeExpanded();
    expect(screen.getByRole("button", { name: `Step 1 of ${workFlow.length}: ${workFlow[0].title}` })).not.toBeExpanded();
  });

  it("lets a visitor pick a featured shade and open the colour tools", async () => {
    await renderHome();
    expect(screen.getByRole("header", { name: "Find a shade that feels like you." })).toBeOnTheScreen();
    expect(screen.getByText("#C76B4A · Terracottas")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Terracotta" })).toBeSelected();
    await fireEvent.press(screen.getByRole("button", { name: "Sage" }));
    expect(screen.getByText("#71856A · Greens")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sage" })).toBeSelected();
    expect(screen.getAllByRole("button", { name: /^[A-Z][a-z]+$/ }).filter((b) => b.props.accessibilityState?.selected !== undefined)).toHaveLength(12);

    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await fireEvent.press(screen.getByRole("link", { name: "PaintDB" }));
    await fireEvent.press(screen.getByRole("link", { name: "CC BY 4.0" }));
    expect(open).toHaveBeenCalledWith(PAINTDB.source);
    expect(open).toHaveBeenCalledWith(PAINTDB.licenseUrl);
    await fireEvent.press(screen.getByRole("link", { name: /^Colour finder\./ }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/colours", params: {} });
  });

  it("draws the collage once it has a width, every photo cut to its shape and named for screen readers", async () => {
    measureLayout.mockImplementation((_container, onSuccess: (x: number, y: number) => void) => onSuccess(0, 9000));
    await renderHome();
    expect(screen.getByRole("header", { name: "The finish we work to." })).toBeOnTheScreen();
    await fireEvent(screen.getByTestId("finishes"), "layout", { nativeEvent: { layout: { x: 0, y: 9000, width: 393, height: 1100 } } });
    const collage = screen.getByTestId("collage");
    expect(within(collage).queryByTestId("skia-canvas")).toBeNull();
    await fireEvent(collage, "layout", { nativeEvent: { layout: { x: 0, y: 140, width: 353, height: 896 } } });
    expect(within(collage).getByTestId("skia-canvas")).toBeOnTheScreen();
    expect(within(collage).getAllByTestId("skia-image")).toHaveLength(7);
    for (const alt of [images.uniformSpraying.alt, images.twoPaintedDoors.alt, images.redHouseWall.alt, images.shadeCardFan.alt]) {
      expect(within(collage).getByLabelText(alt)).toBeOnTheScreen();
    }
    // the tiles rise in as the collage scrolls up the screen
    await act(() => {
      page!.scrollY.value = 9000;
    });
    await settle();
    expect(within(collage).getAllByTestId("skia-group").length).toBeGreaterThan(5);
  });

  it("shows sand where a collage photo has not arrived yet", async () => {
    skiaImages.loaded = false;
    await renderHome();
    await fireEvent(screen.getByTestId("collage"), "layout", { nativeEvent: { layout: { x: 0, y: 140, width: 353, height: 896 } } });
    const paths = within(screen.getByTestId("collage")).getAllByTestId("skia-path");
    expect(paths).toHaveLength(7);
    expect((paths[0].props.skia as { color: string }).color).toBe("#e8d7c5");
  });

  it("shows one live city at a time: switch cities, open a locality, book in the city or see its page", async () => {
    await renderHome();
    expect(screen.getByRole("header", { name: `Painting homes across ${liveCityNames()}` })).toBeOnTheScreen();
    const [first, second] = liveCities();
    expect(screen.getByRole("tab", { name: first.name })).toBeSelected();
    expect(screen.getByText(`${first.areas.length} localities · ${first.region}`)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("link", { name: `Painters in ${first.areas[0]}` }));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: `/services/house-painting/${first.slug}`, params: { section: expect.any(String) } });

    // the second city's card replaces the first
    await fireEvent.press(screen.getByRole("tab", { name: second.name }));
    expect(screen.getByRole("tab", { name: second.name })).toBeSelected();
    expect(screen.queryByRole("link", { name: `Painters in ${first.areas[0]}` })).toBeNull();
    await fireEvent.press(screen.getByRole("link", { name: `Book in ${second.name}` }));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: `/services/house-painting/${second.slug}`, params: { section: "book-visit" } });
    await fireEvent.press(screen.getByRole("link", { name: `See painting in ${second.name}` }));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: `/services/house-painting/${second.slug}`, params: {} });

    await fireEvent.press(screen.getByRole("link", { name: "Ask us" }));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: "/contact", params: {} });
    expect(screen.getByText(/^Coming next: /)).toBeOnTheScreen();
  });

  it("closes with the general FAQs, the first open, and the banner", async () => {
    await renderHome();
    expect(screen.getByRole("header", { name: "Good questions." })).toBeOnTheScreen();
    expect(screen.getByText(generalFaqs[0].a)).toBeOnTheScreen();
    expect(screen.getByText("Free estimate")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Get a free estimate" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/book", params: {} });
  });
});
