import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Linking } from "react-native";

import { ProjectTracker, Stepper } from "~/components/account/Tracker";
import { AuthProvider } from "~/lib/auth-context";
import { apiBase } from "~/lib/config";
import { asha, detail, mockApi, offline, savedToken, seedToken, type Answer } from "./helpers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  usePathname: jest.fn(() => "/account/projects/p"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

const ID = "3f0c2b1a-1111-4222-8333-444455556666";
const path = `GET /api/v1/projects/${ID}`;
const download = File.downloadFileAsync as unknown as jest.Mock;

async function show(answer: Answer | Answer[]) {
  seedToken();
  const calls = mockApi({ "GET /api/v1/me": { data: asha }, [path]: answer });
  await render(
    <AuthProvider>
      <ProjectTracker id={ID} />
    </AuthProvider>,
  );
  return calls;
}

beforeEach(() => jest.clearAllMocks());

describe("the project tracker", () => {
  it("opens the login screen when signed out, coming back to this project", async () => {
    mockApi({});
    await render(
      <AuthProvider>
        <ProjectTracker id={ID} />
      </AuthProvider>,
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: "/login", params: { next: `/account/projects/${ID}` } }));
  });

  it("says where the project stands and what happens next", async () => {
    const calls = await show({ data: detail() });
    expect(await screen.findByRole("header", { name: "Interior Painting in Kamla Nagar, Agra" })).toBeOnTheScreen();
    expect(calls.find((c) => c.path === `/api/v1/projects/${ID}`)).toMatchObject({ headers: { Authorization: "Bearer saved-token" } });
    expect(screen.getByText("12, Rose Villa, Nehru Road, Kamla Nagar, Agra 282005")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Quotation shared" })).toBeOnTheScreen();
    expect(screen.getByText("Your itemised quotation is ready to review.")).toBeOnTheScreen();
    expect(screen.getByLabelText("What happens next: Price finalised")).toBeOnTheScreen();
    expect(screen.queryByText("Final price")).toBeNull();
  });

  it("shows every stage as done, now or to come, with the day each was reached", async () => {
    await show({ data: detail() });
    expect(await screen.findByLabelText("Booking received, done, Tue 20 Oct 2026")).toBeOnTheScreen();
    expect(screen.getByLabelText("Quotation shared, now, Fri 30 Oct 2026")).toBeOnTheScreen();
    expect(screen.getByLabelText("Handed over, to come")).toBeOnTheScreen();
  });

  it("shows the inspection: the visit, the inspector and what they found", async () => {
    await show({ data: detail() });
    expect(await screen.findByRole("header", { name: "Inspection" })).toBeOnTheScreen();
    expect(screen.getByText("Sat 24 Oct 2026, 11:00 am")).toBeOnTheScreen();
    expect(screen.getByText("Sun 25 Oct 2026, 11:30 am")).toBeOnTheScreen();
    expect(screen.getByText("Ravi Kumar")).toBeOnTheScreen();
    expect(screen.getByText("Walls sound; one damp patch.")).toBeOnTheScreen();
  });

  it("lists the quotations newest first, itemised, with totals in rupees, notes, terms and the valid-until day", async () => {
    await show({ data: detail() });
    const headers = (await screen.findAllByRole("header", { name: /^Quotation, version/ })).map((h) => h.props.children.join(""));
    expect(headers).toEqual(["Quotation, version 2", "Quotation, version 1"]);
    const v2 = within(screen.getByTestId("quotation-2"));
    expect(v2.getByText("Ready to review")).toBeOnTheScreen();
    expect(v2.getByText("Shared Fri 30 Oct 2026")).toBeOnTheScreen();
    expect(v2.getByLabelText("Living room walls, Putty touch-up, primer, two coats, 1,000 sq ft · 2 coats · ₹18 per sq ft, 18,000 rupees")).toBeOnTheScreen();
    expect(v2.getByText("₹4,500")).toBeOnTheScreen();
    expect(v2.getByLabelText("Total 22,500 rupees")).toBeOnTheScreen();
    expect(v2.getByText("₹22,500")).toBeOnTheScreen();
    expect(v2.getByText("Asian Paints Royale, two coats.")).toBeOnTheScreen();
    expect(v2.getByText("Nothing in advance; 50% at the halfway walkthrough, the rest at handover.")).toBeOnTheScreen();
    expect(v2.getByText("Sat 14 Nov 2026")).toBeOnTheScreen();
    const v1 = within(screen.getByTestId("quotation-1"));
    expect(v1.getByText("Replaced by a newer version")).toBeOnTheScreen();
    expect(v1.queryByText("Valid until")).toBeNull();
  });

  it("highlights the finalised price once a quotation is approved", async () => {
    const base = detail();
    const approved = { ...base.quotations[0], status: "approved" as const, approvedAt: "2026-10-31T06:30:00.000Z", subtotalPaise: 2400000 };
    await show({ data: detail({ stage: "price_finalised", stageLabel: "Price finalised", finalPricePaise: 2250000, quotations: [approved, base.quotations[1]] }) });
    expect(await screen.findByLabelText("Final price 22,500 rupees, quotation version 2")).toBeOnTheScreen();
    const v2 = within(screen.getByTestId("quotation-2"));
    expect(v2.getByText("Approved")).toBeOnTheScreen();
    expect(v2.getByText("Approved Sat 31 Oct 2026")).toBeOnTheScreen();
    expect(v2.getByLabelText("Final price 22,500 rupees")).toBeOnTheScreen();
    expect(v2.getByLabelText("Subtotal 24,000 rupees")).toBeOnTheScreen();
  });

  it("lists every update newest first, with our notes", async () => {
    await show({ data: detail() });
    const updates = await screen.findAllByLabelText(/^(Fri 30 Oct|Sun 25 Oct|Tue 20 Oct) 2026\./);
    expect(updates.map((u) => u.props.accessibilityLabel)).toEqual([
      "Fri 30 Oct 2026. Quotation shared. Revised quotation (version 2).",
      "Sun 25 Oct 2026. Inspection done. Damp patch near the balcony door; treated before painting.",
      "Tue 20 Oct 2026. Booking received",
    ]);
  });

  it("offers the contact page for help while the website lists no numbers", async () => {
    await show({ data: detail() });
    await fireEvent.press(await screen.findByRole("link", { name: "Contact us" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/contact", params: {} });
  });

  it("says what is still to come for a fresh booking: no inspection, no quotation, no updates", async () => {
    await show({ data: detail({ stage: "booked", stageLabel: "Booking received", inspection: null, quotations: [], timeline: [], address: null, pincode: null, locality: null, city: null, service: null }) });
    expect(await screen.findByRole("header", { name: "Painting project, tracked" })).toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: "Inspection" })).toBeNull();
    expect(screen.getByText(/Your itemised quotation shows here once the inspection is done/)).toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: "Updates" })).toBeNull();
  });
});

