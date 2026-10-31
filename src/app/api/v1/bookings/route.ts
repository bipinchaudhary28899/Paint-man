import type { NextRequest } from "next/server";
import { z } from "zod";
import { customerLoginOpen } from "@/config/login";
import { failure, fieldErrors, personalError, personalOk, readJsonBody } from "@/lib/api-personal";
import { bookingGuestLimit, bookingUserLimit, checkLimits, rateLimited } from "@/lib/auth/limits";
import { maskPhone } from "@/lib/auth/otp";
import { requireUser } from "@/lib/auth/user-session";
import { bookingSchema } from "@/lib/leads/schema";
import { saveLead } from "@/lib/leads/store";
import { clientIp } from "@/lib/http";

export const runtime = "nodejs";

const appBookingSchema = bookingSchema.extend({
  location: z
    .object({
      lat: z.number({ message: "lat must be a number" }).min(-90).max(90),
      lng: z.number({ message: "lng must be a number" }).min(-180).max(180),
    })
    .optional(),
});

/**
 * POST /api/v1/bookings (the app; `Authorization: Bearer <token>` required)
 * Books a site inspection for the signed-in customer and opens its project (stage "booked").
 * Body: the website's booking form (src/lib/leads/schema.ts `bookingSchema`): who and where, name
 * and locality (the area) required, city required while we paint in more than one; address,
 * pincode, propertyType, service, preferredDate (YYYY-MM-DD), message, floors, homeSize, carpetArea
 * and `location: { lat, lng }` (a map pin) optional, from older builds: the customer now adds the
 * address and job on the project (PATCH /api/v1/projects/{id}).
 * `phone` may be left out (the account's verified number is used) and must otherwise be that
 * number; `name` defaults to the account's name. `type` is "booking" and may be left out.
 * 5 bookings per account per 10 minutes.
 * While customer login is closed (src/config/login.ts: accounts coming soon), a request with no
 * Authorization header is booked as the website's form books one: `name` and `phone` required, no
 * account, 5 per IP per 10 minutes, and the answer has no projectId (the project shows up in the
 * account of whoever later signs in with that number). Once login is open it is a 401.
 * Errors: 400 invalid_request (details: field → the form's own message), 401 unauthenticated,
 * 413, 415, 429 rate_limited.
 * Example: POST /api/v1/bookings { "name": "Asha Verma", "city": "agra", "locality": "Kamla Nagar" }
 *   → 201 { "kind": "booking", "data": { "received": true, "projectId": "…" } }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req, { bearerOnly: true });
    // a token that fails is always a 401; no token at all is a guest while accounts are coming soon
    const guest = !auth.ok && !req.headers.has("authorization") && !customerLoginOpen();
    if (!auth.ok && !guest) return auth.response;
    const user = auth.ok ? auth.session.user : null;

    const read = await readJsonBody(req);
    if (!read.ok) return read.response;
    if (!read.body || typeof read.body !== "object" || Array.isArray(read.body)) {
      return personalError(400, "invalid_request", "The body must be a JSON object with the booking's fields.");
    }
    const body = read.body as Record<string, unknown>;
    const parsed = appBookingSchema.safeParse({
      ...body,
      type: body.type ?? "booking",
      phone: body.phone ?? user?.phone ?? "",
      name: body.name ?? user?.name ?? "",
      // a missing required field reads as blank, so it gets the form's own message ("Enter your area or locality")
      locality: body.locality ?? "",
    });
    if (!parsed.success) return personalError(400, "invalid_request", "Please check the highlighted fields.", fieldErrors(parsed.error));
    const { location, ...lead } = parsed.data;
    if (user && lead.phone !== user.phone) {
      return personalError(400, "invalid_request", "Please check the highlighted fields.", { phone: `Use the mobile number you signed in with (${maskPhone(user.phone)})` });
    }

    const wait = await checkLimits(user ? [[bookingUserLimit(), user.id]] : [[bookingGuestLimit(), clientIp(req)]]);
    if (wait) return rateLimited(wait);

    const { projectId } = await saveLead(lead, { source: "app", userId: user?.id, location: location ?? null });
    if (!user) {
      return personalOk({
        status: 201,
        kind: "booking",
        label: "Inspection booking received. We call during working hours to fix the visit.",
        data: { received: true },
        links: { self: "/api/v1/bookings", html: "/thank-you?type=booking" },
      });
    }
    return personalOk({
      status: 201,
      kind: "booking",
      label: "Inspection booking received. We call during working hours to fix the visit.",
      data: { received: true, projectId },
      links: { self: "/api/v1/bookings", project: `/api/v1/projects/${projectId}`, html: `/account/projects/${projectId}` },
    });
  } catch (err) {
    return failure(err, "Saving an app booking");
  }
}
