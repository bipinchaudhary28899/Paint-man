import { render, screen, within } from "@testing-library/react";
import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";
import { AreaLinks } from "@/components/home/AreaLinks";
import AboutPage, { metadata as aboutMeta } from "@/app/(site)/about/page";
import AreasPage, { metadata as areasMeta } from "@/app/(site)/areas/page";
import BookPage, { metadata as bookMeta } from "@/app/(site)/book/page";
import ContactPage, { metadata as contactMeta } from "@/app/(site)/contact/page";
import PalettesPage, { metadata as palettesMeta } from "@/app/(site)/palettes/page";
import PrivacyPage, { metadata as privacyMeta } from "@/app/(site)/privacy-policy/page";
import TermsPage, { metadata as termsMeta } from "@/app/(site)/terms/page";
import VisualizerPage, { metadata as visualizerMeta } from "@/app/(site)/visualizer/page";
import { areaSlug, services, site } from "@/config/site";
import { fakeContact, withFilledSite } from "../support/filled-site";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

// The pages are server components without data fetching, so they render as plain React here.
// Each one is checked against AGENTS.md rule 1: title and description length, one keyword h1,
// a heading outline without skipped levels, and alt text on every image.
const pages: { path: string; Page: () => React.ReactNode; metadata: Metadata; h1: RegExp }[] = [
  { path: "/about", Page: AboutPage, metadata: aboutMeta, h1: new RegExp(`house painting in ${site.city}`, "i") },
  { path: "/areas", Page: AreasPage, metadata: areasMeta, h1: new RegExp(`^areas we serve in ${site.city}`, "i") },
  { path: "/book", Page: BookPage, metadata: bookMeta, h1: new RegExp(`painting inspection in ${site.city}`, "i") },
  { path: "/contact", Page: ContactPage, metadata: contactMeta, h1: new RegExp(`house painters in ${site.city}`, "i") },
  { path: "/palettes", Page: PalettesPage, metadata: palettesMeta, h1: /wall colour combinations/i },
  { path: "/privacy-policy", Page: PrivacyPage, metadata: privacyMeta, h1: /privacy policy/i },
  { path: "/terms", Page: TermsPage, metadata: termsMeta, h1: /terms of service/i },
  { path: "/visualizer", Page: VisualizerPage, metadata: visualizerMeta, h1: /wall colour visualizer/i },
];

