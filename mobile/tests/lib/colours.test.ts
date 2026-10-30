import { apiBase } from "~/lib/config";
import {
  FALLBACK_CREDIT,
  familyLabel,
  fetchBrands,
  PER_PAGE,
  searchShades,
  shadeBookingNote,
  shadeLabel,
  shadeUse,
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
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  note: "Hex values approximate each brand's published colours.",
};

const envelope = (data: unknown, meta: Record<string, unknown>) => ({ ok: true, status: 200, json: async () => ({ apiVersion: "v1", kind: "x", label: "x", data, meta }) }) as Response;
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

describe("searchShades", () => {
  it("asks for one page of the brand catalogue and keeps the licence fields", async () => {
    fetchMock.mockResolvedValue(envelope([shade], { total: 1, page: 1, pages: 1, ...credit }));
    const page = await searchShades({ q: "  8386 ", brand: "asian-paints", family: "green" });
    expect(fetchMock.mock.calls[0][0]).toBe(`${apiBase()}/api/v1/colours/paint?q=8386&brand=asian-paints&family=green&page=1&perPage=${PER_PAGE}`);
    expect(page).toEqual({ shades: [shade], total: 1, page: 1, pages: 1, credit });
  });

  it("sends the family only inside a brand, caps the text at 80 characters, and fills missing counts", async () => {
    fetchMock.mockResolvedValue(envelope([shade, shade], {}));
    const page = await searchShades({ q: "x".repeat(120), family: "green", page: 3 });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("family")).toBeNull();
    expect(url.searchParams.get("q")).toHaveLength(80);
    expect(page).toMatchObject({ total: 2, page: 3, pages: 1, credit: FALLBACK_CREDIT });
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
});
