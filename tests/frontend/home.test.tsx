import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AreaLinks } from "@/components/home/AreaLinks";
import { ColourExplorer, swatchIndices, wheelAngle, wheelShades } from "@/components/home/ColourExplorer";
import { HeroImage, heroSideBySide, heroSizes } from "@/components/home/HeroImage";
import { ParallaxChips } from "@/components/home/ParallaxChips";
import { PinnedReveal, reveal } from "@/components/home/PinnedReveal";
import { images } from "@/config/images";
import { areaSlug, site } from "@/config/site";
import { clamp01, easeInOutQuad } from "@/lib/scroll";

// The shared setup renders next/image as a bare <img>; here the real getImageProps is kept (the
// hero builds its preload from it) and the <img> keeps sizes/loading/fetchPriority so the
// loading strategy can be checked.
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

describe("HeroImage", () => {
  it("loads eagerly without the deprecated priority and preloads only where it sits beside the copy", () => {
    render(<HeroImage image={images.livingMoody} />);
    const img = screen.getByAltText(images.livingMoody.alt);
    expect(img).toHaveAttribute("loading", "eager");
    // side by side the photo column is at most 524px wide (see HeroImage); stacked it spans the screen
    expect(img).toHaveAttribute("sizes", "(min-width: 1080px) 524px, 100vw");
    // on phones the photo is far below the h1 (the LCP there): it must not jump the queue
    expect(img).not.toHaveAttribute("fetchpriority");
    expect(img).not.toHaveAttribute("data-priority");

    const link = document.head.querySelector('link[rel="preload"][as="image"]');
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("media", heroSideBySide);
    expect(link).toHaveAttribute("fetchpriority", "high");
    // the preload and the <img> must ask for the same file, so their sizes match exactly
    expect(link).toHaveAttribute("imagesizes", heroSizes);
    expect(link?.getAttribute("imagesizes")).toBe(img.getAttribute("sizes"));
    expect(heroSizes.startsWith(`${heroSideBySide} `)).toBe(true);
    expect(link?.getAttribute("imagesrcset")).toContain("pexels-photo-30386991.jpeg");
    expect(link?.getAttribute("imagesrcset")).toMatch(/ 640w, .* 1200w/);
  });
});

