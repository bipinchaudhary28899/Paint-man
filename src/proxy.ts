import { NextResponse, type NextRequest } from "next/server";
import { legacyShadeCode, LEGACY_SHADE_BRAND } from "@/config/legacy-shades";
import { sessionCookieName } from "@/lib/auth/session";

/** A path segment as typed ("PM%20502" → "PM 502"); a malformed escape is kept as it is. */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Where a retired Paint Man shade URL now goes: /colours/PM-502 (any case, or the short forms /colours/pm502 and /colours/502) → the colour finder
 * searching its nearest Asian Paints shade, /colours?brand=asian-paints&q=8386. Null for any other
 * path, including /colours/<anything else>, which Next then answers with a 404.
 */
export function legacyShadePath(pathname: string): string | null {
  const m = /^\/colours\/([^/]+)$/.exec(pathname);
  const code = m ? legacyShadeCode(decodeSegment(m[1])) : undefined;
  return code ? `/colours?${new URLSearchParams({ brand: LEGACY_SHADE_BRAND, q: code })}` : null;
}

// Runs before the route cache. Two jobs:
// - /colours/:code: Paint Man's own shade pages (PM-xxx codes) were retired for the brands' shade
//   cards. Each old URL gets a permanent 308 to the finder searching its nearest Asian Paints shade
//   (src/config/legacy-shades.ts), so links and search results keep landing somewhere useful. The
//   old query string is dropped. Every other /colours/<x> passes straight through, with no extra
//   headers, and 404s.
// - /admin and /api: a quick first gate for /admin (no session cookie means straight to the login
//   page) and noindex, no-store on both. This is only an optimistic check: every admin page and API
//   verifies the signed session on the server as well.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/colours/")) {
    const target = legacyShadePath(pathname);
    if (!target) return NextResponse.next();
    return NextResponse.redirect(new URL(target, req.url), 308);
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
