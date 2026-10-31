import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { Linking, Text } from "react-native";

import { ColourTools, colourTools } from "~/components/colours/ColourTools";
import { ColourHero, Glow, HeroText } from "~/components/colours/Hero";
import { PaletteCard, PaletteJump, PaletteList } from "~/components/colours/Palettes";
import { ColourFaqs, CompareSection, FamilyChip, LoadState } from "~/components/colours/Sections";
import { CardFamilies, CardIntro, FamilyIntro, FamilyShades, HubCards, HubIntro, OtherCards, SameFamily } from "~/components/colours/ShadeCards";
import { PaintDbCredit, ShadeSwatches } from "~/components/colours/ShadeSwatches";
import { useLoad } from "~/components/colours/useLoad";
import { nearEnd, stickyOffset } from "~/components/colours/useStickyScroll";
import { SCENE_RATIO, WallPreview } from "~/components/colours/WallPreview";
import { ApiError } from "~/lib/api";
import { FALLBACK_CREDIT, type CardFamily, type CardList, type ShadeCard, type ShadeCardWithSamples, type ShadeFamily, type Swatch } from "~/lib/colours";
import { BRAND_SHADES_ROUNDED, PAINTDB, palettes, site } from "~/shared";
import { skiaImages } from "./skia-mock";

jest.mock("@shopify/react-native-skia", () => require("./skia-mock"));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
  useIsFocused: jest.fn(() => true),
}));

// The pages scroll to their own anchors through the page (usePage().scrollTo); the rest of Page is real.
const mockScrollTo = jest.fn();
jest.mock("~/components/site/Page", () => {
  const actual = jest.requireActual("~/components/site/Page");
  return { ...actual, usePage: () => ({ ...actual.usePage(), scrollTo: mockScrollTo, register: jest.fn() }) };
});

const pushed = (pathname: string, params: Record<string, string> = {}) => expect(router.push).toHaveBeenCalledWith({ pathname, params });

beforeEach(() => {
  jest.clearAllMocks();
  skiaImages.loaded = true;
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
});

// ---------- fixtures shaped like /api/v1/colours/shade-cards ----------

const ref = (code: string, name: string, lrv: number) => ({ id: `asian-paints:${code}`, code, name, hex: "#f6f3e8", lrv });
const fam = (family: string, count: number, hasPage = true): CardFamily => ({
  family,
  label: family[0].toUpperCase() + family.slice(1),
  count,
  hasPage,
  lrv: { min: 20, max: 90 },
  lightest: ref("L152", "Cream Pie", 90),
  darkest: ref("8778", "Walnut Cream", 20),
  undertones: ["neutral", "warm"],
  swatch: "#e2ece1",
});
const swatch = (n: number, code: string | null = String(7000 + n)): Swatch => ({ id: `asian-paints:${code ?? n}`, brand: "asian-paints", code, query: code ?? `Name ${n}`, name: `Name ${n}`, hex: "#bbc8b2", lrv: 40 + n });

const asian: ShadeCard = { slug: "asian-paints", name: "Asian Paints", shortName: "Asian Paints", count: 2221, lrv: { min: 0, max: 96 }, families: [fam("white", 147), fam("blue", 346), fam("black", 3, false)] };
const berger: ShadeCard = { slug: "berger", name: "Berger Paints", shortName: "Berger", count: 1575, lrv: { min: 1, max: 92 }, families: [fam("white", 120), fam("blue", 377)] };
const nerolac: ShadeCard = { slug: "nerolac", name: "Kansai Nerolac", shortName: "Nerolac", count: 2023, lrv: { min: 2, max: 93 }, families: [fam("white", 100), fam("blue", 12, false)] };
const list: CardList = { cards: [asian, berger, nerolac], shades: 5819, credit: FALLBACK_CREDIT };
const withSamples: ShadeCardWithSamples = { ...asian, families: asian.families.map((f, i) => ({ ...f, sample: [swatch(i * 2), swatch(i * 2 + 1, null)] })) };
const blue: ShadeFamily = { ...fam("blue", 346), brand: "asian-paints", brandName: "Asian Paints", shortName: "Asian Paints", shades: [swatch(1), swatch(2)] };

