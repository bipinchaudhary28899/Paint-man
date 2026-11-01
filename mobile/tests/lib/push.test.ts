import { Platform } from "react-native";

import { expoProjectId, forgetPushToken, listenForPush, notificationsModule, PUSH_TOKEN_KEY, pushState, registerForPush, screenFor, unregisterPush, UPDATES_CHANNEL } from "~/lib/push";

// The phone's side of project-update notifications: permission, the Expo push token, registering
// and forgetting it, and opening the project a notification names. expo-notifications is a fake
// handed in (or mocked); the app's Expo project id comes from a mocked expo-constants.

const mockConfig: { expoConfig: { extra?: { eas?: { projectId?: string } } } | null; easConfig: { projectId?: string } | null } = { expoConfig: null, easConfig: null };
// getters: jest runs this before mockConfig is set, so the values are read when the code asks
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockConfig.expoConfig;
    },
    get easConfig() {
      return mockConfig.easConfig;
    },
  },
}));
// expo-notifications' native part is not in Jest: a stand-in, so the loader finds a module
jest.mock("expo-notifications", () => ({ __esModule: true, standIn: true }));

const store = () => (jest.requireMock("expo-secure-store") as { __store: Map<string, string> }).__store;
const TOKEN = "ExponentPushToken[abcdefghij123]";

type Permission = { granted: boolean; canAskAgain: boolean };
/** A fake expo-notifications: permission as given (and as given after asking), a token, listeners. */
function fakeNotifications(now: Permission, afterAsking: Permission = now) {
  const listeners: ((r: unknown) => void)[] = [];
  return {
    AndroidImportance: { HIGH: 4 },
    getPermissionsAsync: jest.fn(async () => now),
    requestPermissionsAsync: jest.fn(async () => afterAsking),
    setNotificationChannelAsync: jest.fn(async () => null),
    getExpoPushTokenAsync: jest.fn(async () => ({ type: "expo", data: TOKEN })),
    setNotificationHandler: jest.fn(),
    getLastNotificationResponseAsync: jest.fn(async () => null as unknown),
    addNotificationResponseReceivedListener: jest.fn((fn: (r: unknown) => void) => {
      listeners.push(fn);
      return { remove: jest.fn(() => listeners.splice(listeners.indexOf(fn), 1)) };
    }),
    tap: (data: unknown) => listeners.forEach((fn) => fn({ notification: { request: { content: { data } } } })),
  };
}
type Fake = ReturnType<typeof fakeNotifications>;
const asModule = (fake: Fake) => fake as unknown as NonNullable<ReturnType<typeof notificationsModule>>;
const flush = () => new Promise((r) => setTimeout(r, 0));
type Request = Parameters<typeof registerForPush>[0];
/** A fake signed-in request: answers with `impl`. */
const fakeRequest = (impl: () => Promise<unknown> = async () => ({ data: {} })) => jest.fn(impl) as unknown as jest.Mock & Request;

beforeEach(() => {
  mockConfig.expoConfig = { extra: { eas: { projectId: "project-123" } } };
  mockConfig.easConfig = null;
  store().clear();
});

describe("the app's Expo project", () => {
  it("comes from the app config, or the build's EAS config, and is missing until eas init", () => {
    expect(expoProjectId()).toBe("project-123");
    mockConfig.expoConfig = null;
    mockConfig.easConfig = { projectId: "from-eas" };
    expect(expoProjectId()).toBe("from-eas");
    mockConfig.easConfig = null;
    expect(expoProjectId()).toBeUndefined();
  });

  it("loads expo-notifications when the build has it, and is off when it does not", () => {
    expect(notificationsModule()).toMatchObject({ standIn: true });
    expect(
      notificationsModule(() => {
        throw new Error("Cannot find native module 'ExpoPushTokenManager'");
      }),
    ).toBeNull();
  });
});

describe("pushState", () => {
  it("is on, not asked yet, refused or off in this build", async () => {
    expect(await pushState(asModule(fakeNotifications({ granted: true, canAskAgain: true })))).toBe("on");
    expect(await pushState(asModule(fakeNotifications({ granted: false, canAskAgain: true })))).toBe("ask");
    expect(await pushState(asModule(fakeNotifications({ granted: false, canAskAgain: false })))).toBe("blocked");
    expect(await pushState(null)).toBe("unavailable");
    mockConfig.expoConfig = null;
    expect(await pushState(asModule(fakeNotifications({ granted: true, canAskAgain: true })))).toBe("unavailable");
  });
});

