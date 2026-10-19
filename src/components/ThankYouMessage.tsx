"use client";

import { site } from "@/config/site";
import { useUrlQuery } from "./useUrlQuery";

// The heading and line that depend on which form was sent (?type=booking|contact). Read in the
// browser so the thank-you page itself can be static and served instantly from the CDN; the
// server HTML shows the booking wording and hydrates in place (no client-render bailout).
export function ThankYouMessage() {
  const booking = useUrlQuery().get("type") !== "contact";
  return (
    <>
      <h1 className="mt-6 text-3xl font-normal text-brand-900">
        {booking ? "Your inspection request is in" : "Thanks for your message"}
      </h1>
      <p className="mt-4 text-lg text-muted">
        {booking
          ? "Our team will call you shortly to confirm a time for the site visit."
          : "We'll get back to you as soon as possible."}{" "}
        Hours: {site.hoursDisplay}.
      </p>
    </>
  );
}
