import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkFlow } from "@/components/WorkFlow";
import { illustrations } from "@/config/images";
import { workFlow } from "@/config/site";

// "How the work gets done" is drawn three ways (phone timeline, tablet tickets with a booking tile,
// desktop columns) from one markup; these check what every layout shares: one heading, one ordered
// list holding only the steps, one button, and decoration kept out of the accessible text.

const cta = { href: "#book-visit", label: "Book a site visit" };

describe("WorkFlow responsive markup", () => {
  it("keeps the steps as one ordered list, in order, with nothing else inside it", () => {
    render(<WorkFlow cta={cta} />);
    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(1);
    expect(lists[0].tagName).toBe("OL");
    const items = within(lists[0]).getAllByRole("listitem");
    expect(items).toHaveLength(workFlow.length);
    items.forEach((li, i) => {
      expect(within(li).getByRole("heading", { level: 3 })).toHaveTextContent(workFlow[i].title);
      expect(li).toHaveTextContent(workFlow[i].text);
    });
    // the booking tile shares the grid on tablets but is not a step
    expect(within(lists[0]).queryByRole("link")).toBeNull();
    expect(within(lists[0]).queryByText("Aap ready, hum ready.")).toBeNull();
  });

  it("has one heading with one italic accent, and the toolbox illustration beside it", () => {
    render(<WorkFlow cta={cta} />);
    const h2 = screen.getByRole("heading", { level: 2, name: "How the work gets done" });
    expect(h2.querySelectorAll("em")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("region", { name: "How the work gets done" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: illustrations.toolbox.alt })).toBeInTheDocument();
  });

  it("numbers each step for the eye only: the dots and the timeline rail are hidden from screen readers", () => {
    render(<WorkFlow />);
    const items = screen.getAllByRole("listitem");
    items.forEach((li, i) => {
      const hidden = li.querySelectorAll("[aria-hidden]");
      expect(hidden.length).toBeGreaterThanOrEqual(1);
      expect(hidden[0]).toHaveTextContent(String(i + 1));
      for (const el of hidden) expect(el).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("renders the button once, after the list, with the tablet tile's line beside it", () => {
    render(<WorkFlow cta={cta} />);
    const links = screen.getAllByRole("link", { name: "Book a site visit" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "#book-visit");
    const tile = links[0].parentElement!;
    expect(within(tile).getByText("Aap ready, hum ready.")).toBeInTheDocument();
    // the tile follows the list, so reading order is: steps, then the call to action
    const list = screen.getByRole("list");
    expect(list.compareDocumentPosition(tile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("drops the button and the tile when no cta is given", () => {
    render(<WorkFlow />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText("Aap ready, hum ready.")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(workFlow.length);
  });

  it("places the tile in the empty slot after an odd number of steps, and on a row of its own after an even number", () => {
    const { unmount } = render(<WorkFlow cta={cta} />);
    const oddTile = screen.getByRole("link").parentElement!;
    expect(oddTile.className).toContain("col-start-2");
    expect(oddTile.className).not.toContain("col-span-full");
    unmount();

    render(<WorkFlow cta={cta} steps={workFlow.slice(0, 4)} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    const evenTile = screen.getByRole("link").parentElement!;
    expect(evenTile.className).toContain("col-span-full");
    expect(evenTile.className).not.toContain("col-start-2");
  });

  it("shows a step's own picture in a box that reserves its space, beside the step's text", () => {
    const step = { title: "Preparation", text: "Cracks filled.", image: { src: "/flow/prep.png", alt: "Painter filling a crack in a wall in Agra" } };
    render(<WorkFlow steps={[step, { title: "Painting", text: "Two coats." }]} />);
    const [withImage, without] = screen.getAllByRole("listitem");
    const img = within(withImage).getByRole("img", { name: step.image.alt });
    expect(img.parentElement!.className).toContain("aspect-[4/3]");
    expect(within(without).queryByRole("img")).toBeNull();
  });
});
