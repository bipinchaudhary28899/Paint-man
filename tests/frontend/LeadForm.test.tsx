import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadForm } from "@/components/LeadForm";
import { TRACKING_KEY } from "@/components/UtmCapture";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

async function fillBooking() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Your name"), "Asha Verma");
  await user.type(screen.getByLabelText("Mobile number"), "9876543210");
  await user.type(screen.getByLabelText(/Locality in/), "Kamla Nagar");
  await user.selectOptions(screen.getByLabelText("Property type"), "Apartment / Flat");
  await user.selectOptions(screen.getByLabelText("Service needed"), "Interior Painting");
  return user;
}

beforeEach(() => {
  router.push.mockReset();
});

describe("LeadForm (booking)", () => {
  it("renders every booking field with a label", () => {
    render(<LeadForm type="booking" />);
    for (const label of ["Your name", "Mobile number", /Locality in/, "Property type", "Service needed", /Preferred inspection date/, /Anything we should know/]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Book my inspection" })).toBeEnabled();
  });

  it("pre-selects the service passed in", () => {
    render(<LeadForm type="booking" defaultService="Exterior Painting" />);
    expect(screen.getByLabelText("Service needed")).toHaveValue("Exterior Painting");
  });

  it("does not allow picking a date in the past", () => {
    render(<LeadForm type="booking" />);
    const min = screen.getByLabelText(/Preferred inspection date/).getAttribute("min")!;
    expect(min).toBe(new Date().toISOString().slice(0, 10));
  });

  it("posts the form as JSON with page and tracking info, then goes to the thank-you page", async () => {
    sessionStorage.setItem(TRACKING_KEY, JSON.stringify({ utmSource: "google", landingPage: "/" }));
    const fetchSpy = mockFetch(200, { ok: true });
    render(<LeadForm type="booking" />);
    const user = await fillBooking();
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
      locality: "Kamla Nagar",
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
