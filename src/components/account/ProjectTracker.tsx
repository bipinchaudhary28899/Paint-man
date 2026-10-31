import Link from "next/link";
import { site } from "@/config/site";
import { formatDate, formatDateTime, NEXT_STEPS, QUOTATION_STATUS_LABELS, quotationFilename } from "@/lib/account";
import { formatPaise } from "@/lib/money";
import type { Inspection, ProjectDetail, Quotation, TimelineEvent } from "@/lib/projects/repo";
import { formatVisit, type StageStep } from "@/lib/projects/stages";

// The project tracker (/account/projects/[id]): where the project stands and what happens next, the
// stage stepper, the inspection, the quotations (itemised, with the PDF), the final price once
// approved, the updates from our team and how to reach us. Server-rendered: readable with JS off.

const sectionHeading = "text-[28px] leading-tight tab:text-3xl";

/** The current stage, its explanation and what happens next; the final price beside it once agreed. */
export function ProjectStatus({ project }: { project: ProjectDetail }) {
  const approved = project.quotations.find((q) => q.status === "approved");
  return (
    <div className={`grid gap-4 ${approved ? "tab:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" : ""}`}>
      <section aria-labelledby="status-now" className="rounded-pm-2xl bg-sand p-5 tab:p-7">
        <p className="eyebrow">Now</p>
        <h2 id="status-now" className="mt-2 text-[28px] leading-tight tab:text-[34px]">
          {project.stageLabel}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed tab:text-base">{project.stageExplanation}</p>
        <p className="mt-4 border-t border-ink/10 pt-4 text-[15px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">What happens next: </span>
          {NEXT_STEPS[project.stage]}
        </p>
        {project.stage === "cancelled" && (
          <Link href="/book" className="btn-primary mt-4">
            Book a new inspection
          </Link>
        )}
      </section>
      {approved && project.finalPricePaise !== undefined && (
        <section aria-labelledby="final-price" className="rounded-pm-2xl bg-sage-deep p-5 text-on-sage tab:p-7">
          <h2 id="final-price" className="text-xs font-semibold uppercase tracking-[0.16em] !font-sans text-on-sage/85">
            Final price
          </h2>
          <p className="mt-2 text-[34px] font-semibold leading-none tracking-tight tab:text-[40px]">{formatPaise(project.finalPricePaise)}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-on-sage/90">
            Quotation version {approved.version}, approved{approved.approvedAt ? ` on ${formatDate(approved.approvedAt)}` : ""}. This is the price for the work it lists.
          </p>
          <a href={approved.pdf} download={quotationFilename(approved.version)} className="mt-4 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
            Download the approved quotation (PDF)
          </a>
        </section>
      )}
    </div>
  );
}

const dot = (step: StageStep) =>
  step.current
    ? "border-terracotta bg-canvas ring-4 ring-terracotta/15 after:absolute after:inset-[5px] after:rounded-full after:bg-terracotta after:content-['']"
    : step.done
      ? "border-sage-deep bg-sage-deep"
      : "border-line-strong bg-canvas";

