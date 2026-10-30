import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BookingSection } from "@/components/BookingSection";
import { HomeBooking } from "@/components/home/HomeBooking";
import { LeadForm } from "@/components/LeadForm";
import { illustrations } from "@/config/images";
import { promises, site } from "@/config/site";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

const NOTE = `${promises[0].title}, and nothing is booked until you approve the estimate.`;

/** true when `b` comes after `a` in the document */
const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("HomeBooking (the booking card after the hero)", () => {
  it("is one labelled section with a single h2, its italic accent, the call-back note and the full booking form", () => {
    render(<HomeBooking />);
    const section = screen.getByRole("region", { name: "Book a site visit online" });
    expect(section).toHaveAttribute("id", "book-visit");
    const headings = within(section).getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0].tagName).toBe("H2");
    expect(headings[0].querySelectorAll("em")).toHaveLength(1);
    expect(within(section).getByText(new RegExp(`working hours \\(${site.hoursDisplay}\\)`))).toBeInTheDocument();
    for (const label of ["Your name", "Mobile number", /House \/ flat no/, "City", "Locality", "PIN code"]) expect(within(section).getByLabelText(label)).toBeRequired();
    expect(within(section).getByRole("button", { name: "Book my inspection" })).toBeInTheDocument();
  });

  it("puts the zero-advance note beside the text on tablets and desktops, and under the submit button on phones", () => {
    render(<HomeBooking />);
    const notes = screen.getAllByText(NOTE);
    // one copy per layout; CSS shows exactly one of them at any width
    expect(notes).toHaveLength(2);
    const [beside, under] = notes;
    const form = screen.getByRole("button", { name: "Book my inspection" }).closest("form")!;
    expect(form).not.toContainElement(beside);
    expect(beside).toHaveClass("max-tab:hidden");
    expect(form).toContainElement(under);
    expect(under).toHaveClass("tab:hidden");
    // right under the button, before the privacy line
    const button = screen.getByRole("button", { name: "Book my inspection" });
    expect(button.nextElementSibling).toBe(under);
    expect(follows(under, screen.getByRole("link", { name: "privacy policy" }))).toBe(true);
  });

  it("shows the paint can once, with its alt text and its size reserved (no layout shift)", () => {
    render(<HomeBooking />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    const can = screen.getByRole("img", { name: illustrations.paintCan.alt });
    expect(can).toHaveAttribute("src", illustrations.paintCan.src);
    expect(can).toHaveAttribute("width", String(illustrations.paintCan.width));
    expect(can).toHaveAttribute("height", String(illustrations.paintCan.height));
  });
});

describe("BookingSection on other pages", () => {
  it("adds nothing under the button when no note is passed", () => {
    render(<BookingSection heading={<>Book a site visit in <em>Agra</em></>} text={<p>We call you back.</p>} />);
    const button = screen.getByRole("button", { name: "Book my inspection" });
    expect(button.nextElementSibling).toHaveTextContent("We use your details only to respond to this request.");
    expect(screen.getAllByText("We call you back.")).toHaveLength(1);
  });

  it("keeps the waitlist (contact) form with the note under its Send button", () => {
    render(<BookingSection id="waitlist" type="contact" heading="Join the waitlist" text="Not yet." note="We call you when bookings open." />);
    expect(screen.getByRole("region", { name: "Join the waitlist" })).toHaveAttribute("id", "waitlist");
    const button = screen.getByRole("button", { name: "Send message" });
    expect(button.nextElementSibling).toHaveTextContent("We call you when bookings open.");
    expect(screen.queryByLabelText("PIN code")).toBeNull();
  });
});

describe("LeadForm layout per screen", () => {
  it("renders a footnote right under the submit button, and none by default", () => {
    const { unmount } = render(<LeadForm type="booking" footnote={<p>No advance to pay.</p>} />);
    expect(screen.getByRole("button", { name: "Book my inspection" }).nextElementSibling).toHaveTextContent("No advance to pay.");
    unmount();
    render(<LeadForm type="booking" />);
    expect(screen.queryByText("No advance to pay.")).toBeNull();
  });

  it("keeps locality and PIN in one row, and name and mobile as a pair", () => {
    render(<LeadForm type="booking" />);
    // the grid row a field sits in (the mobile field has a +91 wrapper inside its cell)
    const row = (label: string) => screen.getByLabelText(label).closest(".grid")!;
    expect(row("Locality")).toBe(row("PIN code"));
    expect(row("Your name")).toBe(row("Mobile number"));
    expect(row("Your name")).not.toBe(row("Locality"));
  });

  it("opens Add more details with a tap on its summary, which keeps its label and the optional hint", async () => {
    const user = userEvent.setup();
    const { container } = render(<LeadForm type="booking" />);
    const details = container.querySelector("details")!;
    const summary = details.querySelector("summary")!;
    expect(summary).toHaveTextContent("Add more details (optional)");
    expect(details).not.toHaveAttribute("open");
    await user.click(screen.getByText("Add more details"));
    expect(details).toHaveAttribute("open");
    expect(screen.getByLabelText("What needs painting?")).toBeVisible();
  });
});
