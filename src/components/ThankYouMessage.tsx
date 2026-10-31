"use client";

import { bookingSteps, site } from "@/config/site";
import { TrackBookingInvite } from "./account/AccountLink";
import { useUrlQuery } from "./useUrlQuery";

// The heading and line that depend on which form was sent (?type=booking|visit|waitlist|contact). Read in the
// browser so the thank-you page itself can be static and served instantly from the CDN; the
// server HTML shows the booking wording and hydrates in place (no client-render bailout).
export function ThankYouMessage() {
  const type = useUrlQuery().get("type");
  if (type === "waitlist") {
    return (
      <>
        <h1 className="mt-6 text-3xl font-normal text-brand-900">You&apos;re on the waitlist</h1>
        <p className="mt-4 text-lg text-muted">We&apos;ll call you as soon as we start painting in your city.</p>
      </>
    );
  }
  const booking = type !== "contact";
  return (
    <>
      <h1 className="mt-6 text-3xl font-normal text-brand-900">
        {booking ? "Your inspection request is in" : "Thanks for your message"}
      </h1>
      <p className="mt-4 text-lg text-muted">
        Shukriya!{" "}
        {booking
          ? "Our team will call you shortly to confirm a time for the site visit."
          : "We'll get back to you as soon as possible."}{" "}
        Hours: {site.hoursDisplay}.
      </p>
      {booking && (
        // What happens from here, so the visitor knows the next step is ours (the booking steps after "fill in the form")
        <section aria-labelledby="next-steps" className="mx-auto mt-8 max-w-md rounded-[20px] border border-line-soft bg-paper p-5 text-left tab:p-6">
          <h2 id="next-steps" className="!font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted">Aage kya hoga · What happens next</h2>
          <ol className="mt-4 space-y-4">
            {bookingSteps.slice(1).map((s, i) => (
              <li key={s.title} className="flex gap-3.5">
                <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand text-sm font-semibold">{i + 1}</span>
                <span>
                  <span className="block font-semibold">{s.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {/* follow the booking in the account: log in with the same number, or straight there when signed in */}
      {booking && <TrackBookingInvite />}
    </>
  );
}
