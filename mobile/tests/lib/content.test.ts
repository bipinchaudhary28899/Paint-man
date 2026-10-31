import { imageSource, logos } from "~/lib/images";
import { cities, illustrations, images, liveCities, servicesIn, services } from "~/shared";

// The app shows the website's own facts and pictures; these checks catch a change on the website
// that the app could not display.

describe("images", () => {
  it("has a source for every photo and illustration the website names", () => {
    for (const img of [...Object.values(images), ...Object.values(illustrations)]) {
      expect(() => imageSource(img.src)).not.toThrow();
    }
    for (const s of services) expect(() => imageSource(s.image.src)).not.toThrow();
  });

  it("bundles our own files and sizes Pexels photos for a phone", () => {
    // bundled assets are module ids in the app (jest-expo stands in an object for them)
    expect(imageSource(illustrations.painter.src)).not.toHaveProperty("uri");
    expect(imageSource(images.uniformCeiling.src)).not.toHaveProperty("uri");
    expect(imageSource(images.livingRoom.src, 800)).toEqual({ uri: `${images.livingRoom.src}?auto=compress&cs=tinysrgb&w=800` });
    expect(Object.keys(logos)).toEqual(["short", "stackedReversed", "stackedColor"]);
  });

  it("refuses a path it cannot show", () => {
    expect(() => imageSource("/photos/unknown.jpg")).toThrow(/No app source/);
    expect(() => imageSource("https://example.com/a.jpg")).toThrow(/No app source/);
  });
});

describe("cities and services", () => {
  it("every live city has localities and services; cities coming soon have neither", () => {
    expect(liveCities().length).toBeGreaterThan(0);
    for (const c of cities) {
      if (c.status === "live") {
        expect(c.areas.length).toBeGreaterThan(0);
        expect(servicesIn(c).length).toBeGreaterThan(0);
      } else {
        expect(servicesIn(c)).toEqual([]);
      }
    }
  });
});
