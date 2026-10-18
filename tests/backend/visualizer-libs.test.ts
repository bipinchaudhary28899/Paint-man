import { describe, expect, it } from "vitest";
import { ACCEPTED_TYPES, fitWithin, MAX_BYTES, validateImageFile } from "@/lib/visualizer/files";
import { brush, brushLine, connectedComponents, coverage, dropSmallComponents, emptyMask, feather, fillSmallHoles, maskFromComponents, resizeMask, subtractMask, unionMask, type Mask } from "@/lib/visualizer/mask";
import { hexToRgb, oklabToRgb, recolour, rgbToOklab, wallMeanLightness } from "@/lib/visualizer/recolour";

const fromRows = (rows: string[]): Mask => {
  const height = rows.length, width = rows[0].length;
  const data = new Uint8Array(width * height);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { data[y * width + x] = ch === "#" ? 255 : 0; }));
  return { width, height, data };
};
const toRows = (m: Mask) => Array.from({ length: m.height }, (_, y) => Array.from({ length: m.width }, (_, x) => (m.data[y * m.width + x] >= 128 ? "#" : ".")).join(""));

describe("mask ops", () => {
  it("labels separate wall surfaces and drops specks", () => {
    const m = fromRows(["##..#", "##...", ".....", "...##", "#..##"]);
    const { labels, sizes } = connectedComponents(m);
    expect(sizes.length - 1).toBe(4); // two 4-blocks, two single pixels
    expect(labels[0]).toBe(labels[6]);
    expect(labels[0]).not.toBe(labels[18]);
    const cleaned = dropSmallComponents(m, 3 / 25);
    expect(toRows(cleaned)).toEqual(["##...", "##...", ".....", "...##", "...##"]);
    const only = maskFromComponents(m, labels, new Set([labels[18]]));
    expect(coverage(only)).toBeCloseTo(4 / 25);
  });

  it("fills small pockets inside a wall but keeps large openings and the background", () => {
    // a wall with a 1-pixel pocket (switch plate) and a 2×2 opening (picture); the right column is not wall
    const m = fromRows(["####.", "#.##.", "####.", "#..#.", "#..#."]);
    const filled = fillSmallHoles(m, 2 / 25);
    expect(toRows(filled)).toEqual(["####.", "####.", "####.", "#..#.", "#..#."]);
    expect(filled.data).not.toBe(m.data); // pure: the input mask is untouched
    expect(toRows(m)[1]).toBe("#.##.");
  });

  it("resizes with nearest neighbour and feathers edges without leaking far", () => {
    const m = fromRows(["#.", ".#"]);
    expect(toRows(resizeMask(m, 4, 4))).toEqual(["##..", "##..", "..##", "..##"]);
    expect(resizeMask(m, 2, 2)).toBe(m);
    const solid = fromRows(["......", "......", "..##..", "..##..", "......", "......"]);
    const soft = feather(solid, 1, 1);
    expect(soft.data[0]).toBe(0); // far corner untouched
    const inner = soft.data[2 * 6 + 2];
    expect(inner).toBeLessThan(255); // block pixel softened by its empty neighbours
    expect(inner).toBeGreaterThan(100);
    expect(soft.data[1 * 6 + 2]).toBeGreaterThan(0); // the edge bleeds one pixel out
    expect(feather(solid, 0)).toBe(solid);
  });

  it("brushes add and erase circles and strokes, clipped to the image", () => {
    const m = emptyMask(10, 10);
    brush(m, 2, 2, 1.2, 255); // radius 1.2 → a plus shape
    expect(toRows(m).slice(0, 4)).toEqual(["..........", "..#.......", ".###......", "..#......."]);
    brush(m, 2, 2, 0.5, 0);
    expect(m.data[22]).toBe(0);
    const line = brushLine(emptyMask(10, 3), 0, 1, 9, 1, 0.6, 255);
    expect(toRows(line)[1]).toBe("##########");
    brush(line, -5, -5, 2, 255); // fully outside: no throw, no change
    expect(coverage(line)).toBeCloseTo(10 / 30);
  });

  it("unions and subtracts", () => {
    const a = fromRows(["##.", "..."]), b = fromRows([".##", "..#"]);
    expect(toRows(unionMask(a, b))).toEqual(["###", "..#"]);
    expect(toRows(subtractMask(a, b))).toEqual(["#..", "..."]);
  });
});

describe("recolour", () => {
  it("round-trips sRGB through OKLab", () => {
    for (const [r, g, b] of [[255, 255, 255], [0, 0, 0], [184, 199, 176], [36, 37, 34], [200, 63, 56]]) {
      const [L, a, bb] = rgbToOklab(r, g, b);
      const back = oklabToRgb(L, a, bb);
      expect(Math.abs(back[0] - r) + Math.abs(back[1] - g) + Math.abs(back[2] - b)).toBeLessThanOrEqual(3);
    }
    expect(hexToRgb("#b8c7b0")).toEqual([184, 199, 176]);
  });

  it("changes only masked pixels and keeps the wall's light and shade", () => {
    // 4 px: two wall pixels (a lit one and a shadowed one), two non-wall
    const src = new Uint8ClampedArray([240, 238, 230, 255, 150, 148, 142, 255, 30, 60, 200, 255, 120, 120, 120, 255]);
    const mask: Mask = { width: 4, height: 1, data: Uint8Array.from([255, 255, 0, 0]) };
    const out = new Uint8ClampedArray(16);
    const meanL = wallMeanLightness(src, mask);
    recolour(src, out, mask, "#b8c7b0", meanL);
    expect([...out.slice(8)]).toEqual([...src.slice(8)]); // non-wall untouched
    const lit = rgbToOklab(out[0], out[1], out[2])[0];
    const shadow = rgbToOklab(out[4], out[5], out[6])[0];
    expect(lit).toBeGreaterThan(shadow); // shading preserved
    // hue moved towards the green shade: g channel now leads r and b on both wall pixels
    expect(out[1]).toBeGreaterThan(out[0]);
    expect(out[5]).toBeGreaterThan(out[4]);
    expect(out[3]).toBe(255);
  });

  it("blends partially at soft edges and never crushes to pure black or white", () => {
    const src = new Uint8ClampedArray([255, 255, 255, 255, 5, 5, 5, 255]);
    const mask: Mask = { width: 2, height: 1, data: Uint8Array.from([128, 255]) };
    const out = new Uint8ClampedArray(8);
    recolour(src, out, mask, "#2f3f7a", 0.9);
    expect(out[0]).toBeLessThan(255);
    expect(out[0]).toBeGreaterThan(100); // half-blended
    expect(out[4] + out[5] + out[6]).toBeGreaterThan(15); // deep shadow lifted off black
    expect(wallMeanLightness(src, { width: 2, height: 1, data: Uint8Array.from([0, 0]) })).toBe(0.8); // no wall: sane default
  });
});

describe("upload rules", () => {
  it("accepts jpeg/png/webp under 12 MB and rejects the rest with a reason", () => {
    for (const type of ACCEPTED_TYPES) expect(validateImageFile({ type, size: 1000 })).toBeNull();
    expect(validateImageFile({ type: "image/gif", size: 1000 })).toMatch(/JPEG, PNG or WebP/);
    expect(validateImageFile({ type: "image/jpeg", size: MAX_BYTES + 1 })).toMatch(/12 MB/);
    expect(validateImageFile({ type: "image/jpeg", size: 0 })).toMatch(/empty/);
  });

  it("caps the processing size at the longest edge, keeping the aspect", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1400, height: 1050 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(600, 2800, 700)).toEqual({ width: 150, height: 700 });
  });
});
