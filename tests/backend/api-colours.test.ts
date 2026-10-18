import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { colours } from "@/config/colours";
import { palettes } from "@/config/palettes";
import { apiError, apiOk } from "@/lib/api";
import { GET as listColours } from "@/app/api/v1/colours/route";
import { GET as oneColour } from "@/app/api/v1/colours/[code]/route";
import { GET as listPalettes } from "@/app/api/v1/palettes/route";

const get = (url: string) => new NextRequest(`http://localhost:3000${url}`);
const one = (code: string) => oneColour(get(`/api/v1/colours/${code}`), { params: Promise.resolve({ code }) });

describe("API envelope", () => {
  it("wraps data with version, kind, label, meta and optional links", async () => {
    const res = apiOk({ kind: "thing", label: "One thing", data: { a: 1 }, meta: { total: 1 }, links: { self: "/x" } });
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "thing", label: "One thing", data: { a: 1 }, meta: { total: 1 }, links: { self: "/x" } });
    expect(typeof body.meta.generatedAt).toBe("string");

    const plain = await apiOk({ kind: "t", label: "l", data: [] }).json();
    expect(plain).not.toHaveProperty("links");
  });

  it("errors use the same envelope with an error object", async () => {
    const res = apiError(418, "teapot", "Short and stout.", ["detail"]);
    expect(res.status).toBe(418);
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "error", label: "Short and stout.", error: { code: "teapot", message: "Short and stout.", details: ["detail"] } });
    const bare = await apiError(400, "x", "y").json();
    expect(bare.error).not.toHaveProperty("details");
  });
});

describe("GET /api/v1/colours", () => {
  it("returns the whole catalogue with a readable label and per-item links", async () => {
    const res = listColours(get("/api/v1/colours"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("public");
    const body = await res.json();
    expect(body.apiVersion).toBe("v1");
    expect(body.kind).toBe("colour");
    expect(body.label).toBe(`${colours.length} Paint Man wall colours`);
    expect(body.data).toHaveLength(colours.length);
    expect(body.data[0]).toMatchObject({ code: "PM-101", name: "Taj White", links: { self: "/api/v1/colours/PM-101", html: "/colours/PM-101" } });
    expect(body.meta).toMatchObject({ total: colours.length, query: { q: "", family: null, room: null, limit: null } });
    expect(body.meta.hints.families).toContain("Greens");
    expect(body.links.html).toBe("/colours");
  });

  it("searches and describes the query in the label", async () => {
    const body = await listColours(get("/api/v1/colours?q=sage&family=Greens&room=Bedroom&limit=1")).json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].code).toBe("PM-502");
    expect(body.label).toBe('1 Paint Man wall colour matching "sage", in Greens, for Bedroom');
    expect(body.links.html).toBe("/colours?q=sage");
  });

  it("rejects unknown families and rooms and bad limits with hints", async () => {
    const fam = listColours(get("/api/v1/colours?family=Neons"));
    expect(fam.status).toBe(400);
    const famBody = await fam.json();
    expect(famBody.error.code).toBe("invalid_family");
    expect(famBody.error.details).toContain("Greens");

    const room = await listColours(get("/api/v1/colours?room=Garage"));
    expect(room.status).toBe(400);
    expect((await room.json()).error.code).toBe("invalid_room");

    for (const bad of ["0", "101", "abc", "2.5"]) {
      const res = listColours(get(`/api/v1/colours?limit=${bad}`));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("invalid_limit");
    }
  });

  it("truncates absurdly long queries instead of failing", async () => {
    const body = await listColours(get(`/api/v1/colours?q=${"a".repeat(500)}`)).json();
    expect(body.meta.query.q).toHaveLength(80);
  });
});

describe("GET /api/v1/colours/[code]", () => {
  it("returns one shade with pairings, similar shades and a booking link", async () => {
    const res = await one("pm502");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("colour");
    expect(body.label).toContain("Sage Mist (PM-502)");
    expect(body.data.code).toBe("PM-502");
    expect(body.data.pairings.map((p: { code: string }) => p.code)).toEqual(["PM-102", "PM-204"]);
    expect(body.data.similar.length).toBeGreaterThan(0);
    expect(body.links).toEqual({ self: "/api/v1/colours/PM-502", html: "/colours/PM-502", book: "/book?colour=PM-502" });
  });

  it("404s in the envelope for an unknown code", async () => {
    const res = await one("PM-999");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.kind).toBe("error");
    expect(body.error.code).toBe("not_found");
  });
});

describe("GET /api/v1/palettes", () => {
  it("lists palettes with the three shades resolved by role", async () => {
    const res = listPalettes(get("/api/v1/palettes"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("palette");
    expect(body.data).toHaveLength(palettes.length);
    expect(body.data[0].colours.featureWall).toMatchObject({ code: "PM-502", name: "Sage Mist", links: { html: "/colours/PM-502" } });
    expect(body.data[0].links).toEqual({ html: "/palettes#calm-bedroom", book: "/book?palette=calm-bedroom" });
  });

  it("filters by room and rejects unknown rooms", async () => {
    const body = await listPalettes(get("/api/v1/palettes?room=Exterior")).json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((p: { rooms: string[] }) => p.rooms.includes("Exterior"))).toBe(true);
    expect(body.label).toContain("for Exterior");
    const bad = listPalettes(get("/api/v1/palettes?room=Garage"));
    expect(bad.status).toBe(400);
  });
});
