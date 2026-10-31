import { fireEvent, render, screen } from "@testing-library/react-native";
import { usePathname } from "expo-router";
import { Text } from "react-native";

import { BottomNav } from "~/components/site/BottomNav";
import { NavStateProvider } from "~/components/site/nav-state";
import { FaqList } from "~/components/site/Sections";
import { Plus } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { generalFaqs } from "~/shared";
import { radii } from "~/theme";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/about"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (usePathname as jest.Mock).mockReturnValue("/about");
});

describe("pill buttons", () => {
  it("come in a compact size for tight rows, still a 44pt pill", async () => {
    const onPress = jest.fn();
    await render(<Button label="Clear" small variant="secondary" onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Clear" });
    expect(button).toHaveStyle({ minHeight: 44, borderRadius: radii.pill });
    expect(screen.getByText("Clear")).toHaveStyle({ fontSize: 14 });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalled();
  });

  it("can carry a mark before the label and say a fuller name to screen readers", async () => {
    await render(<Button label="Call" accessibilityLabel="Call us" leading={<Text>mark</Text>} onPress={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Call us" })).toBeOnTheScreen();
    expect(screen.getByText("mark")).toBeOnTheScreen();
    expect(screen.getByText("Call")).toBeOnTheScreen();
  });

  it("put the + toggle in a round pill that fills ink when open", async () => {
    const { rerender } = await render(<Plus open={false} disc />);
    expect(screen.getByTestId("plus-disc")).toHaveStyle({ width: 36, height: 36, borderRadius: radii.pill });
    expect(screen.getByTestId("plus-disc")).not.toHaveStyle({ backgroundColor: "#242522" });
    await rerender(<Plus open disc />);
    expect(screen.getByTestId("plus-disc")).toHaveStyle({ backgroundColor: "#242522" });
  });

  it("give every FAQ row its round + toggle", async () => {
    await render(<FaqList faqs={generalFaqs.slice(0, 3)} />);
    expect(screen.getAllByTestId("plus-disc")).toHaveLength(3);
  });
});

describe("the bottom nav's depth", () => {
  it("draws the bar with its bevel and the dab with its gloss, keeping the labels legible", async () => {
    await render(
      <NavStateProvider>
        <BottomNav />
      </NavStateProvider>,
    );
    await fireEvent(screen.getByTestId("bottom-nav"), "layout", { nativeEvent: { layout: { x: 16, y: 700, width: 361, height: 64 } } });
    expect(screen.getByTestId("bottom-nav-bevel", { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId("bottom-nav-gloss", { includeHiddenElements: true })).toBeOnTheScreen();
    for (const label of ["Home", "Services", "Colours", "Estimate"]) expect(screen.getByRole("tab", { name: label })).toBeOnTheScreen();
    // the active label leaves its sunken pill for the place under the dab
    expect(screen.getByText("Home").parent).toHaveStyle({ backgroundColor: "transparent" });
    expect(screen.getByText("Services").parent).toHaveStyle({ backgroundColor: "rgba(0, 0, 0, 0.16)" });
  });
});
