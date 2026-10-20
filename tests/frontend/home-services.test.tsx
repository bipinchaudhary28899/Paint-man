import { act, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessSection } from "@/components/home/ProcessSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { services } from "@/config/site";

/** jsdom has no layout: give the swipe row the widths a phone (or a tablet) would report. */
function layOut({ client, scroll }: { client: number; scroll: number }) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("swipe") ? client : 0;
  });
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("swipe") ? scroll : 0;
  });
}

beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 1;
  });
});

afterEach(() => vi.restoreAllMocks());

describe("Services on the home page (phone rows, tablet side cards, desktop grid)", () => {
  it("has one h2 and a card per service, each linking to its hub with its name as an h3", () => {
    render(<ServicesSection />);
    const section = document.getElementById("services")!;
    expect(within(section).getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(within(section).getByRole("heading", { level: 2, name: "Every wall in the house." })).toBeInTheDocument();
    const names = within(section).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(services.map((s) => s.name));
    for (const s of services) {
      const card = within(section).getByRole("link", { name: new RegExp(s.name.replace(/[&,]/g, ".")) });
      expect(card).toHaveAttribute("href", `/services/${s.slug}`);
      expect(card).toHaveTextContent(s.intro);
    }
  });

  it("gives every service a tag, including doors and windows, and a photo with descriptive alt text", () => {
    render(<ServicesSection />);
    const door = services.find((s) => s.slug === "door-window-painting")!;
    const card = screen.getByRole("link", { name: /Doors, Windows/ });
    // The tag appears beside the name (phones, tablets) and over the photo (desktop); one is display:none.
    expect(within(card).getAllByText("Doors & windows")).toHaveLength(2);
    expect(within(card).getByRole("img")).toHaveAttribute("alt", door.image.alt);
    for (const img of screen.getAllByRole("img")) expect(img.getAttribute("alt")).not.toBe("");
  });

  it("ends with the All services link to the services index", () => {
    render(<ServicesSection />);
    expect(screen.getByRole("link", { name: "All services" })).toHaveAttribute("href", "/services");
  });
});

describe("Process on the home page (phone swipe row, tablet table, desktop columns)", () => {
  it("keeps one h2 with one italic accent and the five steps in order as h3s", () => {
    render(<ProcessSection />);
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toHaveTextContent("From enquiry to fresh walls in five steps.");
    expect(h2.querySelectorAll("em")).toHaveLength(1);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    items.forEach((item, i) => expect(item).toHaveTextContent(`0${i + 1}`));
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Request an estimate",
      "Inspection & measuring",
      "Itemised quotation",
      "Supervised painting",
      "Walkthrough & handover",
    ]);
  });

  it("makes the steps a labelled, focusable swipe region while the row scrolls (phones)", () => {
    layOut({ client: 390, scroll: 1150 });
    render(<ProcessSection />);
    const row = screen.getByRole("region", { name: "Five steps, swipe for more" });
    expect(row).toHaveAttribute("tabindex", "0");
    expect(within(row).getByRole("list")).toBeInTheDocument();
  });

  it("drops the region and the tab stop where the steps fit (tablet table, desktop), and re-checks on resize", () => {
    layOut({ client: 770, scroll: 770 });
    render(<ProcessSection />);
    expect(screen.queryByRole("region", { name: "Five steps, swipe for more" })).not.toBeInTheDocument();
    expect(document.querySelector(".swipe")).not.toHaveAttribute("tabindex");

    vi.restoreAllMocks();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    layOut({ client: 390, scroll: 1150 });
    act(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.getByRole("region", { name: "Five steps, swipe for more" })).toHaveAttribute("tabindex", "0");
  });

  it("throttles resize checks to one per frame and stops listening when removed", () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    layOut({ client: 770, scroll: 770 });
    const { unmount } = render(<ProcessSection />);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("resize"));
    });
    expect(frames).toHaveLength(1);
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it("shows the two job photos with captions and descriptive alt text", () => {
    render(<ProcessSection />);
    const figures = screen.getAllByRole("figure");
    expect(figures).toHaveLength(2);
    expect(figures[0]).toHaveTextContent("On site: the brand and finish you approved");
    expect(figures[1]).toHaveTextContent("Shade cards brought to your home at the inspection");
    for (const img of screen.getAllByRole("img")) expect(img.getAttribute("alt")).toBeTruthy();
  });
});
