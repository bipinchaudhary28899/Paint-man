import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as appleRoute } from "@/app/.well-known/apple-app-site-association/route";
import { GET as androidRoute } from "@/app/.well-known/assetlinks.json/route";
import { appLinks } from "@/config/app-links";
import { androidFingerprints, androidIntentFilter, appleAppSiteAssociation, appleTeamId, assetLinks, associatedDomain } from "@/lib/app-links";

const FINGERPRINT = Array.from({ length: 32 }, (_, i) => (i * 7).toString(16).padStart(2, "0").slice(-2)).join(":");

afterEach(() => vi.unstubAllEnvs());

describe("the app's claimed paths", () => {
  it("are unique site paths, and never the admin, the API or the retired shade pages", () => {
    expect(new Set(appLinks.paths).size).toBe(appLinks.paths.length);
    for (const p of appLinks.paths) {
      expect(p).toMatch(/^\/[a-z0-9/-]*(\/\*)?$/);
      expect(p.startsWith("/admin")).toBe(false);
      expect(p.startsWith("/api")).toBe(false);
      expect(p.startsWith("/colours/")).toBe(false);
    }
    expect(appLinks.paths).toContain("/");
    expect(appLinks.host).not.toMatch(/^www\./);
  });
});

describe("credentials", () => {
  it("accepts a 10-character Apple Team ID, trimmed and upper-cased, and nothing else", () => {
    expect(appleTeamId({ APPLE_TEAM_ID: " abcde12345 " })).toBe("ABCDE12345");
    expect(appleTeamId({ APPLE_TEAM_ID: "ABCDE1234" })).toBeUndefined();
    expect(appleTeamId({ APPLE_TEAM_ID: "ABCDE-12345" })).toBeUndefined();
    expect(appleTeamId({})).toBeUndefined();
  });

  it("keeps the well-formed SHA-256 fingerprints, upper-cased, and drops the rest", () => {
    expect(androidFingerprints({ ANDROID_CERT_SHA256: `${FINGERPRINT.toLowerCase()}, nope ,${FINGERPRINT}` })).toEqual([FINGERPRINT.toUpperCase(), FINGERPRINT.toUpperCase()]);
    expect(androidFingerprints({ ANDROID_CERT_SHA256: "AA:BB" })).toEqual([]);
    expect(androidFingerprints({})).toEqual([]);
  });
});

describe("the association files", () => {
  it("name the app by Team ID and bundle for iOS, with one component per claimed path", () => {
    const file = appleAppSiteAssociation("ABCDE12345");
    expect(file.applinks.details).toHaveLength(1);
    expect(file.applinks.details[0].appIDs).toEqual(["ABCDE12345.in.paintsaathi.app"]);
    expect(file.applinks.details[0].components).toEqual(appLinks.paths.map((p) => ({ "/": p })));
  });

  it("delegate link handling to the signed Android app", () => {
    expect(assetLinks([FINGERPRINT])).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: { namespace: "android_app", package_name: "in.paintsaathi.app", sha256_cert_fingerprints: [FINGERPRINT] },
      },
    ]);
  });

  it("give the app an auto-verified https intent filter: exact paths, and prefixes for the /x/* ones", () => {
    const filter = androidIntentFilter();
    expect(filter).toMatchObject({ action: "VIEW", autoVerify: true, category: ["BROWSABLE", "DEFAULT"] });
    expect(filter.data).toContainEqual({ scheme: "https", host: "paintsaathi.in", path: "/colours" });
    expect(filter.data).toContainEqual({ scheme: "https", host: "paintsaathi.in", pathPrefix: "/services/" });
    expect(filter.data).toHaveLength(appLinks.paths.length);
    expect(associatedDomain).toBe("applinks:paintsaathi.in");
  });
});

describe("the /.well-known routes", () => {
  it("answer 404, uncached, until the store credentials are set", async () => {
    vi.stubEnv("APPLE_TEAM_ID", "");
    vi.stubEnv("ANDROID_CERT_SHA256", "");
    for (const res of [appleRoute(), androidRoute()]) {
      expect(res.status).toBe(404);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("serve the files as cached JSON once they are", async () => {
    vi.stubEnv("APPLE_TEAM_ID", "ABCDE12345");
    vi.stubEnv("ANDROID_CERT_SHA256", FINGERPRINT);
    const apple = appleRoute();
    expect(apple.status).toBe(200);
    expect(apple.headers.get("content-type")).toContain("application/json");
    expect(apple.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(await apple.json()).toEqual(appleAppSiteAssociation("ABCDE12345"));
    const android = androidRoute();
    expect(android.status).toBe(200);
    expect(await android.json()).toEqual(assetLinks([FINGERPRINT.toUpperCase()]));
  });
});