describe("the project tracker: the quotation PDF", () => {
  it("downloads it with the session's bearer token into the cache and opens the share sheet", async () => {
    await show({ data: detail() });
    await fireEvent.press(await screen.findByRole("button", { name: "Download PDF of quotation version 2" }));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///cache/Paint-Saathi-quotation-v2.pdf", expect.objectContaining({ mimeType: "application/pdf", UTI: "com.adobe.pdf" })));
    expect(download).toHaveBeenCalledWith(`${apiBase()}/api/v1/projects/${ID}/quotations/q2/pdf`, expect.anything(), expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer saved-token" }) }));
  });

  it("says when the download fails, and signs out when the session has expired", async () => {
    await show({ data: detail() });
    download.mockRejectedValueOnce(new Error("Unable to download a file: response has status 404"));
    await fireEvent.press(await screen.findByRole("button", { name: "Download PDF of quotation version 1" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This quotation is no longer available. Open the project again to see the latest version.");
    download.mockRejectedValueOnce(new Error("Unable to download a file: response has status 401"));
    await fireEvent.press(screen.getByRole("button", { name: "Download PDF of quotation version 2" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith({ pathname: "/login", params: { next: `/account/projects/${ID}` } }));
    expect(savedToken()).toBeUndefined();
  });
});

describe("the project tracker: when it cannot show the project", () => {
  it("says it is not in this account (another customer's project, or a bad link)", async () => {
    await show({ status: 404, error: { code: "not_found", message: "No such project in your account." } });
    expect(await screen.findByRole("header", { name: "Project not found" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    // the breadcrumb and the button both go to the account
    const [crumb, button] = screen.getAllByRole("link", { name: "My account" });
    await fireEvent.press(button);
    expect(router.navigate).toHaveBeenCalledWith("/account");
    await fireEvent.press(crumb);
    expect(router.push).toHaveBeenCalledWith({ pathname: "/account", params: {} });
  });

  it("says when it cannot load, and tries again", async () => {
    await show([offline, { data: detail() }]);
    expect(await screen.findByRole("header", { name: "Your project could not load" })).toBeOnTheScreen();
    expect(screen.getByText("Network error. Please check your connection and try again.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("header", { name: "Interior Painting in Kamla Nagar, Agra" })).toBeOnTheScreen();
  });
});

describe("Stepper", () => {
  it("shows a paused project's hold as the current step, after the furthest stage reached", async () => {
    await render(
      <Stepper
        steps={[
          { stage: "booked", label: "Booking received", done: true, current: false },
          { stage: "call_confirmed", label: "Visit being arranged", done: false, current: false },
          { stage: "on_hold", label: "On hold", done: false, current: true },
        ]}
      />,
    );
    expect(screen.getByLabelText("Booking received, done")).toHaveTextContent(/Done/);
    expect(screen.getByLabelText("On hold, now")).toHaveTextContent(/Now$/);
  });
});

describe("help with numbers", () => {
  it("offers call and WhatsApp once the website lists them", async () => {
    const spy = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const site = jest.requireActual("~/shared").site as { phone: string; whatsapp: string };
    const before = { phone: site.phone, whatsapp: site.whatsapp };
    Object.assign(site, { phone: "+919876543210", whatsapp: "919876543210" });
    try {
      await show({ data: detail() });
      await fireEvent.press(await screen.findByRole("link", { name: "Call us" }));
      expect(spy).toHaveBeenCalledWith("tel:+919876543210");
      await fireEvent.press(screen.getByRole("link", { name: "WhatsApp us" }));
      expect(spy.mock.calls.at(-1)?.[0]).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
      expect(screen.queryByRole("link", { name: "Contact us" })).toBeNull();
    } finally {
      Object.assign(site, before);
    }
  });
});
