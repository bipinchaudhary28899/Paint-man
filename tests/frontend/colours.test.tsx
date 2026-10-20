import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ColoursPage from "@/app/(site)/colours/page";
import { ColourFinder, ColourFinderFromUrl, PER_PAGE, type BrandShadeItem } from "@/components/colours/ColourFinder";
import { WallPreview } from "@/components/colours/WallPreview";
import { genericScene } from "@/config/scenes";

/** The visitor arrives on this address. */
const open = (url: string) => window.history.replaceState(null, "", url);

const brands = [
  { slug: "asian-paints", name: "Asian Paints", count: 2221 },
  { slug: "berger", name: "Berger Paints", count: 1575 },
];
const props = { brands, brandFamilies: ["white", "blue"], brandTotal: 8539, attribution: { text: "Shade data: PaintDB", source: "https://paintdb.com", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" } };
const shade = (i: number, extra: Partial<BrandShadeItem> = {}): BrandShadeItem => ({
  id: `asian-paints:${7000 + i}`, brand: "asian-paints", brandName: "Asian Paints", code: String(7000 + i), name: `Shade ${i}`,
  hex: "#e7975b", lrv: 40, family: "blue", undertone: "Cool Blue", interior: true, exterior: true, ...extra,
});
const page = (n: number, total = 100) => ({ data: Array.from({ length: Math.min(PER_PAGE, total - (n - 1) * PER_PAGE) }, (_, i) => shade((n - 1) * PER_PAGE + i)), meta: { total, page: n, pages: Math.ceil(total / PER_PAGE) } });
const servePages = () =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const u = new URL(String(url), "http://x");
    return new Response(JSON.stringify(page(Number(u.searchParams.get("page")))));
  });

const brandGrid = () => screen.getByRole("list", { name: "Paint brands" });
const brandTiles = () => within(screen.getByRole("list", { name: "Brand shades" })).getAllByRole("button");

