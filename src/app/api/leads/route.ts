import { after, NextResponse, type NextRequest } from "next/server";
import { leadSchema } from "@/lib/leads/schema";
import { ensureSheetHeader, saveLead, warmLeadStorage } from "@/lib/leads/store";
import { bodyTooLarge, clientIp, isSameOrigin, noStore } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { createTimer } from "@/lib/timing";

export const runtime = "nodejs";

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
  // Fetch the Google access token while the rate limit is checked, not after it.
  warmLeadStorage();
  // Only valid submissions count, so customers fixing typos aren't locked out.
  if (!(await timer.time("ratelimit", rateLimit(ip)))) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please call us or try again later." }, { status: 429 });
  }

  try {
    // Nothing about stored data is sent back to the browser.
    await saveLead(parsed.data, timer);
    // Step durations only (no lead data): shows in the Vercel logs and the browser's network panel.
    console.info("Lead saved in", JSON.stringify(timer.summary()));
    // After the response: keep the sheet's header row current (adds new columns once).
    after(() => ensureSheetHeader().catch((e) => console.error("Sheet header check failed:", e instanceof Error ? e.message.slice(0, 120) : "unknown")));
    return NextResponse.json({ ok: true }, { headers: { ...noStore, "Server-Timing": timer.header() } });
  } catch (err) {
    // Log the error type only: never the submitted personal details.
    console.error("Failed to save lead:", err instanceof Error ? err.message.slice(0, 200) : "unknown error");
    return NextResponse.json({ ok: false, error: "We couldn't save your request. Please try again or call us." }, { status: 500 });
  }
}
