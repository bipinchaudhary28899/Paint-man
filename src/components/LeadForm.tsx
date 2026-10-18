"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { site } from "@/config/site";
import { propertyTypes, serviceTypes } from "@/lib/leads/options";
import { readTracking } from "./UtmCapture";

type Props = { type: "booking" | "contact"; defaultService?: (typeof serviceTypes)[number]; defaultMessage?: string };

function Field({
  id,
  label,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
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

export function LeadForm({ type, defaultService, defaultMessage }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  // The thank-you page is static: load it while the visitor fills the form, so it appears
  // the instant the lead is saved.
  useEffect(() => {
    router.prefetch(`/thank-you?type=${type}`);
  }, [router, type]);

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
        body: JSON.stringify({ ...data, type, page: window.location.pathname, tracking: readTracking() }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        router.push(`/thank-you?type=${type}`);
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

  const aria = (name: string) =>
    errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` } : {};

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Your name" error={errors.name}>
          <input id="name" name="name" autoComplete="name" required maxLength={80} className="field" {...aria("name")} />
        </Field>
        <Field id="phone" label="Mobile number" error={errors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="10-digit mobile"
            maxLength={16}
            className="field"
            {...aria("phone")}
          />
        </Field>
      </div>

      {type === "booking" && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="locality" label={`Locality in ${site.city}`} error={errors.locality}>
              <input
                id="locality"
                name="locality"
                list="localities"
                required
                maxLength={80}
                placeholder="e.g. Kamla Nagar"
                className="field"
                {...aria("locality")}
              />
              <datalist id="localities">
                {site.areas.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </Field>
            <Field id="propertyType" label="Property type" error={errors.propertyType}>
              <select id="propertyType" name="propertyType" required defaultValue="" className="field" {...aria("propertyType")}>
                <option value="" disabled>Select</option>
                {propertyTypes.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="service" label="Service needed" error={errors.service}>
              <select id="service" name="service" required defaultValue={defaultService ?? ""} className="field" {...aria("service")}>
                <option value="" disabled>Select</option>
                {serviceTypes.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field id="preferredDate" label="Preferred inspection date" optional error={errors.preferredDate}>
              <input id="preferredDate" name="preferredDate" type="date" min={today} className="field" {...aria("preferredDate")} />
            </Field>
          </div>
        </>
      )}

      <Field
        id="message"
        label={type === "booking" ? "Anything we should know?" : "How can we help?"}
        optional={type === "booking"}
        error={errors.message}
      >
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={1000}
          defaultValue={defaultMessage}
          required={type === "contact"}
          placeholder={type === "booking" ? "Rooms to paint, wall problems like dampness or cracks…" : ""}
          className="field"
          {...aria("message")}
        />
      </Field>

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

      <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto disabled:opacity-60">
        {submitting ? "Sending…" : type === "booking" ? "Book my inspection" : "Send message"}
      </button>
      <p className="text-xs text-muted">
        We use your details only to respond to this request. See our{" "}
        <a href="/privacy-policy" className="underline">privacy policy</a>.
      </p>
    </form>
  );
}
