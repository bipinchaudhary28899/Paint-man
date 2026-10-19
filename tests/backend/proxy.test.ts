import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { canonicalColourPath, config, proxy } from "@/proxy";

// The proxy runs before the route cache. Shade URLs: case variants get a 308 to the canonical
// upper-case code, and everything else under /colours passes through untouched (no noindex, no
// no-store), so curated shade pages stay cacheable and indexable. /admin and /api keep their gate
// and headers exactly as before.

const get = (path: string, cookie?: string) => new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} });

describe("proxy: one URL per shade", () => {
  it("sends a lower- or mixed-case code to the upper-case URL with a 308", () => {
    for (const path of ["/colours/pm-502", "/colours/Pm-502", "/colours/pM-1205"]) {
      const res = proxy(get(path));
      expect(res.status, path).toBe(308);
      expect(res.headers.get("location")).toBe(`http://localhost:3000${path.toUpperCase().replace("/COLOURS/", "/colours/")}`);
    }
    expect(proxy(get("/colours/pm-502")).headers.get("location")).toBe("http://localhost:3000/colours/PM-502");
  });

  it("keeps the query string on the redirect", () => {
    const res = proxy(get("/colours/pm-502?from=finder&ref=a%20b"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost:3000/colours/PM-502?from=finder&ref=a%20b");
  });

  it("lets the canonical URL through without the admin/api headers", () => {
    const res = proxy(get("/colours/PM-502"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("x-robots-tag")).toBeNull();
    expect(res.headers.get("cache-control")).toBeNull();
  });

  it("leaves short forms and unknown codes to the page (which redirects or 404s them)", () => {
    for (const path of ["/colours/502", "/colours/pm502", "/colours/sage", "/colours/PM-9999"]) {
      const res = proxy(get(path));
      expect(res.headers.get("location"), path).toBeNull();
      expect(res.headers.get("x-robots-tag"), path).toBeNull();
    }
  });

  it("knows the canonical path for a shade URL", () => {
    expect(canonicalColourPath("/colours/pm-502")).toBe("/colours/PM-502");
    expect(canonicalColourPath("/colours/PM-502")).toBeNull();
    expect(canonicalColourPath("/colours/502")).toBeNull();
    expect(canonicalColourPath("/colours/pm-502/extra")).toBeNull();
    expect(canonicalColourPath("/colours")).toBeNull();
    expect(canonicalColourPath("/palettes/pm-502")).toBeNull();
  });

  it("runs for shade pages as well as /admin and /api", () => {
    expect(config.matcher).toEqual(["/admin/:path*", "/api/:path*", "/colours/:code"]);
  });
});

describe("proxy: /admin and /api unchanged", () => {
  it("redirects /admin without a session cookie to the login page, noindex", () => {
    const res = proxy(get("/admin"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin/login");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("passes /admin/login and /admin with a cookie through, noindex and no-store", () => {
    for (const res of [proxy(get("/admin/login")), proxy(get("/admin/leads", "pm_admin=x"))]) {
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      expect(res.headers.get("cache-control")).toBe("no-store, max-age=0");
    }
  });

  it("marks every /api response noindex and no-store", () => {
    const res = proxy(get("/api/v1/colours/PM-502"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(res.headers.get("cache-control")).toBe("no-store, max-age=0");
  });
});
