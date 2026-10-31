import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { router, usePathname } from "expo-router";
import { Text } from "react-native";

import { NavStateProvider } from "~/components/site/nav-state";
import { Page } from "~/components/site/Page";
import { AuthProvider } from "~/lib/auth-context";
import { asha, mockApi, seedToken } from "./helpers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn() },
  usePathname: jest.fn(() => "/about"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

const mockPathname = usePathname as jest.Mock;

async function show() {
  await render(
    <AuthProvider>
      <NavStateProvider>
        <Page footer={false}>
          <Text>content</Text>
        </Page>
      </NavStateProvider>
    </AuthProvider>,
  );
}

const drawer = async () => {
  await fireEvent.press(screen.getByRole("button", { name: "Open menu" }));
  return within(screen.getByTestId("nav-drawer"));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname.mockReturnValue("/about");
});

describe("the header's account control", () => {
  it("is a Log in pill when signed out, opening the login screen", async () => {
    mockApi({});
    await show();
    const login = await screen.findByRole("link", { name: "Log in" });
    expect(screen.queryByTestId("account-initials")).toBeNull();
    await fireEvent.press(login);
    expect(router.push).toHaveBeenCalledWith("/login");
  });

  it("is a round button with the customer's initials when signed in, opening the account", async () => {
    seedToken();
    mockApi({ "GET /api/v1/me": { data: asha } });
    await show();
    const button = await screen.findByTestId("account-initials");
    expect(button).toHaveTextContent("AV");
    expect(button).toHaveProp("accessibilityLabel", "My account");
    expect(button).toHaveProp("accessibilityRole", "link");
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
    await fireEvent.press(button);
    expect(router.push).toHaveBeenCalledWith("/account");
  });

  it("is a My account pill while the account has no name", async () => {
    seedToken();
    mockApi({ "GET /api/v1/me": { data: { ...asha, name: null } } });
    await show();
    await fireEvent.press(await screen.findByRole("link", { name: "My account" }));
    expect(screen.queryByTestId("account-initials")).toBeNull();
    expect(router.push).toHaveBeenCalledWith("/account");
  });

  it("shows nothing while the saved session is read, and no Log in pill on the login screen itself", async () => {
    seedToken();
    globalThis.fetch = jest.fn(() => new Promise(() => {})) as never;
    await show();
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "My account" })).toBeNull();
    await screen.unmount();

    mockPathname.mockReturnValue("/login");
    mockApi({});
    await show();
    await waitFor(() => expect(screen.getByRole("button", { name: "Open menu" })).toBeOnTheScreen());
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
  });
});

describe("the drawer's account link", () => {
  it("is Log in when signed out", async () => {
    mockApi({});
    await show();
    await screen.findByRole("link", { name: "Log in" });
    const menu = await drawer();
    await fireEvent.press(menu.getByRole("link", { name: "Log in" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/login", params: {} });
  });

  it("is My account when signed in, marked while the account is open", async () => {
    seedToken();
    mockApi({ "GET /api/v1/me": { data: asha } });
    mockPathname.mockReturnValue("/account");
    await show();
    await screen.findByTestId("account-initials");
    const menu = await drawer();
    const link = menu.getByRole("link", { name: "My account" });
    expect(link).toBeSelected();
    expect(menu.queryByRole("link", { name: "Log in" })).toBeNull();
  });
});
