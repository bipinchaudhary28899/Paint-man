import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Hero } from "@/components/home/Hero";
import { HeroImage, heroPreloadMedia, heroSideBySide, heroSizes, heroTablet } from "@/components/home/HeroImage";
import { illustrations } from "@/config/images";
import { cityPath, homeCity } from "@/config/site";

// The shared setup drops `sizes`; here the <img> keeps it (and loading/fetchPriority), so the
// per-breakpoint sizes and the loading strategy can be checked. getImageProps stays real: the
// hero builds its preload from it.
vi.mock("next/image", async () => {
  const actual = await vi.importActual<typeof import("next/image")>("next/image");
  return {
    ...actual,
    default: ({ src, alt, fill: _fill, priority, preload: _preload, ...rest }: Record<string, unknown>) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={String(src)} alt={String(alt ?? "")} data-priority={priority ? "true" : undefined} {...rest} />
    ),
  };
});

describe("Hero", () => {
  it("has the page's only h1, carrying the eyebrow keyword and one italic accent", () => {
    const { container } = render(<Hero />);
    const h1 = screen.getByRole("heading", { level: 1 });
    // (jsdom has no layout, so the block break after the eyebrow's ": " may collapse in the name)
    expect(h1).toHaveAccessibleName(/^Book house painters online:\s*Your space, painted beautifully\. Managed completely\.$/);
    expect(h1.querySelectorAll("em")).toHaveLength(1);
    expect(h1.querySelector("em")).toHaveTextContent("completely.");
    // no other headings in the hero: the facts are a description list, not headings
    expect(container.querySelectorAll("h1, h2, h3, h4")).toHaveLength(1);
    expect(container.querySelector("section#top")).not.toBeNull();
  });

  it("links the intro to the home city's page", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: homeCity.name })).toHaveAttribute("href", cityPath(homeCity));
  });

  it("offers both actions in each layout, one copy of each pair shown per breakpoint", () => {
    render(<Hero />);
    const book = screen.getAllByRole("link", { name: "Book a site visit" });
    const colours = screen.getAllByRole("link", { name: "Explore colours" });
    expect(book).toHaveLength(2);
    expect(colours).toHaveLength(2);
    for (const a of book) expect(a).toHaveAttribute("href", "#book-visit");
    for (const a of colours) expect(a).toHaveAttribute("href", "/colours");

    // phones and tablets: the copy that follows the intro (hidden from 1080px);
    // desktop: the copy under the picture (display:none below 1080px)
    const [stacked, beside] = book.map((a) => a.parentElement!);
    expect(stacked.className).toMatch(/(^| )desk:hidden( |$)/);
    expect(beside.className).toMatch(/(^| )hidden( |$)/);
    expect(beside.className).toMatch(/(^| )desk:flex( |$)/);
    expect(within(stacked).getByRole("link", { name: "Explore colours" })).toBe(colours[0]);
    expect(within(beside).getByRole("link", { name: "Explore colours" })).toBe(colours[1]);
  });

  it("states the three service facts as terms and values", () => {
    render(<Hero />);
    const terms = screen.getAllByRole("term").map((t) => t.textContent);
    const values = screen.getAllByRole("definition").map((d) => d.textContent);
    expect(terms).toEqual(["Payment", "Estimate", "Work"]);
    expect(values).toEqual(["Zero advance", "Full, before work starts", "Timed and documented"]);
  });

  it("shows the paint-brands picture with its descriptive alt, loaded eagerly", () => {
    render(<Hero />);
    const img = screen.getByAltText(illustrations.paintBrands.alt);
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("sizes", heroSizes);
    expect(img).not.toHaveAttribute("fetchpriority");
    expect(img).not.toHaveAttribute("data-priority");
  });
});

describe("HeroImage", () => {
  it("sizes the picture for each layout: the desktop column, then the framed panel on tablets and phones", () => {
    expect(heroSideBySide).toBe("(min-width: 1080px)");
    expect(heroTablet).toBe("(min-width: 721px)");
    // desktop column at most 524px; tablet panel = screen − 2×32 gutter − 2×1 border − 2×24 padding;
    // phone panel = screen − 2×20 gutter − 2×1 border − 2×12 padding
    expect(heroSizes).toBe("(min-width: 1080px) 524px, (min-width: 721px) calc(100vw - 114px), calc(100vw - 66px)");
  });

  it("preloads at high priority only where the picture is the LCP (tablets and desktop), with the img's own sizes", () => {
    render(<HeroImage image={illustrations.paintBrands} />);
    const img = screen.getByAltText(illustrations.paintBrands.alt);
    expect(img).toHaveClass("object-cover");
    const link = [...document.head.querySelectorAll('link[rel="preload"][as="image"]')].find((l) =>
      l.getAttribute("imagesrcset")?.includes("paint-brands.webp"),
    );
    expect(link).toBeDefined();
    expect(heroPreloadMedia).toBe(heroTablet);
    expect(link).toHaveAttribute("media", heroPreloadMedia);
    expect(link).toHaveAttribute("fetchpriority", "high");
    // the preload and the <img> must ask for the same file, so their sizes match exactly
    expect(link?.getAttribute("imagesizes")).toBe(img.getAttribute("sizes"));
  });
});
