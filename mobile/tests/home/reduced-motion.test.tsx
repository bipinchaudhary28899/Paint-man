import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { Dimensions, Text } from "react-native";
import { getAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { Finishes } from "~/components/home/Finishes";
import { PinnedReveal } from "~/components/home/PinnedReveal";
import { NavStateProvider } from "~/components/site/nav-state";
import { Page, usePage } from "~/components/site/Page";
import { Reveal } from "~/components/ui/Reveal";
import { Skeleton, SkeletonGroup } from "~/components/ui/Skeleton";
import { HEADER_HEIGHT } from "~/theme";

jest.mock("@shopify/react-native-skia", () => require("./skia-mock"));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: () => true };
});

// every host view's measureLayout (the preset's shared mock), answered per test
const measureLayout: jest.Mock = jest.requireActual("@react-native/jest-preset/jest/MockNativeMethods").default.measureLayout;
let scrollY: SharedValue<number> | undefined;

function Probe() {
  scrollY = usePage().scrollY;
  return null;
}

beforeEach(() => measureLayout.mockImplementation((_c, onSuccess: (x: number, y: number) => void) => onSuccess(0, 1500)));
afterEach(() => measureLayout.mockImplementation(() => undefined));

describe("with reduced motion", () => {
  it("shows the walls finished, with no pinned runway, and the collage in place", async () => {
    await render(
      <NavStateProvider>
        <Page>
          <PinnedReveal />
          <Finishes />
          <Probe />
        </Page>
      </NavStateProvider>,
    );
    const track = screen.getByTestId("reveal-track");
    expect(track).toHaveStyle({ height: Dimensions.get("window").height - HEADER_HEIGHT });
    expect(screen.getByText("100%", { includeHiddenElements: true })).toBeOnTheScreen();

    await fireEvent(track, "layout", { nativeEvent: { layout: { x: 0, y: 1500, width: 390, height: 700 } } });
    const collage = screen.getByTestId("collage");
    await fireEvent(collage, "layout", { nativeEvent: { layout: { x: 0, y: 140, width: 353, height: 896 } } });
    await act(() => {
      scrollY!.value = 400;
    });
    expect(screen.getByText("100%", { includeHiddenElements: true })).toBeOnTheScreen();
    for (const tile of within(collage).getAllByTestId("skia-group").filter((g) => "opacity" in (g.props.skia as object))) {
      expect((tile.props.skia as { opacity: SharedValue<number> }).opacity.value).toBe(1);
    }
  });

  it("never hides a section to rise in: it shows below the fold as it is", async () => {
    await render(
      <NavStateProvider>
        <Page>
          <Reveal testID="block">
            <Text>Section</Text>
          </Reveal>
          <Probe />
        </Page>
      </NavStateProvider>,
    );
    // measured 1500pt down the page, below the fold
    await fireEvent(screen.getByTestId("block"), "layout", { nativeEvent: { layout: { x: 0, y: 1500, width: 390, height: 300 } } });
    await act(() => new Promise<void>((r) => setTimeout(r, 50)));
    expect((getAnimatedStyle as unknown as (el: unknown) => object)(screen.getByTestId("block").children[0])).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });
  });

  it("keeps skeletons still: no band of light sweeping across them", async () => {
    await render(
      <SkeletonGroup label="Loading shades">
        <Skeleton height={14} />
      </SkeletonGroup>,
    );
    const [block] = screen.getAllByTestId("skeleton", { includeHiddenElements: true });
    expect(block.children).toHaveLength(0);
    expect(screen.getByLabelText("Loading shades")).toBeBusy();
  });
});
