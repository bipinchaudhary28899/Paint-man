import { describe, expect, it } from "vitest";
import { colourFamilies, colours, rooms } from "@/config/colours";
import { getColour, isFamily, isHex, isRoom, normaliseCode, pairings, searchColours, searchHints, similar } from "@/lib/colours/search";

describe("catalogue integrity", () => {
  it("has unique PM codes, valid hex and known rooms, and every pairing exists", () => {
    const codes = colours.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of colours) {
      expect(c.code).toMatch(/^PM-\d{3,4}$/);
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(colourFamilies).toContain(c.family);
      for (const r of c.rooms) expect(rooms).toContain(r);
      for (const p of c.pairsWith) expect(codes).toContain(p);
      expect(c.lrv).toBeGreaterThanOrEqual(0);
      expect(c.lrv).toBeLessThanOrEqual(100);
      expect(c.note.length).toBeGreaterThan(20);
    }
  });
});

describe("normaliseCode and getColour", () => {
  it("accepts the code in the ways people type it", () => {
    for (const input of ["PM-502", "pm-502", "PM 502", "pm502", "502", " 502 "]) {
      expect(normaliseCode(input)).toBe("PM-502");
      expect(getColour(input)?.name).toBe("Sage Mist");
    }
  });

  it("accepts four-digit ladder codes too", () => {
    expect(normaliseCode("1804")).toBe("PM-1804");
    expect(getColour("pm 1804")?.family).toBe("Blues");
  });

  it("leaves other text alone and returns undefined for unknown codes", () => {
    expect(normaliseCode("sage")).toBe("SAGE");
    expect(getColour("PM-999")).toBeUndefined();
    expect(getColour("banana")).toBeUndefined();
  });
});

describe("searchColours", () => {
  it("returns the whole catalogue in order for an empty query", () => {
    expect(searchColours()).toEqual(colours);
    expect(searchColours({ q: "   " })).toEqual(colours);
  });

  it("ranks an exact code first, then exact name, then prefix, then substring", () => {
    expect(searchColours({ q: "PM-101" })[0].name).toBe("Taj White");
    expect(searchColours({ q: "chalk" })[0].code).toBe("PM-102");
    expect(searchColours({ q: "sag" })[0].name).toBe("Sage Mist");
    expect(searchColours({ q: "mist" })[0].name).toBe("Mist");
    expect(searchColours({ q: "mist" }).slice(0, 2).map((c) => c.name)).toContain("Sage Mist");
  });

  it("finds shades by regional names and moods in tags", () => {
    expect(searchColours({ q: "gulabi" })[0].code).toBe("PM-701");
    expect(searchColours({ q: "haldi" })[0].name).toBe("Haldi");
    expect(searchColours({ q: "haldi" }).slice(0, 3).map((c) => c.name)).toContain("Marigold");
    const darkBlues = searchColours({ q: "dark blue" });
    expect(darkBlues[0].family).toBe("Blues");
    expect(darkBlues[0].lrv).toBeLessThan(25);
    expect(darkBlues.slice(0, 5).map((c) => c.name)).toContain("Indigo Night");
  });

  it("matches rooms, finishes and notes with a lower score", () => {
    const weatherproof = searchColours({ q: "weatherproof" });
    expect(weatherproof.length).toBeGreaterThan(0);
    expect(weatherproof.every((c) => c.finish === "Exterior weatherproof" || c.note.toLowerCase().includes("weatherproof"))).toBe(true);
    expect(searchColours({ q: "pooja" }).every((c) => c.rooms.includes("Pooja room") || c.note.toLowerCase().includes("pooja"))).toBe(true);
  });

  it("finds the nearest shades to a hex, with or without the hash", () => {
    expect(searchColours({ q: "#b8c7b0" })[0].code).toBe("PM-502");
    expect(searchColours({ q: "B8C7B0" })[0].code).toBe("PM-502");
    expect(searchColours({ q: "#b8c7b0" })).toHaveLength(6);
    expect(searchColours({ q: "#b8c7b0", limit: 2 })).toHaveLength(2);
  });

  it("filters by family and room and honours limit", () => {
    expect(searchColours({ family: "Greens" }).every((c) => c.family === "Greens")).toBe(true);
    expect(searchColours({ room: "Exterior" }).every((c) => c.rooms.includes("Exterior"))).toBe(true);
    expect(searchColours({ family: "Blues", room: "Exterior" }).map((c) => c.code)[0]).toBe("PM-604");
    expect(searchColours({ limit: 3 })).toHaveLength(3);
  });

  it("returns nothing for gibberish", () => {
    expect(searchColours({ q: "zzzzqqq" })).toEqual([]);
  });
});

describe("helpers", () => {
  it("resolves pairings and skips unknown codes", () => {
    const sage = getColour("PM-502")!;
    expect(pairings(sage).map((c) => c.code)).toEqual(["PM-102", "PM-204"]);
    expect(pairings({ ...sage, pairsWith: ["PM-999", "PM-101"] }).map((c) => c.code)).toEqual(["PM-101"]);
  });

  it("lists similar shades from the same family, excluding itself, capped", () => {
    const sage = getColour("PM-502")!;
    const alike = similar(sage);
    expect(alike).toHaveLength(4);
    expect(alike.every((c) => c.family === "Greens" && c.code !== "PM-502")).toBe(true);
    expect(similar(sage, 1)).toHaveLength(1);
    expect(similar(sage, 0)).toEqual([]);
    expect(similar(sage, 999)).toHaveLength(colours.filter((c) => c.family === "Greens").length - 1);
  });

  it("picks the nearest neighbours by lightness, one lighter and one darker at a time, wrapping at the ends", () => {
    const family = colours.filter((c) => c.family === "Greens").sort((a, b) => b.lrv - a.lrv || a.code.localeCompare(b.code));
    const sage = getColour("PM-502")!;
    const i = family.indexOf(sage);
    expect(similar(sage).map((c) => c.code)).toEqual([family[i - 1], family[i + 1], family[i - 2], family[i + 2]].map((c) => c.code));
    // the lightest shade wraps round to the darkest
    expect(similar(family[0], 2).map((c) => c.code)).toEqual([family.at(-1)!.code, family[1].code]);
    // shades get different neighbours, not the same first four of the family
    expect(similar(family[0]).map((c) => c.code)).not.toEqual(similar(family.at(-1)!).map((c) => c.code));
    // a shade outside the catalogue still gets its family
    expect(similar({ ...sage, code: "PM-9999" }, 2).every((c) => c.family === "Greens")).toBe(true);
  });

  it("links every shade page from at least two others through pairings and similar shades", () => {
    const inlinks = new Map<string, Set<string>>(colours.map((c) => [c.code, new Set()]));
    for (const c of colours) for (const to of [...pairings(c), ...similar(c)]) if (to.code !== c.code) inlinks.get(to.code)!.add(c.code);
    const weakest = [...inlinks].filter(([, from]) => from.size < 2).map(([code]) => code);
    expect(weakest).toEqual([]);
  });

  it("type guards and hints", () => {
    expect(isFamily("Greens")).toBe(true);
    expect(isFamily("Neons")).toBe(false);
    expect(isFamily(42)).toBe(false);
    expect(isRoom("Bedroom")).toBe(true);
    expect(isRoom("Garage")).toBe(false);
    expect(isHex("#abcdef")).toBe(true);
    expect(isHex("abc")).toBe(false);
    expect(searchHints()).toEqual({ families: [...colourFamilies], rooms: [...rooms] });
  });
});
