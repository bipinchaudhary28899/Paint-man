import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingSection } from "@/components/BookingSection";
import { NavMenu } from "@/components/NavMenu";
import { Promises } from "@/components/Promises";
import { ThankYouMessage } from "@/components/ThankYouMessage";
import { navMenus } from "@/config/nav";
import { promises } from "@/config/site";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }));
const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => pathname.value }));

const mockFetch = (status: number, body: unknown) => vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  router.push.mockReset();
  router.prefetch.mockReset();
});

describe("BookingSection (our booking form with its heading)", () => {
  it("shows the heading and note beside the full booking form", () => {
    render(<BookingSection heading={<>Book a site visit <em>online</em></>} text={<p>We call you back.</p>} />);
    const section = screen.getByRole("region", { name: "Book a site visit online" });
    expect(section).toHaveAttribute("id", "book-visit");
    expect(screen.getByRole("heading", { level: 2, name: "Book a site visit online" })).toBeInTheDocument();
    expect(screen.getByText("We call you back.")).toBeInTheDocument();
    // LeadForm's booking fields, not a short call-back form
    for (const label of ["Your name", "Mobile number", "Property type", "Service needed", "Floors to paint", "Home size"]) expect(screen.getByLabelText(label)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book my inspection" })).toBeInTheDocument();
  });

  it("can hold the contact form with a prefilled message, under its own id", () => {
    render(<BookingSection id="waitlist" type="contact" defaultMessage="Please call me when you start in Bangalore." heading="Join the waitlist" text="Not yet." />);
    expect(screen.getByRole("region", { name: "Join the waitlist" })).toHaveAttribute("id", "waitlist");
    expect(screen.getByLabelText(/How can we help/)).toHaveValue("Please call me when you start in Bangalore.");
    expect(screen.queryByLabelText("Property type")).toBeNull();
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });
});

describe("NavMenu (header dropdowns)", () => {
  const services = navMenus()[0];

  it("opens on click, lists crawlable links while closed, and closes on Escape with focus back on the button", async () => {
    const user = userEvent.setup();
    const { container } = render(<NavMenu menu={services} />);
    const button = screen.getByRole("button", { name: "Services" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector('a[href="/services/interior-painting"]')).not.toBeNull(); // in the HTML even when hidden
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /House painting/ })).toBeVisible();
    await user.keyboard("{Escape}");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("closes on a click outside, after following a link, and on hover-out", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<><NavMenu menu={services} /><p>outside</p></>);
    const button = screen.getByRole("button", { name: "Services" });
    await user.click(button);
    await user.click(screen.getByText("outside"));
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.hover(button);
    act(() => vi.advanceTimersByTime(100));
    expect(button).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("link", { name: "All services" }));
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.hover(button);
    act(() => vi.advanceTimersByTime(100));
    await user.unhover(button.parentElement!);
    act(() => vi.advanceTimersByTime(300));
    expect(button).toHaveAttribute("aria-expanded", "false");
    vi.useRealTimers();
  });

  it("groups the cities by region and marks the ones coming soon", () => {
    const cities = navMenus().find((m) => m.label === "Cities")!;
    expect(cities.groups.map((g) => g.heading)).toEqual(["Uttar Pradesh", "Delhi NCR", "Karnataka"]);
    const links = cities.groups.flatMap((g) => g.links);
    expect(links.find((l) => l.href === "/services/house-painting/agra")?.note).toBeUndefined();
    expect(links.find((l) => l.href === "/services/house-painting/bangalore")?.note).toBe("Coming soon");
  });
});

describe("Promises", () => {
  it("lists every promise, with or without the section heading", () => {
    const { unmount } = render(<Promises />);
    expect(screen.getByRole("heading", { level: 2, name: "Our promises" })).toBeInTheDocument();
    for (const p of promises) expect(screen.getByRole("heading", { level: 3, name: p.title })).toBeInTheDocument();
    expect(promises.map((p) => p.title)).toEqual(expect.arrayContaining(["Zero advance payment", "Full estimate before work starts", "Timed work", "Fully documented", "Zero compromise on quality", "What's best for you, not for us"]));
    unmount();
    render(<Promises heading={false} />);
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(screen.getByRole("region", { name: "Our promises" })).toBeInTheDocument();
  });
});

describe("ThankYouMessage for the waitlist", () => {
  it("tells a waitlisted visitor we call when their city opens", () => {
    window.history.replaceState(null, "", "/thank-you?type=waitlist");
    render(<ThankYouMessage />);
    expect(screen.getByRole("heading", { name: "You're on the waitlist" })).toBeInTheDocument();
    window.history.replaceState(null, "", "/");
  });
});
