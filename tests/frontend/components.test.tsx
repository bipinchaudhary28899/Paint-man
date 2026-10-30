import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CtaBanner } from "@/components/CtaBanner";
import { FaqList } from "@/components/FaqList";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { activeSection, MobileCtaBar, slotCentre } from "@/components/MobileCtaBar";
import { PhotoCrop } from "@/components/PhotoCrop";
import { readTracking, TRACKING_KEY, UtmCapture } from "@/components/UtmCapture";
import { images } from "@/config/images";
import { services, site } from "@/config/site";
import { fakeContact, withFilledSite } from "../support/filled-site";

const usePathnameMock = vi.hoisted(() => vi.fn(() => "/services"));
const searchParamsMock = vi.hoisted(() => vi.fn(() => new URLSearchParams()));
vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useSearchParams: searchParamsMock,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

describe("Header and Footer", () => {
  it("header: Services, Cities and Colours menus, FAQ, and a Book site visit button", () => {
    render(<Header />);
    const main = screen.getByRole("navigation", { name: "Main" });
    for (const name of ["Services", "Cities", "Colours"]) expect(within(main).getByRole("button", { name })).toHaveAttribute("aria-expanded", "false");
    // every menu link is in the HTML (crawlable) even while the menu is closed
    for (const href of ["/services/house-painting", "/services/interior-painting", "/services/house-painting/agra", "/services/house-painting/bangalore", "/colours", "/palettes", "/shade-cards/asian-paints", "/shade-cards"]) {
      expect(main.querySelector(`a[href="${href}"]`), href).not.toBeNull();
    }
    expect(within(main).getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/faq");
    expect(screen.getByRole("link", { name: "Book site visit" })).toHaveAttribute("href", "/book");
  });

  it("header marks the section the visitor is in, and only that one", () => {
    const marked = () => [...screen.getByRole("navigation", { name: "Main" }).querySelectorAll("[aria-current]")].map((el) => el.textContent?.trim());
    for (const [path, section] of [["/services/house-painting/agra", "Cities"], ["/shade-cards/berger", "Colours"], ["/services", "Services"]] as const) {
      vi.mocked(usePathnameMock).mockReturnValue(path);
      const { unmount } = render(<Header />);
      expect(marked(), path).toEqual([section]);
      expect(screen.getByRole("button", { name: section })).toHaveAttribute("aria-current", "true");
      unmount();
    }
    vi.mocked(usePathnameMock).mockReturnValue("/faq");
    const { unmount } = render(<Header />);
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("aria-current", "page");
    unmount();
    vi.mocked(usePathnameMock).mockReturnValue("/about");
    render(<Header />);
    expect(marked()).toEqual([]);
    vi.mocked(usePathnameMock).mockReturnValue("/services");
  });

  it("header shows the phone number once site.ts has one", async () => {
    expect(Boolean(render(<Header />).container.querySelector('a[href^="tel:"]'))).toBe(Boolean(site.phone));
    const FilledHeader = await withFilledSite(fakeContact, async () => (await import("@/components/Header")).Header);
    const { unmount } = render(<FilledHeader />);
    expect(screen.getByRole("link", { name: fakeContact.phoneDisplay })).toHaveAttribute("href", `tel:${fakeContact.phone}`);
    unmount();
    // without a display format the number itself is shown
    const BareHeader = await withFilledSite({ phone: fakeContact.phone }, async () => (await import("@/components/Header")).Header);
    render(<BareHeader />);
    expect(screen.getByRole("link", { name: fakeContact.phone })).toHaveAttribute("href", `tel:${fakeContact.phone}`);
  });

  it("footer links every service hub, every service in each live city, and the legal pages", () => {
    render(<Footer />);
    for (const s of services) {
      expect(screen.getByRole("link", { name: s.title })).toHaveAttribute("href", `/services/${s.slug}`);
      expect(screen.getByRole("link", { name: `${s.name} in ${site.city}` })).toHaveAttribute("href", `/services/${s.slug}/agra`);
    }
    expect(screen.getByRole("link", { name: "Bangalore (coming soon)" })).toHaveAttribute("href", "/services/house-painting/bangalore");
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
    // the dab carries the active tab's icon (decorative: the slot is aria-hidden, the label is text)
    expect(dab.querySelector("svg path")).not.toBeNull();
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
    for (const [path, label] of [["/palettes", "Colours"], ["/contact", "Estimate"], ["/book", "Estimate"], ["/colours", "Colours"]] as const) {
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
    expect(screen.getByRole("link", { name: `Areas we serve in ${site.city}` })).toHaveAttribute("href", "/services/house-painting/agra#localities");
    expect(screen.getByText(new RegExp(`Painting in ${site.city}: ${site.areas[0]}`))).toBeInTheDocument();
    expect(screen.getByText(/Zero advance payment/)).toBeInTheDocument();
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

  it("footer links the phone and email exactly and shows the street address once site.ts has them", async () => {
    const FilledFooter = await withFilledSite(fakeContact, async () => (await import("@/components/Footer")).Footer);
    const { container } = render(<FilledFooter />);
    const { phone, phoneDisplay, email, street, postalCode } = fakeContact;
    expect(screen.getByRole("link", { name: phoneDisplay })).toHaveAttribute("href", `tel:${phone}`);
    expect(screen.getByRole("link", { name: email })).toHaveAttribute("href", `mailto:${email}`);
    const address = container.querySelector("address")!;
    expect(address).toHaveTextContent(`${street}, ${site.city} ${postalCode}`);
    // the street line replaces the city-only fallback
    expect(address).not.toHaveTextContent(`${site.city}, ${site.region}`);
    expect(address).toHaveTextContent(site.hoursDisplay);
  });

  it("footer shows the bare phone number when there is no display format", async () => {
    const FilledFooter = await withFilledSite({ phone: fakeContact.phone }, async () => (await import("@/components/Footer")).Footer);
    const { container } = render(<FilledFooter />);
    expect(screen.getByRole("link", { name: fakeContact.phone })).toHaveAttribute("href", "tel:+910000000001");
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(container.querySelector("address")).toHaveTextContent(`${site.city}, ${site.region}`);
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
    render(<PhotoCrop image={images.workersTeam} shape="blob" sizes="100px" backdrop="#000" />);
    expect(screen.getByRole("img")).toHaveAttribute("alt", images.workersTeam.alt);
  });

  it("PhotoCrop respects absolute positioning classes", () => {
    const { container } = render(<PhotoCrop image={images.workersTeam} shape="arch" sizes="100px" className="absolute top-0" />);
    expect(container.firstElementChild!.className).not.toMatch(/\brelative\b/);
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
    window.history.replaceState(null, "", "/thank-you?type=booking");
    const { unmount } = render(<ThankYouMessage />);
    expect(screen.getByRole("heading", { name: "Your inspection request is in" })).toBeInTheDocument();
    unmount();
    window.history.replaceState(null, "", "/thank-you?type=contact");
    render(<ThankYouMessage />);
    expect(screen.getByRole("heading", { name: "Thanks for your message" })).toBeInTheDocument();
    window.history.replaceState(null, "", "/");
  });

  it("after a booking, lists what happens next (the booking steps after the form); a message gets none", async () => {
    const { ThankYouMessage } = await import("@/components/ThankYouMessage");
    const { bookingSteps } = await import("@/config/site");
    window.history.replaceState(null, "", "/thank-you?type=booking");
    const { unmount } = render(<ThankYouMessage />);
    const next = screen.getByRole("region", { name: /What happens next/ });
    expect(within(next).getAllByRole("listitem").map((li) => li.querySelector("span.block")?.textContent)).toEqual(bookingSteps.slice(1).map((s) => s.title));
    unmount();
    window.history.replaceState(null, "", "/thank-you?type=contact");
    render(<ThankYouMessage />);
    expect(screen.queryByRole("region", { name: /What happens next/ })).toBeNull();
    window.history.replaceState(null, "", "/");
  });
});

describe("Paint Saathi logos (one lock-up per screen size)", () => {
  const sizeOf = async (p: string) => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const png = readFileSync(join(process.cwd(), "public", p));
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  };

  it("header: the short PS logo on phones, the full horizontal logo from the wide breakpoint", async () => {
    const { Wordmark, BRAND, WIDE_MEDIA } = await import("@/components/Logo");
    const { container } = render(<Wordmark eager />);
    const img = screen.getByAltText("Paint Saathi");
    expect(decodeURIComponent(img.getAttribute("src")!)).toContain(BRAND.short.color.src);
    expect(img).toHaveAttribute("width", String(BRAND.short.color.width));
    expect(img).toHaveAttribute("loading", "eager");
    expect(img.className).toMatch(/h-10 .*min-\[721px\]:h-11 .*lg:h-12/); // smaller on phones, bigger on desktop
    const source = container.querySelector("picture source")!;
    expect(source).toHaveAttribute("media", WIDE_MEDIA);
    expect(decodeURIComponent(source.getAttribute("srcset")!)).toContain(BRAND.horizontal.color.src);
    // the wide logo's own size, so its space is reserved before it loads
    expect(source).toHaveAttribute("width", String(BRAND.horizontal.color.width));
    expect(source).toHaveAttribute("height", String(BRAND.horizontal.color.height));
  });

  it("reversed variants exist for dark backgrounds, and the footer uses the stacked logo", async () => {
    const { Wordmark, StackedLogo, BRAND } = await import("@/components/Logo");
    const { container, unmount } = render(<Wordmark variant="reversed" />);
    expect(decodeURIComponent(container.querySelector("source")!.getAttribute("srcset")!)).toContain(BRAND.horizontal.reversed.src);
    unmount();
    render(<StackedLogo />);
    const img = screen.getByAltText("Paint Saathi");
    expect(img).toHaveAttribute("src", BRAND.stacked.reversed.src);
    expect(img.className).toContain("md:h-24");
  });

  it("every logo the site uses exists in the brand pack at its stated size", async () => {
    const { BRAND } = await import("@/components/Logo");
    for (const set of [BRAND.horizontal, BRAND.short, BRAND.stacked]) {
      for (const art of Object.values(set)) expect(await sizeOf(art.src), art.src).toEqual([art.width, art.height]);
    }
    expect(await sizeOf(BRAND.mark)).toEqual([256, 256]);
  });

  it("names the home link in the header", async () => {
    const { Header } = await import("@/components/Header");
    render(<Header />);
    expect(screen.getByRole("link", { name: "Paint Saathi home" })).toBeInTheDocument();
  });
});


describe("ErrorNotice (a page that broke)", () => {
  it("apologises in one heading, retries on request and offers home and booking, with no error details", async () => {
    const { ErrorNotice } = await import("@/components/ErrorNotice");
    const retry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorNotice retry={retry} />);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Something went wrong.");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Book a site visit" })).toHaveAttribute("href", "/book");
  });
});

describe("LiveCityLinks", () => {
  it("names every city we paint in, each linking to its page, joined the way a sentence would", async () => {
    const { LiveCityLinks } = await import("@/components/LiveCityLinks");
    const { container } = render(<p><LiveCityLinks linkClassName="underline" conjunction="or" /></p>);
    expect(container.textContent).toBe("Agra, Mathura or Vrindavan");
    expect(screen.getByRole("link", { name: "Mathura" })).toHaveAttribute("href", "/services/house-painting/mathura");
    expect(screen.getByRole("link", { name: "Vrindavan" })).toHaveClass("underline");
  });
});
