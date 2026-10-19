import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { legacyShades } from "@/config/legacy-shades";
import { palettes, rooms } from "@/config/palettes";
import { apiError, apiOk, publicCache } from "@/lib/api";
import { GET as listColours } from "@/app/api/v1/colours/route";
import { GET as oneColour } from "@/app/api/v1/colours/[code]/route";
import { GET as listPalettes } from "@/app/api/v1/palettes/route";

const get = (url: string) => new NextRequest(`http://localhost:3000${url}`);

describe("API envelope", () => {
  it("wraps data with version, kind, label, meta and optional links", async () => {
    const res = apiOk({ kind: "thing", label: "One thing", data: { a: 1 }, meta: { total: 1 }, links: { self: "/x" } });
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "thing", label: "One thing", data: { a: 1 }, meta: { total: 1 }, links: { self: "/x" } });
    expect(typeof body.meta.generatedAt).toBe("string");

    const plain = await apiOk({ kind: "t", label: "l", data: [] }).json();
    expect(plain).not.toHaveProperty("links");
  });

  it("errors use the same envelope with an error object, uncached unless asked", async () => {
    const res = apiError(418, "teapot", "Short and stout.", ["detail"]);
    expect(res.status).toBe(418);
    expect(res.headers.get("cache-control")).toBeNull();
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "error", label: "Short and stout.", error: { code: "teapot", message: "Short and stout.", details: ["detail"] } });
    const bare = await apiError(400, "x", "y").json();
    expect(bare.error).not.toHaveProperty("details");
    expect(apiError(410, "gone", "Gone.", undefined, publicCache).headers.get("cache-control")).toBe(publicCache["Cache-Control"]);
  });
});

/** What a client of a retired shade endpoint gets: 410, the error envelope and where to go instead. */
async function expectGone(res: Response, replacement?: unknown) {
  expect(res.status).toBe(410);
  expect(res.headers.get("cache-control")).toBe(publicCache["Cache-Control"]);
  const body = await res.json();
  expect(body).toMatchObject({ apiVersion: "v1", kind: "error", error: { code: "gone" } });
  expect(body.label).toBe(body.error.message);
  expect(body.error.message).toContain("/api/v1/colours/paint");
  const successors = { search: "/api/v1/colours/paint", brands: "/api/v1/colours/brands", html: "/colours" };
  expect(body.error.details).toEqual(replacement ? { ...successors, replacement } : successors);
  expect(typeof body.meta.generatedAt).toBe("string");
  return body;
}

const oneColourAt = (code: string) => oneColour(get(`/api/v1/colours/${encodeURIComponent(code)}`), { params: Promise.resolve({ code }) });

describe("GET /api/v1/colours (retired)", () => {
  it("answers 410 Gone with the brand-shade endpoints, whatever the query", async () => {
    await expectGone(listColours());
  });
});

describe("GET /api/v1/colours/{code} (retired)", () => {
  it("answers 410 Gone for an old Paint Man code, naming its nearest Asian Paints shade", async () => {
    const [pm, code] = Object.entries(legacyShades)[0];
    const replacement = { id: `asian-paints:${code}`, self: `/api/v1/colours/paint?brand=asian-paints&q=${code}`, html: `/colours?brand=asian-paints&q=${code}` };
    const body = await expectGone(await oneColourAt(pm), replacement);
    expect(body.error.message).toContain(`asian-paints:${code}`);
    await expectGone(await oneColourAt(pm.toLowerCase().replace("-", "")), replacement); // short forms too
    // and the replacement is a real shade the paint API finds
    const { GET: searchPaint } = await import("@/app/api/v1/colours/paint/route");
    const found = await (await searchPaint(get(replacement.self))).json();
    expect(found.data.map((s: { id: string }) => s.id)).toContain(replacement.id);
  });

  it("answers the plain 410 for anything that was never a Paint Man code", async () => {
    for (const code of ["sage", "99999", "asian-paints:8386", ""]) await expectGone(await oneColourAt(code));
  });
});

describe("GET /api/v1/palettes", () => {
  it("lists palettes with the three brand shades by role, field names unchanged", async () => {
    const res = listPalettes(get("/api/v1/palettes"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe(publicCache["Cache-Control"]);
    const body = await res.json();
    expect(body.kind).toBe("palette");
    expect(body.label).toBe("10 wall colour palettes, each three brand paint shades: a feature wall, the other walls and an accent");
    expect(body.label).not.toMatch(/Paint Man/);
    expect(body.data).toHaveLength(palettes.length);
    const calm = body.data[0];
    expect(calm).toMatchObject({ slug: "calm-bedroom", name: "Calm bedroom", rooms: ["Bedroom"], description: palettes[0].description, tip: palettes[0].tip });
    expect(Object.keys(calm.colours)).toEqual(["featureWall", "otherWalls", "accent"]);
    expect(calm.colours.featureWall).toEqual({
      code: "8386",
      name: "Pepper Leaf",
      hex: "#bbc8b2",
      finish: "Matt emulsion",
      id: "asian-paints:8386",
      brand: "asian-paints",
      brandName: "Asian Paints",
      links: { self: "/api/v1/colours/paint?brand=asian-paints&q=8386", html: "/colours?brand=asian-paints&q=8386" },
    });
    expect(calm.links).toEqual({ html: "/palettes#calm-bedroom", book: "/book?palette=calm-bedroom" });
    expect(body.meta).toMatchObject({ total: palettes.length, query: { room: null }, hints: { rooms: [...rooms] } });
    expect(body.links).toEqual({ self: "/api/v1/palettes", html: "/palettes" });
  });

  it("filters by room and rejects unknown rooms with the valid ones", async () => {
    const body = await listPalettes(get("/api/v1/palettes?room=Exterior")).json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((p: { rooms: string[] }) => p.rooms.includes("Exterior"))).toBe(true);
    expect(body.label).toContain("for Exterior");
    expect(body.meta.query).toEqual({ room: "Exterior" });
    const one = await listPalettes(get("/api/v1/palettes?room=Pooja%20room")).json();
    expect(one.label).toMatch(/^1 wall colour palette for Pooja room,/);

    const bad = listPalettes(get("/api/v1/palettes?room=Garage"));
    expect(bad.status).toBe(400);
    const err = await bad.json();
    expect(err.error).toMatchObject({ code: "invalid_room", details: [...rooms] });
  });
});

describe("GET /api/v1/colours/web (retired with the photo visualizer)", () => {
  it("answers 410 gone with the brand-shade successors and a cacheable body", async () => {
    const { GET } = await import("@/app/api/v1/colours/web/route");
    const res = GET();
    expect(res.status).toBe(410);
    expect(res.headers.get("cache-control")).toBe(publicCache["Cache-Control"]);
    const body = await res.json();
    expect(body).toMatchObject({
      apiVersion: "v1",
      kind: "error",
      error: { code: "gone", details: { search: "/api/v1/colours/paint", brands: "/api/v1/colours/brands", html: "/colours" } },
    });
    expect(body.error.message).toMatch(/visualizer, which was retired/);
  });
});
