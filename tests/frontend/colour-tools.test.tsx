import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColourTools, colourTools } from "@/components/ColourTools";
import { items } from "@/components/MobileCtaBar";
import { palettes } from "@/config/palettes";

describe("ColourTools (every colour feature as cards)", () => {
  it("links the finder, the shade cards, the combinations and a home visit, each with its swatch strip", () => {
    const { container } = render(<ColourTools />);
    const nav = screen.getByRole("navigation", { name: "Colour tools" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/colours", "/shade-cards", "/palettes", "/book"]);
    expect(links[0]).toHaveAccessibleName(/Colour finder.*8,500\+ brand shades/);
    expect(links[2]).toHaveTextContent(`${palettes.length} ready palettes`);
    // the strips are decoration: hidden from assistive tech, painted with the tool's colours
    const strips = container.querySelectorAll("a > span[aria-hidden]");
    expect(strips).toHaveLength(4);
    expect(strips[2].querySelectorAll("span")).toHaveLength(3);
    expect(screen.queryByRole("heading")).toBeNull();
    // four across from tablets up by default
    expect(nav.querySelector("ul")).toHaveClass("tab:grid-cols-4");
  });

  it("marks the page you are on instead of linking to it, and can sit 2 by 2 under a heading", () => {
    render(<ColourTools current="palettes" columns={2} heading="More colour tools" />);
    expect(screen.getByRole("heading", { level: 2, name: "More colour tools" })).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Colour tools" });
    expect(within(nav).getAllByRole("link")).toHaveLength(3);
    const here = within(nav).getByText("You are here").closest("[aria-current]");
    expect(here).toHaveAttribute("aria-current", "page");
    expect(here).toHaveTextContent("Colour combinations");
    expect(nav.querySelector("ul")).not.toHaveClass("tab:grid-cols-4");
    expect(colourTools.map((t) => t.key)).toEqual(["finder", "shade-cards", "palettes", "visit"]);
  });
});

describe("phone bottom nav", () => {
  it("keeps the Colours tab active on the finder, the palettes and every shade-card page", () => {
    const colours = items.find((i) => i.label === "Colours")!;
    for (const p of ["/colours", "/palettes", "/shade-cards", "/shade-cards/berger", "/shade-cards/berger/blue"]) expect(colours.match(p), p).toBe(true);
    const home = items.find((i) => i.label === "Home")!;
    expect(home.match("/shade-cards")).toBe(false);
  });
});
