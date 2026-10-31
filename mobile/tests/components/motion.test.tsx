import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { getAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { NavStateProvider } from "~/components/site/nav-state";
import { LAYOUT_SETTLE_MS, Page, usePage } from "~/components/site/Page";
import { COLLAPSE_MS, Collapse, collapseHeight, Turn, UNLIMITED } from "~/components/ui/Collapse";
import { REVEAL_LINE, REVEAL_RISE, Reveal, RevealContainer, revealDue } from "~/components/ui/Reveal";
import { Skeleton, SkeletonGroup, SkeletonLines } from "~/components/ui/Skeleton";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/about"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

const wait = (ms: number) => act(() => new Promise<void>((r) => setTimeout(r, ms)));
/** An animated view's style as it is now (its animated values included). */
const styleOf = getAnimatedStyle as unknown as (el: unknown) => Record<string, unknown>;

describe("Collapse", () => {
  it("sets no limit when open, nothing when shut, and the body's share in between (none before it is measured)", () => {
    expect(collapseHeight(1, 200)).toBe(UNLIMITED);
    expect(collapseHeight(1, -1)).toBe(UNLIMITED);
    expect(collapseHeight(0, 200)).toBe(0);
    expect(collapseHeight(0.5, 200)).toBe(100);
    expect(collapseHeight(0.5, -1)).toBe(0);
  });

  function Accordion({ startOpen = false }: { startOpen?: boolean }) {
    const [open, setOpen] = useState(startOpen);
    return (
      <>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)}>
          <Text>Question</Text>
        </Pressable>
        <Collapse open={open} testID="body" accessibilityLabel="Answer body">
          <Text>Answer</Text>
        </Collapse>
        <Turn open={open} testID="turn">
          <Text>v</Text>
        </Turn>
      </>
    );
  }

  it("slides its body open, hides it from screen readers the moment it closes, and lets it go once shut", async () => {
    await render(<Accordion />);
    expect(screen.queryByText("Answer", { includeHiddenElements: true })).toBeNull();

    await fireEvent.press(screen.getByRole("button"));
    expect(screen.getByText("Answer")).toBeOnTheScreen();
    expect(screen.getByLabelText("Answer body")).toBeOnTheScreen();
    // measured, then open in full: no limit on what is inside
    await fireEvent(screen.getByTestId("body"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 120 } } });
    await waitFor(() => expect(styleOf(screen.getByTestId("body").parent)).toMatchObject({ maxHeight: UNLIMITED, opacity: 1 }));
    await waitFor(() => expect(styleOf(screen.getByTestId("turn", { includeHiddenElements: true }))).toMatchObject({ transform: [{ rotate: "180deg" }] }));

    await fireEvent.press(screen.getByRole("button"));
    expect(screen.queryByText("Answer")).toBeNull();
    expect(screen.getByText("Answer", { includeHiddenElements: true })).toBeOnTheScreen();
    await wait(COLLAPSE_MS + 120);
    expect(screen.queryByText("Answer", { includeHiddenElements: true })).toBeNull();
    expect(styleOf(screen.getByTestId("turn", { includeHiddenElements: true }))).toMatchObject({ transform: [{ rotate: "0deg" }] });
  });

  it("starts open when asked, and reopening while it closes keeps it", async () => {
    await render(<Accordion startOpen />);
    expect(screen.getByText("Answer")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button"));
    await fireEvent.press(screen.getByRole("button"));
    await wait(COLLAPSE_MS + 120);
    expect(screen.getByText("Answer")).toBeOnTheScreen();
  });
});

