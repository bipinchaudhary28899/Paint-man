import { render, screen } from "@testing-library/react-native";
import { PixelRatio } from "react-native";
import type { TestInstance } from "test-renderer";

import { Art, FADE_MS, Logo, Photo } from "~/components/ui/Media";
import { PHOTO_WIDTHS, photoSource, photoWidth } from "~/lib/images";
import { illustrations, images } from "~/shared";

// Pictures load at the size they are drawn, from the memory and disk caches, fading in over their sand box.

let mockReduced = false;
jest.mock("react-native-reanimated", () => {
  const actual = jest.requireActual("react-native-reanimated");
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: () => mockReduced };
});

/** The URL a labelled picture loads (expo-image hands its native view a list of sources). */
const src = (label: string): string => {
  const s = screen.getByLabelText(label).props.source as { uri: string }[] | { uri: string };
  return Array.isArray(s) ? s[0].uri : s.uri;
};

describe("the size a photo is fetched at", () => {
  it("is the first shared step covering 90% of the pixels drawn, capped at the largest", () => {
    // a full-bleed photo on a 393pt, 3× iPhone (1179px) and on a 430pt Pro Max (1290px)
    expect(photoWidth(393, 3)).toBe(1080);
    expect(photoWidth(430, 3)).toBe(1280);
    // a 340pt carousel card on 3× and on 2×; a 170pt tile on 3×
    expect(photoWidth(340, 3)).toBe(1080);
    expect(photoWidth(340, 2)).toBe(800);
    expect(photoWidth(170, 3)).toBe(600);
    expect(photoWidth(100, 2)).toBe(400);
    // never past the largest step, never below the smallest
    expect(photoWidth(2000, 3)).toBe(1600);
    expect(photoWidth(-5, 3)).toBe(400);
    for (const w of [120, 250, 393, 600]) expect(PHOTO_WIDTHS).toContain(photoWidth(w, 3));
  });

  it("asks Pexels for that width and leaves bundled files as they are", () => {
    expect(photoSource(images.livingRoom.src, 170, 3)).toEqual({ uri: `${images.livingRoom.src}?auto=compress&cs=tinysrgb&w=600` });
    expect(photoSource(images.uniformCeiling.src, 393, 3)).not.toHaveProperty("uri");
    // the screen's own pixel ratio by default
    expect(photoSource(images.livingRoom.src, 393)).toEqual({ uri: `${images.livingRoom.src}?auto=compress&cs=tinysrgb&w=${photoWidth(393, PixelRatio.get())}` });
  });
});

describe("Photo", () => {
  it("fetches a full-bleed photo at the screen's width and a smaller one at its own, never wider than the screen", async () => {
    const screenWidth = 750; // React Native's Jest window
    await render(
      <>
        <Photo image={images.livingRoom} aspectRatio={4 / 5} />
        <Photo image={images.houseFront} width={170} />
        <Photo image={images.weatheredWall} width={5000} />
      </>,
    );
    expect(src(images.livingRoom.alt)).toMatch(new RegExp(`w=${photoWidth(screenWidth, PixelRatio.get())}$`));
    expect(src(images.houseFront.alt)).toMatch(new RegExp(`w=${photoWidth(170, PixelRatio.get())}$`));
    expect(src(images.weatheredWall.alt)).toMatch(new RegExp(`w=${photoWidth(screenWidth, PixelRatio.get())}$`));
  });

  it("caches in memory and on disk, keys recycled views by photo, fades in, and passes its priority", async () => {
    await render(
      <>
        <Photo image={images.livingRoom} priority="high" />
        <Photo image={images.houseFront} priority="low" recyclingKey="card-2" />
      </>,
    );
    const hero = screen.getByLabelText(images.livingRoom.alt);
    expect(hero).toHaveProp("cachePolicy", "memory-disk");
    expect(hero).toHaveProp("recyclingKey", images.livingRoom.src);
    expect(hero).toHaveProp("transition", { duration: FADE_MS });
    expect(hero).toHaveProp("priority", "high");
    expect(hero).toHaveStyle({ backgroundColor: "#e8d7c5" });
    const card = screen.getByLabelText(images.houseFront.alt);
    expect(card).toHaveProp("priority", "low");
    expect(card).toHaveProp("recyclingKey", "card-2");
  });

  it("appears at once under reduce motion", async () => {
    mockReduced = true;
    await render(<Photo image={images.livingRoom} />);
    expect(screen.getByLabelText(images.livingRoom.alt)).toHaveProp("transition", { duration: 0 });
    mockReduced = false;
  });
});

describe("Art and Logo", () => {
  it("caches the bundled art and hides a decorative logo from screen readers", async () => {
    await render(
      <>
        <Art art={illustrations.paintCan} width={88} />
        <Logo name="short" decorative />
        <Logo name="stackedReversed" />
      </>,
    );
    expect(screen.getByLabelText(illustrations.paintCan.alt)).toHaveProp("cachePolicy", "memory-disk");
    expect(screen.getAllByLabelText("Paint Saathi")).toHaveLength(1);
    const hidden = (screen.container as TestInstance).queryAll((i) => /Image/.test(i.type) && i.props.accessibilityElementsHidden === true);
    expect(hidden).toHaveLength(1);
    expect(hidden[0]).toHaveProp("importantForAccessibility", "no-hide-descendants");
  });
});
