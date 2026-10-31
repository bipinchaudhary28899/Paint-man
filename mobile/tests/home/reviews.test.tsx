import { render, screen } from "@testing-library/react-native";
import { Reviews } from "~/components/home/Reviews";
import type { Review } from "~/shared";

const real: Review[] = [{ name: "Ritu S.", locality: "Dayalbagh", city: "agra", job: "2 BHK interior", quote: "They measured every wall and the quote matched the final bill.", date: "2026-09" }];

describe("What customers say", () => {
  it("is left out while there are no reviews to show", async () => {
    await render(<Reviews shown={{ items: [], sample: false }} />);
    expect(screen.queryByRole("header", { name: "What customers say" })).toBeNull();
  });

  it("reads each review as one item: name, place, job, month and the words", async () => {
    await render(<Reviews shown={{ items: real, sample: false }} />);
    expect(screen.getByRole("header", { name: "What customers say" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Ritu S., Dayalbagh, Agra, 2 BHK interior, Sep 2026: They measured every wall and the quote matched the final bill.")).toBeOnTheScreen();
    expect(screen.queryByText(/Sample reviews/)).toBeNull();
  });

  it("shows the marked samples in a development build (tests run as one)", async () => {
    await render(<Reviews />);
    expect(screen.getByText(/Sample reviews, shown only in a development build/)).toBeOnTheScreen();
    expect(screen.getAllByText(/^Sample customer/).length).toBeGreaterThan(0);
  });
});