describe("ColourHero", () => {
  it("shows the crumbs, the h1, the intro and what follows, over its glows", async () => {
    await render(
      <ColourHero
        wash="sky"
        crumbs={[{ name: "Colours", path: "/colours" }]}
        title="Find a wall colour"
        intro="8,539 shades"
        glows={[
          { color: "#ebc4be", size: 320, opacity: 0.6, place: { top: -96, right: -96 } },
          { color: "#e9b949", size: 288, opacity: 0.5, place: { bottom: -128, left: "25%" } },
        ]}
      >
        <Text>tools</Text>
      </ColourHero>,
    );
    expect(screen.getByRole("header", { name: "Find a wall colour" })).toBeOnTheScreen();
    expect(screen.getByText("8,539 shades")).toBeOnTheScreen();
    expect(screen.getByText("tools")).toBeOnTheScreen();
  });

  it("leaves the h1 out while loading and takes a composed intro", async () => {
    await render(<ColourHero crumbs={[{ name: "Palettes", path: "/palettes" }]} intro={<HeroText first={false}>Ready-made</HeroText>} />);
    expect(screen.queryByRole("header")).toBeNull();
    expect(screen.getByText("Ready-made")).toBeOnTheScreen();
  });

  it("places a glow by its left offset in points too", async () => {
    await render(<Glow color="#71856a" size={100} opacity={0.3} place={{ top: 10, left: 20 }} />);
  });
});

describe("ColourTools", () => {
  it("links every tool but the page you are on", async () => {
    await render(<ColourTools current="finder" />);
    expect(screen.getByLabelText("Colour finder, you are here")).toBeSelected();
    expect(screen.getByText("You are here")).toBeOnTheScreen();
    expect(screen.getAllByText("Open →")).toHaveLength(3);
    await fireEvent.press(screen.getByRole("link", { name: /^Brand shade cards/ }));
    pushed("/shade-cards");
    await fireEvent.press(screen.getByRole("link", { name: /^See shades at home/ }));
    pushed("/book");
  });

  it("uses the website's copy and counts", () => {
    expect(colourTools[0].text).toBe(`Search ${BRAND_SHADES_ROUNDED} brand shades by code, name or hex, each shown on a room.`);
    expect(colourTools[2].text).toBe(`${palettes.length} ready palettes: a feature wall, its white and an accent.`);
    expect(colourTools[2].swatches).toEqual(palettes[0].shades.map((s) => s.hex));
  });
});

describe("WallPreview", () => {
  const colour = { name: "Pepper Leaf", code: "Asian Paints 8386", hex: "#bbc8b2", lrv: 55 };
  const layout = (w: number, h: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width: w, height: h } } });

  it("multiplies the shade onto the room's wall once it has a size, with a caption", async () => {
    await render(<WallPreview colour={colour} />);
    const room = screen.getByLabelText("A cosy living room, repainted in Pepper Leaf");
    expect(screen.queryByTestId("skia-canvas")).toBeNull();
    await fireEvent(room, "layout", layout(325, 325 / SCENE_RATIO));
    await fireEvent(room, "layout", layout(325, 325 / SCENE_RATIO));
    const [photo, tint] = screen.getAllByTestId("skia-image");
    expect(photo.props.skia).toMatchObject({ fit: "cover", width: 325 });
    expect(tint.props.skia).toMatchObject({ blendMode: "multiply", fit: "cover" });
    expect(screen.getByTestId("skia-blend-color").props.skia).toEqual({ color: "#bbc8b2", mode: "srcIn" });
    expect(screen.getByText("Pepper Leaf Asian Paints 8386")).toBeOnTheScreen();
    expect(screen.getByText("#BBC8B2 · LRV 55")).toBeOnTheScreen();
  });

  it("draws nothing until the photo and mask load, and has no caption when filling", async () => {
    skiaImages.loaded = false;
    const view = await render(<WallPreview colour={{ name: "White", hex: "#ffffff" }} fill />);
    await fireEvent(screen.getByTestId("wall-preview"), "layout", layout(148, 222));
    expect(screen.queryByTestId("skia-canvas")).toBeNull();
    expect(screen.queryByText("#FFFFFF")).toBeNull();
    await view.rerender(<WallPreview colour={{ name: "White", hex: "#ffffff" }} />);
    expect(screen.getByText("#FFFFFF")).toBeOnTheScreen();
  });
});

describe("the sticky bar's arithmetic", () => {
  it("keeps the item under the header, within its container", () => {
    // still below the header: no move
    expect(stickyOffset(500, 2000, 245, 73, 16)).toBe(0);
    // scrolled 300 past the header
    expect(stickyOffset(-227, 2000, 245, 73, 16)).toBe(300);
    // at the container's end it stops
    expect(stickyOffset(-5000, 2000, 245, 73, 16)).toBe(1739);
    expect(stickyOffset(-5000, 100, 245, 73, 16)).toBe(0);
  });

  it("knows when the list's end is near the screen's bottom", () => {
    expect(nearEnd(0, 1000, 852, 800)).toBe(true);
    expect(nearEnd(0, 3000, 852, 800)).toBe(false);
  });
});

