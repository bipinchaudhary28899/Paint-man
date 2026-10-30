import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FaqList } from "@/components/FaqList";
import { AreaLinks } from "@/components/home/AreaLinks";
import { AreasSection } from "@/components/home/AreasSection";
import { FaqSection } from "@/components/home/FaqSection";
import { collageTiles, Finishes } from "@/components/home/Finishes";
import { images } from "@/config/images";
import { areaSlug, generalFaqs, homeCity } from "@/config/site";

/** The grid area a tile takes in one layout: phones read the plain classes, tablets up the `tab:` ones over them. */
function area(place: string, layout: "phone" | "tab") {
  const classes = place.split(" ");
  const pick = (name: string, fallback: number) => {
    const read = (prefix: string) => classes.find((c) => c.startsWith(`${prefix}${name}-`))?.slice(prefix.length + name.length + 1);
    return Number((layout === "tab" ? read("tab:") : undefined) ?? read("") ?? fallback);
  };
  const shown = layout === "tab" ? classes.includes("tab:block") || !classes.includes("hidden") : !classes.includes("hidden");
  return { shown, col: pick("col-start", NaN), cols: pick("col-span", 1), row: pick("row-start", NaN), rows: pick("row-span", 1) };
}

describe("Finishes (home)", () => {
  it("has one h2 with one italic accent and says the photos are examples, not our jobs", () => {
    render(<Finishes />);
    const heading = screen.getByRole("heading", { level: 2, name: "The finish we work to." });
    expect(heading.querySelectorAll("em")).toHaveLength(1);
    expect(screen.getByText(/example photos of painting across India\. Photos of our own jobs are added/)).toBeInTheDocument();
  });

  it("lists the collage photos, painting in India, each with its descriptive alt", () => {
    render(<Finishes />);
    const list = screen.getByRole("list", { name: "Example photos of painting in India" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(collageTiles.length);
    const alts = within(list).getAllByRole("img").map((p) => p.getAttribute("alt"));
    expect(alts).toEqual(collageTiles.flatMap((t) => t.pieces.map((p) => p.image.alt)));
    expect(new Set(alts).size).toBe(alts.length);
    expect(alts).toContain(images.uniformSpraying.alt);
  });

  it("cuts the photos into shapes: one-corner, triangles, a disc and its bite, a leaf, a quarter circle, an arch", () => {
    const { container } = render(<Finishes />);
    for (const shape of ["shape-tri-high", "shape-tri-low", "shape-disc", "shape-bite", "rounded-t-full"]) {
      expect(container.querySelectorAll(`.collage-piece.${shape}`), shape).toHaveLength(1);
    }
    expect(container.querySelectorAll(".collage-piece")).toHaveLength(collageTiles.flatMap((t) => t.pieces).length);
  });

  it("gives every piece its place in the hover wave, left to right", () => {
    const { container } = render(<Finishes />);
    const tiles = [...container.querySelectorAll<HTMLElement>(".collage > li")];
    tiles.forEach((li, i) => expect(li.style.getPropertyValue("--wave")).toBe(String(collageTiles[i].wave)));
    // the two pieces of a pair rise one after the other
    const pair = collageTiles.find((t) => t.pieces.length === 2)!;
    expect(pair.pieces[0].wave).toBeLessThan(pair.pieces[1].wave!);
  });

  it.each([
    ["phone", 2, 5],
    ["tab", 6, 3],
  ] as const)("fills its %s grid (%i by %i) exactly, with no gaps or overlaps", (layout, cols, rows) => {
    const taken = new Map<string, number>();
    for (const [i, t] of collageTiles.entries()) {
      const a = area(t.place, layout);
      if (!a.shown) continue;
      for (let c = a.col; c < a.col + a.cols; c++) {
        for (let r = a.row; r < a.row + a.rows; r++) {
          expect(c >= 1 && c <= cols && r >= 1 && r <= rows, `tile ${i} at ${c},${r}`).toBe(true);
          expect(taken.has(`${c},${r}`), `tile ${i} overlaps at ${c},${r}`).toBe(false);
          taken.set(`${c},${r}`, i);
        }
      }
    }
    expect(taken.size).toBe(cols * rows);
  });
});

describe("AreasSection and AreaLinks (home)", () => {
  it("lists every live city under its own heading, each locality linking to its anchor on that city's page", async () => {
    const { liveCities, cityPath } = await import("@/config/site");
    render(<AreasSection />);
    expect(screen.getByRole("heading", { level: 2, name: "Painting homes across Agra, Mathura and Vrindavan" })).toBeInTheDocument();
    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(liveCities().length);
    liveCities().forEach((c, i) => {
      expect(screen.getByRole("heading", { level: 3, name: c.name })).toContainElement(screen.getByRole("link", { name: c.name }));
      expect(screen.getByRole("link", { name: c.name })).toHaveAttribute("href", cityPath(c));
      const links = within(lists[i]).getAllByRole("link");
      expect(links).toHaveLength(c.areas.length);
      c.areas.forEach((a, j) => {
        expect(links[j]).toHaveAccessibleName(`Painters in ${a}`);
        expect(links[j]).toHaveAttribute("href", `${cityPath(c)}#${areaSlug(a)}`);
      });
    });
  });

  it("shows the phone 'Painters in' label once, hidden from screen readers (the links already say it)", () => {
    const { container } = render(<AreasSection />);
    const label = [...container.querySelectorAll("p")].find((p) => p.textContent === "Painters in")!;
    expect(label).toHaveAttribute("aria-hidden");
  });

  it("keeps a real space between 'Painters in' and the locality in the chip text", () => {
    render(<AreaLinks city={homeCity} />);
    expect(screen.getAllByRole("link")[0].textContent).toBe(`Painters in ${homeCity.areas[0]}`);
  });
});

describe("FaqSection (home)", () => {
  it("shows the heading, the note and every general FAQ as a question heading", () => {
    render(<FaqSection />);
    const section = screen.getByRole("region", { name: "Good questions." });
    expect(section).toHaveAttribute("id", "faq");
    expect(screen.getByText(/Our inspector answers it on the site visit/)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(generalFaqs.map((f) => f.q));
  });

  it("opens the first question only", () => {
    render(<FaqSection />);
    const [first, ...rest] = screen.getAllByRole("heading", { level: 3 }).map((h) => h.closest("details")!);
    expect(first).toHaveAttribute("open");
    for (const d of rest) expect(d).not.toHaveAttribute("open");
  });
});

describe("FaqList", () => {
  it("toggles an answer and keeps its follow-up link", async () => {
    render(<FaqList faqs={[{ q: "Where?", a: "Across the city.", link: { href: "/services/house-painting/agra#localities", label: "See the areas" } }]} />);
    const details = screen.getByRole("heading", { name: "Where?" }).closest("details")!;
    expect(details).not.toHaveAttribute("open");
    await userEvent.setup().click(screen.getByText("Where?"));
    expect(details).toHaveAttribute("open");
    expect(screen.getByRole("link", { name: /See the areas/ })).toHaveAttribute("href", "/services/house-painting/agra#localities");
  });
});
