import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "@/lib/auth/session";

/**
 * The canonical path for a shade URL whose code differs from the canonical one only in case
 * (/colours/pm-502 → /colours/PM-502), or null when the path is already canonical or is not a
 * PM code at all (short forms like /colours/502 are left to the page, which redirects them too).
 */
export function canonicalColourPath(pathname: string): string | null {
  const m = /^\/colours\/([^/]+)$/.exec(pathname);
  if (!m) return null;
  const code = m[1];
  const upper = code.toUpperCase();
  return /^PM-\d+$/.test(upper) && upper !== code ? `/colours/${upper}` : null;
}

// Runs before the route cache. Two jobs:
// - /colours/:code: one URL per shade. Case variants get a 308 here, before rendering, because on a
//   case-insensitive disk a page-level redirect for /colours/pm-502 is cached under the same file
//   as /colours/PM-502 and the canonical URL then serves the redirect to itself. Every other shade
//   URL passes straight through, with no extra headers, so it stays cacheable and indexable.
// - /admin and /api: a quick first gate for /admin (no session cookie means straight to the login
//   page) and noindex, no-store on both. This is only an optimistic check: every admin page and API
//   verifies the signed session on the server as well.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/colours/")) {
    const canonical = canonicalColourPath(pathname);
    if (!canonical) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = canonical; // keeps the query string
    return NextResponse.redirect(url, 308);
  }

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
  matcher: ["/admin/:path*", "/api/:path*", "/colours/:code"],
};
