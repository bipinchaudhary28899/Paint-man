import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { router } from "expo-router";

import { ColourExplorer } from "~/components/home/ColourExplorer";
import { shadeCardBrands } from "~/shared";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

beforeEach(() => jest.clearAllMocks());

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
