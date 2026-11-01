import { router } from "expo-router";
import { Linking } from "react-native";

import { FIELD_MESSAGES } from "@/lib/leads/field-checks";
import { webUrl } from "~/lib/config";
import { ApiError, NETWORK_MESSAGE } from "~/lib/api";
import { FORM_ERROR, submitContact, toContactPayload } from "~/lib/leads";
import { openHref, routeFor } from "~/lib/links";
import { footerColumns, navMenus, menuLinks } from "~/shared";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));

describe("routeFor", () => {
  it("maps website paths to the app screen at the same path", () => {
    expect(routeFor("/")).toEqual({ pathname: "/", params: {} });
    expect(routeFor("/services/interior-painting/agra")).toEqual({ pathname: "/services/interior-painting/agra", params: {} });
    expect(routeFor("/shade-cards/berger/blue")).toEqual({ pathname: "/shade-cards/berger/blue", params: {} });
    expect(routeFor("/faq/")).toEqual({ pathname: "/faq", params: {} });
  });

  it("turns a #fragment into the section param and keeps the query", () => {
    expect(routeFor("/services/house-painting/agra#localities")).toEqual({ pathname: "/services/house-painting/agra", params: { section: "localities" } });
    expect(routeFor("/colours?brand=asian-paints&q=8386")).toEqual({ pathname: "/colours", params: { brand: "asian-paints", q: "8386" } });
  });

  it("has the account screens at the website's paths", () => {
    expect(routeFor("/login")).toEqual({ pathname: "/login", params: {} });
    expect(routeFor("/login?next=/account")).toEqual({ pathname: "/login", params: { next: "/account" } });
    expect(routeFor("/account")).toEqual({ pathname: "/account", params: {} });
    expect(routeFor("/account/projects/3f0c2b1a-1111-4222-8333-444455556666")).toEqual({ pathname: "/account/projects/3f0c2b1a-1111-4222-8333-444455556666", params: {} });
    expect(routeFor("/account/projects/a/b")).toBeNull();
    expect(routeFor("/account/settings")).toBeNull();
  });

  it("has no screen for external links or pages the app does not have", () => {
    expect(routeFor("https://wa.me/91")).toBeNull();
    expect(routeFor("/admin")).toBeNull();
    expect(routeFor("/services/a/b/c")).toBeNull();
  });

  it("has a screen for every link in the website's menus and footer", () => {
    const hrefs = [...footerColumns().flatMap((c) => c.links), ...navMenus().flatMap(menuLinks)].map((l) => l.href);
    expect(hrefs.length).toBeGreaterThan(20);
    for (const href of hrefs) expect(routeFor(href)).not.toBeNull();
  });
});

describe("openHref", () => {
  beforeEach(() => jest.clearAllMocks());

  it("pushes the app screen for a website path", () => {
    openHref("/services/house-painting/agra#localities");
    expect(router.push).toHaveBeenCalledWith({ pathname: "/services/house-painting/agra", params: { section: "localities" } });
  });

  it("opens other links in the browser, website paths on the website", () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    openHref("/admin");
    openHref("tel:+911234");
    expect(open.mock.calls).toEqual([[webUrl("/admin")], ["tel:+911234"]]);
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("contact form", () => {
  const ok = { apiVersion: "v1" as const, kind: "contact-message", label: "x", data: { received: true }, meta: { generatedAt: "x" } };

  it("checks the website's required fields first and sends nothing with a mistake in it", async () => {
    const send = jest.fn();
    await expect(submitContact({ name: "", phone: "", message: "" }, { send })).resolves.toEqual({
      ok: false,
      errors: { name: FIELD_MESSAGES.name, phone: FIELD_MESSAGES.phone, message: FIELD_MESSAGES.message },
      message: FORM_ERROR,
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends the message (a city's waitlist too) to /api/v1/messages, with the screen it came from", async () => {
    const send = jest.fn().mockResolvedValue(ok);
    await expect(submitContact({ name: "Asha", phone: "98765 43210", message: "Two doors" }, { page: "/contact", send })).resolves.toEqual({ ok: true, sent: true });
    expect(send).toHaveBeenCalledWith("/api/v1/messages", { method: "POST", body: { type: "contact", name: "Asha", phone: "9876543210", message: "Two doors", page: "/contact" } });
  });

  it("shows the API's field messages, and its one message otherwise", async () => {
    const refused = new ApiError("invalid_request", "Please check the highlighted fields.", 400, { message: FIELD_MESSAGES.message });
    await expect(submitContact({ name: "Asha", phone: "9876543210", message: "Hi there" }, { send: jest.fn().mockRejectedValue(refused) })).resolves.toEqual({
      ok: false,
      errors: { message: FIELD_MESSAGES.message },
      message: FORM_ERROR,
    });
    await expect(submitContact({ name: "Asha", phone: "9876543210", message: "Hi there" }, { send: jest.fn().mockRejectedValue(new ApiError("network", NETWORK_MESSAGE)) })).resolves.toEqual({
      ok: false,
      errors: {},
      message: NETWORK_MESSAGE,
    });
  });

  it("builds the payload the website's schema expects", () => {
    expect(toContactPayload({ name: " Asha ", phone: "098765 43210", message: " Hi there " })).toEqual({ type: "contact", name: "Asha", phone: "9876543210", message: "Hi there", page: "app" });
  });
});
