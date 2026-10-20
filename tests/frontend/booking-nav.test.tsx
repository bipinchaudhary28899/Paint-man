import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingSection } from "@/components/BookingSection";
import { NavMenu } from "@/components/NavMenu";
import { Promises } from "@/components/Promises";
import { ThankYouMessage } from "@/components/ThankYouMessage";
import { menuLinks, navMenus } from "@/config/nav";
import { WorkFlow } from "@/components/WorkFlow";
import { illustrations } from "@/config/images";
import { areaSlug, promises, site, workFlow } from "@/config/site";

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
    for (const label of ["Your name", "Mobile number", "PIN code", "Property type", "What needs painting?", "Floors to paint", "Home size"]) expect(screen.getByLabelText(label)).toBeInTheDocument();
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

  it("Cities cascades: regions, then the cities of the region pointed at, then that city's localities", async () => {
    const user = userEvent.setup();
    const cities = navMenus().find((m) => m.label === "Cities")!;
    const { container } = render(<NavMenu menu={cities} />);
    // every level's links are in the HTML even while the menu is closed
    for (const href of ["/services/house-painting/agra", "/services/house-painting/delhi-ncr", "/services/house-painting/bangalore", "/services/house-painting/agra#kamla-nagar"]) {
      expect(container.querySelector(`a[href="${href}"]`), href).not.toBeNull();
    }
    await user.click(screen.getByRole("button", { name: "Cities" }));
    // first region open: Uttar Pradesh › Agra › its localities
    expect(screen.getByRole("button", { name: /Uttar Pradesh/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Agra" })).toHaveAttribute("href", "/services/house-painting/agra");
    expect(screen.getByText("Localities in Agra")).toBeVisible();
    for (const a of site.areas) expect(screen.getByRole("link", { name: a })).toHaveAttribute("href", `/services/house-painting/agra#${areaSlug(a)}`);
    expect(screen.queryByRole("link", { name: /Bangalore/ })).toBeNull(); // another region's cities stay hidden
    // pointing at Karnataka shows its cities; Bangalore is not open yet, so its column offers the waitlist
    await user.hover(screen.getByRole("button", { name: /Karnataka/ }));
    expect(screen.getByRole("button", { name: /Karnataka/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Uttar Pradesh/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: /Bangalore/ })).toHaveTextContent("Coming soon");
    expect(screen.queryByRole("link", { name: "Kamla Nagar" })).toBeNull();
    expect(screen.getByText(/not painting in Bangalore yet/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Join the waitlist" })).toHaveAttribute("href", "/services/house-painting/bangalore");
    // keyboard: focusing a region moves the columns too, and following a link closes the menu
    act(() => screen.getByRole("button", { name: /Delhi NCR/ }).focus());
    expect(screen.getByRole("link", { name: /Delhi NCR/ })).toHaveAttribute("href", "/services/house-painting/delhi-ncr");
    await user.click(screen.getByRole("button", { name: /Uttar Pradesh/ }));
    await user.hover(screen.getByRole("link", { name: "Agra" }));
    await user.click(screen.getByRole("link", { name: "Dayalbagh" }));
    expect(screen.getByRole("button", { name: "Cities" })).toHaveAttribute("aria-expanded", "false");
  });

  it("stays open when a click follows the hover that opened it, however the two are timed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<NavMenu menu={services} />);
    const button = screen.getByRole("button", { name: "Services" });
    // the hover opens it first, then the click lands: still open
    await user.hover(button);
    act(() => vi.advanceTimersByTime(100));
    expect(button).toHaveAttribute("aria-expanded", "true");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    // a later click (well after the hover) closes it, and a pending hover timer cannot reopen it
    act(() => vi.advanceTimersByTime(1000));
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    act(() => vi.advanceTimersByTime(300));
    expect(button).toHaveAttribute("aria-expanded", "false");
    vi.useRealTimers();
  });

  it("groups the cities by region, marks the ones coming soon and gives only live cities localities", () => {
    const cities = navMenus().find((m) => m.label === "Cities")!;
    expect(cities.tree!.map((r) => r.label)).toEqual(["Uttar Pradesh", "Delhi NCR", "Karnataka"]);
    expect(cities.tree![0].children!.map((c) => c.label)).toEqual(["Agra"]);
    expect(cities.tree![0].children![0].children!.map((l) => l.label)).toEqual([...site.areas]);
    expect(cities.tree![2].children![0].children).toEqual([]);
    const links = menuLinks(cities);
    expect(links.find((l) => l.href === "/services/house-painting/agra")?.note).toBeUndefined();
    expect(links.find((l) => l.href === "/services/house-painting/bangalore")?.note).toBe("Coming soon");
  });
});

describe("Promises", () => {
  it("lists every promise, with or without the section heading", () => {
    const { unmount } = render(<Promises />);
    expect(screen.getByRole("heading", { level: 2, name: "What you can count on" })).toBeInTheDocument();
    for (const p of promises) expect(screen.getByRole("heading", { level: 3, name: p.title })).toBeInTheDocument();
    expect(promises.map((p) => p.title)).toEqual(expect.arrayContaining(["Zero advance payment", "Full estimate before work starts", "Timed work", "Fully documented", "Zero compromise on quality", "What's best for you, not for us"]));
    unmount();
    render(<Promises heading={false} />);
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(screen.getByRole("region", { name: "What you can count on" })).toBeInTheDocument();
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

describe("WorkFlow (how the work gets done)", () => {
  it("lists the steps in order from booking to handover, with a button to the form", () => {
    render(<WorkFlow cta={{ href: "#book-visit", label: "Book a site visit" }} />);
    expect(screen.getByRole("heading", { level: 2, name: "How the work gets done" })).toBeInTheDocument();
    const steps = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(steps).toEqual(workFlow.map((s) => s.title));
    expect(steps[0]).toBe("Book online");
    expect(steps.at(-1)).toBe("Walkthrough and handover");
    expect(screen.getByRole("link", { name: "Book a site visit" })).toHaveAttribute("href", "#book-visit");
    // the toolbox illustration beside the heading; the steps have none of their own yet
    expect(screen.getAllByRole("img").map((i) => i.getAttribute("alt"))).toEqual([illustrations.toolbox.alt]);
  });

  it("shows a step's illustration with its alt text, and no button without a cta", () => {
    render(<WorkFlow steps={[{ title: "Preparation", text: "Cracks filled.", image: { src: "/flow/prep.png", alt: "Painter filling a crack in a wall in Agra" } }]} />);
    expect(screen.getByRole("img", { name: "Painter filling a crack in a wall in Agra" })).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
