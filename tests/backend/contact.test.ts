import { describe, expect, it } from "vitest";
import { contactChannels, generalFaqs, site } from "@/config/site";
import { WHATSAPP_GREETING, whatsappHref } from "@/config/contact";
import { fakeContact, withFilledSite } from "../support/filled-site";

describe("WhatsApp links", () => {
  it("open a chat with the business number, digits only, and a first line typed in", () => {
    const href = whatsappHref();
    expect(href).toMatch(/^https:\/\/wa\.me\/\d{12}\?text=/);
    expect(href.startsWith(`https://wa.me/${site.whatsapp}?`)).toBe(true);
    expect(new URL(href).searchParams.get("text")).toBe(WHATSAPP_GREETING);
    expect(WHATSAPP_GREETING).toContain(site.name);
    expect(new URL(whatsappHref("About my project & quote")).searchParams.get("text")).toBe("About my project & quote");
  });

  it("show the number the way people write it, matching the digits", () => {
    expect(site.whatsappDisplay.replace(/\D/g, "")).toBe(site.whatsapp);
  });

  it("are empty while no number is set, so nothing links to them", async () => {
    const { whatsappHref: bare } = await withFilledSite({ whatsapp: "" }, () => import("@/config/contact"));
    expect(bare()).toBe("");
    const { whatsappHref: filled } = await withFilledSite({ whatsapp: fakeContact.whatsapp }, () => import("@/config/contact"));
    expect(filled().startsWith(`https://wa.me/${fakeContact.whatsapp}?text=`)).toBe(true);
  });
});

describe("other ways to reach us", () => {
  it("name only the channels that have a number, and the booking FAQ says so", () => {
    expect(contactChannels()).toBe(site.phone ? "message us on WhatsApp or call us" : "message us on WhatsApp");
    expect(generalFaqs[0].a).toContain(`or ${contactChannels()}.`);
    expect(generalFaqs[0].a).not.toMatch(/by phone/);
    expect(contactChannels(fakeContact)).toBe("message us on WhatsApp or call us");
    expect(contactChannels({ whatsapp: "", phone: fakeContact.phone })).toBe("call us");
    expect(contactChannels({ whatsapp: "", phone: "" })).toBe("");
  });
});
