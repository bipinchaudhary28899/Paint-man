import { appLinks } from "@/config/app-links";
import { androidIntentFilter, associatedDomain } from "@/lib/app-links";
import { routeFor } from "~/lib/links";

// The app claims paintsaathi.in links (iOS Universal Links, Android App Links) for the paths in the
// website's src/config/app-links.ts, which also builds the /.well-known files. app.json must declare
// exactly those, and every claimed path must open a screen here rather than the not-found page.

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

type AppJson = { expo: { ios: { bundleIdentifier: string; associatedDomains: string[] }; android: { package: string; intentFilters: unknown[] } } };
const { expo } = require("../../app.json") as AppJson;

/** Real pages under each claimed `/x/*` path. */
const below: Record<string, string[]> = {
  "/account/projects/*": ["/account/projects/3f1c9a2e-7b44-4d2a-9f0e-1a2b3c4d5e6f"],
  "/services/*": ["/services/interior-painting", "/services/interior-painting/agra", "/services/house-painting/mathura"],
  "/shade-cards/*": ["/shade-cards/berger", "/shade-cards/berger/blue"],
};

describe("app links", () => {
  it("declares the website's domain and paths in app.json, for the same bundle", () => {
    expect(expo.ios.bundleIdentifier).toBe(appLinks.bundleId);
    expect(expo.android.package).toBe(appLinks.bundleId);
    expect(expo.ios.associatedDomains).toEqual([associatedDomain]);
    expect(expo.android.intentFilters).toEqual([androidIntentFilter()]);
  });

  it("opens a screen for every claimed path", () => {
    for (const path of appLinks.paths) {
      const examples = path.endsWith("/*") ? below[path] : [path];
      expect(examples?.length).toBeGreaterThan(0);
      for (const p of examples) expect(routeFor(p)).not.toBeNull();
    }
  });

  it("opens the staff screens in the app, not the browser", () => {
    for (const p of ["/admin/login", "/admin", "/admin/projects", "/admin/projects/3f0c2b1a-1111-4222-8333-444455556666"]) expect(routeFor(p)).toMatchObject({ pathname: p });
  });

  it("leaves the API, other admin paths and the retired shade pages to the browser", () => {
    for (const p of ["/admin/settings", "/api/admin/leads", "/api/v1/colours/paint", "/colours/PM-502"]) expect(routeFor(p)).toBeNull();
  });
});
