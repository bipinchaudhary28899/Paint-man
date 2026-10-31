import { contactLinks, telUrl, whatsappUrl } from "~/lib/contact";
import { formatDate, isoToLocalDate, localDateToIso } from "~/lib/dates";
import { site } from "~/shared";

describe("contact links", () => {
  it("offer nothing while the website has no numbers", () => {
    expect(contactLinks({ phone: "", whatsapp: "" })).toEqual([]);
    // today's config: both empty, so the app shows no call or WhatsApp buttons
    expect(contactLinks()).toEqual(contactLinks({ phone: site.phone, whatsapp: site.whatsapp }));
  });

  it("offer call first, then WhatsApp with a first message", () => {
    expect(contactLinks({ phone: "+91 98765 43210", whatsapp: "919876543210" }, "Hello")).toEqual([
      { kind: "call", label: "Call us", url: "tel:+919876543210" },
      { kind: "whatsapp", label: "WhatsApp us", url: "https://wa.me/919876543210?text=Hello" },
    ]);
    expect(contactLinks({ phone: "", whatsapp: "+91 98765 43210" })[0].kind).toBe("whatsapp");
  });

  it("build tel: and wa.me links", () => {
    expect(telUrl("+91 1234")).toBe("tel:+911234");
    expect(whatsappUrl("+91-98765")).toBe("https://wa.me/9198765");
    expect(whatsappUrl("91", "a b&c")).toBe("https://wa.me/91?text=a%20b%26c");
  });
});

describe("dates", () => {
  it("round-trips a calendar date through the picker's local Date", () => {
    expect(localDateToIso(isoToLocalDate("2026-11-05"))).toBe("2026-11-05");
    expect(isoToLocalDate("2027-01-09").getDate()).toBe(9);
  });

  it("formats a date for the form", () => {
    expect(formatDate("2026-11-05")).toBe("Thu 5 Nov 2026");
  });
});

// The booking prefill (src/lib/prefill.ts) is tested with the booking page in tests/content/prefill.test.ts.
