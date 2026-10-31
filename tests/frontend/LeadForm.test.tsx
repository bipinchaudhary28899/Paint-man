import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadForm } from "@/components/LeadForm";
import { TRACKING_KEY } from "@/components/UtmCapture";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

/** Everything a booking asks: name, mobile, city and area. */
async function fillBooking() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Your name"), "Asha Verma");
  await user.type(screen.getByLabelText("Mobile number"), "9876543210");
  await user.selectOptions(screen.getByLabelText("City"), "agra");
  await user.type(screen.getByLabelText("Area / locality"), "Kamla Nagar");
  return user;
}

beforeEach(() => {
  router.push.mockReset();
});

describe("LeadForm (booking)", () => {
  it("asks only who and where: name, mobile, city and area, with no address or job fields", () => {
    const { container } = render(<LeadForm type="booking" />);
    for (const label of ["Your name", "Mobile number", "City", "Area / locality"]) expect(screen.getByLabelText(label)).toBeRequired();
    // we paint in Agra, Mathura and Vrindavan, so the city is chosen first, before the area
    expect([...(screen.getByLabelText("City") as HTMLSelectElement).options].map((o) => o.text)).toEqual(["Select your city", "Agra", "Mathura", "Vrindavan"]);
    expect(screen.getByLabelText("City").compareDocumentPosition(screen.getByLabelText("Area / locality")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const label of [/House \/ flat no/, "PIN code", "What needs painting?", "Property type", /Carpet area/, /inspection date/]) expect(screen.queryByLabelText(label)).toBeNull();
    expect(container.querySelector("details")).toBeNull();
    expect(container.querySelectorAll("input:not([type=hidden]):not([name=website]), select, textarea")).toHaveLength(4);
    // it says where the rest goes
    expect(screen.getByText(/Add the address and what needs painting later in your account/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book my site visit" })).toBeEnabled();
  });

  it("carries what the page knows: the service of a service page, and a prefilled note the visitor can edit", async () => {
    const fetchSpy = mockFetch(200, { ok: true });
    const { container, unmount } = render(<LeadForm type="booking" defaultService="Exterior Painting" />);
    expect(container.querySelector<HTMLInputElement>('input[type=hidden][name="service"]')).toHaveValue("Exterior Painting");
    expect(screen.queryByLabelText(/Your note/)).toBeNull();
    unmount();
    render(<LeadForm type="booking" defaultMessage="Please bring the Berger card." />);
    expect(screen.getByLabelText(/Your note/)).toHaveValue("Please bring the Berger card.");
    expect(screen.getByLabelText(/Your note/)).not.toBeRequired();
    const user = await fillBooking();
    await user.click(screen.getByRole("button", { name: "Book my site visit" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({ message: "Please bring the Berger card." });
  });

  it("posts the form as JSON with page and tracking info, then goes to the thank-you page", async () => {
    sessionStorage.setItem(TRACKING_KEY, JSON.stringify({ utmSource: "google", landingPage: "/" }));
    const fetchSpy = mockFetch(200, { ok: true });
    render(<LeadForm type="booking" />);
    const user = await fillBooking();
    await user.click(screen.getByRole("button", { name: "Book my site visit" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/thank-you?type=booking"));
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/leads");
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(sent).toMatchObject({ type: "booking", name: "Asha Verma", phone: "9876543210", city: "agra", locality: "Kamla Nagar", website: "", tracking: { utmSource: "google", landingPage: "/" } });
    expect(sent).not.toHaveProperty("address");
    expect(sent).not.toHaveProperty("pincode");
    expect(sent.page).toBe("/");
  });

  it("shows server field errors next to the fields and marks them invalid", async () => {
    mockFetch(422, { ok: false, error: "Please check the highlighted fields.", fieldErrors: { phone: "Enter a valid 10-digit mobile number" } });
    render(<LeadForm type="booking" />);
    const user = await fillBooking();
    await user.click(screen.getByRole("button", { name: "Book my site visit" }));

    expect(await screen.findByText("Enter a valid 10-digit mobile number")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Please check the highlighted fields.");
    const phone = screen.getByLabelText("Mobile number");
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(phone).toHaveAttribute("aria-describedby", "phone-error");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows a friendly message on network failure and re-enables the button", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    render(<LeadForm type="booking" />);
    const user = await fillBooking();
    await user.click(screen.getByRole("button", { name: "Book my site visit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/network error/i);
    expect(screen.getByRole("button", { name: "Book my site visit" })).toBeEnabled();
  });

  it("disables the button while sending to prevent double submissions", async () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise((r) => (resolve = r)));
    render(<LeadForm type="booking" />);
    const user = await fillBooking();
    await user.click(screen.getByRole("button", { name: "Book my site visit" }));
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
    resolve(new Response(JSON.stringify({ ok: true })));
    await waitFor(() => expect(router.push).toHaveBeenCalled());
  });

  it("hides the spam honeypot from people and keyboard users", () => {
    const { container } = render(<LeadForm type="booking" />);
    const trap = container.querySelector<HTMLInputElement>('input[name="website"]')!;
    expect(trap).toHaveAttribute("tabindex", "-1");
    expect(trap.closest("[aria-hidden]")).not.toBeNull();
  });
});

describe("LeadForm (contact)", () => {
  it("shows only name, phone and a required message", () => {
    render(<LeadForm type="contact" />);
    expect(screen.queryByLabelText("Area / locality")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/How can we help/)).toBeRequired();
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });

  it("redirects to the contact thank-you page on success", async () => {
    mockFetch(200, { ok: true });
    render(<LeadForm type="contact" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Your name"), "Ravi");
    await user.type(screen.getByLabelText("Mobile number"), "9123456789");
    await user.type(screen.getByLabelText(/How can we help/), "Need a quote");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/thank-you?type=contact"));
  });
});


describe("checks in the browser before anything is sent", () => {
  it("submitting with the required part empty shows every problem at once, focuses the first and sends nothing", async () => {
    const fetchSpy = mockFetch(200, { ok: true });
    render(<LeadForm type="booking" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Book my site visit" }));

    for (const message of ["Enter your name", "Enter a valid 10-digit mobile number", "Choose your city", "Enter your area or locality"]) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
    expect(screen.getByRole("alert")).toHaveTextContent("Please check the highlighted fields.");
    await waitFor(() => expect(screen.getByLabelText("Your name")).toHaveFocus());
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("checks a field when the visitor leaves it, not while it is still empty", async () => {
    render(<LeadForm type="booking" />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Mobile number"));
    await user.tab();
    expect(screen.queryByText("Enter a valid 10-digit mobile number")).toBeNull();

    await user.type(screen.getByLabelText("Mobile number"), "98765");
    await user.tab();
    expect(screen.getByText("Enter a valid 10-digit mobile number")).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile number")).toHaveAttribute("aria-invalid", "true");
  });

  it("clears a field's error, and the summary with the last one, as soon as the value is fixed", async () => {
    render(<LeadForm type="contact" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Your name"), "Ravi");
    await user.type(screen.getByLabelText(/How can we help/), "Need a quote for two rooms");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(screen.getByText("Enter a valid 10-digit mobile number")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Mobile number"), "9123456789");
    expect(screen.queryByText("Enter a valid 10-digit mobile number")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows +91 inside the mobile field and asks the browser for the national number", () => {
    render(<LeadForm type="booking" />);
    const phone = screen.getByLabelText("Mobile number");
    expect(phone.parentElement).toHaveTextContent("+91");
    expect(phone).toHaveAttribute("autocomplete", "tel-national");
  });

  it("marks the form busy and shows a spinner beside Sending…", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    const { container } = render(<LeadForm type="booking" />);
    const user = await fillBooking();
    await user.click(screen.getByRole("button", { name: "Book my site visit" }));
    expect(container.querySelector("form")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Sending…" }).querySelector(".animate-spin")).not.toBeNull();
  });
});

describe("choosing the city (we paint in Agra, Mathura and Vrindavan)", () => {
  it("asks for the city, suggests that city's localities, and flags a missing city before sending", async () => {
    const fetchSpy = mockFetch(200, { ok: true });
    const { container } = render(<LeadForm type="booking" />);
    const user = userEvent.setup();
    const suggestions = () => [...container.querySelectorAll("#locality-options option")].map((o) => o.getAttribute("value"));
    expect(suggestions()).toEqual(expect.arrayContaining(["Kamla Nagar", "Krishna Nagar", "Raman Reti"]));

    await user.selectOptions(screen.getByLabelText("City"), "vrindavan");
    expect(suggestions()).toContain("Raman Reti");
    expect(suggestions()).not.toContain("Kamla Nagar");

    await user.selectOptions(screen.getByLabelText("City"), "mathura");
    expect(suggestions()).toContain("Krishna Nagar");
    expect(suggestions()).not.toContain("Raman Reti");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not send a booking without a city, and clears the error once one is chosen", async () => {
    const fetchSpy = mockFetch(200, { ok: true });
    render(<LeadForm type="booking" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Your name"), "Asha Verma");
    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.type(screen.getByLabelText("Area / locality"), "Raman Reti");
    await user.click(screen.getByRole("button", { name: "Book my site visit" }));
    expect(screen.getByText("Choose your city")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText("City"), "vrindavan");
    expect(screen.queryByText("Choose your city")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Book my site visit" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({ city: "vrindavan", locality: "Raman Reti" });
  });
});
