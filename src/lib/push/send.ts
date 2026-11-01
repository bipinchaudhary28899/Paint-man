import "server-only";
import { dropTokens, tokensFor } from "./tokens";

// Sends a push notification to every phone of an account through Expo's push service, which delivers
// to Apple (APNs) and Google (FCM) with the credentials kept in the app's Expo project. Nothing about
// the customer is logged; a phone Expo reports as no longer registered is forgotten.

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Expo takes up to 100 messages a request. */
const BATCH = 100;
const TIMEOUT_MS = 5000;

export type PushMessage = {
  title: string;
  body: string;
  /** the app screen a tap opens ("/account/projects/…") */
  url: string;
};

type Ticket = { status: "ok" | "error"; details?: { error?: string } };

/** Sends `message` to the account's phones; how many Expo took and how many phones were gone. */
export async function sendPush(userId: string, message: PushMessage, fetchImpl: typeof fetch = fetch): Promise<{ sent: number; dropped: number }> {
  const tokens = await tokensFor(userId);
  let sent = 0;
  const gone: string[] = [];
  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH);
    const res = await fetchImpl(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        // only needed once "enhanced push security" is turned on for the Expo project
        ...(process.env.EXPO_ACCESS_TOKEN && { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }),
      },
      body: JSON.stringify(batch.map((to) => ({ to, title: message.title, body: message.body, data: { url: message.url }, sound: "default", channelId: "updates" }))),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Expo push answered ${res.status}`);
    const tickets = ((await res.json()) as { data?: Ticket[] }).data ?? [];
    tickets.forEach((t, j) => {
      if (t.status === "ok") sent += 1;
      else if (t.details?.error === "DeviceNotRegistered") gone.push(batch[j]);
    });
  }
  await dropTokens(gone);
  return { sent, dropped: gone.length };
}