/** The vertical stepper: every main-line stage, done / current / upcoming, with the date it was reached (the status panel above explains the current one). */
export function StageStepper({ steps }: { steps: StageStep[] }) {
  return (
    <section aria-labelledby="progress" className="card p-5 tab:p-7">
      <h2 id="progress" className={sectionHeading}>
        Your <em>progress</em>
      </h2>
      <ol className="mt-5">
        {steps.map((step, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={step.stage} aria-current={step.current ? "step" : undefined} className="relative flex gap-4 pb-5 last:pb-0">
              {/* the line down to the next step: sage once that step is reached */}
              {!last && <span aria-hidden className={`absolute left-[9px] top-6 bottom-0 w-0.5 rounded-full ${steps[i + 1].done || steps[i + 1].current ? "bg-sage-deep" : "bg-line"}`} />}
              <span aria-hidden className={`relative mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${dot(step)}`} />
              <div className="min-w-0">
                <p className={`leading-snug ${step.current ? "font-semibold text-ink" : step.done ? "text-ink" : "text-muted"}`}>
                  <span className="sr-only">{step.current ? "Current stage: " : step.done ? "Done: " : "Coming up: "}</span>
                  {step.label}
                </p>
                {step.at && <p className="mt-0.5 text-sm text-muted">{formatDate(step.at)}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The site inspection: when, who, whether it happened and what the inspector found. */
export function InspectionCard({ inspection }: { inspection: Inspection | null }) {
  const rows = inspection
    ? [
        inspection.scheduledAt && { label: "Visit", value: formatVisit(inspection.scheduledAt) },
        inspection.inspectorName && { label: "Inspector", value: inspection.inspectorName },
        { label: "Visited", value: inspection.visitedAt ? formatDateTime(inspection.visitedAt) : "Not yet" },
      ].filter((r): r is { label: string; value: string } => Boolean(r))
    : [];
  return (
    <section aria-labelledby="inspection" className="card p-5 tab:p-7">
      <h2 id="inspection" className={sectionHeading}>
        Site <em>inspection</em>
      </h2>
      {!inspection ? (
        <p className="mt-3 text-[15px] leading-relaxed text-muted">Not scheduled yet. We fix the visit time with you on the call, during working hours.</p>
      ) : (
        <>
          <dl className="mt-4 divide-y divide-line-soft border-y border-line-soft">
            {rows.map((r) => (
              <div key={r.label} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2.5 text-[15px]">
                <dt className="text-muted">{r.label}</dt>
                <dd className="font-semibold">{r.value}</dd>
              </div>
            ))}
          </dl>
          {inspection.findings && (
            <div className="mt-4">
              <p className="text-sm font-semibold">What the inspector found</p>
              <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{inspection.findings}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const statusTone: Record<Quotation["status"], string> = {
  draft: "border border-line bg-paper text-muted",
  sent: "bg-golden/35 text-ink",
  approved: "bg-sage-deep text-on-sage",
  declined: "bg-rose-wash text-ink",
  superseded: "border border-line bg-paper text-muted",
};

const grouped = new Intl.NumberFormat("en-IN");
const dash = (
  <>
    <span aria-hidden>–</span>
    <span className="sr-only">not given</span>
  </>
);

/** The itemised lines: a table from tablets up; on phones each line stacks (item and amount, then the details). */
export function QuotationLines({ quotation }: { quotation: Quotation }) {
  return (
    <table className="mt-4 w-full border-collapse text-left text-[15px]">
      <caption className="sr-only">Quotation version {quotation.version}, itemised</caption>
      <thead className="max-tab:sr-only">
        <tr className="border-b border-line text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          <th scope="col" className="py-2 pr-3 font-semibold">Item</th>
          <th scope="col" className="px-3 py-2 text-right font-semibold">Area</th>
          <th scope="col" className="px-3 py-2 text-right font-semibold">Coats</th>
          <th scope="col" className="px-3 py-2 text-right font-semibold">Rate</th>
          <th scope="col" className="py-2 pl-3 text-right font-semibold">Amount</th>
        </tr>
      </thead>
      <tbody>
        {quotation.lines.map((l) => {
          const area = l.areaSqft !== null ? `${grouped.format(l.areaSqft)} sq ft` : null;
          const coats = l.coats !== null ? `${l.coats} coat${l.coats === 1 ? "" : "s"}` : null;
          const rate = l.ratePaise !== null ? formatPaise(l.ratePaise) : null;
          const phoneMeta = [area, coats, rate && `rate ${rate}`].filter(Boolean).join(" · ");
          return (
            <tr key={l.position} className="border-b border-line-soft align-top max-tab:grid max-tab:grid-cols-[minmax(0,1fr)_auto] max-tab:gap-x-4 max-tab:py-3">
              <td className="py-3 pr-3 max-tab:p-0">
                <span className="block font-semibold">{l.item}</span>
                {l.description && <span className="mt-0.5 block text-sm leading-relaxed text-muted">{l.description}</span>}
                {phoneMeta && <span className="mt-1 block text-sm text-muted tab:hidden">{phoneMeta}</span>}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-right tabular-nums max-tab:hidden">{area ?? dash}</td>
              <td className="px-3 py-3 whitespace-nowrap text-right tabular-nums max-tab:hidden">{l.coats ?? dash}</td>
              <td className="px-3 py-3 whitespace-nowrap text-right tabular-nums max-tab:hidden">{rate ?? dash}</td>
              <td className="whitespace-nowrap py-3 pl-3 text-right font-semibold tabular-nums max-tab:col-start-2 max-tab:row-start-1 max-tab:p-0">{formatPaise(l.amountPaise)}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="max-tab:flex max-tab:justify-between">
          <th scope="row" colSpan={4} className="pt-3 text-right font-normal text-muted max-tab:text-left">Subtotal</th>
          <td className="pt-3 pl-3 text-right tabular-nums">{formatPaise(quotation.subtotalPaise)}</td>
        </tr>
        <tr className="max-tab:flex max-tab:items-baseline max-tab:justify-between">
          <th scope="row" colSpan={4} className="pt-2 text-right font-display text-xl font-normal max-tab:text-left">Total</th>
          <td className="pt-2 pl-3 text-right text-xl font-semibold tabular-nums">{formatPaise(quotation.totalPaise)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

/** One version of the quotation: status, dates, the lines (folded away for an old version), notes, terms and the PDF. */
export function QuotationCard({ quotation: q, latest }: { quotation: Quotation; latest: boolean }) {
  const current = latest || q.status === "approved";
  const dates = [q.sentAt && `Sent ${formatDate(q.sentAt)}`, q.approvedAt && `Approved ${formatDate(q.approvedAt)}`, q.validUntil && `Valid until ${formatDate(q.validUntil)}`].filter(Boolean);
  const details = (
    <>
      <QuotationLines quotation={q} />
      {(q.notes || q.paymentTerms) && (
        <dl className="mt-5 grid gap-4 tab:grid-cols-2">
          {q.notes && (
            <div>
              <dt className="text-sm font-semibold">Notes</dt>
              <dd className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{q.notes}</dd>
            </div>
          )}
          {q.paymentTerms && (
            <div>
              <dt className="text-sm font-semibold">Payment terms</dt>
              <dd className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{q.paymentTerms}</dd>
            </div>
          )}
        </dl>
      )}
    </>
  );
  return (
    <article aria-labelledby={`quote-${q.id}`} className={`card p-5 tab:p-7 ${current ? "" : "bg-cream-wash"}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h3 id={`quote-${q.id}`} className="text-2xl leading-tight">
            Quotation, version {q.version}
          </h3>
          {dates.length > 0 && <p className="mt-1 text-sm text-muted">{dates.join(" · ")}</p>}
        </div>
        <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${statusTone[q.status]}`}>{QUOTATION_STATUS_LABELS[q.status]}</span>
      </div>
      {current ? (
        details
      ) : (
        <details className="group mt-3">
          <summary className="flex min-h-11 items-center justify-between gap-3 text-[15px] font-semibold">
            <span>
              Show the {q.lines.length} line{q.lines.length === 1 ? "" : "s"} · total {formatPaise(q.totalPaise)}
            </span>
            <span aria-hidden className="plus text-xl leading-none">+</span>
          </summary>
          {details}
        </details>
      )}
      {q.status === "sent" && (
        <p className="mt-5 rounded-pm-md bg-cream-wash px-4 py-3 text-[15px] leading-relaxed">
          To approve it or ask for changes, tell our team. Nothing starts until you approve it, and there is no advance payment.
        </p>
      )}
      <a href={q.pdf} download={quotationFilename(q.version)} className={`${current ? "btn-primary" : "btn-secondary"} mt-5 w-full tab:w-auto`}>
        Download PDF<span className="sr-only">, quotation version {q.version}</span>
      </a>
    </article>
  );
}

/** Every version the customer has been sent, newest first; until then, what will appear. */
export function QuotationList({ quotations }: { quotations: Quotation[] }) {
  return (
    <section aria-labelledby="quotations">
      <h2 id="quotations" className={sectionHeading}>
        Your <em>quotation</em>
      </h2>
      {quotations.length === 0 ? (
        <p className="card mt-4 p-5 text-[15px] leading-relaxed text-muted tab:p-7">
          Your itemised quotation appears here after the inspection: each wall, door or grill with its preparation, paint, coats and price, and a PDF to keep.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {quotations.map((q, i) => (
            <QuotationCard key={q.id} quotation={q} latest={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}

/** The updates from our team, newest first. */
export function ProjectTimeline({ events }: { events: TimelineEvent[] }) {
  const newestFirst = [...events].reverse();
  return (
    <section aria-labelledby="updates" className="card p-5 tab:p-7">
      <h2 id="updates" className={sectionHeading}>
        <em>Updates</em> from our team
      </h2>
      {newestFirst.length === 0 ? (
        <p className="mt-3 text-[15px] text-muted">No updates yet.</p>
      ) : (
        <ol className="mt-4 divide-y divide-line-soft">
          {newestFirst.map((e, i) => (
            <li key={`${e.at}-${i}`} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm text-muted">
                <time dateTime={e.at}>{formatDateTime(e.at)}</time>
              </p>
              <p className="mt-0.5 font-semibold">{e.label}</p>
              {e.note && <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{e.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** How to reach us about the project: call and WhatsApp once site.ts has them, and the contact page. */
export function ProjectHelp() {
  return (
    <section aria-labelledby="help" className="rounded-pm-2xl border border-dashed border-line-strong p-5 tab:p-7">
      <h2 id="help" className={sectionHeading}>
        Need <em>help</em>?
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">Questions about this project? We answer during working hours: {site.hoursDisplay}.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {site.phone && (
          <a href={`tel:${site.phone}`} className="btn-primary">
            Call {site.phoneDisplay || site.phone}
          </a>
        )}
        {site.whatsapp && (
          <a href={`https://wa.me/${site.whatsapp}`} rel="noopener" className="btn-secondary">
            Chat on WhatsApp
          </a>
        )}
        <Link href="/contact" className="btn-secondary">
          Contact page
        </Link>
      </div>
    </section>
  );
}

/** The whole tracker below the page heading. */
export function ProjectTracker({ project }: { project: ProjectDetail }) {
  return (
    <div className="mt-6 space-y-6 tab:mt-8">
      <ProjectStatus project={project} />
      <div className="grid gap-6 desk:grid-cols-[360px_minmax(0,1fr)] desk:items-start desk:gap-8">
        <div className="space-y-6">
          <StageStepper steps={project.stages} />
          <InspectionCard inspection={project.inspection} />
        </div>
        <div className="space-y-6">
          <QuotationList quotations={project.quotations} />
          <ProjectTimeline events={project.timeline} />
          <ProjectHelp />
        </div>
      </div>
    </div>
  );
}
