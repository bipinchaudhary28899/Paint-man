import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuickVisitForm } from "@/components/QuickVisitForm";
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

describe("QuickVisitForm (Book site visit)", () => {
  it("books a site visit in a live city with name, mobile, city and an optional locality", async () => {
    const fetchSpy = mockFetch(200, { ok: true });
    const user = userEvent.setup();
    render(<QuickVisitForm />);
    expect(screen.getByRole("heading", { name: "Book a free site visit" })).toBeInTheDocument();
    expect(screen.getByText(/Zero advance payment/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Your name"), "Asha");
    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.type(screen.getByLabelText("Locality (optional)"), "Kamla Nagar");
    await user.click(screen.getByRole("button", { name: "Book site visit" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/thank-you?type=visit"));
    const body = JSON.parse(String(fetchSpy.mock.calls[0][1]!.body));
    expect(body).toMatchObject({ type: "visit", city: "agra", name: "Asha", phone: "9876543210", locality: "Kamla Nagar" });
    expect(router.prefetch).toHaveBeenCalledWith("/thank-you?type=visit");
  });

  it("turns into a waitlist form for a city that is not live yet", async () => {
    const fetchSpy = mockFetch(200, { ok: true });
    const user = userEvent.setup();
    render(<QuickVisitForm />);
    await user.selectOptions(screen.getByLabelText("City"), "bangalore");
    expect(screen.getByRole("heading", { name: "Join the Bangalore waitlist" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Delhi NCR (coming soon)" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Locality (optional)")).toBeNull();
    await user.type(screen.getByLabelText("Your name"), "Ravi");
    await user.type(screen.getByLabelText("Mobile number"), "9123456789");
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/thank-you?type=waitlist"));
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]!.body))).toMatchObject({ type: "visit", city: "bangalore" });
  });

  it("on a city page the city is fixed, and field errors are shown and focused", async () => {
    mockFetch(400, { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { phone: "Enter a valid 10-digit mobile number" } });
    const user = userEvent.setup();
    render(<QuickVisitForm defaultCity="agra" lockCity heading="Book a site visit in Agra" />);
    expect(screen.queryByLabelText("City")).toBeNull();
    await user.type(screen.getByLabelText("Your name"), "Asha");
    await user.type(screen.getByLabelText("Mobile number"), "123");
    await user.click(screen.getByRole("button", { name: "Book site visit" }));
    expect(await screen.findByText("Enter a valid 10-digit mobile number")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Please fix the highlighted fields.");
    expect(screen.getByLabelText("Mobile number")).toHaveAttribute("aria-invalid", "true");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("says so when the network fails, or the server gives no message", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));
    render(<QuickVisitForm />);
    await user.type(screen.getByLabelText("Your name"), "Asha");
    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.click(screen.getByRole("button", { name: "Book site visit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Network error/);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("not json", { status: 500 }));
    await user.click(screen.getByRole("button", { name: "Book site visit" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Please try again."));
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
