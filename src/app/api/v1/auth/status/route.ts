import { apiOk } from "@/lib/api";
import { customerLoginOpen } from "@/config/login";

/**
 * GET /api/v1/auth/status
 * Whether customer login is open, so the app can say "coming soon" before anyone types a number.
 * data: { open: boolean }. Open in development, and in production once NEXT_PUBLIC_CUSTOMER_LOGIN=open
 * (src/config/login.ts); tester numbers can sign in either way (POST /api/v1/auth/otp). Not cached
 * for long, so opening login reaches the app within a minute.
 * Example: GET /api/v1/auth/status → 200 { "kind": "login-status", "label": "Customer accounts are coming soon.",
 *   "data": { "open": false } }
 */
export function GET() {
  const open = customerLoginOpen();
  return apiOk({
    kind: "login-status",
    label: open ? "Customer login is open: sign in with a code sent by SMS." : "Customer accounts are coming soon.",
    data: { open },
    links: { self: "/api/v1/auth/status", otp: "/api/v1/auth/otp", html: "/login" },
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
