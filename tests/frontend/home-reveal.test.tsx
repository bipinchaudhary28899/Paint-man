import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PinnedReveal, stages, wallShade } from "@/components/home/PinnedReveal";

// The shared setup drops `sizes`; keep it here so the room photo's per-screen sizes can be checked.
vi.mock("next/image", async () => {
  const actual = await vi.importActual<typeof import("next/image")>("next/image");
  return {
    ...actual,
    default: ({ src, alt, fill: _fill, priority: _priority, preload: _preload, ...rest }: Record<string, unknown>) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={String(src)} alt={String(alt ?? "")} {...rest} />
    ),
  };
});

// jsdom has no CSS scroll timelines, so the reveal takes its JS fallback unless CSS.supports says yes.
function setSupports(value: boolean) {
  Object.defineProperty(globalThis, "CSS", { configurable: true, value: { supports: () => value } });
}
afterEach(() => {
  // @ts-expect-error test cleanup
  delete globalThis.CSS;
});

/** The decorative rule at the top of each stage (the phone strip's active-stage marker). */
const rules = (list: HTMLElement) =>
  within(list).getAllByRole("listitem").map((li) => li.querySelector(":scope > span[aria-hidden]") as HTMLElement);

describe("PinnedReveal on every screen", () => {
  it("is a labelled region with one h2 carrying one italic accent, and no h1", () => {
    render(<PinnedReveal />);
    const region = screen.getByRole("region", { name: "Watch the colour go on" });
    expect(within(region).queryByRole("heading", { level: 1 })).toBeNull();
    const headings = within(region).getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveProperty("tagName", "H2");
    expect(headings[0]).toHaveTextContent("Watch the colour go on.");
    expect(headings[0].querySelectorAll("em")).toHaveLength(1);
    expect(within(region).getByText("How a wall changes")).toBeInTheDocument();
    expect(region).toHaveTextContent("Every stage is on your quotation before a brush touches them.");
  });

  it("lists the four stages once, in order, each with its number, title and what happens", () => {
    render(<PinnedReveal />);
    const region = screen.getByRole("region", { name: "Watch the colour go on" });
    const lists = within(region).getAllByRole("list");
    expect(lists).toHaveLength(1);
    const items = within(lists[0]).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    items.forEach((li, i) => {
      expect(li).toHaveTextContent(`0${i + 1}`);
      expect(within(li).getByText(stages[i].title).tagName).toBe("STRONG");
      expect(li).toHaveTextContent(stages[i].text);
    });
    expect(screen.getAllByText("Prep & putty")).toHaveLength(1);
  });

  it("shows the room at 560px on desktop, 360px on tablets and full width on phones, and credits the shade", () => {
    render(<PinnedReveal />);
    const photo = screen.getByAltText(`Living room with the walls being painted ${wallShade.name}`);
    expect(photo).toHaveAttribute("sizes", "(min-width: 1080px) 560px, (min-width: 721px) 360px, 100vw");
    expect(screen.getByText(/Walls in Pepper Leaf,/)).toHaveTextContent("Walls in Pepper Leaf, Asian Paints 8386");
  });

  it("marks the finished stage by default where CSS drives the reveal (no inline styles)", async () => {
    setSupports(true);
    render(<PinnedReveal />);
    await act(async () => {});
    const marks = rules(screen.getByRole("list"));
    expect(marks).toHaveLength(4);
    marks.forEach((m) => {
      expect(m).toHaveAttribute("aria-hidden", "true");
      expect(m.getAttribute("style")).toBeNull();
    });
    // Without scroll the walls are finished, so the last stage's marker is the one showing
    expect(marks.map((m) => m.classList.contains("opacity-100"))).toEqual([false, false, false, true]);
  });

  it("moves the active-stage marker with the scroll in the JS fallback", async () => {
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { cb(0); return 1; });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    const { container } = render(<PinnedReveal />);
    await act(async () => {});
    const track = screen.getByRole("region", { name: "Watch the colour go on" });
    const panel = container.querySelector(".pin-panel") as HTMLElement;
    track.getBoundingClientRect = () => ({ top: -1200, height: 2400, width: 1000, left: 0, right: 1000, bottom: 1200, x: 0, y: -1200, toJSON: () => ({}) });
    Object.defineProperty(panel, "offsetHeight", { configurable: true, value: 800 });
    await act(async () => { window.dispatchEvent(new Event("scroll")); });

    // 1200 of 1600px scrolled → 75% → the first coat is going on
    const marks = rules(screen.getByRole("list"));
    expect(marks.map((m) => m.style.opacity)).toEqual(["0", "0", "1", "0"]);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((li) => li.style.opacity)).toEqual(["0.55", "0.55", "1", "0.3"]);
    raf.mockRestore();
  });
});
