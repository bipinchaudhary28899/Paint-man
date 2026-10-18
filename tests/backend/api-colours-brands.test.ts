import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as brandsGET } from "@/app/api/v1/colours/brands/route";
import { GET } from "@/app/api/v1/colours/paint/route";

const get = (path: string) => GET(new NextRequest(`http://localhost:3000${path}`));

describe("GET /api/v1/colours/paint", () => {
  it("answers in the envelope with paging, attribution and public caching", async () => {
    const res = await get("/api/v1/colours/paint?q=asian%20paints%207982&perPage=5");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = await res.json();
    expect(body).toMatchObject({ apiVersion: "v1", kind: "paint-colour" });
    expect(body.label).toMatch(/matching "7982", from Asian Paints/);
    expect(body.data[0]).toMatchObject({ id: "asian-paints:7982", code: "7982", name: "Mecca Gold", brandName: "Asian Paints" });
    expect(body.meta).toMatchObject({ query: { brand: "asian-paints" }, license: "CC BY 4.0", attribution: expect.stringContaining("PaintDB"), catalogueSize: 50762 });
    expect(body.links.html).toBe("/colours?catalogue=brands&q=asian+paints+7982");
  });

  it("filters by brand and family", async () => {
    const body = await (await get("/api/v1/colours/paint?brand=asian-paints&family=blue&perPage=48&page=2")).json();
    expect(body.meta).toMatchObject({ total: 346, page: 2, pages: 8, perPage: 48, query: { sort: "shade" } });
    const byCode = await (await get("/api/v1/colours/paint?brand=asian-paints&sort=code&perPage=3")).json();
    expect(byCode.meta.query.sort).toBe("code");
    expect(body.data).toHaveLength(48);
    expect(body.links.html).toContain("brand=asian-paints");
  });

  it("validates brand, family, page and perPage with hints", async () => {
    const bad = await get("/api/v1/colours/paint?brand=acme");
    expect(bad.status).toBe(400);
    const body = await bad.json();
    expect(body.error.code).toBe("invalid_brand");
    expect(body.error.details).toContain("asian-paints");
    expect((await (await get("/api/v1/colours/paint?family=plaid")).json()).error.code).toBe("invalid_family");
    expect((await (await get("/api/v1/colours/paint?page=0")).json()).error.code).toBe("invalid_page");
    const sort = await (await get("/api/v1/colours/paint?sort=random")).json();
    expect(sort.error).toMatchObject({ code: "invalid_sort", details: ["shade", "code", "name"] });
    expect((await (await get("/api/v1/colours/paint?perPage=101")).json()).error.code).toBe("invalid_per_page");
  });
});

describe("GET /api/v1/colours/brands", () => {
  it("lists the 25 brands with counts, families and attribution", async () => {
    const res = brandsGET();
    const body = await res.json();
    expect(body.kind).toBe("paint-brand");
    expect(body.label).toBe("25 paint brands, 50,762 shades in all");
    expect(body.data[0]).toEqual({ slug: "asian-paints", name: "Asian Paints", count: 2221 });
    expect(body.meta.families).toContain("blue");
    expect(body.meta.license).toBe("CC BY 4.0");
    expect(res.headers.get("cache-control")).toContain("public");
  });
});
