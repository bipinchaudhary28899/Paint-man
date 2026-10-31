import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ServicesSection } from "@/components/home/ServicesSection";
import { services } from "@/config/site";

describe("Services on the home page (phone rows, tablet side cards, desktop grid)", () => {
  it("has one h2 and a card per service, each linking to its hub with its name as an h3", () => {
    render(<ServicesSection />);
    const section = document.getElementById("services")!;
    expect(within(section).getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(within(section).getByRole("heading", { level: 2, name: "Every wall in the house." })).toBeInTheDocument();
    const names = within(section).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(services.map((s) => s.name));
    for (const s of services) {
      const card = within(section).getByRole("link", { name: new RegExp(s.name.replace(/[&,]/g, ".")) });
      expect(card).toHaveAttribute("href", `/services/${s.slug}`);
      expect(card).toHaveTextContent(s.intro);
    }
  });

  it("gives every service a tag, including doors and windows, and a photo with descriptive alt text", () => {
    render(<ServicesSection />);
    const door = services.find((s) => s.slug === "door-window-painting")!;
    const card = screen.getByRole("link", { name: /Doors, Windows/ });
    // The tag appears beside the name (phones, tablets) and over the photo (desktop); one is display:none.
    expect(within(card).getAllByText("Doors & windows")).toHaveLength(2);
    expect(within(card).getByRole("img")).toHaveAttribute("alt", door.image.alt);
    for (const img of screen.getAllByRole("img")) expect(img.getAttribute("alt")).not.toBe("");
  });

  it("ends with the All services link to the services index", () => {
    render(<ServicesSection />);
    expect(screen.getByRole("link", { name: "All services" })).toHaveAttribute("href", "/services");
  });
});
