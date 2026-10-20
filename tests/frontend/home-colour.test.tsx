import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ColourExplorer } from "@/components/home/ColourExplorer";

// The colour explorer has one markup for three layouts (phone: big colour block with a label
// card; tablet: picker beside a ring whose centre is the selected shade; desktop: the full
// wheel). These tests check what every layout shares: one heading, one label card that follows
// the chosen swatch, a ring centre that follows it too, and touch-sized links.

describe("ColourExplorer layouts", () => {
  it("has one h2 with a single italic accent and one selected-shade card", () => {
    render(<ColourExplorer />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Find a shade that feels like you.");
    expect(heading.querySelectorAll("em")).toHaveLength(1);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getAllByText("Selected shade")).toHaveLength(1);
    expect(screen.getByText("Terracotta", { selector: "strong" })).toBeInTheDocument();
  });

  it("moves the label card, the pressed swatch and the ring centre to the tapped shade", async () => {
    const user = userEvent.setup();
    const { container } = render(<ColourExplorer />);
    const centre = container.querySelector("[data-testid='wheel-centre']") as SVGCircleElement;
    expect(centre.style.fill).toMatch(/#C76B4A|rgb\(199, 107, 74\)/i);

    await user.click(screen.getByRole("button", { name: "Lagoon" }));
    expect(screen.getByText("Lagoon", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("#5A9AA6 · Blues")).toBeInTheDocument();
    expect(centre.style.fill).toMatch(/#5A9AA6|rgb\(90, 154, 166\)/i);

    const swatches = within(screen.getByRole("list", { name: "Featured shades" })).getAllByRole("button");
    expect(swatches.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.getAttribute("aria-label"))).toEqual(["Lagoon"]);
  });

  it("keeps the wheel decorative and the two shade links pointing at real pages", () => {
    const { container } = render(<ColourExplorer />);
    expect(container.querySelector(".wheel-wrap")).toHaveAttribute("aria-hidden");
    expect(screen.getByRole("link", { name: /Discuss this shade with us/ })).toHaveAttribute("href", "/book");
    expect(screen.getByRole("link", { name: /Search 8,500\+ brand shades/ })).toHaveAttribute("href", "/colours");
  });
});
