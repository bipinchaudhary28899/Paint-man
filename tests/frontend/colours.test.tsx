import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ColoursPage from "@/app/(site)/colours/page";
import { ColourFinder, ColourFinderFromUrl, PER_PAGE, type BrandShadeItem } from "@/components/colours/ColourFinder";
import { WallPreview } from "@/components/colours/WallPreview";
import { colours } from "@/config/colours";
import { genericScene } from "@/config/scenes";
import { getColour } from "@/lib/colours/search";

/** The visitor arrives on this address. */
const open = (url: string) => window.history.replaceState(null, "", url);

const shadeTiles = () => within(screen.getByRole("list", { name: "Shades" })).getAllByRole("link");

/** Prerenders the finder as the static /colours page does, then hydrates that HTML in the browser. */
async function prerenderAndHydrate() {
  const container = document.createElement("div");
  container.innerHTML = renderToString(<ColourFinderFromUrl />);
  document.body.append(container);
  const serverLinks = container.querySelectorAll('ul[aria-label="Shades"] a').length;
  const list = container.querySelector('ul[aria-label="Shades"]');
  const recoverable = vi.fn();
  const consoleError = vi.spyOn(console, "error");
  const root = await act(async () => hydrateRoot(container, <ColourFinderFromUrl />, { onRecoverableError: recoverable }));
  return {
    container,
    serverLinks,
    list,
    problems: [...recoverable.mock.calls, ...consoleError.mock.calls],
    done: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

// Counts link clicks the browser would have followed (nothing called preventDefault), then
// stops jsdom from trying to navigate.
let followed = 0;
const onDocumentClick = (e: MouseEvent) => {
  if (!(e.target as Element).closest("a[href]")) return;
  if (!e.defaultPrevented) followed++;
  e.preventDefault();
};

describe("ColourFinder", () => {
  beforeEach(() => {
    followed = 0;
    document.addEventListener("click", onDocumentClick);
  });
  afterEach(() => {
    document.removeEventListener("click", onDocumentClick);
    open("/");
  });

  it("renders the whole catalogue as links to each shade page and selects the first shade by default", () => {
    render(<ColourFinder />);
    const tiles = shadeTiles();
    expect(tiles).toHaveLength(colours.length);
    tiles.forEach((t, i) => expect(t).toHaveAttribute("href", `/colours/${colours[i].code}`));
    expect(tiles[0]).toHaveAttribute("aria-current", "true");
    expect(tiles.filter((t) => t.hasAttribute("aria-current"))).toHaveLength(1);
    expect(screen.getByRole("heading", { name: /Taj White/ })).toBeInTheDocument();
    expect(screen.getByText(`${colours.length} shades. Tap one to see it on the wall.`)).toBeInTheDocument();
  });

  it("filters as you type, updates the URL and shows the picked shade on the wall", async () => {
    const user = userEvent.setup();
    render(<ColourFinder />);
    await user.type(screen.getByLabelText("Search by name, code, hex or mood"), "sage");
    expect(shadeTiles()[0]).toHaveTextContent("Sage Mist");
    expect(window.location.search).toBe("?q=sage");
    expect(screen.getByText(/for “sage”/)).toBeInTheDocument();

    await user.click(shadeTiles()[0]);
    expect(followed).toBe(0); // a plain click previews, it doesn't leave the page
    expect(shadeTiles()[0]).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("heading", { name: /Sage Mist/ })).toBeInTheDocument();
    // the room is shown twice: the compact pinned preview for phones and the side panel for wide screens
    expect(screen.getAllByAltText("A cosy living room, repainted in Sage Mist")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Book an inspection with this shade/ })).toHaveAttribute("href", "/book?colour=PM-502");
    expect(screen.getByRole("link", { name: "Full details" })).toHaveAttribute("href", "/colours/PM-502");
    // the phone preview is a labelled group carrying the same shade with short, 44px actions
    const phone = screen.getByRole("group", { name: "Selected shade preview" });
    expect(phone).toHaveTextContent("Sage Mist");
    const book = within(phone).getByRole("link", { name: "Book" });
    const details = within(phone).getByRole("link", { name: "Details" });
    expect(book).toHaveAttribute("href", "/book?colour=PM-502");
    expect(details).toHaveAttribute("href", "/colours/PM-502");
    expect(book.className).toContain("!min-h-11");
    expect(details.className).toContain("min-h-11");
  });

  it("leaves modified and middle clicks on a tile to the browser, so the shade page opens in a new tab", () => {
    render(<ColourFinder />);
    const sage = shadeTiles().find((t) => t.textContent?.includes("Sage Mist"))!;
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) fireEvent.click(sage, init);
    expect(followed).toBe(5);
    expect(sage).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("heading", { name: /Taj White/ })).toBeInTheDocument();
    // and Enter on a focused tile previews like a click
    fireEvent.click(sage, { button: 0 });
    expect(sage).toHaveAttribute("aria-current", "true");
  });

  it("toggles family and room chips, keeps the selection valid and clears everything", async () => {
    const user = userEvent.setup();
    render(<ColourFinder />);
    await user.click(shadeTiles()[5]); // Dove, a neutral
    expect(screen.getByRole("heading", { name: /Dove/ })).toBeInTheDocument();

    const greens = screen.getByRole("button", { name: "Greens" });
    await user.click(greens);
    expect(greens).toHaveAttribute("aria-pressed", "true");
    expect(shadeTiles().every((b) => b.textContent?.includes("Greens"))).toBe(true);
    // Dove is no longer in the results, so the panel falls back to the first green.
    expect(screen.getByRole("heading", { name: /Tulsi/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bedroom" }));
    expect(window.location.search).toBe("?family=Greens&room=Bedroom");
    await user.click(screen.getByRole("button", { name: "Bedroom" }));
    expect(window.location.search).toBe("?family=Greens");

    await user.click(greens);
    expect(greens).toHaveAttribute("aria-pressed", "false");
    expect(shadeTiles()).toHaveLength(colours.length);

    await user.type(screen.getByLabelText("Search by name, code, hex or mood"), "zzzz");
    expect(screen.getByText(/No shade matches that/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(shadeTiles()).toHaveLength(colours.length);
    expect(window.location.search).toBe("");
  });

  it("honours initial query and filters and ignores unknown ones", () => {
    render(<ColourFinder initialQuery="PM-604" initialFamily="Blues" initialRoom="Garage" />);
    expect(shadeTiles()[0]).toHaveTextContent("Blue Pottery");
    expect(screen.getByRole("button", { name: "Blues" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Bedroom" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reads its starting filters from the URL in the browser and keeps them in the URL", () => {
    open("/colours?q=PM-604&family=Blues&room=Garage");
    render(<ColourFinderFromUrl />);
    expect(shadeTiles()[0]).toHaveTextContent("Blue Pottery");
    expect(screen.getByRole("button", { name: "Blues" })).toHaveAttribute("aria-pressed", "true");
    expect(window.location.search).toBe("?q=PM-604&family=Blues");
  });

  it("prerenders the full grid of shade links whatever the URL, then hydrates and applies the link's filters", async () => {
    open("/colours?family=Blues");
    const page = await prerenderAndHydrate();
    expect(page.serverLinks).toBe(colours.length); // crawlers get a link to every shade
    expect(page.problems).toEqual([]);
    const tiles = within(page.container.querySelector<HTMLElement>('ul[aria-label="Shades"]')!).getAllByRole("link");
    expect(tiles.length).toBeLessThan(colours.length);
    expect(tiles.every((t) => t.textContent?.includes("Blues"))).toBe(true);
    expect(within(page.container).getByRole("button", { name: "Blues" })).toHaveAttribute("aria-pressed", "true");
    expect(window.location.search).toBe("?family=Blues");
    page.done();
  });

  it("hydrates in place without remounting when the URL has no filters", async () => {
    open("/colours?utm_source=newsletter");
    const page = await prerenderAndHydrate();
    expect(page.problems).toEqual([]);
    expect(page.container.querySelector('ul[aria-label="Shades"]')).toBe(page.list);
    expect(page.container.querySelectorAll('ul[aria-label="Shades"] a')).toHaveLength(colours.length);
    page.done();
  });

  it("ignores its own URL updates instead of starting over", async () => {
    open("/colours?family=Greens");
    const user = userEvent.setup();
    render(<ColourFinderFromUrl />);
    const list = screen.getByRole("list", { name: "Shades" });
    await user.click(screen.getByRole("button", { name: "Bedroom" }));
    expect(window.location.search).toBe("?family=Greens&room=Bedroom");
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(screen.getByRole("list", { name: "Shades" })).toBe(list);
    expect(screen.getByRole("button", { name: "Bedroom" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("/colours page", () => {
  it("has one h1 with the city, readable hero links and every shade linked", () => {
    render(<ColoursPage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Find a wall colour in Agra by code, name or mood");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Try the visualizer" })).toHaveClass("text-ink");
    expect(screen.getByRole("link", { name: "See ready palettes" })).toHaveClass("text-ink");
    expect(shadeTiles()).toHaveLength(colours.length);
  });
});

describe("WallPreview", () => {
  it("shows the one generic room with a tint layer masked to the detected walls in the shade's colour", () => {
    const colour = getColour("PM-401")!;
    const { container } = render(<WallPreview colour={colour} />);
    const photo = screen.getByAltText("A cosy living room, repainted in Terracotta");
    expect(photo).not.toHaveAttribute("fetchpriority"); // previews lazy-load; nothing is preloaded
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
  const servePages = () =>
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = new URL(String(url), "http://x");
      return new Response(JSON.stringify(page(Number(u.searchParams.get("page")))));
    });

  type Cb = (entries: { isIntersecting: boolean }[]) => void;
  let observe: Cb | null = null;
  let watching = 0; // observers currently connected
  beforeEach(() => {
    observe = null;
    watching = 0;
    vi.stubGlobal("IntersectionObserver", class {
      constructor(private cb: Cb) {}
      observe() { observe = this.cb; watching++; }
      disconnect() { watching--; }
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    open("/");
  });

  it("starts with the brands, then loads a brand's shades with primary-colour chips and attribution", async () => {
    const fetchSpy = servePages();
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

    // brand tiles stay toggle buttons (brand shades have no pages); a tap moves the pressed state
    const tiles = within(screen.getByRole("list", { name: "Brand shades" })).getAllByRole("button");
    expect(tiles[0]).toHaveAttribute("aria-pressed", "true");
    await user.click(tiles[3]);
    expect(screen.getByRole("heading", { name: /^Shade 3 Asian Paints 7003/ })).toBeInTheDocument();
    expect(tiles.filter((t) => t.getAttribute("aria-pressed") === "true")).toEqual([tiles[3]]);
    // off-screen tiles skip rendering work; the containment sits on the tile itself, so its
    // selected ring, offset shadow and hover lift are never clipped by the grid cell
    for (const t of [tiles[0], tiles[3]]) {
      expect(t.className).toContain("[content-visibility:auto]");
      expect(t.className).toContain("[contain-intrinsic-size:auto_100px]");
      expect(t.closest("li")!.className).not.toContain("content-visibility");
    }
    expect(tiles[3].className).toContain("ring-2");
  });

  it("scrolls in more pages and never refetches a page it already has", async () => {
    const fetchSpy = servePages();
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

    // a different order is its own request (and its own cache entry)
    await user.selectOptions(screen.getByLabelText("Sort"), "code");
    await waitFor(() => expect(String(fetchSpy.mock.calls.at(-1)![0])).toContain("sort=code"));

    // back to the brands
    await user.click(screen.getByRole("button", { name: "← All brands" }));
    expect(screen.getByRole("list", { name: "Paint brands" })).toBeInTheDocument();
  });

  it("stops scrolling in pages by itself at the cap and hands over to Show more", async () => {
    servePages();
    const user = userEvent.setup();
    render(<ColourFinder {...props} initialCatalogue="brands" initialBrand="asian-paints" autoLoadPages={1} />);
    await waitFor(() => expect(screen.getByText(/100 shades/)).toBeInTheDocument());
    expect(watching).toBe(0); // no infinite scroll past the cap
    await user.click(screen.getByRole("button", { name: /Show more \(52 left\)/ }));
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Brand shades" })).getAllByRole("listitem")).toHaveLength(96));
  });

  it("opens a brand's search straight from a link (catalogue, brand and code in the URL)", async () => {
    const fetchSpy = servePages();
    open("/colours?catalogue=brands&brand=berger&q=3P0050");
    render(<ColourFinderFromUrl {...props} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain("brand=berger");
    expect(url).toContain("q=3P0050");
    expect(screen.getByLabelText("Search Berger Paints by code, name or hex")).toHaveValue("3P0050");
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
