import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CtaBanner } from "@/components/CtaBanner";
import { PHONE_QUERY } from "@/components/CtaFooterNav";
import { Footer } from "@/components/Footer";
import { footerColumns } from "@/config/nav";
import { site } from "@/config/site";

describe("closing call to action (phone, tablet and desktop share one markup)", () => {
  it("has one h2 with a single italic accent, the copy and both actions", () => {
    const { container } = render(<CtaBanner />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Let's give your home a fresh coat.");
    expect(heading.querySelectorAll("em")).toHaveLength(1);
    expect(container.querySelectorAll("h1, h2, h3")).toHaveLength(1);
    expect(screen.getByText(new RegExp(`itemised quote for your home in ${site.city}`))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get a free estimate" })).toHaveAttribute("href", "/book");
    const second = site.whatsapp ? screen.getByRole("link", { name: "Chat on WhatsApp" }) : screen.getByRole("link", { name: "Talk to us" });
    expect(second).toHaveAttribute("href", site.whatsapp ? `https://wa.me/${site.whatsapp}` : "/contact");
  });

  it("the painter illustration keeps its alt text and reserves its space", () => {
    render(<CtaBanner />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("alt")).toMatch(/painter/i);
    expect(img).toHaveAttribute("width");
    expect(img).toHaveAttribute("height");
  });

  it("a page can pass its own heading", () => {
    render(<CtaBanner heading={<>Ready to repaint? <em>Book a site visit.</em></>} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Ready to repaint? Book a site visit.");
  });
});

type Listener = () => void;
// A controllable matchMedia: `phone` says whether the screen is under the tablet breakpoint.
function mockScreen(phone: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    get matches() {
      return phone;
    },
    media: PHONE_QUERY,
    addEventListener: (_: string, fn: Listener) => listeners.add(fn),
    removeEventListener: (_: string, fn: Listener) => listeners.delete(fn),
  };
  const matchMedia = vi.fn(() => mql);
  vi.stubGlobal("matchMedia", matchMedia);
  return {
    matchMedia,
    resize(toPhone: boolean) {
      phone = toPhone;
      act(() => listeners.forEach((fn) => fn()));
    },
    listeners,
  };
}

const rows = () => [...screen.getByRole("navigation", { name: "Footer" }).querySelectorAll("details")];

describe("footer link groups: tap rows on phones, open columns from tablet up", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders one native details row per link column, labelled by its heading, with a decorative chevron", () => {
    const { container } = render(<Footer />);
    const columns = footerColumns();
    expect(rows()).toHaveLength(columns.length);
    rows().forEach((row, i) => {
      expect(row.querySelector("summary")).toHaveTextContent(columns[i].heading);
      expect(row.querySelector("summary svg")).toHaveAttribute("aria-hidden", "true");
    });
    expect(container.querySelectorAll("h1, h2, h3")).toHaveLength(0);
  });

  it("the rows are open without JS (or matchMedia), so tablets and desktops in any browser show every link", () => {
    vi.stubGlobal("matchMedia", undefined);
    render(<Footer />);
    for (const row of rows()) expect(row.open).toBe(true);
    for (const col of footerColumns()) {
      for (const link of col.links) expect(screen.getAllByRole("link", { name: link.label }).some((a) => a.getAttribute("href") === link.href), link.href).toBe(true);
    }
  });

  it("on a phone the rows close into tap rows once the page is interactive; links stay in the HTML for crawlers", () => {
    const media = mockScreen(true);
    render(<Footer />);
    expect(media.matchMedia).toHaveBeenCalledWith(PHONE_QUERY);
    for (const row of rows()) expect(row.open).toBe(false);
    const nav = screen.getByRole("navigation", { name: "Footer" });
    for (const col of footerColumns()) {
      for (const link of col.links) expect(nav.querySelector(`a[href="${link.href}"]`), link.href).not.toBeNull();
    }
  });

  it("on a tablet or desktop the columns stay open", () => {
    mockScreen(false);
    render(<Footer />);
    for (const row of rows()) expect(row.open).toBe(true);
  });

  it("tapping a row on a phone opens it and tapping again closes it", async () => {
    mockScreen(true);
    const user = userEvent.setup();
    render(<Footer />);
    const nav = screen.getByRole("navigation", { name: "Footer" });
    const services = within(nav).getByText("Services", { selector: "summary" });
    const row = services.closest("details")!;
    await user.click(services);
    expect(row.open).toBe(true);
    expect(within(row).getByRole("link", { name: "House painting services" })).toBeVisible();
    await user.click(services);
    expect(row.open).toBe(false);
  });

  it("rotating or resizing across the tablet edge opens or closes the columns, and unmounting stops listening", () => {
    const media = mockScreen(true);
    const { unmount } = render(<Footer />);
    media.resize(false);
    for (const row of rows()) expect(row.open).toBe(true);
    media.resize(true);
    for (const row of rows()) expect(row.open).toBe(false);
    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it("keeps the localities strip, the legal links and the staff login (not followed by crawlers)", () => {
    render(<Footer />);
    expect(screen.getByText(new RegExp(`Painting in ${site.city}: ${site.areas.join(" · ")}`))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy-policy");
    expect(screen.getByRole("link", { name: "Terms of service" })).toHaveAttribute("href", "/terms");
    const staff = screen.getByRole("link", { name: "Staff login" });
    expect(staff).toHaveAttribute("href", "/admin");
    expect(staff).toHaveAttribute("rel", "nofollow");
  });
});
