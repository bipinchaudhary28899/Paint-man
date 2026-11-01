import { requireOptionalNativeModule } from "expo";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Push notifications of the customer's project updates (owner: "booking, inspection and quotation
// updates"): the website sends them through Expo's push service when the team moves a project on
// (src/lib/push on the website). Here the phone asks for permission (only when the customer taps
// "Turn on updates"), gets its Expo push token and registers it with POST /api/v1/me/push-tokens;
// signing out forgets it. A tapped notification opens its project.
// Push needs the app's Expo project (extra.eas.projectId, from `eas init`) and, in the builds, the
// Apple and Google credentials kept in that project. Without the project, or in a build without the
// native module, push is simply off ("unavailable") and nothing else changes.

type Notifications = typeof import("expo-notifications");
type Request = <T>(path: string, init?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown }) => Promise<{ data: T }>;

/** Where updates stand on this phone: on; not asked yet; refused (only Settings can change it); or off in this build. */
export type PushState = "on" | "ask" | "blocked" | "unavailable";

/** The phone's registered token, so signing out can forget it. */
export const PUSH_TOKEN_KEY = "paintsaathi.pushToken";
/** The Android channel the website sends updates on (send.ts: channelId). */
export const UPDATES_CHANNEL = "updates";

/**
 * Loads expo-notifications on use, and only in a build that has its native part (a development build
 * made before it was added has not): loading it there would fail, and in development say so loudly.
 */
function loadNotifications(): Notifications {
  if (!requireOptionalNativeModule("ExpoPushTokenManager")) throw new Error("No push notifications in this build");
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded on use, not at start-up
  return require("expo-notifications") as Notifications;
}

/** expo-notifications, or null in a build without its native part (an older development build). */
export function notificationsModule(load: () => Notifications = loadNotifications): Notifications | null {
  try {
    return load();
  } catch {
    return null;
  }
}

/** The app's Expo project, which Expo push tokens belong to; undefined until `eas init` has set it. */
export function expoProjectId(): string | undefined {
  const fromConfig = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return fromConfig ?? Constants.easConfig?.projectId ?? undefined;
}

/** Where updates stand, without asking. */
export async function pushState(N: Notifications | null = notificationsModule()): Promise<PushState> {
  if (!N || !expoProjectId()) return "unavailable";
  const permission = await N.getPermissionsAsync();
  if (permission.granted) return "on";
  return permission.canAskAgain ? "ask" : "blocked";
}

/**
 * Registers this phone for the account's updates and says where they stand. With `ask` it asks for
 * permission first when it has not been asked yet; without, it only refreshes a phone already allowed
 * (a token can change). Failures of the network or the token come back as errors.
 */
export async function registerForPush(request: Request, { ask = false, N = notificationsModule() }: { ask?: boolean; N?: Notifications | null } = {}): Promise<PushState> {
  const projectId = expoProjectId();
  if (!N || !projectId) return "unavailable";
  let permission = await N.getPermissionsAsync();
  if (!permission.granted && ask && permission.canAskAgain) permission = await N.requestPermissionsAsync();
  if (!permission.granted) return permission.canAskAgain ? "ask" : "blocked";
  if (Platform.OS === "android") {
    await N.setNotificationChannelAsync(UPDATES_CHANNEL, { name: "Project updates", importance: N.AndroidImportance.HIGH });
  }
  const { data: token } = await N.getExpoPushTokenAsync({ projectId });
  await request("/api/v1/me/push-tokens", { method: "POST", body: { token, platform: Platform.OS === "ios" ? "ios" : "android" } });
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token).catch(() => undefined);
  return "on";
}

/** Forgets this phone (signing out): the website stops sending to it. Never throws. */
export async function unregisterPush(request: Request): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (!token) return;
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    await request("/api/v1/me/push-tokens", { method: "DELETE", body: { token } });
  } catch {
    // signing out goes on: the website also drops a phone Expo reports gone
  }
}

/** Drops the saved token without asking the website (the account is gone, and its phones with it). */
export const forgetPushToken = () => SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => undefined);

/** The app screen a notification opens: its `url`, when that is one of the app's own paths. */
export function screenFor(data: unknown): string | null {
  const url = data && typeof data === "object" ? (data as { url?: unknown }).url : undefined;
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") ? url : null;
}

/**
 * Sets up notifications for the running app: one that arrives while it is open shows as a banner, and
 * a tapped one (also the one that launched the app) opens its screen with `open`. Returns the clean-up.
 */
export function listenForPush(open: (path: string) => void, N: Notifications | null = notificationsModule()): () => void {
  if (!N) return () => undefined;
  N.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
  const go = (response: { notification: { request: { content: { data?: unknown } } } } | null) => {
    const path = response && screenFor(response.notification.request.content.data);
    if (path) open(path);
  };
  N.getLastNotificationResponseAsync().then(go, () => undefined);
  const subscription = N.addNotificationResponseReceivedListener(go);
  return () => subscription.remove();
}
