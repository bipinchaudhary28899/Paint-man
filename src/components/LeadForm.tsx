"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { site } from "@/config/site";
import { bookingDateRange } from "@/lib/leads/dates";
import { estimatePaintArea, formatSqft } from "@/lib/leads/estimate";
import { CARPET_AREA_MAX, CARPET_AREA_MIN, floorOptions, homeSizes, propertyTypes, serviceTypes } from "@/lib/leads/options";
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
  // The date picker's range (today in India to a year ahead) is set after mount: the pages with
  // this form are prerendered, so a date worked out while rendering would be the build's date.
  const [dateRange, setDateRange] = useState<{ min: string; max: string }>();
  useEffect(() => setDateRange(bookingDateRange()), []);
  // live rough size of the job, recomputed as floors, service or carpet area change
  const [job, setJob] = useState<{ area: number | null; exterior: boolean; hasCarpet: boolean }>({ area: null, exterior: false, hasCarpet: false });
  function onJobChange(e: React.FormEvent<HTMLFormElement>) {
    if (type !== "booking") return;
    const f = e.currentTarget;
    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "";
    const carpet = Number(get("carpetArea").replace(/[,\s]/g, ""));
    const service = get("service");
    const ok = Number.isInteger(carpet) && carpet >= CARPET_AREA_MIN && carpet <= CARPET_AREA_MAX;
    setJob({ area: ok ? estimatePaintArea(carpet, get("floors") || "1", service) : null, exterior: service === "Exterior Painting", hasCarpet: ok });
  }
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
    <form onSubmit={onSubmit} onChange={onJobChange} noValidate className="space-y-5">
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
                list="locality-options"
                required
                maxLength={80}
                placeholder="e.g. Kamla Nagar"
                className="field"
                {...aria("locality")}
              />
              <datalist id="locality-options">
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
              <input id="preferredDate" name="preferredDate" type="date" min={dateRange?.min} max={dateRange?.max} className="field" {...aria("preferredDate")} />
            </Field>
          </div>

          {/* Size of the job: lets the team plan a crew before the visit */}
          <fieldset className="rounded-2xl border border-line bg-cream-wash/60 p-4 sm:p-5">
            <legend className="px-1 text-sm font-bold">Size of the job</legend>
            <p className="-mt-1 mb-4 text-xs text-muted">Helps us plan the right crew. The inspector measures exactly on site.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="floors" label="Floors to paint" error={errors.floors}>
                <select id="floors" name="floors" required defaultValue="" className="field" {...aria("floors")}>
                  <option value="" disabled>Select</option>
                  {floorOptions.map((f) => (
                    <option key={f} value={f}>{f === "1" ? "1 floor" : `${f} floors`}</option>
                  ))}
                </select>
              </Field>
              <Field id="homeSize" label="Home size" error={errors.homeSize}>
                <select id="homeSize" name="homeSize" required defaultValue="" className="field" {...aria("homeSize")}>
                  <option value="" disabled>Select</option>
                  {homeSizes.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-5">
              <Field id="carpetArea" label="Carpet area per floor (sq ft)" optional error={errors.carpetArea}>
                <input
                  id="carpetArea"
                  name="carpetArea"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9, ]*"
                  maxLength={7}
                  placeholder="e.g. 1200"
                  className="field"
                  {...aria("carpetArea")}
                />
              </Field>
              <p className="mt-1.5 text-xs text-muted" aria-live="polite">
                {job.area !== null
                  ? <>About <strong className="text-ink">{formatSqft(job.area)}</strong> of walls and ceilings to paint, all floors together.</>
                  : job.hasCarpet && job.exterior
                    ? "Exterior walls are measured on site."
                    : "It's on your sale deed or society papers. Not sure? Leave it blank."}
              </p>
            </div>
          </fieldset>
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
