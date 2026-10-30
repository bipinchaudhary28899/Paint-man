import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadForm } from "@/components/LeadForm";
import { TRACKING_KEY } from "@/components/UtmCapture";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

/** The required part: name, mobile and the full address. */
async function fillBooking() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Your name"), "Asha Verma");
  await user.type(screen.getByLabelText("Mobile number"), "9876543210");
  await user.type(screen.getByLabelText(/House \/ flat no/), "12, Rose Villa, Nehru Road");
  await user.selectOptions(screen.getByLabelText("City"), "agra");
  await user.type(screen.getByLabelText("Locality"), "Kamla Nagar");
  await user.type(screen.getByLabelText("PIN code"), "282005");
  return user;
}

/** Opens "Add more details" and fills the job. */
async function fillDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Add more details"));
  await user.selectOptions(screen.getByLabelText("What needs painting?"), "Interior Painting");
  await user.selectOptions(screen.getByLabelText("Property type"), "Apartment / Flat");
  await user.selectOptions(screen.getByLabelText("Floors to paint"), "2");
  await user.selectOptions(screen.getByLabelText("Home size"), "3 BHK");
}

const details = (container: HTMLElement) => container.querySelector("details")!;

beforeEach(() => {
  router.push.mockReset();
});

describe("LeadForm (booking)", () => {
  it("asks only for name, mobile and the full address; the job details are optional, behind Add more details", () => {
    const { container } = render(<LeadForm type="booking" />);
    for (const label of ["Your name", "Mobile number", /House \/ flat no/, "City", "Locality", "PIN code"]) expect(screen.getByLabelText(label)).toBeRequired();
    // we paint in Agra, Mathura and Vrindavan, so the city is chosen first, before the locality
    expect([...(screen.getByLabelText("City") as HTMLSelectElement).options].map((o) => o.text)).toEqual(["Select your city", "Agra", "Mathura", "Vrindavan"]);
    expect(screen.getByLabelText("City").compareDocumentPosition(screen.getByLabelText("Locality")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(details(container)).not.toHaveAttribute("open");
    for (const label of ["What needs painting?", "Property type", "Floors to paint", "Home size", /Carpet area per floor/, /Preferred inspection date/, /Anything we should know/]) {
      const field = screen.getByLabelText(label);
      expect(details(container)).toContainElement(field);
      expect(field).not.toBeRequired();
    }
    expect(screen.getByLabelText("PIN code")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("PIN code")).toHaveAttribute("autocomplete", "postal-code");
    expect(screen.getByRole("button", { name: "Book my inspection" })).toBeEnabled();
  });

  it("offers every kind of job, doors, windows and single walls included, and pre-selects the service passed in", () => {
    render(<LeadForm type="booking" defaultService="Exterior Painting" />);
    const service = screen.getByLabelText("What needs painting?");
    expect(service).toHaveValue("Exterior Painting");
    expect([...(service as HTMLSelectElement).options].map((o) => o.text)).toContain("Doors, Windows & Small Jobs");
  });

  it("opens Add more details when the page prefilled the note, and when a detail comes back with an error", async () => {
    const { container, unmount } = render(<LeadForm type="booking" defaultMessage="Please bring the Berger card." />);
    expect(details(container)).toHaveAttribute("open");
    expect(screen.getByLabelText(/Anything we should know/)).toHaveValue("Please bring the Berger card.");
    unmount();
    mockFetch(422, { ok: false, error: "Please check the highlighted fields.", fieldErrors: { carpetArea: "Enter a whole number of sq ft" } });
    const view = render(<LeadForm type="booking" />);
    const user = await fillBooking();
    await user.click(screen.getByRole("button", { name: "Book my inspection" }));
    expect(await screen.findByText("Enter a whole number of sq ft")).toBeInTheDocument();
    expect(details(view.container)).toHaveAttribute("open");
  });

  it("books with only the required part filled in", async () => {
    const fetchSpy = mockFetch(200, { ok: true });
    render(<LeadForm type="booking" />);
    const user = await fillBooking();
    await user.click(screen.getByRole("button", { name: "Book my inspection" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/thank-you?type=booking"));
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({ address: "12, Rose Villa, Nehru Road", locality: "Kamla Nagar", pincode: "282005", service: "", floors: "" });
  });

  it("offers dates from today in India to a year ahead, worked out in the visitor's browser", () => {
    // 01:30 on 19 October in Agra is still 18 October in UTC
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-18T20:00:00Z"));
    try {
      render(<LeadForm type="booking" />);
      const date = screen.getByLabelText(/Preferred inspection date/);
      expect(date).toHaveAttribute("min", "2026-10-19");
      expect(date).toHaveAttribute("max", "2027-10-19");
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves the date range out of the prerendered HTML, so a static page never carries its build date", () => {
    const html = renderToString(<LeadForm type="booking" />);
    expect(html).toContain('id="preferredDate"');
    expect(html).not.toMatch(/\bmin="/);
    expect(html).not.toMatch(/\bmax="/);
  });

  it("posts the form as JSON with page and tracking info, then goes to the thank-you page", async () => {
    sessionStorage.setItem(TRACKING_KEY, JSON.stringify({ utmSource: "google", landingPage: "/" }));
    const fetchSpy = mockFetch(200, { ok: true });
    render(<LeadForm type="booking" />);
    const user = await fillBooking();
    await fillDetails(user);
    await user.click(screen.getByRole("button", { name: "Book my inspection" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/thank-you?type=booking"));
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/leads");
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(String(init?.body));
    expect(sent).toMatchObject({
      type: "booking",
      name: "Asha Verma",
      phone: "9876543210",
      address: "12, Rose Villa, Nehru Road",
      locality: "Kamla Nagar",
      pincode: "282005",
      propertyType: "Apartment / Flat",
      service: "Interior Painting",
      website: "",
      tracking: { utmSource: "google", landingPage: "/" },
    });
    expect(sent.page).toBe("/");
  });

  it("shows server field errors next to the fields and marks them invalid", async () => {
    mockFetch(422, { ok: false, error: "Please check the highlighted fields.", fieldErrors: { phone: "Enter a valid 10-digit mobile number" } });
    render(<LeadForm type="booking" />);
    const user = await fillBooking();
    await user.click(screen.getByRole("button", { name: "Book my inspection" }));

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
    await user.click(screen.getByRole("button", { name: "Book my inspection" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/network error/i);
    expect(screen.getByRole("button", { name: "Book my inspection" })).toBeEnabled();
  });

  it("disables the button while sending to prevent double submissions", async () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise((r) => (resolve = r)));
    render(<LeadForm type="booking" />);
    const user = await fillBooking();
    await user.click(screen.getByRole("button", { name: "Book my inspection" }));
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
    expect(screen.queryByLabelText("Property type")).not.toBeInTheDocument();
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


describe("job size fields", () => {
  it("asks for floors and home size, and shows a live paint-area estimate from the carpet area", async () => {
    render(<LeadForm type="booking" />);
    const user = await fillBooking();
    await fillDetails(user);
    expect(screen.getByText(/sale deed or society papers/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Carpet area per floor/), "1,200");
    expect(screen.getByText(/of walls and ceilings to paint/)).toHaveTextContent("About 8,400 sq ft");
    await user.selectOptions(screen.getByLabelText("What needs painting?"), "Exterior Painting");
    expect(screen.getByText("Measured on site for this job.")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("What needs painting?"), "Doors, Windows & Small Jobs");
    expect(screen.getByText("Measured on site for this job.")).toBeInTheDocument();
  });

  it("sends the job size with the booking", async () => {
    const fetchSpy = mockFetch(200, { ok: true });
    render(<LeadForm type="booking" />);
    const user = await fillBooking();
    await fillDetails(user);
    await user.type(screen.getByLabelText(/Carpet area per floor/), "950");
    await user.click(screen.getByRole("button", { name: "Book my inspection" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({ floors: "2", homeSize: "3 BHK", carpetArea: "950" });
  });

  it("has no job-size fields on the contact form", () => {
    render(<LeadForm type="contact" />);
    expect(screen.queryByLabelText("Floors to paint")).toBeNull();
  });
});

describe("checks in the browser before anything is sent", () => {
  it("submitting with the required part empty shows every problem at once, focuses the first and sends nothing", async () => {
    const fetchSpy = mockFetch(200, { ok: true });
    render(<LeadForm type="booking" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Book my inspection" }));

    for (const message of ["Enter your name", "Enter a valid 10-digit mobile number", "Enter your house or flat number and street", "Enter your locality", "Enter your 6-digit PIN code"]) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
    expect(screen.getByRole("alert")).toHaveTextContent("Please check the highlighted fields.");
    await waitFor(() => expect(screen.getByLabelText("Your name")).toHaveFocus());
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("checks a field when the visitor leaves it, not while it is still empty", async () => {
    render(<LeadForm type="booking" />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("PIN code"));
    await user.tab();
    expect(screen.queryByText("Enter your 6-digit PIN code")).toBeNull();

    await user.type(screen.getByLabelText("PIN code"), "2820");
    await user.tab();
    expect(screen.getByText("Enter your 6-digit PIN code")).toBeInTheDocument();
    expect(screen.getByLabelText("PIN code")).toHaveAttribute("aria-invalid", "true");
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
    await user.click(screen.getByRole("button", { name: "Book my inspection" }));
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
    await user.type(screen.getByLabelText(/House \/ flat no/), "12, Rose Villa, Nehru Road");
    await user.type(screen.getByLabelText("Locality"), "Raman Reti");
    await user.type(screen.getByLabelText("PIN code"), "281121");
    await user.click(screen.getByRole("button", { name: "Book my inspection" }));
    expect(screen.getByText("Choose your city")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText("City"), "vrindavan");
    expect(screen.queryByText("Choose your city")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Book my inspection" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({ city: "vrindavan", locality: "Raman Reti" });
  });
});
