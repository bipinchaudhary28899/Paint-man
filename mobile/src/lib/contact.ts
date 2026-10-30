import { site } from "~/shared";

// Call and WhatsApp, from the business details in the website's src/config/site.ts. A channel with
// no number there is not offered at all, as on the website (empty values are hidden).

export type ContactLink = { kind: "call" | "whatsapp"; label: string; url: string };

type Details = { phone: string; whatsapp: string };

/** "tel:+919XXXXXXXXX" from an E.164 number (spaces dropped). */
export const telUrl = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

/** A wa.me link to the number (digits only), with an optional first message. */
export function whatsappUrl(number: string, text?: string): string {
  const url = `https://wa.me/${number.replace(/\D/g, "")}`;
  return text ? `${url}?text=${encodeURIComponent(text)}` : url;
}

/** The ways to reach us that have a number filled in, call first. */
export function contactLinks(details: Details = site, text = `Hi ${site.name}, I'd like to get my home painted.`): ContactLink[] {
  const links: ContactLink[] = [];
  if (details.phone.trim()) links.push({ kind: "call", label: "Call us", url: telUrl(details.phone) });
  if (details.whatsapp.replace(/\D/g, "")) links.push({ kind: "whatsapp", label: "WhatsApp us", url: whatsappUrl(details.whatsapp, text) });
  return links;
}
