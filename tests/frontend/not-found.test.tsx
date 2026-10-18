import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NotFound, { metadata } from "@/app/not-found";

vi.mock("next/navigation", () => ({
  usePathname: () => "/does-not-exist",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

describe("404 page", () => {
  it("is noindex but followable, with its own title", () => {
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.title).toEqual({ absolute: "Page not found | Paint Man" });
    expect(metadata).not.toHaveProperty("alternates");
  });

  it("renders one h1 inside the main landmark with the site navigation around it", () => {
    render(<NotFound />);
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(within(main).getByRole("heading", { level: 1 })).toHaveTextContent("Page not found.");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();
  });

  it("links a lost visitor to services, colours and booking", () => {
    render(<NotFound />);
    const main = screen.getByRole("main");
    const hrefs = within(main).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(expect.arrayContaining(["/services", "/colours", "/book", "/"]));
  });
});
