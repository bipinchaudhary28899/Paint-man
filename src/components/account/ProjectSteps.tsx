"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { bookingDateRange } from "@/lib/leads/dates";
import { fieldProblem } from "@/lib/leads/field-checks";
import { floorOptions, homeSizes, propertyTypes, serviceTypes } from "@/lib/leads/options";
import { detailSteps, stepsProgress, type DetailStepKey, type ProjectDetailsFields } from "@/lib/projects/details";

// "Steps to complete" on the project page, until the inspection: the booking asked only who and
// where, so the customer adds the address the inspector visits and tells us about the job here.
// One step's form is open at a time (the first one not done); a done step shows what was given,
// with Edit. Saving sends the step's fields to PATCH /api/v1/projects/{id} and refreshes the page.

type Props = { projectId: string; details: ProjectDetailsFields };
type Errors = Record<string, string>;

const FIELD = "field max-tab:px-3 max-tab:py-[11px]";
const PAIR = "grid gap-3.5 tab:grid-cols-2 tab:gap-4";

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Choice({ id, label, values, value, error, aria }: { id: string; label: string; values: readonly string[]; value: string | null; error?: string; aria: object }) {
  return (
    <Field id={id} label={label} error={error}>
      <select id={id} name={id} defaultValue={value ?? ""} className={FIELD} {...aria}>
        <option value="">Select</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {id === "floors" ? (v === "1" ? "1 floor" : `${v} floors`) : v}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** What a done step says it has. */
function summary(key: DetailStepKey, d: ProjectDetailsFields): string {
  if (key === "address") return [d.address, d.locality, d.pincode].filter(Boolean).join(", ");
  return [d.service, d.propertyType, d.homeSize, d.preferredDate && `visit from ${d.preferredDate}`].filter(Boolean).join(" · ");
}

export function ProjectSteps({ projectId, details: initial }: Props) {
  const router = useRouter();
  const [details, setDetails] = useState(initial);
  const steps = detailSteps(details);
  const progress = stepsProgress(steps);
  const [open, setOpen] = useState<DetailStepKey | null>(steps.find((s) => !s.done)?.key ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [dateRange, setDateRange] = useState<{ min: string; max: string }>();
  useEffect(() => setDateRange(bookingDateRange()), []);

  const aria = (name: string) => (errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${name}-error` } : {});

  function edit(key: DetailStepKey) {
    setErrors({});
    setFormError("");
    setOpen(key);
  }

  async function save(e: FormEvent<HTMLFormElement>, key: DetailStepKey) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form)) as Record<string, string>;
    // the address step needs both its parts; the booking form's own checks and words
    const missing: Errors = {};
    if (key === "address") {
      for (const f of ["address", "locality", "pincode"] as const) {
        const problem = fieldProblem(f, values[f] ?? "");
        if (problem) missing[f] = problem;
      }
    } else if (!values.service) missing.service = "Choose what needs painting";
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      setFormError("Please check the highlighted fields.");
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    setErrors({});
    setFormError("");
    try {
      const res = await fetch(`/api/v1/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.data) {
        const next: ProjectDetailsFields = { ...details, ...pick(json.data) };
        setDetails(next);
        setOpen(detailSteps(next).find((s) => !s.done)?.key ?? null);
        router.refresh();
      } else {
        setErrors(json.error?.details && typeof json.error.details === "object" ? json.error.details : {});
        setFormError(json.error?.message ?? json.label ?? "Something went wrong. Please try again.");
        requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      }
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    }
    setSaving(false);
  }

  const buttons = (
    <div className="flex flex-wrap items-center gap-3">
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Saving…" : "Save"}
      </button>
      {steps.find((s) => s.key === open)?.done && (
        <button type="button" onClick={() => setOpen(null)} className="btn-secondary">
          Cancel
        </button>
      )}
    </div>
  );
  const alert = formError && (
    <p role="alert" className="rounded-lg bg-peach-wash p-3 text-sm font-semibold text-danger">
      {formError}
    </p>
  );

  return (
    <section aria-labelledby="steps-heading" className="rounded-pm-2xl border border-line-soft bg-paper p-5 tab:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="steps-heading" className="text-[28px] leading-tight tab:text-3xl">
          Steps to <em>complete</em>
        </h2>
        <p className="text-sm font-semibold text-muted">{progress.label}</p>
      </div>
      <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream-wash">
        <div className="h-full rounded-full bg-terracotta transition-[width] motion-reduce:transition-none" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        {progress.done === progress.total
          ? "All done. You can still change these until the inspector visits."
          : "Your booking had just the essentials. Add these before the inspection, so the inspector comes prepared."}
      </p>

      <ol className="mt-5 space-y-3">
        {steps.map((step, i) => (
          <li key={step.key} className="rounded-pm-lg border border-line-soft p-4 tab:p-5">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className={`flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm ${step.done ? "bg-sage-deep text-on-ink" : "border border-line-strong text-terracotta"}`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-normal leading-snug">
                  {step.title}
                  <span className="sr-only">{step.done ? " (done)" : " (to do)"}</span>
                </h3>
                {open !== step.key && (
                  <>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{step.done ? summary(step.key, details) : step.text}</p>
                    <button type="button" onClick={() => edit(step.key)} className="mt-2 inline-flex min-h-11 items-center font-semibold text-terracotta underline underline-offset-4">
                      {step.done ? "Edit" : step.key === "address" ? "Add the address" : "Add the job details"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {open === step.key && step.key === "address" && (
              <form onSubmit={(e) => save(e, "address")} noValidate aria-label={step.title} className="mt-4 space-y-3.5">
                <Field id="address" label="House / flat no., building and street" error={errors.address}>
                  <input id="address" name="address" autoComplete="street-address" maxLength={200} defaultValue={details.address ?? ""} placeholder="e.g. 12, Rose Villa, Nehru Road" className={FIELD} {...aria("address")} />
                </Field>
                <div className="grid grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] gap-2.5 tab:grid-cols-2 tab:gap-4">
                  <Field id="locality" label="Area / locality" error={errors.locality}>
                    <input id="locality" name="locality" autoComplete="address-level3" maxLength={80} defaultValue={details.locality ?? ""} className={FIELD} {...aria("locality")} />
                  </Field>
                  <Field id="pincode" label="PIN code" error={errors.pincode}>
                    <input id="pincode" name="pincode" inputMode="numeric" autoComplete="postal-code" maxLength={7} defaultValue={details.pincode ?? ""} placeholder="6 digits" className={FIELD} {...aria("pincode")} />
                  </Field>
                </div>
                {alert}
                {buttons}
              </form>
            )}

            {open === step.key && step.key === "job" && (
              <form onSubmit={(e) => save(e, "job")} noValidate aria-label={step.title} className="mt-4 space-y-3.5">
                <div className={PAIR}>
                  <Choice id="service" label="What needs painting?" values={serviceTypes} value={details.service} error={errors.service} aria={aria("service")} />
                  <Choice id="propertyType" label="Property type (optional)" values={propertyTypes} value={details.propertyType} error={errors.propertyType} aria={aria("propertyType")} />
                </div>
                <div className={PAIR}>
                  <Choice id="floors" label="Floors to paint (optional)" values={floorOptions} value={details.floors} error={errors.floors} aria={aria("floors")} />
                  <Choice id="homeSize" label="Home size (optional)" values={homeSizes} value={details.homeSize} error={errors.homeSize} aria={aria("homeSize")} />
                </div>
                <div className={PAIR}>
                  <Field id="carpetArea" label="Carpet area per floor, sq ft (optional)" error={errors.carpetArea} hint="It's on your sale deed or society papers.">
                    <input id="carpetArea" name="carpetArea" inputMode="numeric" maxLength={7} defaultValue={details.carpetArea ?? ""} placeholder="e.g. 1200" className={FIELD} {...aria("carpetArea")} />
                  </Field>
                  <Field id="preferredDate" label="Good day for the visit (optional)" error={errors.preferredDate}>
                    <input id="preferredDate" name="preferredDate" type="date" min={dateRange?.min} max={dateRange?.max} defaultValue={details.preferredDate ?? ""} className={FIELD} {...aria("preferredDate")} />
                  </Field>
                </div>
                <Field id="notes" label="Anything we should know? (optional)" error={errors.notes}>
                  <textarea id="notes" name="notes" rows={3} maxLength={1000} defaultValue={details.notes ?? ""} placeholder="A single wall, two doors, the balcony grills… and any damp or cracks" className={FIELD} {...aria("notes")} />
                </Field>
                {alert}
                {buttons}
              </form>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

const KEYS = ["address", "locality", "pincode", "service", "propertyType", "floors", "homeSize", "carpetArea", "preferredDate", "notes"] as const;

/** The details fields of the API's project. */
function pick(data: Record<string, unknown>): Partial<ProjectDetailsFields> {
  return Object.fromEntries(KEYS.filter((k) => k in data).map((k) => [k, data[k]]));
}
