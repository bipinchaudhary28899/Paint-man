import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ColourFinder } from "@/components/colours/ColourFinder";
import { WallPreview } from "@/components/colours/WallPreview";
import { colours } from "@/config/colours";
import { genericScene } from "@/config/scenes";
import { getColour } from "@/lib/colours/search";

const shadeButtons = () => within(screen.getByRole("list", { name: "Shades" })).getAllByRole("button");

describe("ColourFinder", () => {
  it("renders the whole catalogue and selects the first shade by default", () => {
    render(<ColourFinder />);
    expect(shadeButtons()).toHaveLength(colours.length);
    expect(screen.getByRole("heading", { name: /Taj White/ })).toBeInTheDocument();
    expect(screen.getByText(`${colours.length} shades. Tap one to see it on the wall.`)).toBeInTheDocument();
  });

  it("filters as you type, updates the URL and shows the picked shade on the wall", async () => {
    const user = userEvent.setup();
    render(<ColourFinder />);
    await user.type(screen.getByLabelText("Search by name, code, hex or mood"), "sage");
    expect(shadeButtons()[0]).toHaveTextContent("Sage Mist");
    expect(window.location.search).toBe("?q=sage");
    expect(screen.getByText(/for “sage”/)).toBeInTheDocument();

    await user.click(shadeButtons()[0]);
    expect(screen.getByRole("heading", { name: /Sage Mist/ })).toBeInTheDocument();
    // the room is shown twice: the compact pinned preview for phones and the side panel for wide screens
    expect(screen.getAllByAltText("A cosy living room, repainted in Sage Mist")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Book an inspection with this shade/ })).toHaveAttribute("href", "/book?colour=PM-502");
    expect(screen.getByRole("link", { name: "Full details" })).toHaveAttribute("href", "/colours/PM-502");
    // the phone preview carries the same shade with short actions
    const phone = screen.getByLabelText("Selected shade preview");
    expect(phone).toHaveTextContent("Sage Mist");
    expect(within(phone).getByRole("link", { name: "Book" })).toHaveAttribute("href", "/book?colour=PM-502");
    expect(within(phone).getByRole("link", { name: "Details" })).toHaveAttribute("href", "/colours/PM-502");
  });

  it("toggles family and room chips, keeps the selection valid and clears everything", async () => {
    const user = userEvent.setup();
    render(<ColourFinder />);
    await user.click(shadeButtons()[5]); // Dove, a neutral
    expect(screen.getByRole("heading", { name: /Dove/ })).toBeInTheDocument();

    const greens = screen.getByRole("button", { name: "Greens" });
    await user.click(greens);
    expect(greens).toHaveAttribute("aria-pressed", "true");
    expect(shadeButtons().every((b) => b.textContent?.includes("Greens"))).toBe(true);
    // Dove is no longer in the results, so the panel falls back to the first green.
    expect(screen.getByRole("heading", { name: /Tulsi/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bedroom" }));
    expect(window.location.search).toBe("?family=Greens&room=Bedroom");
    await user.click(screen.getByRole("button", { name: "Bedroom" }));
    expect(window.location.search).toBe("?family=Greens");

    await user.click(greens);
    expect(greens).toHaveAttribute("aria-pressed", "false");
    expect(shadeButtons()).toHaveLength(colours.length);

    await user.type(screen.getByLabelText("Search by name, code, hex or mood"), "zzzz");
    expect(screen.getByText(/No shade matches that/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(shadeButtons()).toHaveLength(colours.length);
    expect(window.location.search).toBe("");
  });

  it("honours initial query and filters from the URL and ignores unknown ones", () => {
    render(<ColourFinder initialQuery="PM-604" initialFamily="Blues" initialRoom="Garage" />);
    expect(shadeButtons()[0]).toHaveTextContent("Blue Pottery");
    expect(screen.getByRole("button", { name: "Blues" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Bedroom" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("WallPreview", () => {
  it("shows the one generic room with a tint layer masked to the detected walls in the shade's colour", () => {
    const colour = getColour("PM-401")!;
    const { container } = render(<WallPreview colour={colour} />);
    expect(screen.getByAltText("A cosy living room, repainted in Terracotta")).toBeInTheDocument();
    const tints = container.querySelectorAll<HTMLElement>(".tint");
    expect(tints).toHaveLength(2); // colour + luminosity layers for a wall that already has a colour
    expect([...tints].map((t) => t.dataset.blend)).toEqual(["color", "lum"]);
    expect(tints[0].style.background).toBe("rgb(194, 98, 63)");
    expect(tints[0].style.maskImage).toContain("/scenes/living-moody-mask.png");
    expect(tints[0].style.maskImage).toContain(genericScene.mask);
    expect(container.textContent).toContain("PM-401");
    expect(container.textContent).toContain("LRV 18");
  });
});
