import { apiBase } from "~/lib/config";
import {
  clearColourCache,
  FALLBACK_CREDIT,
  familyLabel,
  fetchBrands,
  fetchPaletteFacts,
  fetchShadeCard,
  fetchShadeCards,
  fetchShadeFamily,
  finderHref,
  formatCount,
  isSort,
  joinAnd,
  PER_PAGE,
  searchShades,
  shadeBookingNote,
  shadeCardPath,
  shadeLabel,
  shadeParam,
  shadeUse,
  swatchHref,
  textOnSwatch,
  type PaintShade,
} from "~/lib/colours";

const shade: PaintShade = {
  id: "asian-paints:8386",
  brand: "asian-paints",
  brandName: "Asian Paints",
  code: "8386",
  name: "Pepper Leaf",
  hex: "#bbc8b2",
  lrv: 55,
  family: "green",
  undertone: "Cool Green",
  interior: true,
  exterior: true,
};

const credit = {
  attribution: "Shade data: PaintDB (paintdb.com), CC BY 4.0",
  source: "https://paintdb.com",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  note: "Hex values approximate each brand's published colours.",
};

const envelope = (data: unknown, meta: Record<string, unknown>) => ({ ok: true, status: 200, json: async () => ({ apiVersion: "v1", kind: "x", label: "x", data, meta }) }) as Response;
const notFound = () => ({ ok: false, status: 404, json: async () => ({ apiVersion: "v1", kind: "error", label: "x", error: { code: "not_found", message: "No shade card" } }) }) as Response;
const fetchMock = jest.fn();
const url = (i = 0) => fetchMock.mock.calls[i][0] as string;

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  clearColourCache();
});

