import { describe, expect, it } from "vitest";
import { hexToRgb, rgbToOklab } from "@/lib/colours/oklab";

describe("OKLab colour maths", () => {
  it("parses hex with or without #", () => {
    expect(hexToRgb("#b8c7b0")).toEqual([184, 199, 176]);
    expect(hexToRgb("242522")).toEqual([36, 37, 34]);
  });

  it("maps white, black and a grey to the neutral axis, light to dark", () => {
    const [Lw, aw, bw] = rgbToOklab(255, 255, 255);
    const [Lk] = rgbToOklab(0, 0, 0);
    const [Lg, ag, bg] = rgbToOklab(128, 128, 128);
    expect(Lw).toBeCloseTo(1, 3);
    expect(Lk).toBeCloseTo(0, 6);
    expect(Lg).toBeGreaterThan(Lk);
    expect(Lg).toBeLessThan(Lw);
    for (const c of [aw, bw, ag, bg]) expect(Math.abs(c)).toBeLessThan(1e-3);
  });

  it("puts reds at +a and blues at -b", () => {
    expect(rgbToOklab(220, 40, 40)[1]).toBeGreaterThan(0.1);
    expect(rgbToOklab(40, 60, 220)[2]).toBeLessThan(-0.1);
  });
});
