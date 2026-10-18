import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { Emoji } from "@/components/Emoji";
import { FaqList } from "@/components/FaqList";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { activeSection, MobileCtaBar, slotCentre } from "@/components/MobileCtaBar";
import { PhotoCrop } from "@/components/PhotoCrop";
import { readTracking, TRACKING_KEY, UtmCapture } from "@/components/UtmCapture";
import { images } from "@/config/images";
import { services, site } from "@/config/site";

const usePathnameMock = vi.hoisted(() => vi.fn(() => "/services"));
const searchParamsMock = vi.hoisted(() => vi.fn(() => new URLSearchParams()));
vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useSearchParams: searchParamsMock,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

describe("Header and Footer", () => {
  it("header links to the main pages and the booking page", () => {
    render(<Header />);
    const main = screen.getByRole("navigation", { name: "Main" });
    for (const href of ["/services", "/#how", "/colours", "/#work", "/faq"]) {
      expect(main.querySelector(`a[href="${href}"]`)).not.toBeNull();
    }
    expect(screen.getByRole("link", { name: "Get a free estimate" })).toHaveAttribute("href", "/book");
  });

  it("footer links every service page and the legal pages", () => {
    render(<Footer />);
    for (const s of services) {
      expect(screen.getByRole("link", { name: `${s.name} in ${site.city}` })).toHaveAttribute("href", `/services/${s.slug}`);
    }
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy-policy");
    expect(screen.getByRole("link", { name: "Terms of service" })).toHaveAttribute("href", "/terms");
  });

  it("footer has a staff login link that crawlers are told not to follow", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: "Staff login" });
    expect(link).toHaveAttribute("href", "/admin");
    expect(link).toHaveAttribute("rel", "nofollow");
  });

  it("mobile palette nav always offers booking and marks the current page", () => {
    render(<MobileCtaBar />);
    expect(screen.getByRole("link", { name: "Estimate" })).toHaveAttribute("href", "/book");
    const services = screen.getByRole("link", { name: "Services" });
    expect(services).toHaveAttribute("aria-current", "page");
    expect(services).toHaveTextContent("Services");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("on the home page the dab sits over the active tab and hops once when a new tab is tapped", async () => {
    vi.mocked(usePathnameMock).mockReturnValue("/");
    const user = userEvent.setup();
    const { container } = render(<MobileCtaBar />);
    const nav = container.querySelector("nav") as HTMLElement;
    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("aria-current", "page");
    expect(home).toHaveAttribute("href", "#top");
    // the dab (and the dip in the bar) are centred on the first of four slots; no hop has played yet
    expect(nav.style.getPropertyValue("--nx")).toBe("12.5%");
    expect(slotCentre(2)).toBe("62.5%");
    const dab = container.querySelector(".bnav-dab") as HTMLElement;
    expect(dab).toHaveAttribute("data-tab", "Home");
    expect(container.querySelector(".bnav-dab-hop")).toBeNull();
    // the dab and the dip ride one hidden, transform-only track (no `left`, so no layout shift)
    const slot = container.querySelector(".bnav-slot") as HTMLElement;
    expect(slot).toHaveAttribute("aria-hidden", "true");
    expect(slot.contains(dab)).toBe(true);
    expect(slot.querySelector(".bnav-dip")).not.toBeNull();
    // both label states share one box; the active one only adds a modifier
    expect(home.querySelector("span")).toHaveClass("bnav-label", "bnav-label-on");
    expect(screen.getByRole("link", { name: "Services" }).querySelector("span")).toHaveClass("bnav-label");
    expect(screen.getByRole("link", { name: "Services" }).querySelector("span")).not.toHaveClass("bnav-label-on");
    await user.click(screen.getByRole("link", { name: "Colours" }));
    const colours = screen.getByRole("link", { name: "Colours" });
    expect(colours).toHaveAttribute("aria-current", "page");
    expect(colours).toHaveAttribute("href", "#colour");
    expect(home).not.toHaveAttribute("aria-current");
    // the dab moved over Colours and its arc plays once
    expect(nav.style.getPropertyValue("--nx")).toBe("62.5%");
    expect(dab).toHaveAttribute("data-tab", "Colours");
    await waitFor(() => expect(container.querySelector(".bnav-dab-hop")).not.toBeNull());
    vi.mocked(usePathnameMock).mockReturnValue("/services");
  });

  it("follows the route on inner pages and scrolls smoothly to a section on the home page", async () => {
    for (const [path, label] of [["/palettes", "Colours"], ["/contact", "Estimate"], ["/book", "Estimate"], ["/colours/PM-101", "Colours"]] as const) {
      vi.mocked(usePathnameMock).mockReturnValue(path);
      const { unmount } = render(<MobileCtaBar />);
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
      unmount();
    }
    vi.mocked(usePathnameMock).mockReturnValue("/");
    const target = document.createElement("section");
    target.id = "services";
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);
    const user = userEvent.setup();
    render(<MobileCtaBar />);
    await user.click(screen.getByRole("link", { name: "Services" }));
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    await waitFor(() => expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute("aria-current", "page"), { timeout: 1500 });
    target.remove();
    vi.mocked(usePathnameMock).mockReturnValue("/services");
  });

  it("picks the last section that has passed 55% of the viewport", () => {
    expect(activeSection([0, 900, 1800, 2700], 800)).toBe(0);
    expect(activeSection([-500, 300, 1800, 2700], 800)).toBe(1);
    expect(activeSection([-2000, -900, null, 100], 800)).toBe(3);
  });

  it("footer links about, contact and the areas we serve", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "About us" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "Areas we serve" })).toHaveAttribute("href", "/areas");
    expect(screen.getByText(new RegExp(`Serving ${site.areas[0]}`))).toBeInTheDocument();
  });

  it("footer legal links have a 44px tall tap target", () => {
    render(<Footer />);
    for (const name of ["Privacy policy", "Terms of service"]) {
      expect(screen.getByRole("link", { name })).toHaveClass("inline-flex", "min-h-11", "items-center");
    }
  });

  it("footer shows only the contact details that are filled in", () => {
    const { container } = render(<Footer />);
    expect(Boolean(container.querySelector('a[href^="tel:"]'))).toBe(Boolean(site.phone));
    expect(Boolean(container.querySelector('a[href^="mailto:"]'))).toBe(Boolean(site.email));
    expect(screen.getByText(site.hoursDisplay)).toBeInTheDocument();
  });

  it("call-to-action banner links to booking", () => {
    render(<CtaBanner heading="Ready?" />);
    expect(screen.getByRole("heading", { name: "Ready?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /free estimate/ })).toHaveAttribute("href", "/book");
    render(<CtaBanner />);
    expect(screen.getByRole("heading", { name: /fresh coat/ })).toBeInTheDocument();
  });
});

describe("FaqList", () => {
  it("renders questions collapsed and opens on click", async () => {
    render(<FaqList faqs={[{ q: "How long?", a: "About a week." }]} />);
    const details = screen.getByRole("heading", { name: "How long?" }).closest("details")!;
    expect(details).not.toHaveAttribute("open");
    await userEvent.setup().click(screen.getByText("How long?"));
    expect(details).toHaveAttribute("open");
    expect(screen.getByText("About a week.")).toBeVisible();
  });
});

describe("JsonLd and Breadcrumbs", () => {
  it("escapes < so injected text can never close the script tag", () => {
    const { container } = render(<JsonLd data={{ name: "</script><script>alert(1)</script>" }} />);
    const html = container.querySelector('script[type="application/ld+json"]')!.innerHTML;
    expect(html).not.toContain("</script>");
    expect(JSON.parse(html.replace(/\\u003c/g, "<")).name).toContain("alert(1)");
  });

  it("renders breadcrumb links, marks the current page and adds schema", () => {
    const { container } = render(<Breadcrumbs items={[{ name: "Services", path: "/services" }, { name: "Interior", path: "/services/interior-painting" }]} />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute("href", "/services");
    expect(screen.getByText("Interior")).toHaveAttribute("aria-current", "page");
    expect(container.querySelector('script[type="application/ld+json"]')!.innerHTML).toContain("BreadcrumbList");
  });

  it("gives breadcrumb links a 44px tap target whose padding is cancelled by negative margins", () => {
    render(<Breadcrumbs items={[{ name: "Colours", path: "/colours" }, { name: "Visualizer", path: "/visualizer" }]} />);
    for (const name of ["Home", "Colours"]) {
      expect(screen.getByRole("link", { name })).toHaveClass("inline-flex", "min-h-11", "items-center", "-my-3", "px-1.5", "-mx-1.5");
    }
    // the current page is plain text, not a link
    expect(screen.queryByRole("link", { name: "Visualizer" })).toBeNull();
  });
});

describe("visual components", () => {
  it("PhotoCrop keeps descriptive alt text for SEO and accessibility", () => {
    render(<PhotoCrop image={images.heroPainter} shape="blob" sizes="100px" backdrop="#000" />);
    expect(screen.getByRole("img")).toHaveAttribute("alt", images.heroPainter.alt);
  });

  it("PhotoCrop respects absolute positioning classes", () => {
    const { container } = render(<PhotoCrop image={images.heroPainter} shape="arch" sizes="100px" className="absolute top-0" />);
    expect(container.firstElementChild!.className).not.toMatch(/\brelative\b/);
  });

  it("Emoji images are decorative and hidden from screen readers", () => {
    const { container } = render(<Emoji name="sparkles" size={32} />);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("aria-hidden", "true");
    expect(img).toHaveAttribute("src", "/emoji/sparkles.png");
  });
});

describe("UtmCapture", () => {
  const visit = (url: string) => window.history.replaceState({}, "", url);

  it("remembers the first visit's campaign tags", () => {
    visit("/?utm_source=google&utm_medium=cpc&utm_campaign=diwali");
    render(<UtmCapture />);
    expect(readTracking()).toMatchObject({ utmSource: "google", utmMedium: "cpc", utmCampaign: "diwali", landingPage: "/" });
  });

  it("keeps the first touch on later untagged pages", () => {
    sessionStorage.setItem(TRACKING_KEY, JSON.stringify({ utmSource: "facebook", landingPage: "/" }));
    visit("/services");
    render(<UtmCapture />);
    expect(readTracking()?.utmSource).toBe("facebook");
  });

  it("updates when the visitor returns through a new campaign link", () => {
    sessionStorage.setItem(TRACKING_KEY, JSON.stringify({ utmSource: "facebook" }));
    visit("/book?utm_source=whatsapp");
    render(<UtmCapture />);
    expect(readTracking()).toMatchObject({ utmSource: "whatsapp", landingPage: "/book" });
  });

  it("returns undefined when storage is empty or corrupt", () => {
    expect(readTracking()).toBeUndefined();
    sessionStorage.setItem(TRACKING_KEY, "{not json");
    expect(readTracking()).toBeUndefined();
  });
});

describe("ThankYouMessage", () => {
  it("shows the booking wording by default and the message wording for contact", async () => {
    const { ThankYouMessage } = await import("@/components/ThankYouMessage");
    searchParamsMock.mockReturnValue(new URLSearchParams("type=booking"));
    const { unmount } = render(<ThankYouMessage />);
    expect(screen.getByRole("heading", { name: "Your inspection request is in" })).toBeInTheDocument();
    unmount();
    searchParamsMock.mockReturnValue(new URLSearchParams("type=contact"));
    render(<ThankYouMessage />);
    expect(screen.getByRole("heading", { name: "Thanks for your message" })).toBeInTheDocument();
  });
});
