import { NextResponse, type NextRequest } from "next/server";
import { readUserSession } from "@/lib/auth/user-session";
import { leadSchema } from "@/lib/leads/schema";
import { saveLead } from "@/lib/leads/store";
import { bodyTooLarge, clientIp, isSameOrigin, noStore } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { createTimer } from "@/lib/timing";

export const runtime = "nodejs";

/**
 * POST /api/leads (same-origin only): the website's booking, contact and quick site-visit forms.
 * Saves the lead in Postgres (a booking also opens its project); when the visitor is signed in
 * (ps_session cookie) the lead and project are linked to their account. Answers { ok: true } and
 * never echoes the submitted data.
 * Example: POST /api/leads { "type": "contact", "name": "Asha", "phone": "9876543210", "message": "Shop repaint" } → { "ok": true }
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403, headers: noStore });
  if (bodyTooLarge(req)) return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413, headers: noStore });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    // Honeypot filled: pretend success so bots don't retry.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) {
      return NextResponse.json({ ok: true });
    }
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      fieldErrors[field] ??= issue.message;
    }
    return NextResponse.json({ ok: false, error: "Please check the highlighted fields.", fieldErrors }, { status: 422 });
  }

  const ip = clientIp(req);
  const timer = createTimer();
  // Only valid submissions count, so customers fixing typos aren't locked out.
  if (!(await timer.time("ratelimit", rateLimit(ip)))) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please call us or try again later." }, { status: 429 });
  }

  try {
    // a signed-in visitor's lead (and its project) goes straight into their account
    const session = await timer.time("session", readUserSession(req));
    // Nothing about stored data is sent back to the browser.
    await saveLead(parsed.data, { source: "web", userId: session?.user.id, timer });
    // Step durations only (no lead data): shows in the Vercel logs and the browser's network panel.
    console.info("Lead saved in", JSON.stringify(timer.summary()));
    return NextResponse.json({ ok: true }, { headers: { ...noStore, "Server-Timing": timer.header() } });
  } catch (err) {
    // Log the error type only: never the submitted personal details (a database message can quote them).
    console.error("Failed to save lead:", err instanceof Error ? err.name : "unknown error");
    return NextResponse.json({ ok: false, error: "We couldn't save your request. Please try again or call us." }, { status: 500 });
  }
}
