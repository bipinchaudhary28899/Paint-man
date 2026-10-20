import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaintDbCredit, ShadeSwatches, swatchHref, type Swatch } from "@/components/colours/ShadeSwatches";

const mecca: Swatch = { id: "asian-paints:7982", brand: "asian-paints", code: "7982", query: "7982", name: "Mecca Gold", hex: "#e7975b", lrv: 41 };
const noCode: Swatch = { id: "nerolac:absicon", brand: "nerolac", code: null, query: "Absicon", name: "Absicon", hex: "#86acd7", lrv: 39 };

describe("ShadeSwatches", () => {
  it("shows each shade's code, name and LRV as text and opens it in the colour finder", () => {
    render(<ShadeSwatches shades={[mecca]} label="Asian Paints orange shades" />);
    const list = screen.getByRole("list", { name: "Asian Paints orange shades" });
    const link = within(list).getByRole("link");
    expect(link).toHaveAttribute("href", "/colours?brand=asian-paints&q=7982");
    expect(link).toHaveTextContent("7982");
    expect(link).toHaveTextContent("Mecca Gold");
    expect(link).toHaveTextContent("LRV 41");
    expect(link).toHaveAccessibleName(/7982.*Mecca Gold.*LRV 41/);
    // the colour block is decoration; the text carries the shade
    expect(link.querySelector("[aria-hidden]")).toHaveStyle({ backgroundColor: "#e7975b" });
  });

  it("prints only the name for a shade without a real code, and searches the finder by it", () => {
    render(<ShadeSwatches shades={[noCode]} label="Nerolac blue shades" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/colours?brand=nerolac&q=Absicon");
    expect(link).not.toHaveTextContent("absicon");
    expect(swatchHref({ brand: "berger", query: "3P0050" })).toBe("/colours?brand=berger&q=3P0050");
  });
});

describe("PaintDbCredit", () => {
  it("links the source and the licence and carries the note", () => {
    render(<PaintDbCredit source="https://paintdb.com" licenseUrl="https://creativecommons.org/licenses/by/4.0/" note="Not affiliated with any brand." />);
    expect(screen.getByRole("link", { name: "PaintDB" })).toHaveAttribute("href", "https://paintdb.com");
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
    expect(screen.getByText(/Not affiliated with any brand\./)).toBeInTheDocument();
  });
});
