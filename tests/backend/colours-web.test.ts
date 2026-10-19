import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { familyOf, loadWebColours, resetWebColourCache, searchWebColours, toWebColour } from "@/lib/colours/web";

const sample = {
  colors: [
    { name: "Sage Leaf", hex: "#9BA88D", hsl: { h: 88, s: 14, l: 61 }, luminanceWCAG: 0.36 },
    { name: "Sage", hex: "#87AE73", hsl: { h: 100, s: 27, l: 57 }, luminanceWCAG: 0.37 },
    { name: "Dusty Sage", hex: "#B2BBA0", hsl: { h: 80, s: 16, l: 68 }, luminanceWCAG: 0.48 },
    { name: "Snow", hex: "#FFFAFA", hsl: { h: 0, s: 100, l: 99 }, luminanceWCAG: 0.96 },
    { name: "Graphite", hex: "#383838", hsl: { h: 0, s: 0, l: 22 }, luminanceWCAG: 0.04 },
    { name: "Navy Night", hex: "#1C2541", hsl: { h: 225, s: 40, l: 18 }, luminanceWCAG: 0.02 },
    { name: "bad", hex: "oops", hsl: { h: 0, s: 0, l: 0 } },
  ],
};
const okFetch = (() => Promise.resolve(new Response(JSON.stringify(sample), { status: 200 }))) as unknown as typeof fetch;

afterEach(() => resetWebColourCache());

describe("named colours (color.pizza)", () => {
  it("classifies by hue, saturation and lightness into our families", () => {
    expect(familyOf(0, 100, 99)).toBe("Whites");
    expect(familyOf(0, 0, 22)).toBe("Greys");
    expect(familyOf(40, 15, 60)).toBe("Beiges");
    expect(familyOf(3, 57, 50)).toBe("Reds");
    expect(familyOf(3, 57, 85)).toBe("Pinks");
    expect(familyOf(25, 30, 40)).toBe("Browns");
    expect(familyOf(25, 80, 55)).toBe("Oranges");
    expect(familyOf(50, 80, 55)).toBe("Yellows");
    expect(familyOf(80, 40, 50)).toBe("Olives");
    expect(familyOf(120, 40, 50)).toBe("Greens");
    expect(familyOf(180, 40, 50)).toBe("Teals");
    expect(familyOf(225, 40, 18)).toBe("Blues");
    expect(familyOf(280, 40, 50)).toBe("Purples");
    expect(familyOf(330, 40, 50)).toBe("Pinks");
  });

  it("loads once, drops malformed entries, lowercases hex and caches", async () => {
    const fetcher = vi.fn(okFetch);
    const a = await loadWebColours(fetcher);
    const b = await loadWebColours(fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(a).toHaveLength(6);
    expect(a[1]).toEqual({ name: "Sage", hex: "#87ae73", family: "Greens", lrv: 37 });
    expect(toWebColour({ name: "x", hex: "#ABCDEF", hsl: { h: 210, s: 68, l: 80 } }).lrv).toBe(0);
  });

  it("surfaces a source failure instead of caching it", async () => {
    const bad = vi.fn(() => Promise.resolve(new Response("nope", { status: 503 }))) as unknown as typeof fetch;
    await expect(loadWebColours(bad)).rejects.toThrow(/503/);
    const fetcher = vi.fn(okFetch);
    expect(await loadWebColours(fetcher)).toHaveLength(6);
  });

  it("ranks name matches (prefix, word, substring), finds nearest to a hex, filters and pages", async () => {
    const items = await loadWebColours(okFetch);
    expect(searchWebColours(items, { q: "sage" }).items.map((c) => c.name)).toEqual(["Sage", "Sage Leaf", "Dusty Sage"]);
    expect(searchWebColours(items, { q: "#1c2540" }).items[0].name).toBe("Navy Night");
    expect(searchWebColours(items, { family: "Greens" }).total).toBe(1);
    const paged = searchWebColours(items, { perPage: 2, page: 2 });
    expect(paged).toMatchObject({ page: 2, pages: 3, total: 6 });
    expect(paged.items).toHaveLength(2);
    expect(searchWebColours(items, { perPage: 2, page: 99 }).page).toBe(3);
  });
});

describe("GET /api/v1/colours/web", () => {
  const get = (url: string) => new NextRequest(`http://localhost:3000${url}`);

  it("answers in the envelope with paging and the source", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(okFetch);
    const { GET } = await import("@/app/api/v1/colours/web/route");
    const res = await GET(get("/api/v1/colours/web?q=sage&perPage=2"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("web-colour");
    expect(body.label).toBe('3 named colours matching "sage" (page 1 of 2)');
    expect(body.data.map((c: { name: string }) => c.name)).toEqual(["Sage", "Sage Leaf"]);
    expect(body.meta).toMatchObject({ total: 3, pages: 2, perPage: 2, source: expect.stringContaining("color.pizza") });
    expect(body.links.html).toBe("/visualizer"); // named colours are a tab of the visualizer
    expect(body.meta.hints.families).toContain("Greens");
  });

  it("validates family, page and perPage", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(okFetch);
    const { GET } = await import("@/app/api/v1/colours/web/route");
    expect((await GET(get("/api/v1/colours/web?family=Neons"))).status).toBe(400);
    expect((await (await GET(get("/api/v1/colours/web?page=0"))).json()).error.code).toBe("invalid_page");
    expect((await (await GET(get("/api/v1/colours/web?perPage=500"))).json()).error.code).toBe("invalid_per_page");
  });

  it("returns 503 in the envelope when the source is down", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(new Response("x", { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("@/app/api/v1/colours/web/route");
    const res = await GET(get("/api/v1/colours/web"));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("source_unavailable");
  });
});