describe("Reveal", () => {
  // every host view's measureLayout (the preset's shared mock), answered per test
  const measureLayout: jest.Mock = jest.requireActual("@react-native/jest-preset/jest/MockNativeMethods").default.measureLayout;
  let page: { scrollY: SharedValue<number>; viewport: number; headerHeight: number } | undefined;
  function Probe() {
    page = usePage();
    return null;
  }
  afterEach(() => measureLayout.mockImplementation(() => undefined));

  const at = (y: number) => measureLayout.mockImplementation((_c, onSuccess: (x: number, y: number, w: number, h: number) => void) => onSuccess(0, y, 390, 300));
  const rise = () => styleOf(screen.getByTestId("block").children[0]);
  // a layout pass, then a frame for the style to follow
  const layout = async () => {
    await fireEvent(screen.getByTestId("block"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 300 } } });
    await wait(50);
  };

  async function renderPage() {
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
  }

  it("is due once its top passes 92% of the screen, and stays due when scrolled past", () => {
    const viewport = 800;
    const header = 73;
    expect(revealDue(2000, 0, header, viewport)).toBe(false);
    expect(revealDue(viewport * REVEAL_LINE - header - 1, 0, header, viewport)).toBe(true);
    expect(revealDue(2000, 2000 - viewport * REVEAL_LINE + header + 1, header, viewport)).toBe(true);
    expect(revealDue(200, 5000, header, viewport)).toBe(true);
  });

  it("simply shows when it cannot be measured", async () => {
    await renderPage();
    await layout();
    expect(rise()).toMatchObject({ opacity: 1 });
  });

  it("shows at once when it is already on screen", async () => {
    at(100);
    await renderPage();
    await layout();
    expect(rise()).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] });
  });

  it("waits below the fold, then fades and rises in as the page scrolls it into view", async () => {
    at(3000);
    await renderPage();
    await layout();
    expect(rise()).toMatchObject({ opacity: 0, transform: [{ translateY: REVEAL_RISE }] });
    expect(screen.getByText("Section")).toBeOnTheScreen();
    // not yet
    await act(() => {
      page!.scrollY.value = 1000;
    });
    await wait(50);
    expect(rise()).toMatchObject({ opacity: 0 });
    await act(() => {
      page!.scrollY.value = 3000;
    });
    await waitFor(() => expect(rise()).toMatchObject({ opacity: 1, transform: [{ translateY: 0 }] }));
    // once shown it stays: back up the page, it does not hide again
    await act(() => {
      page!.scrollY.value = 0;
    });
    await layout();
    expect(rise()).toMatchObject({ opacity: 1 });
  });

  it("measures again when the content above changes height, and shows if that brought it on screen", async () => {
    at(3000);
    await renderPage();
    await layout();
    expect(rise()).toMatchObject({ opacity: 0 });
    // an accordion above closes: the block now sits on screen
    at(300);
    let content = screen.getByTestId("block").parent;
    while (content && !(content.props.onLayout && content.props.collapsable === false && content.props.testID !== "block")) content = content.parent;
    await fireEvent(content!, "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 2400 } } });
    await wait(LAYOUT_SETTLE_MS + 20);
    await waitFor(() => expect(rise()).toMatchObject({ opacity: 1 }));
  });

  it("puts a section in the page's gutters, its margins outside", async () => {
    await render(
      <RevealContainer style={{ marginTop: 96 }} containerStyle={{ gap: 40 }}>
        <Text>Section</Text>
      </RevealContainer>,
    );
    expect(screen.getByText("Section")).toBeOnTheScreen();
  });
});

describe("Skeleton", () => {
  it("a group says what is loading and that it is busy; its blocks are hidden from screen readers", async () => {
    await render(
      <SkeletonGroup label="Loading shades" testID="group">
        <Skeleton height={14} width="60%" />
        <SkeletonLines lines={3} />
      </SkeletonGroup>,
    );
    expect(screen.getByLabelText("Loading shades")).toBeBusy();
    const blocks = screen.getAllByTestId("skeleton", { includeHiddenElements: true });
    expect(blocks).toHaveLength(4);
    expect(screen.queryAllByTestId("skeleton")).toHaveLength(0);
    // the lines: full width but for a shorter last one
    expect(blocks[1]).toHaveStyle({ width: "100%", height: 14 });
    expect(blocks[3]).toHaveStyle({ width: "62%" });
    // each block carries the band of light that sweeps across it
    await fireEvent(blocks[0], "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 14 } } });
    expect(blocks[0].children).toHaveLength(1);
  });

  it("a block on its own shimmers by itself, and one line is full width", async () => {
    await render(
      <>
        <Skeleton height={48} radius={999} />
        <SkeletonLines lines={1} />
      </>,
    );
    const [pill, line] = screen.getAllByTestId("skeleton", { includeHiddenElements: true });
    expect(pill).toHaveStyle({ height: 48, borderRadius: 999, width: "100%" });
    expect(pill.children).toHaveLength(1);
    expect(line).toHaveStyle({ width: "100%" });
  });
});
