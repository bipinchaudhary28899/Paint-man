// The phone app (mobile/, Expo) and the links between it and the website. The app's screens sit at
// the website's own paths (mobile/src/lib/links.ts), so a paintsaathi.in link can open the matching
// screen in the app instead of the browser: iOS Universal Links (the app claims the domain with
// `ios.associatedDomains` in mobile/app.json, the site serves /.well-known/apple-app-site-association)
// and Android App Links (an `autoVerify` intent filter, and /.well-known/assetlinks.json). Google uses
// the same verified association to open search results in the app. Only paths the app has a screen
// for are claimed: /admin, /api and the retired /colours/<code> pages always stay on the web.
// mobile/tests/lib/app-links.test.ts keeps mobile/app.json and the app's link router in step with this.

export const appLinks = {
  /** The iOS bundle identifier and the Android package (mobile/app.json). */
  bundleId: "in.paintsaathi.app",
  /** The domain the app claims: the live site's host. www redirects to it, so it is not claimed. */
  host: "paintsaathi.in",
  /**
   * The paths the app opens, as its screens sit: exact paths, and `/x/*` for anything below /x
   * (/services/interior-painting/agra, /shade-cards/berger/blue, /account/projects/<id>).
   */
  paths: [
    "/",
    "/about",
    "/book",
    "/colours",
    "/contact",
    "/faq",
    "/gallery",
    "/login",
    "/palettes",
    "/privacy-policy",
    "/terms",
    "/thank-you",
    "/account",
    "/account/projects/*",
    "/services",
    "/services/*",
    "/shade-cards",
    "/shade-cards/*",
  ],
} as const;
