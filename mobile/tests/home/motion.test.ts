import { COLLAGE_ASPECT, COLLAGE_GAP, collageHeight, collageTiles, pieceBox, shapePath, tileBox } from "~/components/home/collage";
import { clamp01, containProgress, coverProgress, easeInOutQuad, reveal, riseIn, screenTop, stageOpacity, stickyOffset } from "~/components/home/motion";
import { coverRect, skiaSource } from "~/components/home/pictures";
import { PixelRatio } from "react-native";

import { imageSource, photoWidth } from "~/lib/images";
import { genericScene, images } from "~/shared";

describe("the reveal's timeline", () => {
  it("eases the fill and steps through the four stages", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(easeInOutQuad(0.25)).toBeCloseTo(0.125);
    expect(easeInOutQuad(0.75)).toBeCloseTo(0.875);
    expect(reveal(0)).toEqual({ fill: 0, stage: 0, edgeVisible: false });
    expect(reveal(0.3)).toMatchObject({ stage: 1, edgeVisible: true });
    expect(reveal(0.6).stage).toBe(2);
    expect(reveal(1)).toEqual({ fill: 100, stage: 3, edgeVisible: false });
    expect(reveal(-0.5).fill).toBe(0);
  });

  it("dims the stages done and to come", () => {
    expect([0, 1, 2, 3].map((i) => stageOpacity(i, 1))).toEqual([0.55, 1, 0.3, 0.3]);
  });

  it("pins the panel under the header for the length of its track", () => {
    // a 300vh track on an 852pt screen, under a 73pt header
    expect(screenTop(1000, 400, 73)).toBe(673);
    expect(stickyOffset(500, 73, 2556, 779)).toBe(0);
    expect(stickyOffset(-200, 73, 2556, 779)).toBe(273);
    expect(stickyOffset(-5000, 73, 2556, 779)).toBe(2556 - 779);
    expect(stickyOffset(0, 73, 500, 779)).toBe(0);
  });

  it("measures progress from the track's top at the screen's top to its bottom at the bottom", () => {
    expect(containProgress(100, 2556, 852)).toBe(0);
    expect(containProgress(-852, 2556, 852)).toBeCloseTo(0.5);
    expect(containProgress(-3000, 2556, 852)).toBe(1);
    expect(containProgress(0, 500, 852)).toBe(1);
  });

  it("raises a collage tile in over its slice of the view timeline", () => {
    expect(coverProgress(852, 200, 852)).toBe(0);
    expect(coverProgress(-200, 200, 852)).toBe(1);
    expect(riseIn(0, 0)).toEqual({ opacity: 0, translateY: 40 });
    expect(riseIn(0.1, 0)).toEqual({ opacity: 0.5, translateY: 20 });
    expect(riseIn(0.3, 1)).toEqual({ opacity: 1, translateY: 0 });
  });
});

describe("the collage", () => {
  const width = 353;

  it("fills a 335:850 rectangle on a 2 × 5 grid, one gap apart", () => {
    expect(COLLAGE_ASPECT).toBeCloseTo(335 / 850);
    expect(collageHeight(width)).toBeCloseTo(895.67, 1);
    const [a, c, e, b, f] = collageTiles.map((t) => tileBox(t, width));
    const cell = (width - COLLAGE_GAP) / 2;
    expect(a).toMatchObject({ x: 0, y: 0, width: cell });
    expect(b.x).toBeCloseTo(cell + COLLAGE_GAP);
    expect(f.y).toBeCloseTo(b.height + COLLAGE_GAP);
    expect(a.height).toBeCloseTo(b.height + COLLAGE_GAP + f.height);
    expect(c).toMatchObject({ x: 0, width });
    expect(e.y + e.height).toBeCloseTo(collageHeight(width));
  });

  it("shows every photo with its alt text", () => {
    const pieces = collageTiles.flatMap((t) => t.pieces);
    expect(pieces).toHaveLength(7);
    for (const p of pieces) expect(Object.values(images)).toContain(p.image);
  });

  it("cuts each shape as the website's CSS does", () => {
    expect(shapePath("corner", 100, 200)).toBe("M0 0 A100 100 0 0 1 100 100 L100 200 L0 200 Z");
    expect(shapePath("triHigh", 300, 100)).toBe("M9.12 0 L300 0 L300 96.96 Z");
    expect(shapePath("triLow", 300, 100)).toBe("M0 3.04 L290.88 100 L0 100 Z");
    expect(shapePath("disc", 300, 300)).toBe("M0 8 A292 292 0 0 1 292 300 L0 300 Z");
    expect(shapePath("bite", 300, 300)).toBe("M0 0 L300 0 L300 300 A300 300 0 0 0 0 0 Z");
    expect(shapePath("leaf", 100, 100)).toBe("M0 100 A100 100 0 0 1 100 0 A100 100 0 0 1 0 100 Z");
    expect(shapePath("quarter", 100, 100)).toBe("M0 100 A100 100 0 0 1 100 0 L100 100 Z");
  });

  it("insets the disc's photo one gap from the top and right", () => {
    expect(pieceBox("disc", 300, 300)).toEqual({ x: 0, y: 8, width: 292, height: 292 });
    expect(pieceBox("bite", 300, 300)).toEqual({ x: 0, y: 0, width: 300, height: 300 });
  });
});

describe("pictures for Skia", () => {
  it("crops like object-fit: cover with an object-position", () => {
    expect(coverRect(200, 100, { x: 0, y: 0, width: 100, height: 100 })).toEqual({ x: -50, y: 0, width: 200, height: 100 });
    expect(coverRect(100, 200, { x: 10, y: 10, width: 100, height: 100 }, [0.5, 0.3])).toEqual({ x: 10, y: 10 - 100 * 0.3, width: 100, height: 200 });
  });

  it("passes bundled files as modules and Pexels photos as sized URLs", () => {
    expect(skiaSource(genericScene.mask)).toBe(imageSource(genericScene.mask));
    // sized for the points drawn, as Photo is: 200pt is photoSource's step for this screen
    expect(skiaSource(images.livingMoody.src, 200)).toBe(`${images.livingMoody.src}?auto=compress&cs=tinysrgb&w=${photoWidth(200, PixelRatio.get())}`);
    // without a drawn size, the default fetch
    expect(skiaSource(images.livingMoody.src)).toEqual((imageSource(images.livingMoody.src) as { uri: string }).uri);
  });
});