describe("registerForPush", () => {
  it("asks only when told to, then registers the phone's token with the website and keeps it", async () => {
    const fake = fakeNotifications({ granted: false, canAskAgain: true }, { granted: true, canAskAgain: true });
    const request = fakeRequest(async () => ({ data: { registered: true } }));
    expect(await registerForPush(request, { N: asModule(fake) })).toBe("ask");
    expect(fake.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
    expect(await registerForPush(request, { ask: true, N: asModule(fake) })).toBe("on");
    expect(fake.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: "project-123" });
    expect(request).toHaveBeenCalledWith("/api/v1/me/push-tokens", { method: "POST", body: { token: TOKEN, platform: Platform.OS === "ios" ? "ios" : "android" } });
    expect(store().get(PUSH_TOKEN_KEY)).toBe(TOKEN);
  });

  it("sets up Android's updates channel first", async () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => "android" });
    try {
      const fake = fakeNotifications({ granted: true, canAskAgain: true });
      const request = fakeRequest();
      await registerForPush(request, { N: asModule(fake) });
      expect(fake.setNotificationChannelAsync).toHaveBeenCalledWith(UPDATES_CHANNEL, { name: "Project updates", importance: 4 });
      expect(request).toHaveBeenCalledWith("/api/v1/me/push-tokens", { method: "POST", body: { token: TOKEN, platform: "android" } });
    } finally {
      Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
    }
  });

  it("says refused when the customer said no, and off without the Expo project or the module", async () => {
    const request = fakeRequest();
    expect(await registerForPush(request, { ask: true, N: asModule(fakeNotifications({ granted: false, canAskAgain: true }, { granted: false, canAskAgain: false })) })).toBe("blocked");
    expect(await registerForPush(request, { N: null })).toBe("unavailable");
    mockConfig.expoConfig = null;
    expect(await registerForPush(request, { N: asModule(fakeNotifications({ granted: true, canAskAgain: true })) })).toBe("unavailable");
    expect(request).not.toHaveBeenCalled();
  });

  it("lets a failed registration through as an error", async () => {
    const request = fakeRequest(async () => Promise.reject(new Error("offline")));
    await expect(registerForPush(request, { N: asModule(fakeNotifications({ granted: true, canAskAgain: true })) })).rejects.toThrow("offline");
  });
});

describe("unregisterPush and forgetPushToken", () => {
  it("forgets the phone with the website, once, and never throws", async () => {
    const request = fakeRequest(async () => ({ data: { removed: true } }));
    await unregisterPush(request);
    expect(request).not.toHaveBeenCalled();
    store().set(PUSH_TOKEN_KEY, TOKEN);
    await unregisterPush(request);
    expect(request).toHaveBeenCalledWith("/api/v1/me/push-tokens", { method: "DELETE", body: { token: TOKEN } });
    expect(store().has(PUSH_TOKEN_KEY)).toBe(false);
    store().set(PUSH_TOKEN_KEY, TOKEN);
    await expect(unregisterPush(fakeRequest(async () => Promise.reject(new Error("401"))))).resolves.toBeUndefined();
    store().set(PUSH_TOKEN_KEY, TOKEN);
    await forgetPushToken();
    expect(store().has(PUSH_TOKEN_KEY)).toBe(false);
  });
});

describe("opening a notification", () => {
  it("opens only the app's own paths", () => {
    expect(screenFor({ url: "/account/projects/p1" })).toBe("/account/projects/p1");
    expect(screenFor({ url: "//evil.example" })).toBeNull();
    expect(screenFor({ url: "https://evil.example" })).toBeNull();
    expect(screenFor({ url: 3 })).toBeNull();
    expect(screenFor(null)).toBeNull();
    expect(screenFor("x")).toBeNull();
  });

  it("shows banners while the app is open, opens a tapped one and the one that launched the app, and stops on clean-up", async () => {
    const fake = fakeNotifications({ granted: true, canAskAgain: true });
    fake.getLastNotificationResponseAsync.mockResolvedValueOnce({ notification: { request: { content: { data: { url: "/account/projects/launch" } } } } });
    const open = jest.fn();
    const stop = listenForPush(open, asModule(fake));
    await flush();
    expect(open).toHaveBeenCalledWith("/account/projects/launch");
    const handler = fake.setNotificationHandler.mock.calls[0][0] as { handleNotification: () => Promise<object> };
    await expect(handler.handleNotification()).resolves.toEqual({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false });
    fake.tap({ url: "/account/projects/p2" });
    fake.tap({ nothing: true });
    expect(open).toHaveBeenLastCalledWith("/account/projects/p2");
    expect(open).toHaveBeenCalledTimes(2);
    stop();
    fake.tap({ url: "/account/projects/p3" });
    expect(open).toHaveBeenCalledTimes(2);
    // a launch with no notification, and a build without the module
    const quiet = fakeNotifications({ granted: true, canAskAgain: true });
    listenForPush(open, asModule(quiet))();
    await flush();
    expect(open).toHaveBeenCalledTimes(2);
    expect(listenForPush(open, null)).toEqual(expect.any(Function));
  });
});
