import { describe, expect, it } from "vitest";
import { galleryGroups } from "@/config/gallery";
import { images } from "@/config/images";
import { cities, site } from "@/config/site";

const photos = galleryGroups.flatMap((g) => g.photos);
const PEXELS = /^https:\/\/images\.pexels\.com\/photos\/(\d+)\/pexels-photo-\1\.jpeg$/;
const places = cities.flatMap((c) => [c.name, ...c.areas]).map((p) => p.toLowerCase());

describe("gallery (ideas from Indian homes, not our jobs)", () => {
  it("has groups with unique anchors, each with photos to show", () => {
    expect(new Set(galleryGroups.map((g) => g.id)).size).toBe(galleryGroups.length);
    for (const g of galleryGroups) {
      expect(g.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(g.photos.length, g.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses each photo once, from Pexels, and none already used elsewhere on the site", () => {
    const srcs = photos.map((p) => p.src);
    expect(new Set(srcs).size).toBe(srcs.length);
    for (const src of srcs) expect(src).toMatch(PEXELS);
    const siteSrcs = new Set(Object.values(images).map((i) => i.src));
    for (const src of srcs) expect(siteSrcs.has(src), src).toBe(false);
  });

  it("describes each photo plainly, and never claims a place, the brand or a finished job", () => {
    expect(new Set(photos.map((p) => p.alt)).size).toBe(photos.length);
    for (const p of photos) {
      const text = `${p.alt} ${p.caption}`.toLowerCase();
      expect(p.alt.length, p.src).toBeGreaterThanOrEqual(30);
      expect(p.alt.length, p.src).toBeLessThanOrEqual(125);
      expect(p.alt).toMatch(/^[A-Z]/);
      expect(p.alt).not.toMatch(/\.$/);
      expect(p.caption.length, p.src).toBeGreaterThan(5);
      for (const place of places) expect(text, `${p.src} names ${place}`).not.toContain(place);
      expect(text).not.toContain(site.name.toLowerCase());
      expect(text).not.toMatch(/freshly painted|repainted|\bour\b/);
    }
  });

  it("gives every photo its proportions, so its frame is reserved before it loads", () => {
    for (const p of photos) {
      expect(Number.isInteger(p.width) && p.width > 0, p.src).toBe(true);
      expect(Number.isInteger(p.height) && p.height > 0, p.src).toBe(true);
    }
  });
});