describe("AreaLinks", () => {
  it("links every locality to its own entry on the Agra page, using the shared slug from site.ts", () => {
    render(<AreaLinks areas={site.areas} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(site.areas.length);
    for (const a of site.areas) {
      expect(screen.getByRole("link", { name: `Painters in ${a}` })).toHaveAttribute("href", `/services/house-painting/agra#${areaSlug(a)}`);
    }
    expect(screen.getByRole("link", { name: "Painters in Fatehabad Road" })).toHaveAttribute("href", "/services/house-painting/agra#fatehabad-road");
  });
});

describe("ParallaxChips", () => {
  it("draws seven decorative chips, hidden from assistive tech, each with its own drift", () => {
    const { container } = render(<ParallaxChips />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    const chips = container.querySelectorAll(".chip-bg");
    expect(chips).toHaveLength(7);
    const drifts = new Set([...chips].map((c) => (c as HTMLElement).style.getPropertyValue("--drift")));
    expect(drifts.size).toBeGreaterThan(3);
    expect(container.textContent).toContain("Terracotta · 03");
    expect((chips[0] as HTMLElement).style.left).toBe("-40px");
    expect((chips[1] as HTMLElement).style.right).toBe("6%");
  });
});

describe("PinnedReveal", () => {
  it("renders the four stages, the colour and grey layers and the stage labels", () => {
    const { container } = render(<PinnedReveal />);
    expect(screen.getByRole("heading", { level: 2, name: /Watch the colour/ })).toBeInTheDocument();
    expect(container.querySelectorAll(".pin-stage")).toHaveLength(4);
    expect(screen.getByText("Prep & putty")).toBeInTheDocument();
    expect(screen.getByAltText(/walls being painted Pepper Leaf/)).toBeInTheDocument();
    expect(screen.getByText(/Walls in Pepper Leaf,/)).toHaveTextContent("Walls in Pepper Leaf, Asian Paints 8386");
    // the room stays in colour: only the traced walls carry a putty layer and a shade layer
    expect(container.querySelectorAll(".pin-before .tint")).toHaveLength(1);
    expect(container.querySelectorAll(".pin-after .tint")).toHaveLength(1);
    const after = container.querySelector(".pin-after .tint") as HTMLElement;
    expect(after.style.background).toBe("rgb(187, 200, 178)"); // #bbc8b2, Asian Paints Pepper Leaf 8386
    expect(after.style.maskImage).toContain("/scenes/living-moody-mask.png");
    expect(container.querySelectorAll(".pin-label")).toHaveLength(4);
    expect(container.querySelector(".pin-track")).not.toBeNull();
    expect(container.querySelector(".pin-bar")).not.toBeNull();
    // the wet edge is a full-size track (moved only by transform) carrying a 1px line at its top
    const edge = container.querySelector(".pin-edge") as HTMLElement;
    expect(edge).toHaveAttribute("aria-hidden", "true");
    expect(edge).toHaveClass("absolute", "inset-0", "pointer-events-none");
    expect(edge.firstElementChild).toHaveClass("top-0", "h-px");
  });

  it("turns scroll progress into fill, stage and opacities exactly as the design does", () => {
    expect(reveal(0)).toMatchObject({ fill: 0, stage: 0, edgeVisible: false });
    expect(reveal(0.5)).toMatchObject({ fill: 50, stage: 2 });
    expect(reveal(1)).toMatchObject({ fill: 100, stage: 3, edgeVisible: false });
    const mid = reveal(0.3);
    expect(mid.stage).toBe(1);
    expect(mid.stageOpacity(1)).toBe(1);
    expect(mid.stageOpacity(0)).toBe(0.55);
    expect(mid.stageOpacity(3)).toBe(0.3);
    expect(mid.edgeVisible).toBe(true);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(easeInOutQuad(0.25)).toBeCloseTo(0.125);
  });
});

describe("ColourExplorer", () => {
  it("builds 36 wheel wedges and twelve swatches from the spec list, with Terracotta selected", () => {
    const { container } = render(<ColourExplorer />);
    // no auto-rotation: the wheel only turns with the scroll
    expect(container.querySelector(".wheel-spin")).toBeNull();
    expect(container.querySelector("svg.wheel")).not.toBeNull();
    expect(wheelShades).toHaveLength(36);
    expect(container.querySelectorAll("svg.wheel-svg path")).toHaveLength(36);
    const swatches = within(screen.getByRole("list", { name: "Featured shades" })).getAllByRole("button");
    expect(swatches).toHaveLength(12);
    expect(swatchIndices).toEqual([1, 3, 8, 12, 13, 16, 19, 21, 23, 25, 27, 30]);
    expect(screen.getByRole("button", { name: "Terracotta" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("#C76B4A · Terracottas")).toBeInTheDocument();
    expect(screen.getByText(/Discuss this shade with us/)).toHaveAttribute("href", "/book");
    expect(screen.getByText("Search 50,000+ brand shades")).toHaveAttribute("href", "/colours");
    // the home page names a PaintDB shade (the pinned reveal), so the credit sits with the shade links
    expect(screen.getByRole("link", { name: "PaintDB" })).toHaveAttribute("href", "https://paintdb.com");
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
  });

  it("switches the selected shade card when a swatch is tapped", async () => {
    const user = userEvent.setup();
    render(<ColourExplorer />);
    await user.click(screen.getByRole("button", { name: "Sage" }));
    expect(screen.getByRole("button", { name: "Sage" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Terracotta" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("#71856A · Greens")).toBeInTheDocument();
  });

  it("turns the wheel 0°→180° from the moment it enters the screen to when it leaves", () => {
    expect(wheelAngle(-0.5)).toBe(0); // not on screen yet: at rest
    expect(wheelAngle(0)).toBe(0);
    expect(wheelAngle(0.5)).toBe(90);
    expect(wheelAngle(1)).toBe(180);
    expect(wheelAngle(2)).toBe(180);
  });
});
