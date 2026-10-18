import { render, screen, within } from "@testing-library/react";
import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";
import AboutPage, { metadata as aboutMeta } from "@/app/(site)/about/page";
import AreasPage, { metadata as areasMeta } from "@/app/(site)/areas/page";
import BookPage, { metadata as bookMeta } from "@/app/(site)/book/page";
import ContactPage, { metadata as contactMeta } from "@/app/(site)/contact/page";
import PalettesPage, { metadata as palettesMeta } from "@/app/(site)/palettes/page";
import PrivacyPage, { metadata as privacyMeta } from "@/app/(site)/privacy-policy/page";
import TermsPage, { metadata as termsMeta } from "@/app/(site)/terms/page";
import VisualizerPage, { metadata as visualizerMeta } from "@/app/(site)/visualizer/page";
import { services, site } from "@/config/site";

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
  { path: "/areas", Page: AreasPage, metadata: areasMeta, h1: new RegExp(`house painters in ${site.city}`, "i") },
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

describe("/areas", () => {
  it("gives every locality an anchored section and a booking link, linked from the jump list", () => {
    const { container } = render(<AreasPage />);
    const jump = screen.getByRole("navigation", { name: "Jump to a locality" });
    for (const area of site.areas) {
      const id = area.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      const section = container.querySelector(`section#${id}`) as HTMLElement;
      expect(section).not.toBeNull();
      expect(within(section).getByRole("heading", { level: 3, name: area })).toBeInTheDocument();
      expect(within(section).getByRole("link", { name: `Book a slot in ${area}` })).toHaveAttribute("href", "/book");
      expect(within(jump).getByRole("link", { name: area })).toHaveAttribute("href", `#${id}`);
    }
  });

  it("links the services, the colour tools and booking, and has substantial copy", () => {
    const { container } = render(<AreasPage />);
    for (const s of services) expect(screen.getByRole("link", { name: `${s.name} in ${site.city}` })).toHaveAttribute("href", `/services/${s.slug}`);
    for (const href of ["/colours", "/palettes", "/visualizer"]) expect(container.querySelector(`a[href="${href}"]`)).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: /weather/ })).toBeInTheDocument();
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
    if (!site.phone && !site.whatsapp) expect(screen.getByRole("link", { name: "Ask for a call back" })).toHaveAttribute("href", "#message");
    for (const dd of container.querySelectorAll("dd")) expect(dd.textContent?.trim()).not.toBe("");
    expect(container.querySelector("#message form")).not.toBeNull();
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
