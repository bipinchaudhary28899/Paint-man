import { act, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ColourExplorer } from "@/components/home/ColourExplorer";
import { ParallaxChips } from "@/components/home/ParallaxChips";
import { PinnedReveal } from "@/components/home/PinnedReveal";
import { prefersReducedMotion, supportsScrollTimeline, useNeedsJsScroll, useScrollFrame } from "@/lib/scroll";

// jsdom has neither CSS scroll timelines nor matchMedia, so by default components take the
// JS fallback path. These tests flip the feature checks to cover the CSS path too.

function setSupports(value: boolean) {
  Object.defineProperty(globalThis, "CSS", { configurable: true, value: { supports: () => value } });
}
function setReducedMotion(value: boolean) {
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: value }) });
}

afterEach(() => {
  // @ts-expect-error test cleanup
  delete globalThis.CSS;
  // @ts-expect-error test cleanup
  delete window.matchMedia;
});

describe("feature checks", () => {
  it("detects scroll timelines and reduced motion through the platform APIs", () => {
    setSupports(false);
    expect(supportsScrollTimeline()).toBe(false);
    setSupports(true);
    expect(supportsScrollTimeline()).toBe(true);
    expect(prefersReducedMotion()).toBe(false);
    setReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("needs JS only when CSS cannot do it and motion is allowed", async () => {
    const { result, rerender } = renderHook(() => useNeedsJsScroll());
    await act(async () => rerender());
    expect(result.current).toBe(true);

    setSupports(true);
    const css = renderHook(() => useNeedsJsScroll());
    await act(async () => css.rerender());
    expect(css.result.current).toBe(false);

    setSupports(false);
    setReducedMotion(true);
    const still = renderHook(() => useNeedsJsScroll());
    await act(async () => still.rerender());
    expect(still.result.current).toBe(false);
  });
});

describe("useScrollFrame", () => {
  it("runs once on mount and then at most once per animation frame while scrolling", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { cb(0); return 1; });
    const frame = vi.fn();
    const { unmount } = renderHook(() => useScrollFrame(frame, true));
    expect(frame).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    expect(frame).toHaveBeenCalledTimes(3);
    unmount();
    window.dispatchEvent(new Event("scroll"));
    expect(frame).toHaveBeenCalledTimes(3);
    raf.mockRestore();
  });

  it("coalesces scroll events that land before the next frame", () => {
    let pending: FrameRequestCallback | null = null;
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { pending = cb; return 1; });
    const frame = vi.fn();
    renderHook(() => useScrollFrame(frame, true));
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    expect(frame).toHaveBeenCalledTimes(1);
    act(() => pending?.(16));
    expect(frame).toHaveBeenCalledTimes(2);
    raf.mockRestore();
  });

  it("does nothing when disabled", () => {
    const frame = vi.fn();
    renderHook(() => useScrollFrame(frame, false));
    window.dispatchEvent(new Event("scroll"));
    expect(frame).not.toHaveBeenCalled();
  });
});

describe("home effects in a browser with CSS scroll timelines", () => {
  it("renders without inline fallback styles", async () => {
    setSupports(true);
    const { container } = render(
      <>
        <ParallaxChips />
        <PinnedReveal />
        <ColourExplorer />
      </>,
    );
    await act(async () => {});
    expect(container.querySelector("[data-js]")).toBeNull();
    expect((container.querySelector(".pin-after") as HTMLElement).style.clipPath).toBe("");
    expect((container.querySelector(".wheel") as HTMLElement).style.transform).toBe("");
    expect((container.querySelector(".chip-bg") as HTMLElement).style.transform).toBe("");
  });

  it("falls back to JS and applies the progress inline when scroll timelines are missing", async () => {
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { cb(0); return 1; });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 500 });
    const { container } = render(
      <>
        <ParallaxChips />
        <PinnedReveal />
        <ColourExplorer />
      </>,
    );
    await act(async () => {});
    const track = container.querySelector(".pin-track") as HTMLElement;
    const panel = container.querySelector(".pin-panel") as HTMLElement;
    track.getBoundingClientRect = () => ({ top: -1200, height: 2400, width: 1000, left: 0, right: 1000, bottom: 1200, x: 0, y: -1200, toJSON: () => ({}) });
    Object.defineProperty(panel, "offsetHeight", { configurable: true, value: 800 });
    // the wheel's own box: top at the top of an 800px screen, 800 tall → halfway across → 90°
    const wheelBox = container.querySelector(".wheel-wrap") as HTMLElement;
    wheelBox.getBoundingClientRect = () => ({ top: 0, height: 800, width: 1000, left: 0, right: 1000, bottom: 800, x: 0, y: 0, toJSON: () => ({}) });
    await act(async () => { window.dispatchEvent(new Event("scroll")); });

    expect(track).toHaveAttribute("data-js", "true");
    expect(track.style.height).toBe("300vh");
    // p = 1200 / 1600 = 0.75 → eased 0.875 → clip top 12.5%
    expect((container.querySelector(".pin-after") as HTMLElement).style.clipPath).toBe("inset(12.5% 0 0 0)");
    expect((container.querySelector(".pin-before") as HTMLElement).style.clipPath).toBe("inset(0 0 87.5% 0)");
    expect(container.querySelector(".pin-pct")?.textContent).toBe("88%");
    expect((container.querySelector(".wheel") as HTMLElement).style.transform).toBe("rotate(90deg)");
    expect((container.querySelector(".chip-bg") as HTMLElement).style.transform).toContain("translateY(-60px)");

    // A canvas-like viewport cannot pin: collapse the runway and show 60%
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 2000 });
    await act(async () => { window.dispatchEvent(new Event("resize")); });
    expect(track.style.height).toBe("auto");
    expect(container.querySelector(".pin-pct")?.textContent).toBe("68%");
    raf.mockRestore();
  });
});
