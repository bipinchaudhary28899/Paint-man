import type { NextRequest } from "next/server";
import { failure, fieldErrors, personalError, personalOk, readJsonBody } from "@/lib/api-personal";
import { checkLimits, messageIpLimit, rateLimited } from "@/lib/auth/limits";
import { clientIp, isSameOrigin } from "@/lib/http";
import { contactSchema } from "@/lib/leads/schema";
import { saveLead } from "@/lib/leads/store";

export const runtime = "nodejs";

/**
 * POST /api/v1/messages (the app's contact form and a coming-soon city's waitlist)
 * Sends a message to the team, saved as a contact lead, as the website's contact form does
 * (/api/leads, same-origin). No account is needed. Answers without echoing what was sent.
 * Body: the website's contact form (src/lib/leads/schema.ts `contactSchema`): `name` (2–80
 * characters), `phone` (an Indian mobile, any common spelling), `message` (5–1000 characters);
 * `page` (where it was sent from) optional; `website` is a honeypot that must stay empty.
 * `type` is "contact" and may be left out.
 * Requests from another site's pages are refused; 5 messages per IP per 10 minutes.
 * Errors: 400 invalid_request (details: field → the form's own message), 403 forbidden, 413, 415,
 * 429 rate_limited.
 * Example: POST /api/v1/messages { "name": "Asha Verma", "phone": "9876543210", "message": "Please add me to the Delhi NCR waitlist." }
 *   → 201 { "kind": "contact-message", "data": { "received": true } }
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return personalError(403, "forbidden", "Messages are sent from Paint Saathi's own website and app.");
    const read = await readJsonBody(req);
    if (!read.ok) return read.response;
    if (!read.body || typeof read.body !== "object" || Array.isArray(read.body)) {
      return personalError(400, "invalid_request", "The body must be a JSON object with the message's fields.");
    }
    const body = read.body as Record<string, unknown>;
    const parsed = contactSchema.safeParse({ ...body, type: body.type ?? "contact", name: body.name ?? "", message: body.message ?? "" });
    const received = () =>
      personalOk({
        status: 201,
        kind: "contact-message",
        label: "Message received. We reply during working hours.",
        data: { received: true },
        links: { self: "/api/v1/messages", html: "/contact" },
      });
    if (!parsed.success) {
      // a filled honeypot is a bot: it is told the message went, so it does not try again
      if (parsed.error.issues.some((i) => i.path[0] === "website")) return received();
      return personalError(400, "invalid_request", "Please check the highlighted fields.", fieldErrors(parsed.error));
    }

    const wait = await checkLimits([[messageIpLimit(), clientIp(req)]]);
    if (wait) return rateLimited(wait);

    await saveLead(parsed.data, { source: "app" });
    return received();
  } catch (err) {
    return failure(err, "Saving an app message");
  }
}