/** Prerenders the finder as the static /colours page does, then hydrates that HTML in the browser. */
async function prerenderAndHydrate() {
  const container = document.createElement("div");
  container.innerHTML = renderToString(<ColourFinderFromUrl {...props} />);
  document.body.append(container);
  const serverLinks = [...container.querySelectorAll('ul[aria-label="Paint brands"] a')].map((a) => a.getAttribute("href"));
  const grid = container.querySelector('ul[aria-label="Paint brands"]');
  const recoverable = vi.fn();
  const consoleError = vi.spyOn(console, "error");
  const root = await act(async () => hydrateRoot(container, <ColourFinderFromUrl {...props} />, { onRecoverableError: recoverable }));
  return {
    container,
    serverLinks,
    grid,
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

/** Waits for steps that fetch several pages; the default 1 s is tight while the whole suite runs. */
const SLOW = { timeout: 5000 };

type Cb = (entries: { isIntersecting: boolean }[]) => void;
let observe: Cb | null = null;
let watching = 0; // observers currently connected

beforeEach(() => {
  followed = 0;
  document.addEventListener("click", onDocumentClick);
  observe = null;
  watching = 0;
  vi.stubGlobal("IntersectionObserver", class {
    constructor(private cb: Cb) {}
    observe() { observe = this.cb; watching++; }
    disconnect() { watching--; }
  });
});
afterEach(() => {
  document.removeEventListener("click", onDocumentClick);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  open("/");
});

describe("ColourFinder: the brands", () => {
  it("starts with every brand as a real link to its shade card and loads nothing until one is chosen", () => {
    const fetchSpy = servePages();
    render(<ColourFinder {...props} />);
    const links = within(brandGrid()).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/colours?brand=asian-paints", "/colours?brand=berger"]);
    expect(links[0]).toHaveTextContent("Asian Paints2,221 shades");
    expect(screen.getByText(/8,539 shades from 2 brands\. Choose a brand/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    // nothing of Paint Man's own catalogue is left
    expect(screen.queryByRole("group", { name: "Catalogue" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Room" })).toBeNull();
    expect(screen.queryByText(/Paint Man shades/)).toBeNull();
    expect(screen.getByText("Pick a brand")).toBeInTheDocument(); // the empty side panel
  });

  it("opens a brand in place on a plain click, with primary-colour chips, attribution and the first shade on the wall", async () => {
    const fetchSpy = servePages();
    const user = userEvent.setup();
    render(<ColourFinder {...props} />);
    await user.click(within(brandGrid()).getByRole("link", { name: /Asian Paints/ }));
    expect(followed).toBe(0); // the link opened the brand here, not a new page load
    await waitFor(() => expect(brandTiles()).toHaveLength(PER_PAGE));
    expect(window.location.search).toBe("?brand=asian-paints");
    expect(String(fetchSpy.mock.calls[0][0])).toContain("brand=asian-paints");
    expect(String(fetchSpy.mock.calls[0][0])).toContain(`perPage=${PER_PAGE}`);
    expect(screen.getByText(/100 shades\. Tap one/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Primary colour" })).toBeInTheDocument();
    expect(screen.getByText(/PaintDB/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
    expect(screen.getByText("Asian Paints", { selector: "p.font-display" })).toHaveTextContent("Asian Paints (2,221 shades)");

    // the preview shows the first shade, with brand booking links
    expect(screen.getByRole("heading", { name: /Shade 0/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book an inspection with this shade" })).toHaveAttribute("href", "/book?shade=asian-paints%3A7000");
    // the photo visualizer is retired: the room preview is the only way to see a shade
    expect(screen.queryByRole("link", { name: /Try|visualizer/i })).toBeNull();
    // the room is shown twice: the compact pinned preview for phones and the side panel for wide screens
    expect(screen.getAllByAltText("A cosy living room, repainted in Shade 0")).toHaveLength(2);
    const phone = screen.getByRole("group", { name: "Selected shade preview" });
    const book = within(phone).getByRole("link", { name: "Book" });
    expect(book).toHaveAttribute("href", "/book?shade=asian-paints%3A7000");
    expect(book.className).toContain("!min-h-11");

    // tiles are toggle buttons (brand shades have no pages); a tap moves the pressed state
    const tiles = brandTiles();
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
    for (const t of tiles.slice(0, 4)) expect(t.className).not.toMatch(/shadow-\[/); // no hard offset shadows
    // phone tap targets: the colour chips and the order select are at least 44px
    for (const chip of within(screen.getByRole("group", { name: "Primary colour" })).getAllByRole("button")) expect(chip.className).toContain("min-h-11");
    const sortSelect = screen.getByLabelText("Sort");
    expect(sortSelect.className).toContain("min-h-11");
    expect(sortSelect.className).toContain("min-w-0"); // shrinks to the card instead of scrolling the page sideways
    expect(sortSelect.className.split(" ")).not.toContain("!w-auto"); // auto width only from sm up
    expect(within(sortSelect).getByRole("option", { name: "Shade card (light → dark)" })).toBeInTheDocument();

    // back to the brands
    await user.click(screen.getByRole("button", { name: "← All brands" }));
    expect(brandGrid()).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("leaves modified and middle clicks on a brand to the browser, so it opens in a new tab", () => {
    servePages();
    render(<ColourFinder {...props} />);
    const berger = within(brandGrid()).getByRole("link", { name: /Berger/ });
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) fireEvent.click(berger, init);
    expect(followed).toBe(5);
    expect(brandGrid()).toBeInTheDocument();
    fireEvent.click(berger, { button: 0 });
    expect(followed).toBe(5);
    expect(screen.queryByRole("list", { name: "Paint brands" })).toBeNull();
  });

  it("searches all brands from the brand screen and shows errors", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [shade(1, { name: "Mecca Gold", code: "7982" })], meta: { total: 1, page: 1, pages: 1 } })))
      .mockResolvedValueOnce(new Response("down", { status: 503 }));
    const user = userEvent.setup();
    render(<ColourFinder {...props} />);
    await user.type(screen.getByLabelText("Search all brands by code, name or hex"), "7982");
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Brand shades" })).getByRole("button", { name: /Mecca Gold/ })).toBeInTheDocument());
    expect(String(fetchSpy.mock.calls[0][0])).toContain("q=7982");
    expect(String(fetchSpy.mock.calls[0][0])).not.toContain("brand=");
    expect(screen.getByText(/1 shade for “7982”/)).toBeInTheDocument();
    expect(window.location.search).toBe("?q=7982");
    await user.type(screen.getByLabelText("Search all brands by code, name or hex"), "x");
    await waitFor(() => expect(screen.getByText(/unavailable right now/)).toBeInTheDocument());
  });

  it("says so when nothing matches, and a Clear button undoes the search", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [], meta: { total: 0, page: 1, pages: 1 } })));
    const user = userEvent.setup();
    render(<ColourFinder {...props} />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    await user.type(screen.getByLabelText("Search all brands by code, name or hex"), "zzzz");
    await waitFor(() => expect(screen.getByText(/No shade matches that/)).toBeInTheDocument());
    expect(screen.getByText(/#bbc8b2/)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Selected shade preview" })).toBeNull();
    // the side panel follows what the visitor did instead of asking for a brand again
    expect(screen.queryByText("Pick a brand")).toBeNull();
    expect(screen.getByText("No shade to show yet")).toBeInTheDocument();
    const clear = screen.getByRole("button", { name: "Clear" });
    expect(clear.className).toContain("!min-h-11");
    await user.click(clear);
    expect(screen.getByLabelText("Search all brands by code, name or hex")).toHaveValue("");
    expect(brandGrid()).toBeInTheDocument();
    expect(screen.getByText("Pick a brand")).toBeInTheDocument();
  });

  it("tells the side panel when shades are loading or failed", async () => {
    let fail!: () => void;
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise((_, reject) => { fail = () => reject(new Error("offline")); }));
    render(<ColourFinder {...props} initialBrand="asian-paints" />);
    await waitFor(() => expect(screen.getByText("Loading shades…", { selector: "aside p" })).toBeInTheDocument());
    await act(async () => fail());
    await waitFor(() => expect(screen.getByText("Shades didn't load")).toBeInTheDocument());
  });

  it("puts each brand step in the history, so Back returns to the brand grid", async () => {
    servePages();
    const user = userEvent.setup();
    open("/colours");
    const before = window.history.length;
    render(<ColourFinder {...props} />);
    await user.click(within(brandGrid()).getByRole("link", { name: /Berger/ }));
    expect(window.history.length).toBe(before + 1);
    expect(window.location.search).toBe("?brand=berger");
    await waitFor(() => expect(brandTiles()).toHaveLength(PER_PAGE));

    // Back: the browser restores the previous address and fires popstate
    act(() => {
      window.history.replaceState(null, "", "/colours");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(brandGrid()).toBeInTheDocument();
    // Forward to a brand, family, order and search: all restored from the URL; unknown values dropped
    act(() => {
      window.history.replaceState(null, "", "/colours?brand=asian-paints&family=blue&sort=code&q=7");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByLabelText("Search Asian Paints by code, name or hex")).toHaveValue("7");
    act(() => {
      window.history.replaceState(null, "", "/colours?brand=acme&family=blue&sort=random");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(brandGrid()).toBeInTheDocument();
    act(() => {
      window.history.replaceState(null, "", "/colours?brand=asian-paints&family=blue&sort=code");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Sort")).toHaveValue("code");

    // ← All brands is a step too
    const n = window.history.length;
    await user.click(screen.getByRole("button", { name: "← All brands" }));
    expect(window.history.length).toBe(n + 1);
    expect(window.location.search).toBe("");
  });
});

describe("ColourFinder: a brand's shade card", () => {
  it("scrolls in more pages and never refetches a page it already has", async () => {
    const fetchSpy = servePages();
    const user = userEvent.setup();
    render(<ColourFinder {...props} initialBrand="asian-paints" />);
    await waitFor(() => expect(screen.getByText(/100 shades/)).toBeInTheDocument(), SLOW);
    await act(async () => { observe?.([{ isIntersecting: true }]); });
    await waitFor(() => expect(brandTiles()).toHaveLength(96), SLOW);
    // the last page through the button
    await user.click(screen.getByRole("button", { name: /Show more \(4 left\)/ }));
    await waitFor(() => expect(brandTiles()).toHaveLength(100), SLOW);
    expect(screen.queryByRole("button", { name: /Show more/ })).toBeNull();
    const calls = fetchSpy.mock.calls.length;

    // a colour family, then back to all colours: the first page comes from memory
    await user.click(screen.getByRole("button", { name: "Blue" }));
    await waitFor(() => expect(fetchSpy.mock.calls.length).toBe(calls + 1), SLOW);
    expect(String(fetchSpy.mock.calls.at(-1)![0])).toContain("family=blue");
    expect(window.location.search).toBe("?brand=asian-paints&family=blue");
    await user.click(screen.getByRole("button", { name: "All colours" }));
    await waitFor(() => expect(screen.getByText(/100 shades\. Tap/)).toBeInTheDocument(), SLOW);
    expect(fetchSpy.mock.calls.length).toBe(calls + 1);

    // a different order is its own request (and its own cache entry), and goes in the URL
    await user.selectOptions(screen.getByLabelText("Sort"), "code");
    await waitFor(() => expect(String(fetchSpy.mock.calls.at(-1)![0])).toContain("sort=code"), SLOW);
    expect(window.location.search).toBe("?brand=asian-paints&sort=code");
  });

  it("stops scrolling in pages by itself at the cap and hands over to Show more", async () => {
    servePages();
    const user = userEvent.setup();
    render(<ColourFinder {...props} initialBrand="asian-paints" autoLoadPages={1} />);
    await waitFor(() => expect(screen.getByText(/100 shades/)).toBeInTheDocument());
    expect(watching).toBe(0); // no infinite scroll past the cap
    await user.click(screen.getByRole("button", { name: /Show more \(52 left\)/ }));
    await waitFor(() => expect(brandTiles()).toHaveLength(96));
  });

  it("says so when the next page fails, and stops asking", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(page(1))))
      .mockResolvedValueOnce(new Response("down", { status: 503 }));
    const user = userEvent.setup();
    render(<ColourFinder {...props} initialBrand="asian-paints" />);
    await waitFor(() => expect(screen.getByText(/100 shades/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Show more/ }));
    await waitFor(() => expect(screen.getByText(/unavailable right now/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Show more/ })).toBeNull();
    await act(async () => { observe?.([{ isIntersecting: true }]); });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe("ColourFinder: links", () => {
  it("opens a brand's search straight from a link (brand and code in the URL), ignoring old parameters", async () => {
    const fetchSpy = servePages();
    open("/colours?catalogue=brands&brand=berger&q=3P0050&room=Exterior");
    render(<ColourFinderFromUrl {...props} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain("brand=berger");
    expect(url).toContain("q=3P0050");
    expect(screen.getByLabelText("Search Berger Paints by code, name or hex")).toHaveValue("3P0050");
    expect(window.location.search).toBe("?brand=berger&q=3P0050");
  });

  it("takes the colour family and order from the link, for a brand", async () => {
    const fetchSpy = servePages();
    open("/colours?brand=asian-paints&family=blue&sort=code");
    render(<ColourFinderFromUrl {...props} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).toContain("family=blue");
    expect(url).toContain("sort=code");
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Sort")).toHaveValue("code");
    expect(window.location.search).toBe("?brand=asian-paints&family=blue&sort=code");
  });

  it("ignores an unknown brand, family or order, and a family without a brand", async () => {
    const fetchSpy = servePages();
    open("/colours?brand=acme&family=Greens&sort=random");
    const { unmount } = render(<ColourFinderFromUrl {...props} />);
    expect(brandGrid()).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
    unmount();

    open("/colours?brand=asian-paints&family=Greens&sort=random");
    render(<ColourFinderFromUrl {...props} />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const url = String(fetchSpy.mock.calls[0][0]);
    expect(url).not.toContain("family=");
    expect(url).not.toContain("sort=");
    expect(screen.getByRole("button", { name: "All colours" })).toHaveAttribute("aria-pressed", "true");
    expect(window.location.search).toBe("?brand=asian-paints");
  });

  it("prerenders the brand links whatever the URL, then hydrates and applies the link's brand", async () => {
    const fetchSpy = servePages();
    open("/colours?brand=berger");
    const page = await prerenderAndHydrate();
    expect(page.serverLinks).toEqual(["/colours?brand=asian-paints", "/colours?brand=berger"]); // crawlers get a link to every brand
    expect(page.problems).toEqual([]);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(String(fetchSpy.mock.calls[0][0])).toContain("brand=berger");
    expect(page.container.querySelector('ul[aria-label="Paint brands"]')).toBeNull();
    page.done();
  });

  it("opens the shade an old visualizer link carried (/visualizer?shade= now redirects here)", async () => {
    const fetchSpy = servePages();
    open("/colours?shade=asian-paints%3A8386");
    const page = await prerenderAndHydrate();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const url = new URL(String(fetchSpy.mock.calls[0][0]), "http://x");
    expect(url.searchParams.get("brand")).toBe("asian-paints");
    expect(url.searchParams.get("q")).toBe("8386");
    page.done();
  });

  it("hydrates in place without remounting when the URL has no filters", async () => {
    open("/colours?utm_source=newsletter");
    const page = await prerenderAndHydrate();
    expect(page.problems).toEqual([]);
    expect(page.container.querySelector('ul[aria-label="Paint brands"]')).toBe(page.grid);
    page.done();
  });

  it("ignores its own URL updates instead of starting over", async () => {
    servePages();
    open("/colours?brand=asian-paints");
    const user = userEvent.setup();
    render(<ColourFinderFromUrl {...props} />);
    await waitFor(() => expect(screen.getByText(/100 shades/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Blue" }));
    expect(window.location.search).toBe("?brand=asian-paints&family=blue");
    const chips = screen.getByRole("group", { name: "Primary colour" });
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(screen.getByRole("group", { name: "Primary colour" })).toBe(chips);
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("/colours page", () => {
  it("has one h1 with the city, readable hero links and every brand linked", () => {
    render(<ColoursPage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Find a wall colour in Agra by shade code, brand or name");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /visualizer/i })).toBeNull();
    expect(screen.getByRole("link", { name: "See ready palettes" })).toHaveClass("text-ink");
    expect(within(brandGrid()).getAllByRole("link")).toHaveLength(4);
    expect(document.body.textContent).not.toMatch(/PM codes|Paint Man shades/);
  });
});

describe("WallPreview", () => {
  it("shows the one generic room with a tint layer masked to the detected walls in the shade's colour", () => {
    const { container } = render(<WallPreview colour={{ name: "Red Rust-n", code: "Asian Paints 9937", hex: "#c76944", lrv: 23 }} />);
    const photo = screen.getByAltText("A cosy living room, repainted in Red Rust-n");
    expect(photo).not.toHaveAttribute("fetchpriority"); // previews lazy-load; nothing is preloaded
    const tints = container.querySelectorAll<HTMLElement>(".tint");
    // one multiply layer, exactly as the home-page reveal paints the same room: crisp wall texture
    expect(tints).toHaveLength(1);
    expect([...tints].map((t) => t.dataset.blend)).toEqual(["multiply"]);
    expect(tints[0]).toHaveClass("tint-multiply");
    expect(tints[0].style.background).toBe("rgb(199, 105, 68)");
    expect(tints[0].style.maskImage).toContain("/scenes/living-moody-mask.png");
    expect(tints[0].style.maskImage).toContain(genericScene.mask);
    // the whole photo, never cropped: the frame keeps the photo's shape and narrows to a height cap
    const frame = container.querySelector<HTMLElement>(".scene")!;
    expect(frame.style.aspectRatio).toBe("933 / 1400");
    expect(frame.style.width).toMatch(/^min\(100%, (calc\(75vh \* 0\.6664\)|49\.98vh)\)$/);
    expect(container.querySelector("figcaption")).toHaveTextContent("Red Rust-n Asian Paints 9937#C76944 · LRV 23");
  });

  it("leaves the code and LRV out of the caption when the shade has none", () => {
    const { container } = render(<WallPreview colour={{ name: "Dusty Rose", hex: "#c9a0a0" }} />);
    expect(container.querySelector("figcaption")).toHaveTextContent(/^Dusty Rose#C9A0A0$/);
  });

  it("can crop in to 7:8 on desktop while phones keep the whole photo", () => {
    const shade = { name: "Pepper Leaf", code: "Asian Paints 8386", hex: "#bbc8b2" };
    const plain = render(<WallPreview colour={shade} />).container.querySelector<HTMLElement>(".scene")!;
    expect(plain.dataset.crop).toBeUndefined();
    const { container } = render(<WallPreview colour={shade} desktopCrop />);
    const frame = container.querySelector<HTMLElement>(".scene")!;
    expect(frame.dataset.crop).toBe("desktop");
    expect(frame.className).toContain("lg:aspect-[7/8]!");
    expect(frame.className).toContain("lg:w-full!");
    expect(frame.style.aspectRatio).toBe("933 / 1400"); // below lg: the whole photo
    // compact (phone strip) previews never crop
    const strip = render(<WallPreview colour={shade} desktopCrop compact />).container.querySelector<HTMLElement>(".scene")!;
    expect(strip.dataset.crop).toBeUndefined();
  });
});

describe("ColourFinder: the large preview on phones", () => {
  const sheet = () => screen.getByRole("dialog", { name: /^Shade/ });
  const openFinder = async () => {
    open("/colours?brand=asian-paints");
    servePages();
    const user = userEvent.setup();
    render(<ColourFinder {...props} initialBrand="asian-paints" />);
    await waitFor(() => expect(screen.getByText(/100 shades\. Tap one/)).toBeInTheDocument());
    return user;
  };

  it("opens from the pinned room, keeps picking in its strip, and closes back to the grid", async () => {
    const user = await openFinder();
    await user.click(screen.getByRole("button", { name: "See Shade 0 larger" }));
    const dialog = sheet();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("heading", { name: "Shade 0" })).toBeInTheDocument();
    expect(within(dialog).getByAltText("A cosy living room, repainted in Shade 0")).toBeInTheDocument();
    // focus moves into the dialog and the page behind stops scrolling
    expect(within(dialog).getByRole("button", { name: "Close the large preview" })).toHaveFocus();
    expect(document.documentElement.style.overflow).toBe("hidden");
    // Back closes it: opening pushed a history entry of its own
    expect(window.history.state).toEqual({ finderPreview: true });

    // every loaded shade is in the strip; a tap repaints the big room and the grid follows
    const swatches = within(within(dialog).getByRole("list", { name: "Shades" })).getAllByRole("button");
    expect(swatches).toHaveLength(48);
    expect(swatches[0]).toHaveAttribute("aria-pressed", "true");
    await user.click(swatches[5]);
    expect(within(sheet()).getByRole("heading", { name: "Shade 5" })).toBeInTheDocument();
    expect(within(sheet()).getByRole("link", { name: "Book an inspection with this shade" })).toHaveAttribute("href", "/book?shade=asian-paints%3A7005");

    // × goes Back, which closes the sheet but keeps the brand and the pick
    await user.click(within(sheet()).getByRole("button", { name: "Close the large preview" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.documentElement.style.overflow).toBe("");
    expect(screen.getByText(/100 shades\. Tap one/)).toBeInTheDocument();
    expect(brandTiles()[5]).toHaveAttribute("aria-pressed", "true");
    expect(window.location.search).toBe("?brand=asian-paints");
  });

  it("closes on the phone's Back button and on Escape", async () => {
    const user = await openFinder();
    await user.click(screen.getByRole("button", { name: "See Shade 0 larger" }));
    act(() => { window.history.back(); });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Asian Paints", { selector: "p.font-display" })).toBeInTheDocument(); // still in the brand

    await user.click(screen.getByRole("button", { name: "See Shade 0 larger" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("loads more shades when the strip is swiped near its end", async () => {
    const user = await openFinder();
    await user.click(screen.getByRole("button", { name: "See Shade 0 larger" }));
    const list = within(sheet()).getByRole("list", { name: "Shades" });
    Object.defineProperties(list, { scrollWidth: { value: 3000, configurable: true }, clientWidth: { value: 375, configurable: true } });
    list.scrollLeft = 2500;
    fireEvent.scroll(list);
    await waitFor(() => expect(within(within(sheet()).getByRole("list", { name: "Shades" })).getAllByRole("button")).toHaveLength(96), SLOW); // the next 48 joined the first 48
  });

  it("closes when the screen becomes wide enough for the side panel", async () => {
    let listener: (() => void) | undefined;
    const mq = { matches: false, addEventListener: (_: string, cb: () => void) => { listener = cb; }, removeEventListener: vi.fn() };
    vi.stubGlobal("matchMedia", () => mq);
    const user = await openFinder();
    await user.click(screen.getByRole("button", { name: "See Shade 0 larger" }));
    mq.matches = true;
    act(() => listener?.());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

describe("PreviewSheet", () => {
  it("keeps Tab inside the dialog and closes without history when it was not pushed", async () => {
    const { PreviewSheet } = await import("@/components/colours/PreviewSheet");
    const onClose = vi.fn();
    const view = { name: "Pepper Leaf", code: "Asian Paints 8386", hex: "#bbc8b2", lrv: 52, meta: "#BBC8B2 · LRV 52", bookHref: "/book" };
    render(<PreviewSheet view={view} shades={[{ id: "a:1", name: "One", code: "1", hex: "#ffffff" }]} selectedId="a:1" onSelect={vi.fn()} onClose={onClose} />);
    const close = screen.getByRole("button", { name: "Close the large preview" });
    const last = screen.getByRole("link", { name: "Book an inspection with this shade" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(close, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
