import { describe, expect, it } from "vitest";
import ColourPage, { generateMetadata, generateStaticParams } from "@/app/(site)/colours/[code]/page";
import ColoursPage, { metadata as finderMetadata } from "@/app/(site)/colours/page";
import { colours } from "@/config/colours";

// The routes themselves sit outside the coverage gate; these check the behaviour that matters
// for search: one canonical URL per shade, noindex on the generated ladder, static /colours.

const params = (code: string) => ({ params: Promise.resolve({ code }) });
const digestOf = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as { digest?: string }).digest;
  }
  return undefined;
};

describe("/colours/[code]", () => {
  it("prerenders every canonical code", () => {
    expect(generateStaticParams()).toEqual(colours.map((c) => ({ code: c.code })));
  });

  it("redirects case and short-form variants permanently to the canonical code", async () => {
    for (const code of ["pm-502", "Pm-502", "502", "pm502"]) {
      expect(await digestOf(ColourPage(params(code)))).toBe("NEXT_REDIRECT;replace;/colours/PM-502;308;");
    }
  });

  it("renders the canonical code and 404s an unknown one", async () => {
    expect(await digestOf(ColourPage(params("PM-502")))).toBeUndefined();
    expect(await digestOf(ColourPage(params("PM-9999")))).toMatch(/^NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it("indexes curated shades and keeps generated ones noindex, follow", async () => {
    const sage = await generateMetadata(params("PM-502"));
    expect(sage.title).toBe("Sage Mist (PM-502) Wall Paint Colour");
    expect(sage.alternates?.canonical).toBe("/colours/PM-502");
    expect(sage.robots).toBeUndefined();
    expect(String(sage.description)).toMatch(/^Sage Mist \(PM-502\) is a green wall paint colour/);
    const wheat = await generateMetadata(params("PM-1205"));
    expect(wheat.robots).toEqual({ index: false, follow: true });
    expect(wheat.alternates?.canonical).toBe("/colours/PM-1205");
    expect((await generateMetadata(params("nope"))).title).toBe("Colour not found");
  });
});

describe("/colours", () => {
  it("is static: the page reads no searchParams on the server", () => {
    expect(ColoursPage.length).toBe(0);
    expect(ColoursPage.constructor.name).toBe("Function"); // not an async page
  });

  it("uses the local finder title and the measured description", () => {
    expect(finderMetadata.title).toBe("Wall Colour Finder & Shade Codes in Agra");
    expect(String(finderMetadata.description)).toContain("50,000+ brand shades incl. Asian Paints, Berger and Nerolac");
    expect(finderMetadata.alternates?.canonical).toBe("/colours");
  });
});
