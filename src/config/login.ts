// Customer login (a one-time SMS code to the mobile number). Open to everyone in development; in
// production only once NEXT_PUBLIC_CUSTOMER_LOGIN=open is set (when the MSG91 keys and the DLT-approved
// template are ready), then redeploy. Until then the login screens say accounts are coming soon, the
// API refuses codes, and only the tester numbers can sign in (src/lib/auth/testers.ts).
// NEXT_PUBLIC so the browser bundle knows it too; "closed" previews the production state locally.
// The phone app reads EXPO_PUBLIC_CUSTOMER_LOGIN instead (inlined when the app is built), for the
// booking copy it shares; its login screen asks GET /api/v1/auth/status.

type LoginEnv = { NODE_ENV?: string; NEXT_PUBLIC_CUSTOMER_LOGIN?: string };

export function customerLoginOpen(
  env: LoginEnv = { NODE_ENV: process.env.NODE_ENV, NEXT_PUBLIC_CUSTOMER_LOGIN: process.env.NEXT_PUBLIC_CUSTOMER_LOGIN ?? process.env.EXPO_PUBLIC_CUSTOMER_LOGIN },
): boolean {
  const flag = env.NEXT_PUBLIC_CUSTOMER_LOGIN?.trim().toLowerCase();
  if (flag === "open") return true;
  if (flag === "closed") return false;
  return env.NODE_ENV !== "production";
}

/** What the API and the screens say while customer login is closed. */
export const LOGIN_NOT_OPEN_MESSAGE = "Customer accounts are coming soon. To book a visit, use the booking form and we'll call you back.";
