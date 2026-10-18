import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "@/lib/auth/session";

// Quick first gate for /admin: no session cookie means straight to the login page.
// This is only an optimistic check. Every admin page and API verifies the signed
// session on the server as well.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = Boolean(req.cookies.get(sessionCookieName())?.value);

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !hasCookie) {
    const res = NextResponse.redirect(new URL("/admin/login", req.url));
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
