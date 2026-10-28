import { describe, expect, it } from "vitest";
import { images } from "@/config/images";
import { site } from "@/config/site";

type Photo = { src: string; alt: string };

const all: [string, Photo][] = Object.entries(images);

/** Stock photos come from Pexels; anything else is a real photo of a Paint Man job. */
const isStock = (img: Photo) => new URL(img.src, site.url).hostname === "images.pexels.com";

const PEXELS = /^https:\/\/images\.pexels\.com\/photos\/(\d+)\/pexels-photo-\1\.jpeg$/;
const places = [site.city, ...site.areas].map((p) => p.toLowerCase());

/** Why a stock photo's alt is wrong (it claims a place, the brand or a finished job), or [] when it is fine. */
function stockAltProblems(alt: string): string[] {
  const lower = alt.toLowerCase();
  return [
    ...places.filter((place) => lower.includes(place)).map((place) => `mentions ${place}`),
    ...(lower.includes(site.name.toLowerCase()) ? ["names the brand"] : []),
    ...(/freshly painted|repainted|\bour\b/.test(lower) ? ["claims a finished job"] : []),
  ];
}

describe("images config", () => {
  it("every photo has its own src: a canonical Pexels URL for stock, a local public/ file for job photos", () => {
    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all.map(([, i]) => i.src)).size).toBe(all.length);
    for (const [key, img] of all) {
      if (isStock(img)) expect(img.src, key).toMatch(PEXELS);
      // job photos live in public/: next.config.ts only allows images.pexels.com as a remote host
      else expect(img.src, key).toMatch(/^\/[^/]/);
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
    for (const [key, img] of all.filter(([, i]) => isStock(i))) {
      expect(stockAltProblems(img.alt), key).toEqual([]);
    }
  });

  it("photos edited to show the uniform name it, but never a place or a finished job", () => {
    const edited = all.filter(([, i]) => i.src.startsWith("/photos/painter-uniform-"));
    expect(edited.length).toBeGreaterThan(0);
    for (const [key, img] of edited) {
      expect(img.alt, key).toContain(`${site.name} uniform`);
      expect(stockAltProblems(img.alt).filter((p) => p !== "names the brand"), key).toEqual([]);
    }
  });

  it("tells stock from job photos by host, so a real job photo may carry a local alt", () => {
    const job = { src: "/photos/dayalbagh-living-room.jpg", alt: `Freshly painted teal living room in Dayalbagh, ${site.city}` };
    expect(isStock(job)).toBe(false);
    expect(isStock({ src: "https://images.pexels.com/photos/1/pexels-photo-1.jpeg", alt: job.alt })).toBe(true);
    // the same alt on a stock photo would be refused
    expect(stockAltProblems(job.alt)).toEqual(expect.arrayContaining(["mentions dayalbagh", `mentions ${site.city.toLowerCase()}`, "claims a finished job"]));
  });
});