describe.each(pages)("$path", ({ path, Page, metadata, h1 }) => {
  it("has a '{Topic} in Agra' title that fits 60 characters with the brand, and a 140-155 character description", () => {
    const title = String(metadata.title);
    expect(title).toContain(`in ${site.city}`);
    expect(`${title} | ${site.name}`.length).toBeLessThanOrEqual(60);
    const description = String(metadata.description);
    expect(description.length).toBeGreaterThanOrEqual(140);
    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).toContain(site.city);
    expect(metadata.alternates?.canonical).toBe(path);
  });

  it("renders one keyword h1, headings in order and alt text on every image", () => {
    const { container } = render(<Page />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(h1);
    const levels = [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    levels.forEach((level, i) => {
      if (i > 0) expect(level).toBeLessThanOrEqual(levels[i - 1] + 1);
    });
    for (const img of container.querySelectorAll("img")) expect(img).toHaveAttribute("alt");
    // breadcrumb schema on every inner page
    const schema = [...container.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.innerHTML).join("\n");
    expect(schema).toContain("BreadcrumbList");
  });
});

/** Every id in the rendered page; a repeated id breaks label/anchor lookups. */
const ids = (root: HTMLElement) => [...root.querySelectorAll("[id]")].map((el) => el.id);

describe("/areas", () => {
  it("gives every locality an anchored entry and a booking link, linked from the jump list", () => {
    const { container } = render(<AreasPage />);
    const jump = screen.getByRole("navigation", { name: "Jump to a locality" });
    for (const area of site.areas) {
      const id = areaSlug(area);
      const entry = container.querySelector(`#${id}`) as HTMLElement;
      expect(entry, area).not.toBeNull();
      expect(entry.tagName).toBe("LI");
      expect(within(entry).getByRole("heading", { level: 3, name: area })).toBeInTheDocument();
      expect(within(entry).getByRole("link", { name: `Book a slot in ${area}` })).toHaveAttribute("href", "/book");
      expect(within(jump).getByRole("link", { name: area })).toHaveAttribute("href", `#${id}`);
    }
    expect(new Set(ids(container)).size).toBe(ids(container).length);
  });

  it("states the shared process once, not once per locality, and has no landmark per locality", () => {
    const { container } = render(<AreasPage />);
    const text = container.textContent ?? "";
    expect(text.match(/the same supervised crew as anywhere else/g)).toHaveLength(1);
    // one list of localities, not ten labelled <section> regions
    const list = container.querySelector(`#${areaSlug(site.areas[0])}`)!.closest("ul")!;
    expect(within(list).getAllByRole("listitem")).toHaveLength(site.areas.length);
    expect(container.querySelectorAll("section[aria-labelledby]").length).toBeLessThan(site.areas.length);
  });

  it("every home page 'Painters in {area}' link lands on an entry on the rendered /areas page", () => {
    const { container: home } = render(<AreaLinks areas={site.areas} />);
    const hrefs = [...home.querySelectorAll("a")].map((a) => a.getAttribute("href")!);
    expect(hrefs).toHaveLength(site.areas.length);
    const { container: areas } = render(<AreasPage />);
    const pageIds = new Set(ids(areas));
    for (const href of hrefs) {
      const url = new URL(href, "http://site.test");
      expect(url.pathname, href).toBe("/areas");
      expect(pageIds.has(decodeURIComponent(url.hash.slice(1))), href).toBe(true);
    }
  });

  it("links the services, the colour tools and booking, and has substantial copy", () => {
    const { container } = render(<AreasPage />);
    for (const s of services) expect(screen.getByRole("link", { name: `${s.name} in ${site.city}` })).toHaveAttribute("href", `/services/${s.slug}`);
    for (const href of ["/colours", "/palettes", "/visualizer"]) expect(container.querySelector(`a[href="${href}"]`)).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: /weather/ })).toBeInTheDocument();
    // /colours can search and sort shades, not filter by washability: the link promises only light shades
    expect(screen.getByRole("link", { name: /Find light shades/ })).toHaveAttribute("href", "/colours");
    expect(screen.queryByRole("link", { name: /washable/i })).toBeNull();
    const words = (container.textContent ?? "").split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThan(500);
  });
});

describe("/contact", () => {
  it("keeps booking and a call back prominent and shows no empty contact details", () => {
    const { container } = render(<ContactPage />);
    expect(screen.getAllByRole("link", { name: "Book an inspection" })[0]).toHaveAttribute("href", "/book");
    // tel:, wa.me and mailto: links and the street address appear only when site.ts has them
    expect(Boolean(container.querySelector('a[href^="tel:"]'))).toBe(Boolean(site.phone));
    expect(Boolean(container.querySelector('a[href^="https://wa.me/"]'))).toBe(Boolean(site.whatsapp));
    expect(Boolean(container.querySelector('a[href^="mailto:"]'))).toBe(Boolean(site.email));
    expect(Boolean(container.querySelector("address"))).toBe(Boolean(site.address.street));
    if (!site.phone && !site.whatsapp) {
      const callBack = screen.getByRole("link", { name: "Ask for a call back" });
      expect(callBack).toHaveAttribute("href", "#send-message");
      expect(container.querySelector("#send-message form")).not.toBeNull();
    }
    for (const dd of container.querySelectorAll("dd")) expect(dd.textContent?.trim()).not.toBe("");
  });

  it("keeps every id unique, so the message field keeps its 'How can we help?' label", () => {
    const { container } = render(<ContactPage />);
    const all = ids(container);
    expect(new Set(all).size, all.join(", ")).toBe(all.length);
    const field = screen.getByLabelText(/How can we help/);
    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toBeRequired();
    expect(container.querySelector("#send-message form")).toContainElement(field);
  });

  it("gives the service-area link a 44px tap target without changing the row height", () => {
    render(<ContactPage />);
    const link = screen.getByRole("link", { name: `${site.city}, ${site.region}` });
    expect(link).toHaveAttribute("href", "/areas");
    // min-h-11 is 44px on the 28px line; -my-2 takes the extra 16px back out of the row
    expect(link).toHaveClass("inline-flex", "min-h-11", "items-center", "-my-2");
  });

  it("explains what happens next and links the localities and services", () => {
    render(<ContactPage />);
    // the call back happens during the published working hours, not a promised response time
    expect(screen.getByText(new RegExp(`we call you back during working hours, ${site.hoursDisplay}`))).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "You get an itemised quotation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Areas we serve in ${site.city}` })).toHaveAttribute("href", "/areas");
    for (const s of services) expect(screen.getByRole("link", { name: `${s.name} in ${site.city}` })).toHaveAttribute("href", `/services/${s.slug}`);
  });
});

