import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";
import type { SharedValue } from "react-native-reanimated";

import { BeforeAfter, bookShadeHref, clampSplit, FRAME_RATIO, isNearWhite, isSideways, previewShades, STEP } from "~/components/colours/BeforeAfter";
import { palettes } from "~/shared";
import { skiaImages } from "./skia-mock";
import { drag } from "./touch";

jest.mock("@shopify/react-native-skia", () => require("./skia-mock"));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

type Clip = { x: number; y: number; width: number; height: number };
const W = 350;
const H = W / FRAME_RATIO;
const pepper = previewShades[0];
const second = previewShades[1];

const frame = () => screen.getByTestId("before-after");
const touch = () => screen.getByTestId("before-after-touch");
/** Renders the slider at its size and lets a frame pass, so the drawing follows the size. */
const laidOut = async () => {
  await render(<BeforeAfter />);
  await fireEvent(frame(), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: W, height: H } } });
  await act(() => new Promise((r) => setTimeout(r, 50)));
};
/** The repainted part of the room: the clip the tint is drawn in. */
const clip = () => (screen.getByTestId("skia-group").props.skia as { clip: SharedValue<Clip> }).clip.value;
/** Lets an eased change run its course. */
const settle = () => act(() => new Promise((r) => setTimeout(r, 500)));

beforeEach(() => {
  jest.clearAllMocks();
  skiaImages.loaded = true;
});