describe("ColourFaqs", () => {
  it("opens and closes each question in place", async () => {
    await render(<ColourFaqs faqs={[{ q: "Will the wall look like the screen?", a: "Close, not identical." }]} />);
    expect(screen.getByRole("header", { name: "Colour questions" })).toBeOnTheScreen();
    expect(screen.getByText("Before you pick")).toBeOnTheScreen();
    const q = screen.getByRole("button", { name: "Will the wall look like the screen?" });
    expect(screen.queryByText("Close, not identical.")).toBeNull();
    await fireEvent.press(q);
    expect(screen.getByText("Close, not identical.")).toBeOnTheScreen();
    expect(q).toBeExpanded();
    await fireEvent.press(q);
    expect(screen.queryByText("Close, not identical.")).toBeNull();
  });
});

describe("small pieces", () => {
  it("FamilyChip: the current family is not a link", async () => {
    const onPress = jest.fn();
    await render(
      <>
        <FamilyChip label="Blue" count={346} dot="#6c93c4" onPress={onPress} />
        <FamilyChip label="White" current />
      </>,
    );
    await fireEvent.press(screen.getByRole("link", { name: "Blue 346" }));
    expect(onPress).toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: "White" })).toBeNull();
    expect(screen.getByText("White")).toBeOnTheScreen();
  });

  it("LoadState: skeletons while loading, a failure with Try again, and a 404", async () => {
    const retry = jest.fn();
    const view = await render(<LoadState loading="Loading the shade cards…" retry={retry} />);
    // the intro's lines, a card's family strip and six swatches with their codes, announced as loading
    expect(screen.getByLabelText("Loading the shade cards…")).toBeBusy();
    expect(screen.getAllByTestId("skeleton", { includeHiddenElements: true })).toHaveLength(3 + 1 + 6 * 2);
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    await view.rerender(<LoadState loading="x" retry={retry} error={new ApiError("network", "Network error.")} />);
    expect(screen.queryByTestId("load-skeleton")).toBeNull();
    expect(screen.getByText("Network error.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
    await view.rerender(<LoadState loading="x" retry={retry} error={new ApiError("not_found", "No card", 404)} notFound={<Text>Page not found.</Text>} />);
    expect(screen.getByText("Page not found.")).toBeOnTheScreen();
  });

  it("CompareSection: a ruled list of links", async () => {
    await render(<CompareSection heading="Other shade cards" items={[{ label: "Colour finder", href: "/colours", text: "Search every card" }]} />);
    expect(screen.getByText("Compare brands")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Colour finder" }));
    pushed("/colours");
  });

  it("ShadeSwatches open the finder on the shade; a shade without a code is searched by name", async () => {
    await render(<ShadeSwatches shades={[swatch(1), swatch(2, null)]} label="Asian Paints blue shades" />);
    expect(screen.getByLabelText("Asian Paints blue shades")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "7001 Name 1, LRV 41" }));
    pushed("/colours", { brand: "asian-paints", q: "7001" });
    await fireEvent.press(screen.getByRole("link", { name: "Name 2, LRV 42" }));
    pushed("/colours", { brand: "asian-paints", q: "Name 2" });
  });

  it("PaintDbCredit links PaintDB and the licence and adds the note", async () => {
    await render(<PaintDbCredit credit={FALLBACK_CREDIT} />);
    expect(screen.getByText(/Hex values approximate each brand's published colours\. Screens vary/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "PaintDB" }));
    expect(Linking.openURL).toHaveBeenCalledWith(FALLBACK_CREDIT.source);
    await fireEvent.press(screen.getByRole("link", { name: "CC BY 4.0" }));
    expect(Linking.openURL).toHaveBeenCalledWith(FALLBACK_CREDIT.licenseUrl);
  });
});

describe("useLoad", () => {
  it("hands back the data, an API error as it came, anything else as a network error, and retries", async () => {
    const load = jest.fn().mockResolvedValueOnce("first").mockRejectedValueOnce(new ApiError("not_found", "x", 404)).mockRejectedValueOnce(new Error("boom")).mockResolvedValue("again");
    const { result } = await renderHook(() => useLoad(load, "k"));
    await act(async () => undefined);
    expect(result.current.data).toBe("first");
    await act(async () => result.current.retry());
    expect(result.current.error).toMatchObject({ status: 404 });
    await act(async () => result.current.retry());
    expect(result.current.error).toMatchObject({ code: "network" });
    await act(async () => result.current.retry());
    expect(result.current).toMatchObject({ data: "again", error: undefined });
  });
});

describe("the palettes", () => {
  const p = palettes[0];
  const facts = {
    [p.shades[0].id]: {
      lrv: 55,
      closest: [
        { id: "berger:7T1508", brand: "berger", brandName: "Berger Paints", code: "7T1508", name: "Garden Walkway", hex: "#bbcaac", lrv: 56, distance: 0.011, match: "Very close match" },
        { id: "nerolac:abyss", brand: "nerolac", brandName: "Kansai Nerolac", code: null, name: "Abyss", hex: "#bbcaac", lrv: 56, distance: 0.03, match: "Close match" },
      ],
    },
  };

  it("jump chips scroll to each palette", async () => {
    await render(<PaletteJump palettes={palettes} />);
    await fireEvent.press(screen.getByRole("link", { name: palettes[1].name }));
    expect(mockScrollTo).toHaveBeenCalledWith(palettes[1].slug);
  });

  it("a palette card: the room first, the shades by role with their LRV and closest matches, the tip and the booking", async () => {
    await render(<PaletteCard palette={p} facts={facts} />);
    expect(screen.getByLabelText(`A cosy living room, repainted in ${p.shades[0].name.replace(/-[a-z]$/, "")}`)).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: p.name })).toBeOnTheScreen();
    expect(screen.getByText(p.mood)).toBeOnTheScreen();
    expect(screen.getByText(p.rooms.join(" · "))).toBeOnTheScreen();
    expect(screen.getByText("Feature wall")).toBeOnTheScreen();
    expect(screen.getByText("Other walls & ceiling")).toBeOnTheScreen();
    expect(screen.getByText(`${p.shades[0].hex.toUpperCase()} · LRV 55 · ${p.shades[0].finish}`)).toBeOnTheScreen();
    // a shade the API has not described yet has no LRV
    expect(screen.getByText(`${p.shades[1].hex.toUpperCase()} · ${p.shades[1].finish}`)).toBeOnTheScreen();
    expect(screen.getByText(/Closest on screen: .*Kansai Nerolac Abyss \(close match\)/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Berger Paints Garden Walkway 7T1508" }));
    pushed("/colours", { brand: "berger", q: "7T1508" });
    await fireEvent.press(screen.getByRole("link", { name: `See Asian Paints ${p.shades[0].code} in the finder` }));
    pushed("/colours", { brand: "asian-paints", q: p.shades[0].code });
    expect(screen.getByText(`Inspector's tip: ${p.tip}`)).toBeOnTheScreen();
    // each palette's button says which palette it books (ten of them share the visible label)
    await fireEvent.press(screen.getByRole("button", { name: `Book an inspection with the ${p.name} palette` }));
    pushed("/book", { palette: p.slug });
  });

  it("holds each shade's LRV and closest matches in skeleton lines while they load", async () => {
    const one = palettes.slice(0, 1);
    const view = await render(<PaletteList palettes={one} facts={{}} loading credit={PAINTDB} />);
    expect(screen.getAllByLabelText("Loading the LRV and closest matches")).toHaveLength(one[0].shades.length);
    // the shade's own hex and finish show at once
    expect(screen.getByText(`${one[0].shades[0].hex.toUpperCase()} · ${one[0].shades[0].finish}`)).toBeOnTheScreen();
    await view.rerender(<PaletteList palettes={one} facts={facts} loading={false} credit={PAINTDB} />);
    expect(screen.queryByLabelText("Loading the LRV and closest matches")).toBeNull();
    // after a failure (not loading, no facts) there is nothing to wait for
    await view.rerender(<PaletteList palettes={one} facts={{}} credit={PAINTDB} />);
    expect(screen.queryByLabelText("Loading the LRV and closest matches")).toBeNull();
  });

  it("the list ends with the credit and the site's name", async () => {
    await render(<PaletteList palettes={palettes.slice(0, 1)} facts={{}} credit={PAINTDB} />);
    expect(screen.getByText(new RegExp(`${site.name} isn't affiliated with these brands`))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "PaintDB" }));
    expect(Linking.openURL).toHaveBeenCalledWith(PAINTDB.source);
    await fireEvent.press(screen.getByRole("link", { name: "CC BY 4.0" }));
    expect(Linking.openURL).toHaveBeenCalledWith(PAINTDB.licenseUrl);
  });
});

