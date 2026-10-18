import { afterEach, describe, expect, it, vi } from "vitest";
import { hardNavigate } from "@/lib/browser";

describe("hardNavigate", () => {
  const original = window.location;
  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: original });
  });

  it("does a full page load of the given URL", () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, assign } });
    hardNavigate("/admin");
    expect(assign).toHaveBeenCalledWith("/admin");
  });
});