describe("the colour preview slider", () => {
  it("shows the room half as photographed, half repainted, once it has a size", async () => {
    await render(<BeforeAfter />);
    expect(screen.queryByTestId("skia-canvas")).toBeNull();
    expect(frame()).toHaveStyle({ aspectRatio: FRAME_RATIO });
    await fireEvent(frame(), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: W, height: H } } });
    // a second identical layout changes nothing
    await fireEvent(frame(), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: W, height: H } } });
    const [photo, tint] = screen.getAllByTestId("skia-image");
    expect(photo.props.skia).toMatchObject({ fit: "cover", width: W, height: H });
    expect(tint.props.skia).toMatchObject({ blendMode: "multiply", fit: "cover", width: W });
    expect(clip()).toEqual({ x: W / 2, y: 0, width: W / 2, height: H });
    const colour = screen.getByTestId("skia-blend-color").props.skia as { color: SharedValue<string>; mode: string };
    expect(colour.mode).toBe("srcIn");
    expect(colour.color.value).toBe(pepper.hex);
    expect(screen.getByText("As photographed")).toBeOnTheScreen();
    expect(screen.getByText("Repainted")).toBeOnTheScreen();
  });

  it("draws nothing until the photo and mask load", async () => {
    skiaImages.loaded = false;
    await laidOut();
    expect(screen.queryByTestId("skia-canvas")).toBeNull();
    expect(screen.getByTestId("before-after-divider")).toBeOnTheScreen();
  });

  it("follows a sideways drag, within the frame, and leaves vertical swipes to the page", async () => {
    await laidOut();
    // a swipe down the photo scrolls the page instead
    expect(await drag(touch(), [[2, 20]])).toBe(false);
    expect(clip().x).toBe(W / 2);

    // dragged 70pt to the left from where the finger was taken: more of the room repainted
    expect(
      await drag(touch(), [
        [-10, 0],
        [-40, 2],
        [-80, 3],
      ]),
    ).toBe(true);
    expect(clip().x).toBeCloseTo(W / 2 - 70);
    expect(frame()).toHaveAccessibilityValue({ min: 0, max: 100, now: 70, text: "70% repainted" });

    // never past the frame's edge
    await drag(touch(), [
      [20, 0],
      [600, 0],
    ]);
    expect(clip().x).toBe(W);
    expect(frame()).toHaveAccessibilityValue({ now: 0 });
  });

  it("keeps the drag once it is sideways, and settles if the system takes it", async () => {
    await laidOut();
    expect(touch().props.onResponderTerminationRequest()).toBe(false);
    await act(async () => touch().props.onResponderTerminate({ touchHistory: {} }));
    expect(frame()).toHaveAccessibilityValue({ now: 50 });
  });

  it("is an adjustable control for screen readers, a step at a time, within 0 and 100", async () => {
    await laidOut();
    const room = screen.getByRole("adjustable");
    expect(room).toHaveAccessibleName(`Colour preview on an example room: on the left as photographed, on the right with the walls repainted in ${pepper.name}, Asian Paints ${pepper.code}`);
    expect(room.props.accessibilityHint).toBe("Swipe up or down to show more or less of the repainted room.");
    expect(room).toHaveAccessibilityValue({ now: 50, text: "50% repainted" });
    await fireEvent(room, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(room).toHaveAccessibilityValue({ now: 50 + STEP });
    await settle();
    expect(clip().x).toBeCloseTo(W * 0.4);
    for (let i = 0; i < 8; i++) await fireEvent(room, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(room).toHaveAccessibilityValue({ now: 100 });
    for (let i = 0; i < 12; i++) await fireEvent(room, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(room).toHaveAccessibilityValue({ now: 0 });
  });

  it("repaints in the chosen shade and books an inspection with it", async () => {
    await laidOut();
    const chips = within(screen.getByLabelText("Wall colours"));
    for (const s of previewShades) expect(chips.getByRole("button", { name: `${s.name} ${s.code}` })).toBeOnTheScreen();
    expect(chips.getByRole("button", { name: `${pepper.name} ${pepper.code}` })).toBeSelected();

    await fireEvent.press(chips.getByRole("button", { name: `${second.name} ${second.code}` }));
    expect(chips.getByRole("button", { name: `${second.name} ${second.code}` })).toBeSelected();
    expect(chips.getByRole("button", { name: `${pepper.name} ${pepper.code}` })).not.toBeSelected();
    await settle();
    expect((screen.getByTestId("skia-blend-color").props.skia as { color: SharedValue<string> }).color.value).toMatch(/^(#fee19d|rgba\(254, 225, 157, 1\))$/i);
    expect(screen.getByRole("adjustable")).toHaveAccessibleName(new RegExp(`repainted in ${second.name}, Asian Paints ${second.code}$`));
    expect(screen.getByText(new RegExp(`recoloured on screen, in ${second.name}, Asian Paints ${second.code}`))).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Book an inspection with this shade" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/book", params: { shade: second.id } });
  });

  it("says plainly that it is a preview on an example room, not a finished job", async () => {
    await laidOut();
    expect(screen.getByText(/^A colour preview on an example room, not a finished job of ours\. Only the walls of this stock photo are recoloured/)).toBeOnTheScreen();
  });

  it("takes its own list of shades", async () => {
    await render(<BeforeAfter shades={[second]} />);
    expect(screen.getByRole("button", { name: `${second.name} ${second.code}` })).toBeSelected();
    expect(screen.queryByRole("button", { name: `${pepper.name} ${pepper.code}` })).toBeNull();
  });
});

describe("the slider's shades and arithmetic", () => {
  it("offers the palettes' feature walls, each once, without the near-whites", () => {
    const features = palettes.map((p) => p.shades[0]);
    expect(previewShades.length).toBeGreaterThanOrEqual(4);
    expect(new Set(previewShades.map((s) => s.id)).size).toBe(previewShades.length);
    for (const s of previewShades) {
      const f = features.find((x) => x.id === s.id)!;
      expect(f).toBeDefined();
      expect(s).toMatchObject({ code: f.code, hex: f.hex, brandName: f.brandName });
      expect(s.name).not.toMatch(/-n$/);
      expect(isNearWhite(s.hex)).toBe(false);
    }
    expect(previewShades[0].name).toBe("Pepper Leaf");
    expect(previewShades.some((s) => s.name === "Sharp Navy")).toBe(true);
    expect(previewShades.some((s) => s.code === "L146")).toBe(false);
  });

  it("tells near-whites, sideways drags and the frame's bounds", () => {
    expect(isNearWhite("#f7f1e7")).toBe(true);
    expect(isNearWhite("#fee19d")).toBe(false);
    expect(isSideways(10, 4)).toBe(true);
    expect(isSideways(5, 0)).toBe(false);
    expect(isSideways(10, 12)).toBe(false);
    expect(clampSplit(-0.2)).toBe(0);
    expect(clampSplit(1.4)).toBe(1);
    expect(clampSplit(0.3)).toBe(0.3);
    expect(bookShadeHref({ id: "asian-paints:8386" })).toBe("/book?shade=asian-paints%3A8386");
  });
});
