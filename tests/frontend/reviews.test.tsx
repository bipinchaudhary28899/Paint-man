import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Reviews } from "@/components/Reviews";
import { sampleReviews, type Review } from "@/config/reviews";

const real: Review[] = [
  { name: "Ritu S.", locality: "Dayalbagh", city: "agra", job: "2 BHK interior", quote: "They measured every wall and the quote matched the final bill.", date: "2026-09" },
  { name: "Anil K.", locality: "Krishna Nagar", city: "mathura", job: "Exterior walls", quote: "The supervisor sent photos every evening and the crew finished on time.", date: "2026-10" },
];

describe("What customers say", () => {
  it("is left out entirely while there are no reviews to show", () => {
    const { container } = render(<Reviews shown={{ items: [], sample: false }} />);
    expect(container).toBeEmptyDOMElement();
    // and by default outside development, until src/config/reviews.ts has a real one
    const { container: byDefault } = render(<Reviews />);
    expect(byDefault.querySelector("section")).toBeNull();
  });

  it("shows each customer's words with their name, locality, job and month, under one h2 with one accent", () => {
    render(<Reviews shown={{ items: real, sample: false }} className="mt-14" />);
    const section = screen.getByRole("region", { name: "What customers say" });
    expect(section).toHaveClass("mt-14");
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.querySelectorAll("em")).toHaveLength(1);
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].querySelector("blockquote")).toHaveTextContent(real[0].quote);
    expect(items[0].querySelector("figcaption")).toHaveTextContent("Ritu S., Dayalbagh, Agra2 BHK interior · Sep 2026");
    expect(items[1].querySelector("figcaption")).toHaveTextContent("Anil K., Krishna Nagar, Mathura");
    expect(screen.queryByText(/Sample reviews/)).toBeNull();
  });

  it("marks the development samples as samples", () => {
    render(<Reviews shown={{ items: sampleReviews, sample: true }} />);
    expect(screen.getByText(/Sample reviews, shown only on a development server/)).toBeInTheDocument();
    expect(screen.getAllByText("Sample customer")).toHaveLength(sampleReviews.length);
  });
});
