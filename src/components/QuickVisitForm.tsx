"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { cities, type City } from "@/config/site";
import { readTracking } from "./UtmCapture";

// The quick "Book a site visit" form: name, mobile and city (plus an optional locality in a live
// city). It sits at the top of the home page and on city pages, so a visitor can ask for a visit
// in seconds; the team takes the job details on the call. In a city that is not live yet the
// same request joins that city's waitlist, and the button and thank-you page say so.
export function QuickVisitForm({
  defaultCity = cities[0].slug,
  lockCity = false,
  heading = "Book a free site visit",
  intro = "Zero advance payment and a full estimate before work starts. Leave your number and we call you back.",
}: {
  defaultCity?: string;
  /** On a city page the city is fixed; on the home page the visitor picks it. */
  lockCity?: boolean;
  heading?: string;
  intro?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [city, setCity] = useState(defaultCity);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const chosen: City | undefined = cities.find((c) => c.slug === city);
  const live = chosen?.status === "live";
  const next = live ? "visit" : "waitlist";

  useEffect(() => {
    router.prefetch(`/thank-you?type=${next}`);
  }, [router, next]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, city, type: "visit", page: window.location.pathname, tracking: readTracking() }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        router.push(`/thank-you?type=${next}`);
        return;
      }
      setErrors(json.fieldErrors ?? {});
      setFormError(json.error ?? "Something went wrong. Please try again.");
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    }
    setSubmitting(false);
  }

  const f = (name: string) => `${id}-${name}`;
  const aria = (name: string) => (errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${f(name)}-error` } : {});
  const error = (name: string) =>
    errors[name] ? (
      <p id={`${f(name)}-error`} className="mt-1 text-sm font-semibold text-danger">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby={f("heading")} className="space-y-3">
      <div>
        <h2 id={f("heading")} className="text-2xl font-normal leading-tight">{live ? heading : `Join the ${chosen?.name ?? ""} waitlist`}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {live ? intro : `We're not painting in ${chosen?.name ?? "this city"} yet. Leave your number and we'll call you when bookings open there.`}
        </p>
      </div>
      <div>
        <label htmlFor={f("name")} className="sr-only">Your name</label>
        <input id={f("name")} name="name" autoComplete="name" required maxLength={80} placeholder="Your name" className="field" {...aria("name")} />
        {error("name")}
      </div>
      <div>
        <label htmlFor={f("phone")} className="sr-only">Mobile number</label>
        <div className="flex gap-2">
          <span aria-hidden className="field !w-auto shrink-0 text-muted">+91</span>
          <input id={f("phone")} name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={16} placeholder="10-digit mobile number" className="field min-w-0 flex-1" {...aria("phone")} />
        </div>
        {error("phone")}
      </div>
      {!lockCity && (
        <div>
          <label htmlFor={f("city")} className="sr-only">City</label>
          <select id={f("city")} value={city} onChange={(e) => setCity(e.target.value)} className="field" {...aria("city")}>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.status === "live" ? c.name : `${c.name} (coming soon)`}
              </option>
            ))}
          </select>
          {error("city")}
        </div>
      )}
      {live && (
        <div>
          <label htmlFor={f("locality")} className="sr-only">Locality (optional)</label>
          <input id={f("locality")} name="locality" maxLength={80} placeholder={`Locality in ${chosen?.name} (optional)`} list={f("areas")} className="field" />
          <datalist id={f("areas")}>
            {chosen?.areas.map((a) => <option key={a} value={a} />)}
          </datalist>
        </div>
      )}
      {/* Honeypot for bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={f("website")}>Website</label>
        <input id={f("website")} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {formError && (
        <p role="alert" className="rounded-lg bg-peach-wash p-3 text-sm font-semibold text-danger">
          {formError}
        </p>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
        {submitting ? "Sending…" : live ? "Book site visit" : "Join the waitlist"}
      </button>
      <p className="text-xs text-muted">
        We use your details only to call you back. See our <a href="/privacy-policy" className="underline">privacy policy</a>.
      </p>
    </form>
  );
}
