"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { liveCities } from "@/config/site";
import { fieldProblem, isRequiredField, REQUIRED_FIELDS, requiredFieldErrors } from "@/lib/leads/field-checks";
import type { serviceTypes } from "@/lib/leads/options";
import { readTracking } from "./UtmCapture";

type Props = {
  type: "booking" | "contact";
  defaultService?: (typeof serviceTypes)[number];
  defaultMessage?: string;
  /** a short line right under the submit button (BookingSection puts its note there on phones) */
  footnote?: React.ReactNode;
};

// A booking asks only who and where: name, mobile, the city (when we paint in more than one) and the
// area. The address and the job are added afterwards in the customer's account (ProjectSteps) or on
// the call. Three layouts: phones get a compact single column, tablets two columns, desktops the
// roomier spacing. Fields are 48px tall on phones, 50px on
// tablets and the .field default (54px) on desktops.
const FIELD = "field max-tab:px-3 max-tab:py-[11px] tab:max-desk:px-3.5 tab:max-desk:py-3";
/** two fields side by side from tablets up, stacked on phones */
const PAIR = "grid gap-3.5 tab:grid-cols-2 tab:gap-4 desk:gap-5";

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function LeadForm({ type, defaultService, defaultMessage, footnote }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const live = liveCities();
  // with more than one live city the visitor picks it first, and the locality suggestions follow it
  const askCity = live.length > 1;
  const [cityPick, setCityPick] = useState("");
  const requiredFields = type === "booking" && askCity ? ([...REQUIRED_FIELDS.booking, "city"] as const) : REQUIRED_FIELDS[type];
  const localitySuggestions = (live.find((c) => c.slug === cityPick) ? live.filter((c) => c.slug === cityPick) : live).flatMap((c) => c.areas);
  /** Clears a field's error as soon as its value is fine, so the visitor sees the fix land. */
  function clearFixed(target: EventTarget) {
    const { name, value } = target as HTMLInputElement;
    if (!errors[name] || !isRequiredField(name) || fieldProblem(name, value)) return;
    const next = { ...errors };
    delete next[name];
    setErrors(next);
    if (Object.keys(next).length === 0) setFormError("");
  }
  /** Leaving a required field the visitor has typed in checks it there and then (an empty one waits for submit). */
  function onBlurCheck(e: React.FocusEvent<HTMLFormElement>) {
    const { name, value } = e.target as EventTarget as HTMLInputElement;
    if (!isRequiredField(name) || !requiredFields.includes(name) || value.trim() === "") return;
    const problem = fieldProblem(name, value);
    if (problem && errors[name] !== problem) setErrors((prev) => ({ ...prev, [name]: problem }));
  }
  // The thank-you page is static: load it while the visitor fills the form, so it appears
  // the instant the lead is saved.
  useEffect(() => {
    router.prefetch(`/thank-you?type=${type}`);
  }, [router, type]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    // the required fields are checked here first: no round trip to learn a PIN code is short
    const missing = requiredFieldErrors(type, data, requiredFields);
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      setFormError("Please check the highlighted fields.");
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setSubmitting(true);
    setErrors({});
    setFormError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type, page: window.location.pathname, tracking: readTracking() }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        router.push(`/thank-you?type=${type}`);
        return;
      }
      const fieldErrors: Record<string, string> = json.fieldErrors ?? {};
      setErrors(fieldErrors);
      setFormError(json.error ?? "Something went wrong. Please try again.");
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    }
    setSubmitting(false);
  }

  const aria = (name: string) =>
    errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` } : {};

  return (
    <form onSubmit={onSubmit} onChange={(e) => clearFixed(e.target)} onBlur={onBlurCheck} noValidate aria-busy={submitting} className="space-y-3.5 tab:space-y-4 desk:space-y-5">
      <div className={PAIR}>
        <Field id="name" label="Your name" error={errors.name}>
          <input id="name" name="name" autoComplete="name" required maxLength={80} className={FIELD} {...aria("name")} />
        </Field>
        <Field id="phone" label="Mobile number" error={errors.phone}>
          {/* +91 sits inside the field, as Indian forms show it; the number itself is the 10 digits */}
          <div className="relative">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center border-r border-line pl-3 pr-2.5 text-[15px] font-medium text-muted tab:pl-3.5 desk:pl-4">
              +91
            </span>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              required
              placeholder="10-digit mobile"
              maxLength={16}
              className={`${FIELD} !pl-[3.6rem] desk:!pl-[3.9rem]`}
              {...aria("phone")}
            />
          </div>
        </Field>
      </div>

      {type === "booking" && (
        <>
          <div className={askCity ? PAIR : undefined}>
            {askCity && (
              <Field id="city" label="City" error={errors.city}>
                <select id="city" name="city" required value={cityPick} onChange={(e) => setCityPick(e.target.value)} className={FIELD} {...aria("city")}>
                  <option value="" disabled>Select your city</option>
                  {live.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field id="locality" label={askCity ? "Area / locality" : `Area / locality in ${live[0].name}`} error={errors.locality}>
              <input
                id="locality"
                name="locality"
                list="locality-options"
                autoComplete="address-level3"
                required
                maxLength={80}
                placeholder="e.g. Kamla Nagar"
                className={FIELD}
                {...aria("locality")}
              />
              <datalist id="locality-options">
                {localitySuggestions.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </Field>
          </div>
          {/* a service page or a palette/shade link knows part of the job already: it goes along with the booking */}
          {defaultService && <input type="hidden" name="service" value={defaultService} />}
          {defaultMessage && (
            <Field id="message" label="Your note (optional)" error={errors.message}>
              <textarea id="message" name="message" rows={2} maxLength={1000} defaultValue={defaultMessage} className={FIELD} {...aria("message")} />
            </Field>
          )}
          <p className="text-[13px] leading-normal text-muted">
            That&apos;s all we need to call you. Add the address and what needs painting later in your account, or tell us on the call.
          </p>
        </>
      )}

      {type === "contact" && (
        <Field id="message" label="How can we help?" error={errors.message}>
          <textarea
            id="message"
            name="message"
            rows={4}
            maxLength={1000}
            defaultValue={defaultMessage}
            required
            className={FIELD}
            {...aria("message")}
          />
        </Field>
      )}

      {/* Honeypot for bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {formError && (
        <p role="alert" className="rounded-lg bg-peach-wash p-3 text-sm font-semibold text-danger">
          {formError}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full max-desk:min-h-[54px] max-desk:text-base desk:w-auto">
        {submitting && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />}
        {submitting ? "Sending…" : type === "booking" ? "Book my site visit" : "Send message"}
      </button>
      {footnote}
      <p className="text-xs text-muted max-desk:text-center">
        We use your details only to respond to this request. See our{" "}
        <a href="/privacy-policy" className="underline">privacy policy</a>.
      </p>
    </form>
  );
}
