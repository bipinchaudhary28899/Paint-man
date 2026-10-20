"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { liveCities } from "@/config/site";
import { bookingDateRange } from "@/lib/leads/dates";
import { estimatePaintArea, formatSqft } from "@/lib/leads/estimate";
import { CARPET_AREA_MAX, CARPET_AREA_MIN, floorOptions, homeSizes, propertyTypes, serviceTypes } from "@/lib/leads/options";
import { readTracking } from "./UtmCapture";

type Props = {
  type: "booking" | "contact";
  defaultService?: (typeof serviceTypes)[number];
  defaultMessage?: string;
  /** a short line right under the submit button (BookingSection puts its note there on phones) */
  footnote?: React.ReactNode;
};

// Three layouts: phones get a compact single column (name and mobile stacked, locality and PIN side by
// side), tablets two columns, desktops the roomier spacing. Fields are 48px tall on phones, 50px on
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

/** Fields under "Add more details": an error in one of them opens the section. */
const DETAIL_FIELDS = ["service", "propertyType", "floors", "homeSize", "carpetArea", "preferredDate", "message"];

export function LeadForm({ type, defaultService, defaultMessage, footnote }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // The date picker's range (today in India to a year ahead) is set after mount: the pages with
  // this form are prerendered, so a date worked out while rendering would be the build's date.
  const [dateRange, setDateRange] = useState<{ min: string; max: string }>();
  useEffect(() => setDateRange(bookingDateRange()), []);
  // live rough size of the job, recomputed as floors, service or carpet area change
  const [job, setJob] = useState<{ area: number | null; measuredOnSite: boolean; hasCarpet: boolean }>({ area: null, measuredOnSite: false, hasCarpet: false });
  // "Add more details" starts open only when the page prefilled the note, so the visitor sees it
  const [moreOpen, setMoreOpen] = useState(Boolean(defaultMessage));
  const live = liveCities();
  function onJobChange(e: React.FormEvent<HTMLFormElement>) {
    if (type !== "booking") return;
    const f = e.currentTarget;
    const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "";
    const carpet = Number(get("carpetArea").replace(/[,\s]/g, ""));
    const service = get("service");
    const ok = Number.isInteger(carpet) && carpet >= CARPET_AREA_MIN && carpet <= CARPET_AREA_MAX;
    const area = ok ? estimatePaintArea(carpet, get("floors") || "1", service) : null;
    setJob({ area, measuredOnSite: ok && area === null, hasCarpet: ok });
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
      const fieldErrors: Record<string, string> = json.fieldErrors ?? {};
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).some((k) => DETAIL_FIELDS.includes(k))) setMoreOpen(true);
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
    <form onSubmit={onSubmit} onChange={onJobChange} noValidate className="space-y-3.5 tab:space-y-4 desk:space-y-5">
      <div className={PAIR}>
        <Field id="name" label="Your name" error={errors.name}>
          <input id="name" name="name" autoComplete="name" required maxLength={80} className={FIELD} {...aria("name")} />
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
            className={FIELD}
            {...aria("phone")}
          />
        </Field>
      </div>

      {type === "booking" && (
        <>
          <Field id="address" label="House / flat no., building and street" error={errors.address}>
            <input
              id="address"
              name="address"
              autoComplete="street-address"
              required
              maxLength={200}
              placeholder="e.g. 12, Rose Villa, Nehru Road"
              className={FIELD}
              {...aria("address")}
            />
          </Field>
          <div className="grid grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] gap-2.5 tab:grid-cols-2 tab:gap-4 desk:gap-5">
            <Field id="locality" label={live.length > 1 ? "Locality" : `Locality in ${live[0].name}`} error={errors.locality}>
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
                {live.flatMap((c) => c.areas).map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </Field>
            <Field id="pincode" label="PIN code" error={errors.pincode}>
              <input
                id="pincode"
                name="pincode"
                inputMode="numeric"
                autoComplete="postal-code"
                required
                maxLength={7}
                placeholder="6 digits"
                className={FIELD}
                {...aria("pincode")}
              />
            </Field>
          </div>
          {live.length > 1 && (
            <Field id="city" label="City" error={errors.city}>
              <select id="city" name="city" required defaultValue="" className={FIELD} {...aria("city")}>
                <option value="" disabled>Select</option>
                {live.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Everything about the job is optional: a single wall or a door books as fast as a house.
              A closed <details> still submits its fields, and it works without JavaScript. */}
          <details
            open={moreOpen}
            onToggle={(e) => setMoreOpen(e.currentTarget.open)}
            className="group rounded-pm-md border border-dashed border-line-strong bg-cream-wash desk:rounded-2xl desk:border-solid desk:border-line desk:bg-cream-wash/60"
          >
            <summary className="flex min-h-[50px] cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2 tab:min-h-[52px] tab:px-4 desk:min-h-11 desk:px-5 desk:py-3">
              <span className="text-[15px] desk:text-base">
                <span className="font-bold">Add more details</span> <span className="text-[13px] text-muted tab:text-sm">(optional)</span>
                <span className="hidden text-xs text-muted desk:block">What needs painting, the property and its size, a date, a note</span>
              </span>
              <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[22px] transition group-open:rotate-45 desk:border desk:border-line desk:text-lg">+</span>
            </summary>
            <div className="space-y-3.5 border-t border-line px-3.5 pb-4 pt-3.5 tab:space-y-4 tab:px-4 desk:space-y-5 desk:px-5 desk:pb-5 desk:pt-4">
              <div className={PAIR}>
                <Field id="service" label="What needs painting?" error={errors.service}>
                  <select id="service" name="service" defaultValue={defaultService ?? ""} className={FIELD} {...aria("service")}>
                    <option value="">Select</option>
                    {serviceTypes.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field id="propertyType" label="Property type" error={errors.propertyType}>
                  <select id="propertyType" name="propertyType" defaultValue="" className={FIELD} {...aria("propertyType")}>
                    <option value="">Select</option>
                    {propertyTypes.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className={PAIR}>
                <Field id="floors" label="Floors to paint" error={errors.floors}>
                  <select id="floors" name="floors" defaultValue="" className={FIELD} {...aria("floors")}>
                    <option value="">Select</option>
                    {floorOptions.map((f) => (
                      <option key={f} value={f}>{f === "1" ? "1 floor" : `${f} floors`}</option>
                    ))}
                  </select>
                </Field>
                <Field id="homeSize" label="Home size" error={errors.homeSize}>
                  <select id="homeSize" name="homeSize" defaultValue="" className={FIELD} {...aria("homeSize")}>
                    <option value="">Select</option>
                    {homeSizes.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className={PAIR}>
                <div>
                  <Field id="carpetArea" label="Carpet area per floor (sq ft)" error={errors.carpetArea}>
                    <input
                      id="carpetArea"
                      name="carpetArea"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9, ]*"
                      maxLength={7}
                      placeholder="e.g. 1200"
                      className={FIELD}
                      {...aria("carpetArea")}
                    />
                  </Field>
                  <p className="mt-1.5 text-xs text-muted" aria-live="polite">
                    {job.area !== null
                      ? <>About <strong className="text-ink">{formatSqft(job.area)}</strong> of walls and ceilings to paint, all floors together.</>
                      : job.hasCarpet && job.measuredOnSite
                        ? "Measured on site for this job."
                        : "It's on your sale deed or society papers. Not sure? Leave it blank."}
                  </p>
                </div>
                <Field id="preferredDate" label="Preferred inspection date" error={errors.preferredDate}>
                  <input id="preferredDate" name="preferredDate" type="date" min={dateRange?.min} max={dateRange?.max} className={FIELD} {...aria("preferredDate")} />
                </Field>
              </div>
              <Field id="message" label="Anything we should know?" error={errors.message}>
                <textarea
                  id="message"
                  name="message"
                  rows={3}
                  maxLength={1000}
                  defaultValue={defaultMessage}
                  placeholder="A single wall, two doors, the balcony grills, a full flat… and any damp or cracks"
                  className={FIELD}
                  {...aria("message")}
                />
              </Field>
            </div>
          </details>
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

      <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60 max-desk:min-h-[54px] max-desk:text-base desk:w-auto">
        {submitting ? "Sending…" : type === "booking" ? "Book my inspection" : "Send message"}
      </button>
      {footnote}
      <p className="text-xs text-muted max-desk:text-center">
        We use your details only to respond to this request. See our{" "}
        <a href="/privacy-policy" className="underline">privacy policy</a>.
      </p>
    </form>
  );
}
