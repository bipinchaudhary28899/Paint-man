import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Blob, ColourMarquee, SpinBadge } from "@/components/Decor";
import { Header } from "@/components/Header";
import { HouseFill } from "@/components/HouseFill";
import { LeadForm } from "@/components/LeadForm";
import { PageHero } from "@/components/PageHero";
import { PaintSpill } from "@/components/PaintSpill";
import { PhotoCrop, type CropShape } from "@/components/PhotoCrop";
import { Tilt } from "@/components/Tilt";
import { images } from "@/config/images";
import { site } from "@/config/site";

vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }) }));

describe("paint motion", () => {
  it("PaintSpill renders three pours with drips, hidden from assistive tech", () => {
    const { container } = render(<PaintSpill />);
    const spills = container.querySelectorAll(".spill");
    expect(spills).toHaveLength(3);
    expect([...spills].map((s) => s.getAttribute("data-paint"))).toEqual(["tangerine", "pink", "sunshine"]);
    expect(container.querySelectorAll(".spill-drip")).toHaveLength(4);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect((spills[0] as HTMLElement).style.getPropertyValue("--pour")).toBe("46%");
  });

  it("HouseFill is a labelled SVG with two rising paint layers and a roller", () => {
    const { container } = render(<HouseFill className="extra" />);
    expect(screen.getByRole("img", { name: /painted cobalt blue/ })).toBeInTheDocument();
    expect(container.querySelectorAll(".fill-level")).toHaveLength(2);
    expect(container.querySelector(".fill-level.second")).not.toBeNull();
    expect(container.querySelector(".roller")).not.toBeNull();
    expect(container.querySelector("svg")!.getAttribute("class")).toContain("extra");
  });
});

describe("Decor", () => {
  it("SpinBadge spells the city in its ring text", () => {
    const { container } = render(<SpinBadge />);
    expect(container.textContent).toContain(`BOOK AN INSPECTION • ${site.city.toUpperCase()} •`);
  });

  it("ColourMarquee duplicates the chip row for a seamless loop", () => {
    const { container } = render(<ColourMarquee />);
    expect(container.querySelectorAll("span.rounded-full")).toHaveLength(20);
    expect(container.textContent).toContain("Terracotta");
  });

  it("Blob takes a colour", () => {
    const { container } = render(<Blob color="#123456" />);
    expect(container.querySelector("path")).toHaveAttribute("fill", "#123456");
  });
});

describe("Tilt", () => {
  it("tilts towards the mouse and resets on leave; ignores touch", () => {
    const { container } = render(<Tilt max={10}><p>card</p></Tilt>);
    const el = container.firstElementChild as HTMLDivElement;
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });

    const move = (clientX: number, clientY: number, pointerType: string) => {
      const ev = new MouseEvent("pointermove", { bubbles: true, clientX, clientY });
      Object.defineProperty(ev, "pointerType", { value: pointerType });
      fireEvent(el, ev);
    };
    move(200, 0, "mouse");
    expect(el.style.getPropertyValue("--ry")).toBe("5deg");
    expect(el.style.getPropertyValue("--rx")).toBe("5deg");
    expect(el.style.getPropertyValue("--gx")).toBe("100%");

    move(0, 100, "touch");
    expect(el.style.getPropertyValue("--ry")).toBe("5deg");

    fireEvent.pointerLeave(el);
    expect(el.style.getPropertyValue("--rx")).toBe("0deg");
    expect(el.style.getPropertyValue("--ry")).toBe("0deg");
  });
});

describe("PageHero", () => {
  const crumbs = [{ name: "About", path: "/about" }];
  it("renders the title, intro and children without a photo", () => {
    const { container } = render(<PageHero title="About us" intro="Hello" crumbs={crumbs}><span>child</span></PageHero>);
    expect(screen.getByRole("heading", { level: 1, name: "About us" })).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("renders the framed photo when an image is given", () => {
    render(<PageHero title="Services" crumbs={crumbs} image={images.trays} shape="blob" />);
    expect(screen.getByAltText(images.trays.alt)).toBeInTheDocument();
  });
});

describe("PhotoCrop shapes", () => {
  const shapes: CropShape[] = ["arch", "circle", "pill", "squircle", "slant", "ticket", "blob", "blob2", "splat", "scallop"];
  it.each(shapes)("renders the %s crop", (shape) => {
    const { container } = render(<PhotoCrop image={images.trays} shape={shape} sizes="100px" backdrop="#fff" rotate={3} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.transform).toBe("rotate(3deg)");
    const frame = root.querySelector(".group\\/crop") as HTMLElement;
    if (["blob", "blob2", "splat", "scallop"].includes(shape)) expect(frame.style.maskImage).toContain("data:image/svg+xml");
    if (shape === "slant") expect(frame.style.clipPath).toContain("polygon");
    if (shape === "ticket") expect(frame.style.mask).toContain("radial-gradient");
    if (shape === "arch") expect(frame.className).toContain("rounded-t-full");
  });
});

describe("Header and LeadForm wiring", () => {
  it("header links to the colour finder", () => {
    render(<Header />);
    expect(screen.getByRole("navigation", { name: "Main" }).querySelector('a[href="/colours"]')).not.toBeNull();
  });

  it("LeadForm pre-fills the message from a chosen shade", () => {
    render(<LeadForm type="booking" defaultMessage="Interested in Asian Paints 8386 Pepper Leaf (#BBC8B2)." />);
    expect(screen.getByLabelText(/Anything we should know/)).toHaveValue("Interested in Asian Paints 8386 Pepper Leaf (#BBC8B2).");
  });
});
