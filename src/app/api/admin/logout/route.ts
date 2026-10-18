import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "@/lib/auth/session";
import { isSameOrigin, noStore } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  // The sign-out button fetches with Accept: application/json and then loads the login page
  // itself; a plain form post (no JavaScript) gets a 303 to the login page instead.
  const wantsJson = req.headers.get("accept")?.includes("application/json") ?? false;
  const res = wantsJson
    ? NextResponse.json({ ok: true }, { headers: noStore })
    : NextResponse.redirect(new URL("/admin/login", req.url), { status: 303, headers: noStore });
  res.cookies.set(sessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
