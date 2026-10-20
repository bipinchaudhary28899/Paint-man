import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Promises } from "@/components/Promises";
import { promises } from "@/config/site";

/**
 * Lay the row out as a phone would: the scroller is `client` wide, its content `scroll` wide, and the
 * cards sit `step` px apart (card width + gap). jsdom has no layout, so the browser's numbers are given here.
 */
function layOut({ client, scroll, step }: { client: number; scroll: number; step: number }) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("swipe") ? client : 0;
  });
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("swipe") ? scroll : 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (this: HTMLElement) {
    if (this.tagName !== "LI") return 0;
    return 20 + [...this.parentElement!.children].indexOf(this) * step;
  });
}

function scrollRowTo(row: HTMLElement, left: number) {
  row.scrollLeft = left;
  fireEvent.scroll(row);
}

beforeEach(() => {
  // Run each throttled frame straight away so the counter updates inside the test.
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 1;
  });
});

afterEach(() => vi.restoreAllMocks());

describe("Promises on the home page (phone swipe row, tablet tiles)", () => {
  it("keeps one h2 and every promise as a numbered card in order, the numbers hidden from screen readers", () => {
    render(<Promises />);
    expect(screen.getByRole("heading", { level: 2, name: "What you can count on" })).toBeInTheDocument();
    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(promises.length);
    items.forEach((item, i) => {
      expect(within(item).getByRole("heading", { level: 3 })).toHaveTextContent(promises[i].title);
      expect(item).toHaveTextContent(promises[i].text);
      const number = within(item).getByText(String(i + 1).padStart(2, "0"));
      expect(number).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("shows where the visitor is in the swipe row: the counter follows the scroll to the last card", () => {
    layOut({ client: 390, scroll: 1816, step: 298 });
    render(<Promises />);
    const row = screen.getByRole("region", { name: "Promises, swipe for more" });
    expect(row).toHaveAttribute("tabindex", "0");
    expect(screen.getByText(`1 / ${promises.length}`)).toBeInTheDocument();

    scrollRowTo(row, 596);
    expect(screen.getByText(`3 / ${promises.length}`)).toBeInTheDocument();

    scrollRowTo(row, 870);
    expect(screen.getByText(`4 / ${promises.length}`)).toBeInTheDocument();

    // the end of the row is the last card, even though it cannot snap to the start
    scrollRowTo(row, 1816 - 390);
    expect(screen.getByText(`${promises.length} / ${promises.length}`)).toBeInTheDocument();

    scrollRowTo(row, 0);
    expect(screen.getByText(`1 / ${promises.length}`)).toBeInTheDocument();
  });

  it("is a plain grid with no extra tab stop once nothing scrolls (tablet and desktop)", () => {
    layOut({ client: 1200, scroll: 1200, step: 400 });
    render(<Promises />);
    expect(screen.queryByRole("region", { name: "Promises, swipe for more" })).toBeNull();
    expect(screen.getByRole("list").parentElement).not.toHaveAttribute("tabindex");
    expect(screen.getByText(`1 / ${promises.length}`)).toBeInTheDocument();
  });

  it("re-measures when the window resizes, e.g. a tablet turned to portrait phone width", () => {
    layOut({ client: 1200, scroll: 1200, step: 400 });
    render(<Promises />);
    expect(screen.queryByRole("region", { name: "Promises, swipe for more" })).toBeNull();
    vi.restoreAllMocks();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    layOut({ client: 390, scroll: 1816, step: 298 });
    fireEvent(window, new Event("resize"));
    expect(screen.getByRole("region", { name: "Promises, swipe for more" })).toHaveAttribute("tabindex", "0");
  });

  it("without its heading stays a region named for the promises, with no counter", () => {
    layOut({ client: 390, scroll: 1816, step: 298 });
    render(<Promises heading={false} />);
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(screen.getByRole("region", { name: "What you can count on" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Promises, swipe for more" })).toBeInTheDocument();
    expect(screen.queryByText(`1 / ${promises.length}`)).toBeNull();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(promises.map((p) => p.title));
  });

  it("updates the counter at most once a frame however fast the visitor swipes", () => {
    layOut({ client: 390, scroll: 1816, step: 298 });
    let next: FrameRequestCallback | null = null;
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      next = cb;
      return 1;
    });
    render(<Promises />);
    const row = screen.getByRole("region", { name: "Promises, swipe for more" });
    scrollRowTo(row, 298);
    scrollRowTo(row, 596);
    expect(raf).toHaveBeenCalledTimes(1);
    expect(screen.getByText(`1 / ${promises.length}`)).toBeInTheDocument();
    act(() => next!(0));
    expect(screen.getByText(`3 / ${promises.length}`)).toBeInTheDocument();
  });

  it("stops listening when it leaves the page", () => {
    layOut({ client: 390, scroll: 1816, step: 298 });
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const removed = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Promises />);
    unmount();
    expect(cancel).toHaveBeenCalled();
    expect(removed).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
