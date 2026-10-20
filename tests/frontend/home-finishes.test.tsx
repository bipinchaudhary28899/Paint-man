import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FaqList } from "@/components/FaqList";
import { AreaLinks } from "@/components/home/AreaLinks";
import { AreasSection } from "@/components/home/AreasSection";
import { FaqSection } from "@/components/home/FaqSection";
import { Finishes } from "@/components/home/Finishes";
import { images } from "@/config/images";
import { areaSlug, generalFaqs, site } from "@/config/site";

describe("Finishes (home)", () => {
  it("has one h2 with one italic accent and the four example finishes with their captions", () => {
    render(<Finishes />);
    const heading = screen.getByRole("heading", { level: 2, name: "The finish we work to." });
    expect(heading.querySelectorAll("em")).toHaveLength(1);
    expect(screen.getByText(new RegExp(`Photos of our own ${site.city} jobs`))).toBeInTheDocument();
    for (const caption of ["Exterior · grey-blue", "Living room · warm white", "Shade selection", "Open plan · teal accent"]) {
      expect(screen.getByText(caption).tagName).toBe("FIGCAPTION");
    }
  });

  it("puts the photos in a keyboard-scrollable, labelled swipe region with descriptive alt text", () => {
    render(<Finishes />);
    const region = screen.getByRole("region", { name: "Example finishes" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveClass("swipe");
    const photos = within(region).getAllByRole("img");
    expect(photos.map((p) => p.getAttribute("alt"))).toEqual([images.exteriorBlue.alt, images.livingMoody.alt, images.swatchSheet.alt, images.livingTeal.alt]);
    expect(within(region).getAllByRole("figure")).toHaveLength(4);
  });
});

describe("AreasSection and AreaLinks (home)", () => {
  it("links every locality to its anchor on the city page, keeping 'Painters in' in each link name", () => {
    render(<AreasSection />);
    expect(screen.getByRole("heading", { level: 2, name: `Painting homes across ${site.city}` })).toBeInTheDocument();
    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links).toHaveLength(site.areas.length);
    site.areas.forEach((a, i) => {
      expect(links[i]).toHaveAccessibleName(`Painters in ${a}`);
      expect(links[i]).toHaveAttribute("href", `/services/house-painting/agra#${areaSlug(a)}`);
    });
  });

  it("shows the phone 'Painters in' label once, hidden from screen readers (the links already say it)", () => {
    const { container } = render(<AreasSection />);
    const label = [...container.querySelectorAll("p")].find((p) => p.textContent === "Painters in")!;
    expect(label).toHaveAttribute("aria-hidden");
  });

  it("keeps a real space between 'Painters in' and the locality in the chip text", () => {
    render(<AreaLinks areas={["Kamla Nagar"]} />);
    expect(screen.getByRole("link").textContent).toBe("Painters in Kamla Nagar");
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