describe("the shade cards", () => {
  it("hub: the intro names the brands, and each card links its families with pages", async () => {
    await render(
      <>
        <HubIntro list={list} />
        <HubCards list={list} />
      </>,
    );
    expect(screen.getByText(/^5,819 shades from Asian Paints, Berger Paints and Kansai Nerolac, the brands we supply and apply\./)).toBeOnTheScreen();
    expect(screen.getByLabelText("Brand shade cards, you are here")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Choose a shade card" })).toBeOnTheScreen();
    expect(screen.getByText("2,221 shades in 3 colour families, LRV 0 to 96.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Berger Paints shade card" }));
    pushed("/shade-cards/berger");
    const families = within(screen.getByLabelText("Asian Paints colour families"));
    await fireEvent.press(families.getByRole("link", { name: "Blue 346" }));
    pushed("/shade-cards/asian-paints/blue");
    expect(families.queryByRole("link", { name: /Black/ })).toBeNull();
  });

  it("brand: the intro, chips that scroll to each family, the families and the other cards", async () => {
    await render(
      <>
        <CardIntro card={withSamples} />
        <CardFamilies card={withSamples} />
        <OtherCards card={asian} cards={list.cards} credit={FALLBACK_CREDIT} />
      </>,
    );
    expect(screen.getByText(/^2,221 shades from the Asian Paints shade card, in the order of the paper card: 3 colour families/)).toBeOnTheScreen();
    expect(screen.getByText(/^LRV \(light reflectance value\) runs from 0 to 96 on this card/)).toBeOnTheScreen();
    await fireEvent.press(within(screen.getByLabelText("Asian Paints colour families")).getByRole("link", { name: "Black 3" }));
    expect(mockScrollTo).toHaveBeenCalledWith("black");
    expect(screen.getByRole("header", { name: "Asian Paints white shades" })).toBeOnTheScreen();
    expect(screen.getByText("147 on the card, LRV 90 to 20, mostly neutral or warm undertones. 2 of them, lightest to darkest:")).toBeOnTheScreen();
    expect(screen.getByText("3 on the card, LRV 90 to 20, mostly neutral or warm undertones.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "All 346 blue shades" }));
    pushed("/shade-cards/asian-paints/blue");
    expect(screen.queryByRole("link", { name: /All 3 black/ })).toBeNull();
    expect(screen.getByRole("header", { name: "Other shade cards" })).toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: "Asian Paints shade card" })).toBeNull();
    expect(screen.getByText("1,575 shades")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Colour finder" }));
    pushed("/colours");
  });

  it("family: the intro, the card's other families, every shade and the same family elsewhere", async () => {
    await render(
      <>
        <FamilyIntro family={blue} card={asian} />
        <FamilyShades family={blue} />
        <SameFamily family={blue} cards={list.cards} credit={FALLBACK_CREDIT} />
      </>,
    );
    expect(
      screen.getByText(
        "All 346 blue shades on the Asian Paints card, from light to dark. LRV runs from 90 (Cream Pie) down to 20 (Walnut Cream); most have a neutral or warm undertone. Each swatch shows the code to quote to a painter or a paint shop. Tap one to see it on a room wall.",
      ),
    ).toBeOnTheScreen();
    const chips = within(screen.getByLabelText("Other Asian Paints colour families"));
    expect(chips.queryByRole("link", { name: "Blue" })).toBeNull();
    await fireEvent.press(chips.getByRole("link", { name: "White" }));
    pushed("/shade-cards/asian-paints/white");
    // a family without a page opens its section of the brand page
    await fireEvent.press(chips.getByRole("link", { name: "Black" }));
    pushed("/shade-cards/asian-paints", { section: "black" });
    expect(screen.getByRole("header", { name: "346 Asian Paints blue shades, light to dark" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Blue shades from other brands" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Berger blue shades" }));
    pushed("/shade-cards/berger/blue");
    expect(screen.getByText("377 on the Berger Paints card")).toBeOnTheScreen();
    // Nerolac's blue has no page, so it is not offered
    expect(screen.queryByRole("link", { name: "Nerolac blue shades" })).toBeNull();
    expect(screen.getByText("2,221 shades in 3 families")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "The whole Asian Paints card" }));
    pushed("/shade-cards/asian-paints");
  });

  it("family: before the cards load there are no chips and no count for the whole card", async () => {
    await render(
      <>
        <FamilyIntro family={blue} />
        <SameFamily family={blue} cards={[]} credit={FALLBACK_CREDIT} />
      </>,
    );
    expect(screen.queryByLabelText("Other Asian Paints colour families")).toBeNull();
    expect(screen.getByRole("link", { name: "The whole Asian Paints card" })).toBeOnTheScreen();
  });
});
