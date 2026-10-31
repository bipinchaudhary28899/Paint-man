import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Diagnose } from "@/components/home/Diagnose";
import { PaintSaathiWay } from "@/components/home/PaintSaathiWay";
import { images } from "@/config/images";
import { site } from "@/config/site";

// The shared setup drops `sizes`; keep it here so the photo's per-screen sizes can be checked.
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

describe("Diagnose", () => {
  it("is a labelled section with one h2 and no h1", () => {
    render(<Diagnose />);
    const section = screen.getByRole("region", { name: "We diagnose first" });
    expect(within(section).queryByRole("heading", { level: 1 })).toBeNull();
    const headings = within(section).getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveProperty("tagName", "H2");
    expect(headings[0]).toHaveTextContent("We diagnose first.");
    expect(section).toHaveTextContent("Hum sirf paint nahi karte.");
    expect(section).toHaveTextContent(/separate lines, so you pay for repairs you can see/);
  });

  it("links to the booking page", () => {
    render(<Diagnose />);
    expect(screen.getByRole("link", { name: "Book a free site visit" })).toHaveAttribute("href", "/book");
  });

  it("shows the photo with its descriptive alt and keeps the wash out of the accessibility tree", () => {
    const { container } = render(<Diagnose />);
    const img = screen.getByAltText(images.weatheredWall.alt);
    expect(img).toHaveAttribute("src", images.weatheredWall.src);
    expect(img).toHaveAttribute("sizes", "(min-width: 1264px) 1200px, 100vw");
    // the wash over the photo is decoration only
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it("lists the four checks as a plain labelled list under the photo, never as chips or a sideways row", () => {
    const { container } = render(<Diagnose />);
    const list = screen.getByRole("list", { name: "What the inspection checks" });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Moisture reading", "Crack mapping", "Old-paint adhesion", "Wall measurement"]);
    expect(list).toHaveClass("grid-cols-2", "tab:grid-cols-4");
    expect(container.querySelector(".pill, .swipe")).toBeNull();
    // the list follows the photo card, not over it
    expect(list.previousElementSibling?.querySelector("img")).not.toBeNull();
  });

});

describe("PaintSaathiWay", () => {
  it("names the brand in the eyebrow and accents one word of the h2", () => {
    render(<PaintSaathiWay />);
    expect(screen.getByText(`The ${site.name} way`)).toBeInTheDocument();
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toHaveTextContent("Painting, without the project management.");
    const accents = h2.querySelectorAll("em");
    expect(accents).toHaveLength(1);
    expect(accents[0]).toHaveTextContent("without");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("lists the three commitments in order, numbered, each with an h3 under the h2", () => {
    render(<PaintSaathiWay />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    const titles = ["One line-by-line quote", "A supervisor on site", "Your home, protected"];
    items.forEach((li, i) => {
      expect(li).toHaveTextContent(`0${i + 1}`);
      expect(within(li).getByRole("heading", { level: 3 })).toHaveTextContent(titles[i]);
    });
    expect(items[1]).toHaveTextContent("sends you photos every day");

    // the outline goes h2 then the h3s, never skipping a level
    const levels = screen.getAllByRole("heading").map((h) => Number(h.tagName.slice(1)));
    expect(levels).toEqual([2, 3, 3, 3]);
  });

  it("sizes the photo for each design: full width on phones, the 290px portrait on tablets, 560px on desktop", () => {
    render(<PaintSaathiWay />);
    const img = screen.getByAltText(images.uniformSkimming.alt);
    expect(img).toHaveAttribute("src", images.uniformSkimming.src);
    expect(img).toHaveAttribute("sizes", "(min-width: 1080px) 560px, (min-width: 721px) 290px, 100vw");
    // below the fold: next/image's default lazy loading stays (no eager or high-priority hints)
    expect(img).not.toHaveAttribute("loading", "eager");
    expect(img).not.toHaveAttribute("fetchpriority");
  });
});
