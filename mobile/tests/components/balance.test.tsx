import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Dimensions } from "react-native";

import { balanceStep, Em, H, MAX_SCALE, plainText } from "~/components/ui/Text";

// The website's `text-wrap: balance` for headings: measured by layout, then the narrowest width that
// keeps the line count. React Native's Jest setup reports a text size of 2× (fontScale 2); these tests
// lay headings out at the phone's default size unless they say otherwise.

const textSize = (fontScale: number) => act(() => Dimensions.set({ window: { width: 750, height: 1334, scale: 2, fontScale } }));
beforeEach(() => textSize(1));

describe("plainText", () => {
  it("joins a heading's text, nested accents included", () => {
    expect(
      plainText(
        <>
          Find your <Em>shade</Em> {2}
        </>,
      ),
    ).toBe("Find your shade 2");
    expect(plainText([null, false, "a"])).toBe("a");
  });
});

describe("balanceStep", () => {
  const LH = 40;

  it("leaves one line alone and remembers it", () => {
    expect(balanceStep({ done: false }, { width: 353, height: 40 }, LH, "one")).toEqual({ full: 353, lines: 1, done: true });
    // a heading with the same key and width starts done
    expect(balanceStep({ done: false }, { width: 353, height: 40 }, LH, "one")).toEqual({ full: 353, lines: 1, width: undefined, done: true });
  });

  it("searches between half and the full width for the narrowest that keeps the line count", () => {
    let s = balanceStep({ done: false }, { width: 353, height: 160 }, LH, "four");
    expect(s).toMatchObject({ full: 353, lines: 4, lo: 176.5, hi: 353, width: 265, done: false });
    // a stale layout from another width says nothing
    expect(balanceStep(s, { width: 353, height: 160 }, LH, "four")).toBe(s);
    // too narrow: five lines → the range moves up
    s = balanceStep(s, { width: 265, height: 200 }, LH, "four");
    expect(s).toMatchObject({ lo: 265, hi: 353, width: 309 });
    // fits: four lines → the range moves down, until it is 2pt wide
    while (!s.done) s = balanceStep(s, { width: s.width!, height: s.width! >= 330 ? 160 : 200 }, LH, "four");
    expect(s.width).toBeGreaterThanOrEqual(330);
    expect(s.width).toBeLessThanOrEqual(332);
    // remembered: the next heading like it is balanced at once
    expect(balanceStep({ done: false }, { width: 353, height: 160 }, LH, "four")).toMatchObject({ width: s.width, done: true });
    // and a finished search ignores later layouts
    expect(balanceStep(s, { width: 100, height: 400 }, LH, "four")).toBe(s);
  });

  it("does nothing without a width", () => {
    expect(balanceStep({ done: false }, { width: 0, height: 120 }, LH, "zero")).toMatchObject({ done: true });
  });
});

describe("H", () => {
  it("narrows itself to the balanced width as it lays out", async () => {
    await render(
      <H size={40} leading={1} testID="h">
        A heading that wraps onto <Em>three</Em> lines
      </H>,
    );
    const h = screen.getByTestId("h");
    await fireEvent(h, "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 120 } } });
    expect(h).toHaveStyle({ width: 225, alignSelf: "flex-start" });
    await fireEvent(h, "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 225, height: 120 } } });
    expect(h).toHaveStyle({ width: 188 });
  });

  it("centres a centred heading, and can be left unbalanced", async () => {
    await render(
      <>
        <H size={40} leading={1} testID="c" style={{ textAlign: "center", lineHeight: 44 }}>
          Centred heading over two lines
        </H>
        <H testID="plain" balance={false}>
          Plain
        </H>
        <H testID="clamped" numberOfLines={1}>
          Clamped
        </H>
      </>,
    );
    await fireEvent(screen.getByTestId("c"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 88 } } });
    expect(screen.getByTestId("c")).toHaveStyle({ alignSelf: "center" });
    expect(screen.getByTestId("plain")).not.toHaveProp("onLayout");
    expect(screen.getByTestId("clamped")).not.toHaveProp("onLayout");
  });

  it("grows with the phone's text size up to 2×, and counts its lines at the grown size", async () => {
    await textSize(1.5);
    await render(
      <H size={40} leading={1} testID="big">
        A heading at a larger text size
      </H>,
    );
    const h = screen.getByTestId("big");
    expect(h).toHaveProp("maxFontSizeMultiplier", MAX_SCALE.large);
    // two lines at 1.5× are 120pt tall (40 × 1.5 each): a two-line heading, so it balances
    await fireEvent(h, "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 120 } } });
    expect(h).toHaveStyle({ width: 225 });
    // one line at 1.5× (60pt) is left alone
    await render(
      <H size={40} leading={1} testID="one">
        Short at 1.5×
      </H>,
    );
    await fireEvent(screen.getByTestId("one"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 60 } } });
    expect(screen.getByTestId("one")).not.toHaveProp("onLayout");
  });

  it("can be left to grow without a cap, counting its lines at the full text size", async () => {
    await textSize(3);
    await render(
      <H size={20} leading={1} maxFontSizeMultiplier={0} testID="free">
        Uncapped heading
      </H>,
    );
    // one line at 3× is 60pt: done
    await fireEvent(screen.getByTestId("free"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 60 } } });
    expect(screen.getByTestId("free")).not.toHaveProp("onLayout");
  });

  it("stops growing at its cap: past 2× the lines are counted at 2×", async () => {
    await textSize(3);
    await render(
      <H size={20} leading={1} testID="cap">
        Capped heading text
      </H>,
    );
    // one line at the 2× cap is 40pt: done, not mistaken for two lines
    await fireEvent(screen.getByTestId("cap"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 40 } } });
    expect(screen.getByTestId("cap")).not.toHaveProp("onLayout");
  });
});
