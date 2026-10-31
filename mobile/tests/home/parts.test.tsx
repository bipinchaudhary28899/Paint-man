import { fireEvent, render, screen } from "@testing-library/react-native";

import { PinnedReveal } from "~/components/home/PinnedReveal";
import { NavStateProvider } from "~/components/site/nav-state";
import { Page } from "~/components/site/Page";

jest.mock("@shopify/react-native-skia", () => require("./skia-mock"));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  usePathname: jest.fn(() => "/"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// every host view's measureLayout (the preset's shared mock), answered per test
const measureLayout: jest.Mock = jest.requireActual("@react-native/jest-preset/jest/MockNativeMethods").default.measureLayout;
afterEach(() => measureLayout.mockImplementation(() => undefined));

describe("the reveal outside a page", () => {
  it("shows the walls finished when there is no screen to pin to", async () => {
    await render(<PinnedReveal />);
    await fireEvent(screen.getByTestId("reveal-track"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } } });
    expect(screen.getByText("100%", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("waits for a measurement that fails, without pinning", async () => {
    measureLayout.mockImplementation((_c, _ok, onFail: () => void) => onFail());
    await render(
      <NavStateProvider>
        <Page>
          <PinnedReveal />
        </Page>
      </NavStateProvider>,
    );
    await fireEvent(screen.getByTestId("reveal-track"), "layout", { nativeEvent: { layout: { x: 0, y: 1200, width: 390, height: 2000 } } });
    expect(screen.getByText("0%", { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
