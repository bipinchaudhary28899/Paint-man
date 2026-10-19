import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { legacyShadeCode, legacyShades, LEGACY_SHADE_BRAND } from "@/config/legacy-shades";
import { sessionCookieName } from "@/lib/auth/session";
import { getBrandShade } from "@/lib/colours/brands";
import { config, legacyShadePath, proxy } from "@/proxy";

// The proxy runs before the route cache. Paint Man's own shade pages (PM-xxx) were retired: every
// old /colours/<code> URL answers 308 with the colour finder searching the nearest Asian Paints
// shade, and anything else under /colours passes through untouched (no noindex, no no-store) to
// Next's 404. /admin and /api keep their gate and headers exactly as before.

const get = (path: string, cookie?: string) => new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} });
const finder = (code: string) => `http://localhost:3000/colours?brand=asian-paints&q=${code}`;

describe("legacy Paint Man shade codes", () => {
  const entries = Object.entries(legacyShades);

  it("maps all 167 retired codes, each to a real Asian Paints shade", () => {
    expect(entries).toHaveLength(167);
    expect(LEGACY_SHADE_BRAND).toBe("asian-paints");
    for (const [pm, code] of entries) {
      expect(pm, pm).toMatch(/^PM-\d{3,4}$/);
      const shade = getBrandShade(`${LEGACY_SHADE_BRAND}:${code}`);
      expect(shade, `${pm} → ${code}`).toBeDefined();
      expect(shade!.code, pm).toBe(code); // the exact code as printed on the shade card
    }
  });

  it("looks codes up in any case and ignores everything else", () => {
    const [pm, code] = entries[0];
    expect(legacyShadeCode(pm)).toBe(code);
    expect(legacyShadeCode(pm.toLowerCase())).toBe(code);
    for (const other of ["", "pm", "PM-", "PM-0", "PM-99999", "8386", "sage", "constructor", "__proto__", "toString"]) expect(legacyShadeCode(other), other).toBeUndefined();
  });
});

describe("proxy: retired shade pages", () => {
  it("sends every legacy code to the finder searching its Asian Paints shade, with a 308", () => {
    for (const [pm, code] of Object.entries(legacyShades)) {
      const res = proxy(get(`/colours/${pm}`));
      expect(res.status, pm).toBe(308);
      expect(res.headers.get("location"), pm).toBe(finder(code));
    }
  });

  it("matches the code in any case", () => {
    for (const pm of Object.keys(legacyShades)) {
      for (const variant of [pm.toLowerCase(), pm[0] + pm.slice(1).toLowerCase()]) {
        const res = proxy(get(`/colours/${variant}`));
        expect(res.status, variant).toBe(308);
        expect(res.headers.get("location"), variant).toBe(finder(legacyShades[pm]));
      }
    }
  });

  it("drops the old query string", () => {
    const [pm, code] = Object.entries(legacyShades)[0];
    const res = proxy(get(`/colours/${pm}?from=finder&ref=a%20b`));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(finder(code));
  });

  it("lets every other /colours/<x> through untouched, for Next to 404", () => {
    for (const path of ["/colours/502", "/colours/sage", "/colours/PM-9999", "/colours/asian-paints", "/colours/__proto__"]) {
      const res = proxy(get(path));
      expect(res.status, path).toBe(200);
      expect(res.headers.get("location"), path).toBeNull();
      expect(res.headers.get("x-middleware-next"), path).toBe("1");
      expect(res.headers.get("x-robots-tag"), path).toBeNull();
      expect(res.headers.get("cache-control"), path).toBeNull();
    }
  });

  it("knows the new home of an old shade URL, and nothing else", () => {
    const [pm, code] = Object.entries(legacyShades)[0];
    expect(legacyShadePath(`/colours/${pm}`)).toBe(`/colours?brand=asian-paints&q=${code}`);
    expect(legacyShadePath(`/colours/${pm.toLowerCase()}`)).toBe(`/colours?brand=asian-paints&q=${code}`);
    expect(legacyShadePath(`/colours/${pm}/extra`)).toBeNull();
    expect(legacyShadePath("/colours")).toBeNull();
    expect(legacyShadePath(`/palettes/${pm}`)).toBeNull();
    expect(legacyShadePath("/colours/sage")).toBeNull();
  });

  it("runs for old shade URLs as well as /admin and /api", () => {
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

  it("looks for the session cookie by its own name", () => {
    expect(proxy(get("/admin/leads", "some_other_cookie=x")).headers.get("location")).toBe("http://localhost:3000/admin/login");
    expect(proxy(get("/admin/leads", `${sessionCookieName()}=`)).headers.get("location")).toBe("http://localhost:3000/admin/login");
  });

  it("passes /admin/login and /admin with a cookie through, noindex and no-store", () => {
    for (const res of [proxy(get("/admin/login")), proxy(get("/admin/leads", `${sessionCookieName()}=x`))]) {
      expect(res.headers.get("location")).toBeNull();
      expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      expect(res.headers.get("cache-control")).toBe("no-store, max-age=0");
    }
  });

  it("marks every /api response noindex and no-store", () => {
    const res = proxy(get("/api/v1/colours/brands"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(res.headers.get("cache-control")).toBe("no-store, max-age=0");
  });
});
