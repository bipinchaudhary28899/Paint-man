import { describe, expect, it } from "vitest";
import { images } from "@/config/images";
import { site } from "@/config/site";

const all = Object.entries(images);

describe("images config", () => {
  it("every photo is a distinct Pexels URL", () => {
    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all.map(([, i]) => i.src)).size).toBe(all.length);
    for (const [key, img] of all) {
      expect(img.src, key).toMatch(/^https:\/\/images\.pexels\.com\/photos\/(\d+)\/pexels-photo-\1\.jpeg$/);
    }
  });

  it("every photo has its own descriptive alt of a sensible length", () => {
    expect(new Set(all.map(([, i]) => i.alt)).size).toBe(all.length);
    for (const [key, img] of all) {
      expect(img.alt.length, key).toBeGreaterThanOrEqual(30);
      expect(img.alt.length, key).toBeLessThanOrEqual(125);
      expect(img.alt, key).toMatch(/^[A-Z]/);
      expect(img.alt, key).not.toMatch(/\.$/);
    }
  });

  it("stock photos never claim a place, a brand or a finished job", () => {
    const places = [site.city, ...site.areas].map((p) => p.toLowerCase());
    for (const [key, img] of all) {
      const alt = img.alt.toLowerCase();
      for (const place of places) expect(alt, `${key} mentions ${place}`).not.toContain(place);
      expect(alt, key).not.toContain(site.name.toLowerCase());
      expect(alt, key).not.toMatch(/freshly painted|repainted|\bour\b/);
    }
  });
});
