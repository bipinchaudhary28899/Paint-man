import { act, renderHook } from "@testing-library/react-native";
import { Keyboard, TextInput } from "react-native";
import { makeMutable } from "react-native-reanimated";

import { FIELD_GAP, scrollToClear, useKeyboardRoom } from "~/components/site/useKeyboardRoom";

// Android draws the app under the keyboard: the page takes the keyboard's height off its bottom and
// brings the focused field above it. Here the keyboard's events are fired by hand and the focused
// field answers where it is.

type Listener = (e: { endCoordinates: { height: number } }) => void;

const VIEWPORT = 852;
const HEADER = 73;

async function setup(os: "android" | "ios" = "android") {
  const listeners: Record<string, Listener> = {};
  const removed: string[] = [];
  jest.spyOn(Keyboard, "addListener").mockImplementation(((event: string, fn: Listener) => {
    listeners[event] = fn;
    return { remove: () => removed.push(event) };
  }) as never);
  const scrollTo = jest.fn();
  const scrollY = makeMutable(400);
  // the page's refs: the same objects from render to render
  const scrollRef = { current: { scrollTo } };
  const contentRef = { current: {} as never };
  const hook = await renderHook(() => useKeyboardRoom({ scrollRef, contentRef, scrollY, headerHeight: HEADER, viewport: VIEWPORT, os }));
  return { hook, listeners, removed, scrollTo, scrollY };
}

/** The focused field: `y` and `h` in page-content coordinates (or none). */
const focusField = (field: { y: number; h: number } | null) =>
  jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue(
    (field && { measureLayout: (_c: unknown, ok: (x: number, y: number, w: number, h: number) => void) => ok(0, field.y, 350, field.h) }) as never,
  );

/** Lets the two frames after the keyboard opens run. */
const frames = () => act(() => new Promise((r) => setTimeout(r, 60)));

afterEach(() => jest.restoreAllMocks());

describe("scrollToClear", () => {
  it("is how far a field's bottom sits below the keyboard's top, less the gap; 0 when it is clear", () => {
    expect(scrollToClear(923, VIEWPORT, 300)).toBe(923 - (VIEWPORT - 300 - FIELD_GAP));
    expect(scrollToClear(400, VIEWPORT, 300)).toBe(0);
  });
});

describe("useKeyboardRoom on Android", () => {
  it("takes the keyboard's height while it is up and scrolls a hidden field above it", async () => {
    focusField({ y: 1200, h: 50 });
    const { hook, listeners, scrollTo } = await setup();
    expect(hook.result.current).toBe(0);
    await act(() => listeners.keyboardDidShow({ endCoordinates: { height: 300 } }));
    expect(hook.result.current).toBe(300);
    await frames();
    // the field ends 1200 + 50 + 73 - 400 = 923pt down the screen; it must end FIELD_GAP above the keyboard
    expect(scrollTo).toHaveBeenCalledWith({ y: 400 + scrollToClear(923, VIEWPORT, 300), animated: true });
    await act(() => listeners.keyboardDidHide({ endCoordinates: { height: 0 } }));
    expect(hook.result.current).toBe(0);
  });

  it("leaves the page where it is when the field already shows, or nothing has focus", async () => {
    focusField({ y: 300, h: 50 });
    const { listeners, scrollTo } = await setup();
    await act(() => listeners.keyboardDidShow({ endCoordinates: { height: 300 } }));
    await frames();
    focusField(null);
    await act(() => listeners.keyboardDidShow({ endCoordinates: { height: 320 } }));
    await frames();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("stops listening when the page goes", async () => {
    const { hook, removed } = await setup();
    await hook.unmount();
    expect(removed.sort()).toEqual(["keyboardDidHide", "keyboardDidShow"]);
  });
});

describe("useKeyboardRoom on iOS", () => {
  it("does nothing: the scroll view keeps fields in view itself", async () => {
    const { hook, listeners } = await setup("ios");
    expect(listeners).toEqual({});
    expect(hook.result.current).toBe(0);
  });
});
