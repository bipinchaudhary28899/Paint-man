import { normalizeMobile, requiredFieldErrors } from "~/shared";
import { FORM_ERROR, submitBooking, type BookingValues, type SubmitResult } from "./booking";

// Every form on the website posts to /api/leads, which accepts same-origin requests only, so none of
// them can send from the app until the owner approves an app endpoint (mobile/README.md). Until then
// each form checks its answers exactly as the website would and reports them as not sent: nothing is
// transmitted or stored. The website has one lead form (LeadForm) in two kinds: booking, and contact
// (the contact page, and the waitlist note on a city coming soon).

/** Whether leads leave the phone (false until the app endpoint exists). */
export const LEADS_ARE_SENT = false;

export type ContactValues = { name: string; phone: string; message: string };

export async function submitContact(values: ContactValues): Promise<SubmitResult> {
  const errors = requiredFieldErrors("contact", values);
  if (Object.keys(errors).length > 0) return { ok: false, errors, message: FORM_ERROR };
  return { ok: true, sent: LEADS_ARE_SENT };
}

/** The JSON a contact request would send (cleaned as the website's schema cleans it). */
export const toContactPayload = (values: ContactValues) => ({
  type: "contact" as const,
  name: values.name.trim(),
  phone: normalizeMobile(values.phone),
  message: values.message.trim(),
  page: "app",
});

export { FORM_ERROR, submitBooking, type BookingValues, type SubmitResult };
