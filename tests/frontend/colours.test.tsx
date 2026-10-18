import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ColourFinder, PER_PAGE, type BrandShadeItem } from "@/components/colours/ColourFinder";
import { WallPreview } from "@/components/colours/WallPreview";
import { colours } from "@/config/colours";
import { genericScene } from "@/config/scenes";
import { getColour } from "@/lib/colours/search";

const shadeButtons = () => within(screen.getByRole("list", { name: "Shades" })).getAllByRole("button");

describe("ColourFinder", () => {
  it("renders the whole catalogue and selects the first shade by default", () => {
    render(<ColourFinder />);
    expect(shadeButtons()).toHaveLength(colours.length);
    expect(screen.getByRole("heading", { name: /Taj White/ })).toBeInTheDocument();
    expect(screen.getByText(`${colours.length} shades. Tap one to see it on the wall.`)).toBeInTheDocument();
  });

  it("filters as you type, updates the URL and shows the picked shade on the wall", async () => {
    const user = userEvent.setup();
    render(<ColourFinder />);
    await user.type(screen.getByLabelText("Search by name, code, hex or mood"), "sage");
    expect(shadeButtons()[0]).toHaveTextContent("Sage Mist");
    expect(window.location.search).toBe("?q=sage");
    expect(screen.getByText(/for “sage”/)).toBeInTheDocument();

    await user.click(shadeButtons()[0]);
    expect(screen.getByRole("heading", { name: /Sage Mist/ })).toBeInTheDocument();
    // the room is shown twice: the compact pinned preview for phones and the side panel for wide screens
    expect(screen.getAllByAltText("A cosy living room, repainted in Sage Mist")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Book an inspection with this shade/ })).toHaveAttribute("href", "/book?colour=PM-502");
    expect(screen.getByRole("link", { name: "Full details" })).toHaveAttribute("href", "/colours/PM-502");
    // the phone preview carries the same shade with short actions
    const phone = screen.getByLabelText("Selected shade preview");
    expect(phone).toHaveTextContent("Sage Mist");
    expect(within(phone).getByRole("link", { name: "Book" })).toHaveAttribute("href", "/book?colour=PM-502");
    expect(within(phone).getByRole("link", { name: "Details" })).toHaveAttribute("href", "/colours/PM-502");
  });

  it("toggles family and room chips, keeps the selection valid and clears everything", async () => {
    const user = userEvent.setup();
    render(<ColourFinder />);
    await user.click(shadeButtons()[5]); // Dove, a neutral
    expect(screen.getByRole("heading", { name: /Dove/ })).toBeInTheDocument();

    const greens = screen.getByRole("button", { name: "Greens" });
    await user.click(greens);
    expect(greens).toHaveAttribute("aria-pressed", "true");
    expect(shadeButtons().every((b) => b.textContent?.includes("Greens"))).toBe(true);
    // Dove is no longer in the results, so the panel falls back to the first green.
    expect(screen.getByRole("heading", { name: /Tulsi/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bedroom" }));
    expect(window.location.search).toBe("?family=Greens&room=Bedroom");
    await user.click(screen.getByRole("button", { name: "Bedroom" }));
    expect(window.location.search).toBe("?family=Greens");

    await user.click(greens);
    expect(greens).toHaveAttribute("aria-pressed", "false");
    expect(shadeButtons()).toHaveLength(colours.length);

    await user.type(screen.getByLabelText("Search by name, code, hex or mood"), "zzzz");
    expect(screen.getByText(/No shade matches that/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(shadeButtons()).toHaveLength(colours.length);
    expect(window.location.search).toBe("");
  });

  it("honours initial query and filters from the URL and ignores unknown ones", () => {
    render(<ColourFinder initialQuery="PM-604" initialFamily="Blues" initialRoom="Garage" />);
    expect(shadeButtons()[0]).toHaveTextContent("Blue Pottery");
    expect(screen.getByRole("button", { name: "Blues" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Bedroom" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("WallPreview", () => {
  it("shows the one generic room with a tint layer masked to the detected walls in the shade's colour", () => {
    const colour = getColour("PM-401")!;
    const { container } = render(<WallPreview colour={colour} />);
    expect(screen.getByAltText("A cosy living room, repainted in Terracotta")).toBeInTheDocument();
    const tints = container.querySelectorAll<HTMLElement>(".tint");
    expect(tints).toHaveLength(2); // colour + luminosity layers for a wall that already has a colour
    expect([...tints].map((t) => t.dataset.blend)).toEqual(["color", "lum"]);
    expect(tints[0].style.background).toBe("rgb(194, 98, 63)");
    expect(tints[0].style.maskImage).toContain("/scenes/living-moody-mask.png");
    expect(tints[0].style.maskImage).toContain(genericScene.mask);
    // the whole photo, never cropped: the frame keeps the photo's shape and narrows to a height cap
    const frame = container.querySelector<HTMLElement>(".scene")!;
    expect(frame.style.aspectRatio).toBe("933 / 1400");
    expect(frame.style.width).toMatch(/^min\(100%, (calc\(75vh \* 0\.6664\)|49\.98vh)\)$/);
    expect(container.textContent).toContain("PM-401");
    expect(container.textContent).toContain("LRV 18");
  });
});

describe("ColourFinder: brand shades", () => {
  const brands = [
    { slug: "asian-paints", name: "Asian Paints", count: 2221 },
    { slug: "berger", name: "Berger Paints", count: 1575 },
  ];
  const shade = (i: number, extra: Partial<BrandShadeItem> = {}): BrandShadeItem => ({
    id: `asian-paints:${7000 + i}`, brand: "asian-paints", brandName: "Asian Paints", code: String(7000 + i), name: `Shade ${i}`,
    hex: "#e7975b", lrv: 40, family: "blue", undertone: "Cool Blue", interior: true, exterior: true, ...extra,
  });
  const page = (n: number, total = 100) => ({ data: Array.from({ length: Math.min(PER_PAGE, total - (n - 1) * PER_PAGE) }, (_, i) => shade((n - 1) * PER_PAGE + i)), meta: { total, page: n, pages: Math.ceil(total / PER_PAGE) } });
  const props = { brands, brandFamilies: ["white", "blue"], brandTotal: 50762, attribution: { text: "Shade data: PaintDB", source: "https://paintdb.com", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" } };

  let observe: ((entries: { isIntersecting: boolean }[]) => void) | null = null;
  beforeEach(() => {
    observe = null;
    vi.stubGlobal("IntersectionObserver", class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) { observe = cb; }
      observe() {}
      disconnect() {}
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts with the brands, then loads a brand's shades with primary-colour chips and attribution", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = new URL(String(url), "http://x");
      return new Response(JSON.stringify(page(Number(u.searchParams.get("page")))));
    });
    const user = userEvent.setup();
    render(<ColourFinder {...props} initialCatalogue="brands" />);
    expect(screen.getByRole("button", { name: "Brand shades (50,762)" })).toHaveAttribute("aria-pressed", "true");
    const brandGrid = screen.getByRole("list", { name: "Paint brands" });
    expect(within(brandGrid).getAllByRole("button")).toHaveLength(2);
    expect(fetchSpy).not.toHaveBeenCalled(); // nothing loads until a brand is chosen

    await user.click(within(brandGrid).getByRole("button", { name: /Asian Paints/ }));
    await waitFor(() => expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(PER_PAGE));
    expect(String(fetchSpy.mock.calls[0][0])).toContain("brand=asian-paints");
    expect(String(fetchSpy.mock.calls[0][0])).toContain(`perPage=${PER_PAGE}`);
    expect(screen.getByText(/100 shades\. Tap one/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Primary colour" })).toBeInTheDocument();
    expect(screen.getByText(/PaintDB/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
    // the preview shows the first shade, with brand booking links
    expect(screen.getByRole("heading", { name: /Shade 0/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book an inspection with this shade" })).toHaveAttribute("href", "/book?shade=asian-paints%3A7000");
    expect(screen.getByRole("link", { name: "Try on your wall" })).toHaveAttribute("href", "/visualizer?shade=asian-paints%3A7000");
    await user.click(within(screen.getByRole("list", { name: "Brand shades" })).getAllByRole("button")[3]);
    expect(screen.getByRole("heading", { name: /^Shade 3 Asian Paints 7003/ })).toBeInTheDocument();
  });

  it("scrolls in more pages and never refetches a page it already has", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = new URL(String(url), "http://x");
      return new Response(JSON.stringify(page(Number(u.searchParams.get("page")))));
    });
    const user = userEvent.setup();
    render(<ColourFinder {...props} initialCatalogue="brands" initialBrand="asian-paints" />);
    await waitFor(() => expect(screen.getByText(/100 shades/)).toBeInTheDocument());
    await act(async () => { observe?.([{ isIntersecting: true }]); });
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Brand shades" })).getAllByRole("listitem")).toHaveLength(96));
    // the last page through the button
    await user.click(screen.getByRole("button", { name: /Show more \(4 left\)/ }));
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Brand shades" })).getAllByRole("listitem")).toHaveLength(100));
    expect(screen.queryByRole("button", { name: /Show more/ })).toBeNull();
    const calls = fetchSpy.mock.calls.length;

    // a colour family, then back to all colours: the first page comes from memory
    await user.click(screen.getByRole("button", { name: "Blue" }));
    await waitFor(() => expect(fetchSpy.mock.calls.length).toBe(calls + 1));
    expect(String(fetchSpy.mock.calls.at(-1)![0])).toContain("family=blue");
    await user.click(screen.getByRole("button", { name: "All colours" }));
    await waitFor(() => expect(screen.getByText(/100 shades\. Tap/)).toBeInTheDocument());
    expect(fetchSpy.mock.calls.length).toBe(calls + 1);

    // back to the brands
    await user.click(screen.getByRole("button", { name: "← All brands" }));
    expect(screen.getByRole("list", { name: "Paint brands" })).toBeInTheDocument();
  });

  it("searches all brands from the brand screen and shows errors", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [shade(1, { name: "Mecca Gold", code: "7982" })], meta: { total: 1, page: 1, pages: 1 } })))
      .mockResolvedValueOnce(new Response("down", { status: 503 }));
    const user = userEvent.setup();
    render(<ColourFinder {...props} initialCatalogue="brands" />);
    await user.type(screen.getByLabelText("Search all brands by code, name or hex"), "7982");
    await waitFor(() => expect(screen.getByRole("button", { name: /Mecca Gold/ })).toBeInTheDocument());
    expect(String(fetchSpy.mock.calls[0][0])).toContain("q=7982");
    expect(screen.getByText(/1 shade for “7982”/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search all brands by code, name or hex"), "x");
    await waitFor(() => expect(screen.getByText(/unavailable right now/)).toBeInTheDocument());
  });

  it("switches back to Paint Man shades", async () => {
    const user = userEvent.setup();
    render(<ColourFinder {...props} />);
    expect(screen.getByRole("button", { name: "Paint Man shades (167)" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Brand shades (50,762)" }));
    expect(screen.getByRole("list", { name: "Paint brands" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Paint Man shades (167)" }));
    expect(screen.getByRole("list", { name: "Shades" })).toBeInTheDocument();
  });
});
