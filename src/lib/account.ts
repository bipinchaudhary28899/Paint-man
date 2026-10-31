import { site } from "@/config/site";
import type { ProjectStage } from "@/lib/projects/stages";

// Plain helpers for the customer's account pages (/login, /account, the project tracker) and the
// quotation PDF. No server imports, so client components can use them too.

/**
 * The readable sign-in hint cookie the verify endpoint sets beside the httpOnly session cookie
 * (src/lib/auth/user-session.ts `SIGNED_IN_COOKIE`). It holds no personal data; static pages read it
 * in the browser to show "My account" instead of "Log in" without asking the server.
 */
export const SIGNED_IN_HINT = "ps_signed_in";

/** True when a `document.cookie` string carries the sign-in hint. */
export function hasSignedInHint(cookie: string): boolean {
  return cookie.split(";").some((part) => {
    const [name, ...value] = part.trim().split("=");
    return name === SIGNED_IN_HINT && value.join("=") !== "";
  });
}

export const ACCOUNT_PATH = "/account";
export const LOGIN_PATH = "/login";

/** The login page, coming back to `next` afterwards. */
export const loginHref = (next: string = ACCOUNT_PATH) => `${LOGIN_PATH}?${new URLSearchParams({ next })}`;

const PROBE_ORIGIN = "https://paintsaathi.invalid";

/**
 * Where to go after signing in: `raw` when it is a path on this site, else `fallback`. Refuses
 * other sites in every disguise (`//evil.com`, `/\evil.com`, `https://…`, control characters), the
 * API and the login page itself (no loop).
 */
export function safeNextPath(raw: string | null | undefined, fallback: string = ACCOUNT_PATH): string {
  if (!raw || raw.length > 512 || !raw.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(raw)) return fallback;
  let url: URL;
  try {
    url = new URL(raw, PROBE_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PROBE_ORIGIN) return fallback;
  if (url.pathname === LOGIN_PATH || url.pathname.startsWith("/api/")) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

const IST = "Asia/Kolkata";
const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** "31 Oct 2026" in India time, from an ISO timestamp or a calendar date (YYYY-MM-DD). */
export function formatDate(value: string | Date): string {
  const at = typeof value === "string" && DAY_ONLY.test(value) ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
  return at.toLocaleDateString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric" });
}

/** "31 Oct 2026, 11:30 am" in India time. */
export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-IN", { timeZone: IST, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** "+91 98765 43210" for a 10-digit Indian mobile; anything else is shown as it is. */
export function formatMobile(phone: string): string {
  return /^\d{10}$/.test(phone) ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

/** "Kamla Nagar, Agra": the parts that are known, in order. */
export const placeLine = (...parts: (string | null | undefined)[]) => parts.filter((p): p is string => Boolean(p && p.trim())).join(", ");

/** "Paint-Saathi-quotation-v2.pdf": a quotation PDF's file name (the download and the API's Content-Disposition). */
export const quotationFilename = (version: number) => `${site.name.replace(/\s+/g, "-")}-quotation-v${version}.pdf`;

export type QuotationStatus = "draft" | "sent" | "approved" | "declined" | "superseded";

/** How each quotation status reads to the customer. */
export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "For your review",
  approved: "Approved",
  declined: "Declined",
  superseded: "Replaced by a newer version",
};

/**
 * What happens after each stage, in the site's own promises (src/config/site.ts `promises`,
 * `workFlow`): a call during working hours, the inspection, an itemised quotation approved before
 * anything starts, supervised painting, a walkthrough at handover.
 */
export const NEXT_STEPS: Record<ProjectStage, string> = {
  booked: `We call you during working hours (${site.hoursDisplay}) to understand the job and fix a time for the site inspection.`,
  call_confirmed: "Our inspector visits at the agreed time: measures the walls, checks for damp and cracks, and brings shade cards.",
  inspection_scheduled: "The inspector measures and checks every wall. Your itemised quotation follows after the visit.",
  inspected: "We prepare your itemised quotation: each wall, door or grill, the preparation, the paint and its coats, and how long it takes.",
  quotation_shared: "Review the quotation below. Nothing starts until you approve it, and there is no advance payment.",
  price_finalised: "We fix the crew's start date with you.",
  work_scheduled: "The crew covers floors and furniture, does the preparation the quotation lists, then paints.",
  in_progress: "A supervisor checks each stage. At the end you walk through every item against the quotation.",
  completed: "The job is closed. If anything needs attention, tell us.",
  on_hold: "We pick up again when you are ready. Tell us when.",
  cancelled: "Want to start again? Book a new inspection.",
};
