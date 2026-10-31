import { appLinks } from "@/config/app-links";
import { cities, promises, site } from "~/shared";

// The app's store listings (app store optimisation): store.config.json is the App Store listing in
// EAS Metadata's format (`eas metadata:push`), store/google-play.json the Play Store text to paste in
// Play Console. They must fit each store's limits and say only what the website says.

type AppleInfo = { title: string; subtitle: string; promoText: string; description: string; keywords: string[]; marketingUrl: string; supportUrl: string; privacyPolicyUrl: string };
type Play = { title: string; shortDescription: string; fullDescription: string; website: string; privacyPolicy: string };

const apple = (require("../../store.config.json") as { apple: { info: Record<string, AppleInfo> } }).apple.info["en-US"];
const play = require("../../store/google-play.json") as Play;
const live = cities.filter((c) => c.status === "live").map((c) => c.name);
const soon = cities.filter((c) => c.status !== "live").map((c) => c.name);

describe("the App Store listing", () => {
  it("fits Apple's limits", () => {
    expect(apple.title.length).toBeLessThanOrEqual(30);
    expect(apple.subtitle.length).toBeLessThanOrEqual(30);
    expect(apple.promoText.length).toBeLessThanOrEqual(170);
    expect(apple.description.length).toBeLessThanOrEqual(4000);
    expect(apple.keywords.join(",").length).toBeLessThanOrEqual(100);
  });

  it("spends its keywords on words the title and subtitle do not already have", () => {
    const named = `${apple.title} ${apple.subtitle}`.toLowerCase();
    expect(new Set(apple.keywords).size).toBe(apple.keywords.length);
    for (const k of apple.keywords) expect(named).not.toContain(k);
  });

  it("links to the site's own home, contact and privacy pages", () => {
    const origin = `https://${appLinks.host}`;
    expect(apple.marketingUrl).toBe(origin);
    expect(apple.supportUrl).toBe(`${origin}/contact`);
    expect(apple.privacyPolicyUrl).toBe(`${origin}/privacy-policy`);
    expect(play.website).toBe(origin);
    expect(play.privacyPolicy).toBe(apple.privacyPolicyUrl);
  });
});

describe("the Play Store listing", () => {
  it("fits Google's limits", () => {
    expect(play.title.length).toBeLessThanOrEqual(30);
    expect(play.shortDescription.length).toBeLessThanOrEqual(80);
    expect(play.fullDescription.length).toBeLessThanOrEqual(4000);
  });
});

describe("both listings", () => {
  it("name the brand, every live city and none of the coming ones", () => {
    for (const text of [apple.description, play.fullDescription, play.shortDescription]) {
      for (const city of live) expect(text).toContain(city);
      for (const city of soon) expect(text).not.toContain(city);
    }
    expect(apple.title).toContain(site.name);
    expect(play.title).toContain(site.name);
  });

  it("state the service promises word for word, as the website does", () => {
    for (const p of promises) {
      expect(apple.description).toContain(`${p.title}: ${p.text}`);
      expect(play.fullDescription).toContain(`${p.title}: ${p.text}`);
    }
  });
});
