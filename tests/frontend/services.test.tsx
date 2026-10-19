import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FaqList } from "@/components/FaqList";
import { PageHero } from "@/components/PageHero";
import { accentCity, finderSearchHref, JobSizeTable, ServiceDetails, ServiceShades } from "@/components/services/ServiceDetails";
import { images } from "@/config/images";
import { getPalette, shadeDisplayName } from "@/config/palettes";
import { generalFaqs, getService, jobSize, services, site } from "@/config/site";

// The shared next/image mock drops `preload` before it reaches the <img>, so record the props
// PageHero actually passes: the hero (LCP) photo must ask Next to load it first.
const imageProps = vi.hoisted(() => vi.fn());
vi.mock("next/image", () => ({
  default: ({ src, alt, fill: _fill, priority: _priority, preload: _preload, sizes: _sizes, ...rest }: Record<string, unknown>) => {
    imageProps({ src, alt, priority: _priority, preload: _preload, sizes: _sizes, ...rest });
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={String(src)} alt={String(alt ?? "")} {...rest} />;
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/services",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const interior = getService("interior-painting")!;
const exterior = getService("exterior-painting")!;
const rental = getService("rental-property-painting")!;
const hrefs = (root: HTMLElement) => [...root.querySelectorAll("a")].map((a) => a.getAttribute("href"));

/** Heading levels in document order never skip a level (h2 → h4) and start at the given level. */
function expectOrderedOutline(root: HTMLElement, start: number) {
  const levels = [...root.querySelectorAll("h1, h2, h3, h4")].map((h) => Number(h.tagName[1]));
  expect(levels[0]).toBe(start);
  levels.forEach((l, i) => i && expect(l - levels[i - 1]).toBeLessThanOrEqual(1));
}

describe("accentCity", () => {
  it("puts the city in the heading's one italic accent", () => {
    const { container } = render(<h1>{accentCity(interior.title)}</h1>);
    expect(screen.getByRole("heading", { level: 1, name: interior.title })).toBeInTheDocument();
    expect(container.querySelectorAll("em")).toHaveLength(1);
    expect(container.querySelector("em")).toHaveTextContent(site.city);
  });

  it("leaves a title that does not end with the city as plain text", () => {
    expect(accentCity("Painting services")).toBe("Painting services");
  });
});

describe("ServiceDetails", () => {
  it.each(services.map((s) => [s.slug, s] as const))("%s: renders every section as real h2/h3 headings", (_slug, s) => {
    const { container } = render(<ServiceDetails service={s} />);
    for (const name of [/step by step/, /paint system/, /affects the cost/, /How long it takes/, /Aftercare and cleanup/, /Shades that suit/]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
    for (const p of s.process) expect(screen.getByRole("heading", { level: 3, name: p.step })).toBeInTheDocument();
    for (const p of s.paintSystem) expect(screen.getByRole("heading", { level: 3, name: p.title })).toBeInTheDocument();
    for (const c of s.costFactors) expect(screen.getByText(c.title).tagName).toBe("DT");
    for (const t of [...s.timeline, ...s.aftercare]) expect(screen.getByText(t)).toBeInTheDocument();
    expect(within(container).getAllByRole("listitem").length).toBeGreaterThan(s.process.length);
    expectOrderedOutline(container, 2);
    expect(hrefs(container)).toContain("/faq");
  });

  it("shows the crew sizing table for interior work, worked out from the booking form's rule", () => {
    render(<ServiceDetails service={interior} />);
    const table = screen.getByRole("table");
    const j = jobSize(900);
    const row = within(table).getByRole("row", { name: /2 BHK/ });
    expect(row).toHaveTextContent(`about ${j.paintArea.toLocaleString("en-IN")} sq ft`);
    expect(row).toHaveTextContent(`${j.painterDays} painter-days`);
    expect(row).toHaveTextContent(`${j.painters} painters`);
    expect(row).toHaveTextContent("for about a week");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + interior.sizeExamples!.length);
    // the crew grows with the home, so every example says the same job length as the FAQs
    for (const e of interior.sizeExamples!) {
      const r = within(table).getByRole("row", { name: new RegExp(e.home) });
      expect(r).toHaveTextContent(`${jobSize(e.carpetArea).painters} painters`);
      expect(r).toHaveTextContent("for about a week");
    }
    expect(table).not.toHaveTextContent(/working days/);
  });

  it("states a day count in the table only for a home the crew rule cannot fit into a week", () => {
    render(<JobSizeTable examples={[{ home: "Large floor", carpetArea: 4000 }]} />);
    const j = jobSize(4000);
    expect(screen.getByRole("row", { name: /Large floor/ })).toHaveTextContent(`for about ${j.days} working days`);
  });

  it("leaves the table out for exterior work, which is measured on site", () => {
    render(<ServiceDetails service={exterior} />);
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders the table rows it is given", () => {
    render(<JobSizeTable examples={[{ home: "1 BHK", carpetArea: 550 }]} />);
    expect(screen.getByRole("rowheader", { name: /1 BHK/ })).toHaveTextContent("550 sq ft carpet");
  });
});

describe("ServiceShades", () => {
  it("links each matching palette, and each of its brand shades to its search in the colour finder", () => {
    const { container } = render(<ServiceShades service={interior} />);
    const links = hrefs(container);
    for (const slug of interior.shades.palettes) {
      const palette = getPalette(slug)!;
      expect(screen.getByRole("link", { name: palette.name })).toHaveAttribute("href", `/palettes#${slug}`);
      expect(screen.getByText(`${palette.mood} · Asian Paints shades`)).toBeInTheDocument();
      for (const s of palette.shades) {
        const href = `/colours?brand=${s.brand}&q=${s.code}`;
        expect(links).toContain(href);
        expect(finderSearchHref(s)).toBe(href);
        expect(screen.getAllByRole("link", { name: `${shadeDisplayName(s.name)} ${s.code}` })[0]).toHaveAttribute("href", href);
      }
    }
    expect(links.some((h) => h?.startsWith("/colours/"))).toBe(false);
    expect(screen.getByRole("link", { name: "Browse every wall colour shade" })).toHaveAttribute("href", "/colours");
    expect(links).toContain("/palettes");
    expect(links).not.toContain("/visualizer"); // retired
  });

  it("credits PaintDB under the CC BY 4.0 licence wherever it shows brand shades", () => {
    render(<ServiceShades service={exterior} />);
    expect(screen.getByRole("link", { name: "PaintDB" })).toHaveAttribute("href", "https://paintdb.com");
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
    expect(screen.getByRole("link", { name: "CC BY 4.0" }).getAttribute("rel")).toContain("license");
  });

  it("opens the plain finder for every service: there is no room filter any more", () => {
    for (const s of [exterior, rental]) {
      const { container, unmount } = render(<ServiceShades service={s} />);
      expect(screen.getByRole("link", { name: "Browse every wall colour shade" })).toHaveAttribute("href", "/colours");
      expect(hrefs(container).some((h) => h?.includes("room="))).toBe(false);
      unmount();
    }
  });

  it("skips a palette slug that no longer exists", () => {
    const broken = { ...interior, shades: { ...interior.shades, palettes: ["gone", "calm-bedroom"] } };
    render(<ServiceShades service={broken} />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(1);
  });
});

describe("FaqList links", () => {
  it("shows a follow-up link after an answer that has one", () => {
    render(<FaqList faqs={[{ q: "Where?", a: "Across the city.", link: { href: "/areas", label: "See areas" } }, { q: "When?", a: "Soon." }]} />);
    expect(screen.getByRole("link", { name: /See areas/ })).toHaveAttribute("href", "/areas");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("links the general FAQs to the pages that answer them in full, first one open when asked", () => {
    const { container } = render(<FaqList faqs={generalFaqs} openFirst />);
    expect(hrefs(container)).toEqual(expect.arrayContaining(["/book", "/services", "/contact"]));
    const details = container.querySelectorAll("details");
    expect(details[0]).toHaveAttribute("open");
    expect(details[1]).not.toHaveAttribute("open");
  });
});

describe("PageHero image", () => {
  it("loads the hero photo eagerly at high fetch priority", () => {
    render(<PageHero title="Services" crumbs={[{ name: "Services", path: "/services" }]} image={images.livingTeal} />);
    const img = screen.getByAltText(images.livingTeal.alt);
    expect(img).toHaveAttribute("fetchpriority", "high");
    const props = imageProps.mock.calls.map(([p]) => p).find((p) => p.alt === images.livingTeal.alt);
    // preloaded (Next 16's replacement for `priority`) or explicitly eager: never lazy
    expect(props.preload === true || props.loading === "eager").toBe(true);
    expect(props.loading).not.toBe("lazy");
    expect(props.priority).toBeUndefined();
    expect(props.sizes).toEqual(expect.any(String));
  });
});

describe("service page", () => {
  it.each(services.map((s) => [s.slug, s] as const))("%s: one keyword h1, ordered headings and the booking form for that service", async (slug, s) => {
    const { default: ServicePage } = await import("@/app/(site)/services/[slug]/page");
    const { container } = render(await ServicePage({ params: Promise.resolve({ slug }) }));
    const h1s = container.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(s.title);
    expectOrderedOutline(container, 1);
    expect(screen.getByLabelText("Service needed")).toHaveValue(s.leadService);
    expect(container.querySelector("#book-inspection form")).not.toBeNull();
    const links = hrefs(container);
    expect(links).toEqual(expect.arrayContaining(["/faq", "/areas", "/palettes", `/book?service=${slug}`]));
    for (const other of services.filter((o) => o.slug !== slug)) expect(links).toContain(`/services/${other.slug}`);
    const ld = [...container.querySelectorAll('script[type="application/ld+json"]')].map((n) => n.textContent).join("");
    for (const f of s.faqs) expect(ld).toContain(f.q);
  });

  it("404s an unknown slug", async () => {
    const { default: ServicePage } = await import("@/app/(site)/services/[slug]/page");
    await expect(ServicePage({ params: Promise.resolve({ slug: "roofing" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("FAQ page", () => {
  it("marks up only the general FAQs but still shows every service FAQ, with links to each service", async () => {
    const { default: FaqPage } = await import("@/app/(site)/faq/page");
    const { container } = render(<FaqPage />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelector("h1")).toHaveTextContent(`House painting questions in ${site.city}, answered`);
    const faqLd = [...container.querySelectorAll('script[type="application/ld+json"]')]
      .map((n) => JSON.parse(n.textContent!))
      .find((d) => d["@type"] === "FAQPage");
    expect(faqLd.mainEntity.map((q: { name: string }) => q.name)).toEqual(generalFaqs.map((f) => f.q));
    for (const s of services) {
      for (const f of s.faqs) expect(screen.getByRole("heading", { level: 3, name: f.q })).toBeInTheDocument();
      expect(hrefs(container)).toContain(`/services/${s.slug}`);
    }
  });
});
