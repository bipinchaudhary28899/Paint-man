import { site } from "@/config/site";

// Links to the business WhatsApp, from the number in src/config/site.ts. Used by the website and,
// through mobile/src/shared.ts, the app, so a chat opens with the same first line everywhere.

/** The opening line of a WhatsApp chat started from the site, so nobody faces an empty message box. */
export const WHATSAPP_GREETING = `Hi ${site.name}, I'd like to get my home painted.`;

/** A wa.me link to the business WhatsApp with `text` typed in, or "" when no number is set. */
export function whatsappHref(text: string = WHATSAPP_GREETING): string {
  return site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}` : "";
}