describe("searchShades", () => {
  it("asks for one page of the brand catalogue and keeps the licence fields", async () => {
    fetchMock.mockResolvedValue(envelope([shade], { total: 1, page: 1, pages: 1, ...credit }));
    const page = await searchShades({ q: "  8386 ", brand: "asian-paints", family: "green" });
    expect(url()).toBe(`${apiBase()}/api/v1/colours/paint?q=8386&brand=asian-paints&family=green&page=1&perPage=${PER_PAGE}`);
    expect(page).toEqual({ shades: [shade], total: 1, page: 1, pages: 1, credit });
  });

  it("sends the order only when it is not the shade-card order", async () => {
    fetchMock.mockResolvedValue(envelope([shade], {}));
    await searchShades({ brand: "berger", sort: "code", page: 2 });
    expect(new URL(url()).searchParams.get("sort")).toBe("code");
    await searchShades({ brand: "berger", sort: "shade", page: 2 });
    expect(new URL(url(1)).searchParams.get("sort")).toBeNull();
  });

  it("sends the family only inside a brand, caps the text at 80 characters, and fills missing counts", async () => {
    fetchMock.mockResolvedValue(envelope([shade, shade], {}));
    const page = await searchShades({ q: "x".repeat(120), family: "green", page: 3 });
    const sp = new URL(url()).searchParams;
    expect(sp.get("family")).toBeNull();
    expect(sp.get("q")).toHaveLength(80);
    expect(page).toMatchObject({ total: 2, page: 3, pages: 1, credit: FALLBACK_CREDIT });
  });

  it("asks once per page for the session, and again after a failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(searchShades({ brand: "nerolac" })).rejects.toMatchObject({ code: "network" });
    fetchMock.mockResolvedValue(envelope([shade], { total: 1 }));
    await searchShades({ brand: "nerolac" });
    await searchShades({ brand: "nerolac" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps at most a few hundred answers, dropping the oldest", async () => {
    fetchMock.mockResolvedValue(envelope([], {}));
    for (let p = 1; p <= 301; p++) await searchShades({ brand: "berger", page: p });
    await searchShades({ brand: "berger", page: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(302);
  });
});

describe("fetchBrands", () => {
  it("returns the brands, the colour families and the shade count", async () => {
    const brands = [{ slug: "berger", name: "Berger Paints", count: 1575 }];
    fetchMock.mockResolvedValue(envelope(brands, { shades: 8539, families: ["white", 7, "green"], ...credit }));
    await expect(fetchBrands()).resolves.toEqual({ brands, families: ["white", "green"], shades: 8539, credit });
  });

  it("copes with a response without families or counts", async () => {
    fetchMock.mockResolvedValue(envelope([], {}));
    await expect(fetchBrands()).resolves.toEqual({ brands: [], families: [], shades: 0, credit: FALLBACK_CREDIT });
  });
});

describe("shade cards", () => {
  const card = { slug: "berger", name: "Berger Paints", shortName: "Berger", count: 1575, lrv: { min: 1, max: 92 }, families: [] };

  it("lists the cards with the number of shades", async () => {
    fetchMock.mockResolvedValue(envelope([card], { shades: 8539, ...credit }));
    await expect(fetchShadeCards()).resolves.toEqual({ cards: [card], shades: 8539, credit });
    expect(url()).toBe(`${apiBase()}/api/v1/colours/shade-cards`);
  });

  it("adds the cards' counts up when the total is missing", async () => {
    fetchMock.mockResolvedValue(envelope([card, card], {}));
    await expect(fetchShadeCards()).resolves.toMatchObject({ shades: 3150 });
  });

  it("fetches one card and one family by path", async () => {
    fetchMock.mockResolvedValue(envelope(card, credit));
    await expect(fetchShadeCard("berger")).resolves.toEqual({ card, credit });
    expect(url()).toBe(`${apiBase()}/api/v1/colours/shade-cards/berger`);
    const family = { family: "blue", shades: [] };
    fetchMock.mockResolvedValue(envelope(family, credit));
    await expect(fetchShadeFamily("berger", "blue")).resolves.toEqual({ family, credit });
    expect(url(1)).toBe(`${apiBase()}/api/v1/colours/shade-cards/berger/blue`);
  });

  it("passes a 404 on with its status", async () => {
    fetchMock.mockResolvedValue(notFound());
    await expect(fetchShadeCard("acme")).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("builds the finder and card links", () => {
    expect(swatchHref({ brand: "nerolac", query: "Absicon" })).toBe("/colours?brand=nerolac&q=Absicon");
    expect(finderHref({ brand: "asian-paints", code: "8386" })).toBe("/colours?brand=asian-paints&q=8386");
    expect(shadeCardPath("berger")).toBe("/shade-cards/berger");
    expect(shadeCardPath("berger", "blue")).toBe("/shade-cards/berger/blue");
  });
});

describe("fetchPaletteFacts", () => {
  it("indexes each palette shade's LRV and closest matches by id", async () => {
    const match = { id: "berger:7T1508", brand: "berger", brandName: "Berger Paints", code: "7T1508", name: "Garden Walkway", hex: "#bbcaac", lrv: 56, distance: 0.011, match: "Very close match" };
    fetchMock.mockResolvedValue(
      envelope([{ colours: { featureWall: { id: "asian-paints:8386", lrv: 55, closest: [match] }, otherWalls: { id: "asian-paints:L146" }, accent: { id: "asian-paints:8504", lrv: "x", closest: "y" } } }], {}),
    );
    await expect(fetchPaletteFacts()).resolves.toEqual({
      "asian-paints:8386": { lrv: 55, closest: [match] },
      "asian-paints:L146": { lrv: null, closest: [] },
      "asian-paints:8504": { lrv: null, closest: [] },
    });
    expect(url()).toBe(`${apiBase()}/api/v1/palettes`);
  });
});

describe("shade helpers", () => {
  it("picks readable text for a swatch", () => {
    expect(textOnSwatch("#ffffff")).toBe("#242522");
    expect(textOnSwatch("#bbc8b2")).toBe("#242522");
    expect(textOnSwatch("#1d2b4f")).toBe("#f8f5ef");
    expect(textOnSwatch("#000")).toBe("#242522");
  });

  it("labels a shade and writes the booking note the website writes", () => {
    expect(shadeLabel(shade)).toBe("Asian Paints 8386 Pepper Leaf");
    expect(shadeBookingNote(shade)).toBe("Interested in Asian Paints 8386 Pepper Leaf (#BBC8B2). Please bring the shade card.");
  });

  it("says where a shade can be used", () => {
    expect(shadeUse(shade)).toBe("Interior and exterior");
    expect(shadeUse({ interior: true, exterior: false })).toBe("Interior");
    expect(shadeUse({ interior: false, exterior: true })).toBe("Exterior");
    expect(shadeUse({ interior: false, exterior: false })).toBe("Not stated");
  });

  it("capitalises a family", () => {
    expect(familyLabel("green")).toBe("Green");
    expect(familyLabel("")).toBe("");
  });

  it("prints counts with Indian digit grouping, as toLocaleString('en-IN') does", () => {
    expect(formatCount(7)).toBe("7");
    expect(formatCount(346)).toBe("346");
    expect(formatCount(8539)).toBe("8,539");
    expect(formatCount(123456)).toBe("1,23,456");
    expect(formatCount(12345678)).toBe("1,23,45,678");
    expect(formatCount(-2221)).toBe("-2,221");
    expect(formatCount(1234.5)).toBe("1,234.5");
  });

  it("joins a list with a final 'and'", () => {
    expect(joinAnd(["A", "B", "C"])).toBe("A, B and C");
    expect(joinAnd(["A"])).toBe("A");
  });

  it("knows the three orders", () => {
    expect(isSort("code")).toBe(true);
    expect(isSort("random")).toBe(false);
    expect(isSort(undefined)).toBe(false);
  });

  it("reads an old visualizer link's shade as a brand and a search", () => {
    expect(shadeParam("asian-paints:8386")).toEqual({ brand: "asian-paints", q: "8386" });
    expect(shadeParam("dunn:7-1:a")).toEqual({ brand: "dunn", q: "7-1:a" });
    expect(shadeParam("asian-paints")).toBeUndefined();
    expect(shadeParam(undefined)).toBeUndefined();
  });
});
