import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ColourExplorer, swatchIndices, wheelAngle, wheelShades } from "@/components/home/ColourExplorer";
import { ParallaxChips } from "@/components/home/ParallaxChips";
import { PinnedReveal, reveal } from "@/components/home/PinnedReveal";
import { colours } from "@/config/colours";
import { clamp01, easeInOutQuad } from "@/lib/scroll";

describe("ParallaxChips", () => {
  it("draws seven decorative chips, hidden from assistive tech, each with its own drift", () => {
    const { container } = render(<ParallaxChips />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    const chips = container.querySelectorAll(".chip-bg");
    expect(chips).toHaveLength(7);
    const drifts = new Set([...chips].map((c) => (c as HTMLElement).style.getPropertyValue("--drift")));
    expect(drifts.size).toBeGreaterThan(3);
    expect(container.textContent).toContain("Terracotta · 03");
    expect((chips[0] as HTMLElement).style.left).toBe("-40px");
    expect((chips[1] as HTMLElement).style.right).toBe("6%");
  });
});

describe("PinnedReveal", () => {
  it("renders the four stages, the colour and grey layers and the stage labels", () => {
    const { container } = render(<PinnedReveal />);
    expect(screen.getByRole("heading", { level: 2, name: /Watch the colour/ })).toBeInTheDocument();
    expect(container.querySelectorAll(".pin-stage")).toHaveLength(4);
    expect(screen.getByText("Prep & putty")).toBeInTheDocument();
    expect(screen.getByAltText(/walls being painted Sage Mist/)).toBeInTheDocument();
    // the room stays in colour: only the traced walls carry a putty layer and a shade layer
    expect(container.querySelectorAll(".pin-before .tint")).toHaveLength(1);
    expect(container.querySelectorAll(".pin-after .tint")).toHaveLength(1);
    const after = container.querySelector(".pin-after .tint") as HTMLElement;
    expect(after.style.background).toBe("rgb(184, 199, 176)");
    expect(after.style.maskImage).toContain("/scenes/living-moody-mask.png");
    expect(container.querySelectorAll(".pin-label")).toHaveLength(4);
    expect(container.querySelector(".pin-track")).not.toBeNull();
    expect(container.querySelector(".pin-bar")).not.toBeNull();
  });

  it("turns scroll progress into fill, stage and opacities exactly as the design does", () => {
    expect(reveal(0)).toMatchObject({ fill: 0, stage: 0, edgeVisible: false });
    expect(reveal(0.5)).toMatchObject({ fill: 50, stage: 2 });
    expect(reveal(1)).toMatchObject({ fill: 100, stage: 3, edgeVisible: false });
    const mid = reveal(0.3);
    expect(mid.stage).toBe(1);
    expect(mid.stageOpacity(1)).toBe(1);
    expect(mid.stageOpacity(0)).toBe(0.55);
    expect(mid.stageOpacity(3)).toBe(0.3);
    expect(mid.edgeVisible).toBe(true);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(easeInOutQuad(0.25)).toBeCloseTo(0.125);
  });
});

describe("ColourExplorer", () => {
  it("builds 36 wheel wedges and twelve swatches from the spec list, with Terracotta selected", () => {
    const { container } = render(<ColourExplorer />);
    // no auto-rotation: the wheel only turns with the scroll
    expect(container.querySelector(".wheel-spin")).toBeNull();
    expect(container.querySelector("svg.wheel")).not.toBeNull();
    expect(wheelShades).toHaveLength(36);
    expect(container.querySelectorAll("svg.wheel-svg path")).toHaveLength(36);
    const swatches = within(screen.getByRole("list", { name: "Featured shades" })).getAllByRole("button");
    expect(swatches).toHaveLength(12);
    expect(swatchIndices).toEqual([1, 3, 8, 12, 13, 16, 19, 21, 23, 25, 27, 30]);
    expect(screen.getByRole("button", { name: "Terracotta" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("#C76B4A · Terracottas")).toBeInTheDocument();
    expect(screen.getByText(/Discuss this shade with us/)).toHaveAttribute("href", "/book");
    expect(screen.getByText(`Search all ${colours.length} shades`)).toHaveAttribute("href", "/colours");
  });

  it("switches the selected shade card when a swatch is tapped", async () => {
    const user = userEvent.setup();
    render(<ColourExplorer />);
    await user.click(screen.getByRole("button", { name: "Sage" }));
    expect(screen.getByRole("button", { name: "Sage" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Terracotta" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("#71856A · Greens")).toBeInTheDocument();
  });

  it("turns the wheel 0°→180° from the moment it enters the screen to when it leaves", () => {
    expect(wheelAngle(-0.5)).toBe(0); // not on screen yet: at rest
    expect(wheelAngle(0)).toBe(0);
    expect(wheelAngle(0.5)).toBe(90);
    expect(wheelAngle(1)).toBe(180);
    expect(wheelAngle(2)).toBe(180);
  });
});