describe("/contact once site.ts has contact details", () => {
  const loadContact = (overrides: Parameters<typeof withFilledSite>[0]) =>
    withFilledSite(overrides, async () => (await import("@/app/(site)/contact/page")).default);

  it("links the phone, WhatsApp and email exactly, shows the street address, and the hero offers a call", async () => {
    const Contact = await loadContact(fakeContact);
    const { container } = render(<Contact />);
    const { phone, phoneDisplay, whatsapp, email, street, postalCode } = fakeContact;
    expect(screen.getByRole("link", { name: phoneDisplay })).toHaveAttribute("href", `tel:${phone}`);
    expect(screen.getByRole("link", { name: `Call ${phoneDisplay}` })).toHaveAttribute("href", `tel:${phone}`);
    for (const a of container.querySelectorAll('a[href^="tel:"]')) expect(a).toHaveAttribute("href", "tel:+910000000001");
    // wa.me takes the number as digits only, with the country code
    const chat = screen.getByRole("link", { name: "Chat on WhatsApp" });
    expect(chat).toHaveAttribute("href", `https://wa.me/${whatsapp}`);
    expect(chat.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+$/);
    expect(screen.getByRole("link", { name: email })).toHaveAttribute("href", `mailto:${email}`);
    expect(container.querySelector("address")).toHaveTextContent(`${street}, ${site.city}, ${site.region} ${postalCode}`);
    // with a phone number the hero's second button calls instead of scrolling to the form
    expect(screen.queryByRole("link", { name: "Ask for a call back" })).toBeNull();
    const rows = [...container.querySelectorAll("dt")].map((dt) => dt.textContent);
    expect(rows).toEqual(["Phone", "WhatsApp", "Email", "Address", "Service area", "Hours"]);
    expect(new Set(ids(container)).size).toBe(ids(container).length);
  });

  it("offers WhatsApp in the hero when there is no phone number", async () => {
    const Contact = await loadContact({ whatsapp: fakeContact.whatsapp });
    const { container } = render(<Contact />);
    const chats = screen.getAllByRole("link", { name: "Chat on WhatsApp" });
    expect(chats).toHaveLength(2); // the hero button and the WhatsApp row
    for (const a of chats) expect(a).toHaveAttribute("href", "https://wa.me/910000000001");
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(container.querySelector("address")).toBeNull();
    expect(screen.queryByRole("link", { name: "Ask for a call back" })).toBeNull();
  });
});

describe("static /book and /visualizer", () => {
  it("/book always renders the booking form, whatever the query", () => {
    render(<BookPage />);
    expect(screen.getByRole("button", { name: "Book my inspection" })).toBeInTheDocument();
  });

  it("/visualizer renders the full visualizer", () => {
    render(<VisualizerPage />);
    expect(screen.getByLabelText("Choose a room photo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Book an inspection with/ })).toHaveAttribute("href", expect.stringMatching(/^\/book\?colour=PM-/));
  });
});
