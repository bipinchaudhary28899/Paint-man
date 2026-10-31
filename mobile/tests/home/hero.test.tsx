import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { Hero } from "~/components/home/Hero";
import { illustrations, liveCities, site } from "~/shared";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));

const mockScrollTo = jest.fn();
jest.mock("~/components/site/Page", () => {
  const actual = jest.requireActual("~/components/site/Page");
  return { ...actual, usePage: () => ({ scrollTo: mockScrollTo }) };
});

beforeEach(() => jest.clearAllMocks());

describe("the home hero", () => {
  it("puts the booking button first: it glides to the booking card on the page", async () => {
    await render(<Hero />);
    await fireEvent.press(screen.getByRole("button", { name: "Book a free inspection" }));
    expect(mockScrollTo).toHaveBeenCalledWith("book-visit");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("has one heading with its accent word, and names every live city once", async () => {
    await render(<Hero />);
    expect(screen.getAllByRole("header")).toHaveLength(1);
    expect(screen.getByText("completely.")).toBeOnTheScreen();
    const line = screen.getByText(/^Now painting in /);
    for (const c of liveCities()) expect(line).toHaveTextContent(new RegExp(c.name));
    expect(screen.getByText(new RegExp(`^Ek deewar ho ya poora ghar`))).toHaveTextContent(new RegExp(`${site.yearsPainting} saal se gharon ko rang rahe hain, ab online bhi\\.$`));
  });

  it("keeps the paint-brands picture with its alt text", async () => {
    await render(<Hero />);
    expect(screen.getByLabelText(illustrations.paintBrands.alt)).toBeOnTheScreen();
  });
});
