import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
import { Linking, Text } from "react-native";

import { ProjectUpdates } from "~/components/account/ProjectUpdates";
import { AuthProvider, useAuth, type Auth } from "~/lib/auth-context";
import { PUSH_TOKEN_KEY } from "~/lib/push";
import { asha, mockApi, seedToken } from "./helpers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn() },
  usePathname: jest.fn(() => "/account"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// "Updates on your phone" on the account screen, and the phone's push token following the session:
// registered again on sign-in when allowed, forgotten on sign-out. expo-notifications and the app's
// Expo project are fakes.

const mockConfig: { projectId?: string } = { projectId: "project-123" };
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: { eas: { projectId: mockConfig.projectId } } };
    },
    easConfig: null,
  },
}));
const mockPermission = { now: { granted: false, canAskAgain: true }, afterAsking: { granted: true, canAskAgain: true } };
jest.mock("expo-notifications", () => ({
  __esModule: true,
  AndroidImportance: { HIGH: 4 },
  getPermissionsAsync: jest.fn(async () => mockPermission.now),
  requestPermissionsAsync: jest.fn(async () => mockPermission.afterAsking),
  setNotificationChannelAsync: jest.fn(async () => null),
  getExpoPushTokenAsync: jest.fn(async () => ({ type: "expo", data: "ExponentPushToken[phone-abcdefgh]" })),
}));

const store = () => (jest.requireMock("expo-secure-store") as { __store: Map<string, string> }).__store;
const REGISTER = "POST /api/v1/me/push-tokens";
const FORGET = "DELETE /api/v1/me/push-tokens";

let auth: Auth;
/** Hands the session's API to the test, and shows its status. */
function Probe({ onAuth }: { onAuth: (a: Auth) => void }) {
  const a = useAuth();
  useEffect(() => {
    onAuth(a);
  });
  return <Text>{a.status}</Text>;
}

async function show(routes: Parameters<typeof mockApi>[0] = {}) {
  seedToken();
  const calls = mockApi({ "GET /api/v1/me": { data: asha }, [REGISTER]: { status: 201, data: { registered: true } }, [FORGET]: { data: { removed: true } }, ...routes });
  await render(
    <AuthProvider>
      <ProjectUpdates />
      <Probe onAuth={(a) => (auth = a)} />
    </AuthProvider>,
  );
  await screen.findByText("signedIn");
  return calls;
}

beforeEach(() => {
  jest.clearAllMocks();
  store().clear();
  mockConfig.projectId = "project-123";
  mockPermission.now = { granted: false, canAskAgain: true };
  mockPermission.afterAsking = { granted: true, canAskAgain: true };
});

describe("Updates on your phone", () => {
  it("asks only when the customer taps Turn on updates, then registers the phone", async () => {
    const calls = await show();
    expect(screen.getByRole("header", { name: "Updates on your phone" })).toBeOnTheScreen();
    expect(screen.getByText(/confirm your visit, schedule the inspection, share your quotation/)).toBeOnTheScreen();
    expect(calls.some((c) => c.path === "/api/v1/me/push-tokens")).toBe(false);
    mockPermission.now = mockPermission.afterAsking;
    await fireEvent.press(screen.getByRole("button", { name: "Turn on updates" }));
    expect(await screen.findByText("This phone gets a notification each time your project moves on.")).toBeOnTheScreen();
    expect(calls.find((c) => c.method === "POST" && c.path === "/api/v1/me/push-tokens")).toMatchObject({
      headers: { Authorization: "Bearer saved-token" },
      body: { token: "ExponentPushToken[phone-abcdefgh]" },
    });
    expect(screen.queryByRole("button", { name: "Turn on updates" })).toBeNull();
  });

  it("points to Settings once notifications were refused", async () => {
    mockPermission.now = { granted: false, canAskAgain: false };
    const settings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    await show();
    expect(await screen.findByText(/Turn them on in Settings/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Open Settings" }));
    expect(settings).toHaveBeenCalled();
  });

  it("says why when the phone cannot be registered", async () => {
    await show({ [REGISTER]: { status: 429, error: { code: "rate_limited", message: "Too many requests. Try again in 40 seconds." } } });
    await fireEvent.press(await screen.findByRole("button", { name: "Turn on updates" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests. Try again in 40 seconds.");
  });

  it("is not shown in a build without push (no Expo project yet)", async () => {
    mockConfig.projectId = undefined;
    await show();
    await act(() => new Promise((r) => setTimeout(r, 20)));
    expect(screen.queryByTestId("project-updates")).toBeNull();
  });
});

describe("the phone's token and the session", () => {
  it("registers an allowed phone again on sign-in, and forgets it on sign-out", async () => {
    mockPermission.now = { granted: true, canAskAgain: true };
    const calls = await show();
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/api/v1/me/push-tokens")).toBe(true));
    expect(store().get(PUSH_TOKEN_KEY)).toBe("ExponentPushToken[phone-abcdefgh]");
    await act(() => auth.signOut());
    expect(calls.find((c) => c.method === "DELETE" && c.path === "/api/v1/me/push-tokens")).toMatchObject({ body: { token: "ExponentPushToken[phone-abcdefgh]" } });
    expect(store().has(PUSH_TOKEN_KEY)).toBe(false);
  });

  it("drops the saved token when the account is deleted", async () => {
    store().set(PUSH_TOKEN_KEY, "ExponentPushToken[phone-abcdefgh]");
    await show({ "DELETE /api/v1/me": { data: { deleted: true } } });
    await act(() => auth.deleteAccount());
    expect(store().has(PUSH_TOKEN_KEY)).toBe(false);
  });
});
