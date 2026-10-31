import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useReducedMotion } from "react-native-reanimated";

import { closing, FINAL_SCALE, LaunchAnimation, lockupScale, LOGO, markMotion, RING, screenOpacity, stripAngle, stripOpacity, swapOpacity, TIMES, wordmarkMotion } from "~/components/site/LaunchAnimation";

jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const mod360 = (a: number) => ((a % 360) + 360) % 360;

describe("the fan deck's motion", () => {
  it("starts as a full ring, one strip every 30°", () => {
    expect(RING).toHaveLength(12);
    expect(RING.map((_, i) => mod360(stripAngle(i, 0)))).toEqual(RING.map((_, i) => i * 30));
  });

  it("turns once, then closes into the logo: terracotta upright, golden and sage 25° either side", () => {
    expect(closing(0)).toBe(0);
    expect(closing(TIMES.closeEnd)).toBe(1);
    const end = TIMES.end;
    expect(mod360(stripAngle(0, end))).toBeCloseTo(0);
    expect(mod360(stripAngle(1, end))).toBeCloseTo(25);
    expect(mod360(stripAngle(RING.length - 1, end))).toBeCloseTo(335);
    // the others end behind the terracotta strip, faded out
    for (const i of RING.keys()) {
      if (i in LOGO) {
        expect(stripOpacity(i, end)).toBe(1);
      } else {
        expect(mod360(stripAngle(i, end))).toBeCloseTo(0);
        expect(stripOpacity(i, 0)).toBe(1);
        expect(stripOpacity(i, end)).toBe(0);
      }
    }
    // the logo's colours: terracotta, golden, sage
    expect([RING[0], RING[1], RING[RING.length - 1]]).toEqual(["#C76B4A", "#E9B949", "#71856A"]);
  });

  it("grows in, then settles onto the stacked logo's fan: smaller, its rivet just above the centre", () => {
    const start = markMotion(0);
    expect(start.scale).toBe(0.6);
    expect(start.opacity).toBe(0);
    expect(Math.abs(start.translateX) + Math.abs(start.translateY)).toBe(0);
    const settled = markMotion(TIMES.closeEnd);
    expect(settled.scale).toBeCloseTo(FINAL_SCALE);
    expect(FINAL_SCALE).toBeGreaterThan(0.6);
    expect(FINAL_SCALE).toBeLessThan(0.75);
    expect(settled.translateY).toBeLessThan(0);
    expect(settled.opacity).toBe(1);
    // once the logo file shows, the drawn fan is gone
    expect(markMotion(TIMES.swapEnd + 100).opacity).toBe(0);
  });

  it("raises the wordmark in under the fan, swaps in the logo file, and fades into the app", () => {
    expect(wordmarkMotion(TIMES.wordStart)).toEqual({ opacity: 0, translateY: 14 });
    expect(wordmarkMotion(TIMES.wordEnd)).toEqual({ opacity: 1, translateY: 0 });
    expect(swapOpacity(TIMES.swapStart)).toBe(0);
    expect(swapOpacity(TIMES.swapEnd)).toBe(1);
    expect(TIMES.wordEnd).toBeLessThan(TIMES.hold);
    expect(lockupScale(TIMES.hold)).toBe(1);
    expect(lockupScale(TIMES.end)).toBeCloseTo(1.06);
    expect(screenOpacity(0)).toBe(1);
    expect(screenOpacity(TIMES.hold)).toBe(1);
    expect(screenOpacity(TIMES.end)).toBe(0);
  });
});

describe("LaunchAnimation", () => {
  it("draws the ring of strips, hidden from screen readers, and a tap skips it", async () => {
    const onDone = jest.fn();
    await render(<LaunchAnimation onDone={onDone} />);
    for (const i of RING.keys()) expect(screen.getByTestId(`launch-strip-${i}`, { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId("launch-logo-fan", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId("launch-logo-word", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId("launch", { includeHiddenElements: true })).toHaveProp("accessibilityElementsHidden", true);
    await fireEvent.press(screen.getByLabelText("Skip", { includeHiddenElements: true }));
    expect(onDone).toHaveBeenCalled();
  });

  it("hands over to the app when it has played", async () => {
    const onDone = jest.fn();
    await render(<LaunchAnimation onDone={onDone} />);
    await waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: TIMES.end + 2000 });
  });

  it("is not shown at all with reduce motion on", async () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const onDone = jest.fn();
    await render(<LaunchAnimation onDone={onDone} />);
    expect(screen.queryByTestId("launch", { includeHiddenElements: true })).toBeNull();
    expect(onDone).toHaveBeenCalled();
  });
});
