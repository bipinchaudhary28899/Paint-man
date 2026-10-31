import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";

import { ColourExplorer } from "~/components/home/ColourExplorer";
import { BeforeAfterSection } from "~/components/home/BeforeAfterSection";
import { shadeCardBrands } from "~/shared";

jest.mock("@shopify/react-native-skia", () => require("./skia-mock"));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

beforeEach(() => jest.clearAllMocks());

describe("the home page's colour preview section", () => {
  it("has a heading with its accent, says what the slider shows, and holds the slider", async () => {
    await render(<BeforeAfterSection />);
    expect(screen.getByText("Colour preview")).toBeOnTheScreen();
    const heading = screen.getByRole("header", { name: "Slide to see the walls repainted." });
    expect(within(heading).getByText("repainted.")).toBeOnTheScreen();
    expect(screen.getByText(/as photographed on the left, and with its walls in a real shade-card colour on the right/)).toBeOnTheScreen();
    expect(screen.getByRole("adjustable", { name: /^Colour preview on an example room/ })).toBeOnTheScreen();
    expect(screen.getByText(/not a finished job of ours/)).toBeOnTheScreen();
  });
});

describe("the colour explorer's brand pills", () => {
  it("open the finder on each brand's shade card", async () => {
    await render(<ColourExplorer />);
    expect(screen.getByText("Browse a brand's shades")).toBeOnTheScreen();
    const pills = within(screen.getByLabelText("Paint brands"));
    for (const b of shadeCardBrands) expect(pills.getByRole("link", { name: b.name })).toBeOnTheScreen();
    await fireEvent.press(pills.getByRole("link", { name: shadeCardBrands[1].name }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/colours", params: { brand: shadeCardBrands[1].slug } });
  });
});
