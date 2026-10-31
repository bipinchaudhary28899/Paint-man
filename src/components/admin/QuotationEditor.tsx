"use client";

import { useEffect, useRef, useState } from "react";
import { autoAmount, blankLine, buildQuotationRequest, draftFromLine, draftTotal, type LineDraft } from "@/lib/admin/quotation-form";
import { formatPaise } from "@/lib/money";
import type { AdminQuotation } from "@/lib/projects/repo";
import { ActionStatus } from "./ActionStatus";
import { useAdminAction } from "./useAdminAction";

type Field = Exclude<keyof LineDraft, "key">;

const COLUMNS: { field: Field; label: string; className: string; inputMode?: "numeric" | "decimal" }[] = [
  { field: "item", label: "Item", className: "w-44" },
  { field: "description", label: "Description", className: "w-64" },
  { field: "area", label: "Area (sq ft)", className: "w-24", inputMode: "numeric" },
  { field: "coats", label: "Coats", className: "w-16", inputMode: "numeric" },
  { field: "rate", label: "Rate (₹/sq ft)", className: "w-24", inputMode: "decimal" },
  { field: "amount", label: "Amount (₹)", className: "w-32", inputMode: "decimal" },
];

const MAX_LINES = 100;

/**
 * The editor of a draft quotation: lines (item, description, area, coats, rate, amount; the amount
 * fills in from area × rate and can be typed over), notes, payment terms and validity, with the
 * total live in rupees. Save keeps it as a draft (staff only); Send saves it, then shares it with
 * the customer, after which it can no longer change.
 */
export function QuotationEditor({
  projectId,
  quotation,
  pdfHref,
  onSent,
}: {
  projectId: string;
  quotation: AdminQuotation;
  pdfHref?: string;
  /** Called once the version is sent (the editor then gives way to the read-only view). */
  onSent?: (version: number) => void;
}) {
  const counter = useRef(0);
  const newKey = () => `line-${++counter.current}`;
  const [lines, setLines] = useState<LineDraft[]>(() => (quotation.lines.length ? quotation.lines.map((l) => draftFromLine(l, newKey())) : [blankLine(newKey())]));
  const [notes, setNotes] = useState(quotation.notes ?? "");
  const [paymentTerms, setPaymentTerms] = useState(quotation.paymentTerms ?? "");
  const [validUntil, setValidUntil] = useState(quotation.validUntil ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const action = useAdminAction();
  const url = `/api/admin/projects/${projectId}/quotations/${quotation.id}`;
  const total = draftTotal(lines);

  // a warning before leaving the page with unsaved lines
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touch = () => setDirty(true);
  /** A change handler for one of the text fields under the lines: sets it and marks the form unsaved. */
  const edit = (set: (v: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value);
    touch();
  };

  function update(key: string, field: Field, value: string) {
    setLines((all) =>
      all.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, [field]: value };
        if (field === "area" || field === "rate") next.amount = autoAmount(next.area, next.rate) ?? next.amount;
        return next;
      }),
    );
    touch();
  }

  function move(index: number, by: -1 | 1) {
    setLines((all) => {
      const next = [...all];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
    touch();
  }

  function remove(key: string) {
    setLines((all) => all.filter((l) => l.key !== key));
    touch();
  }

  function add() {
    setLines((all) => [...all, blankLine(newKey())]);
    touch();
  }

  /** Saves the draft; true when it was saved. Before sending, the page is refreshed once, after the send. */
  async function save({ refresh = true } = {}): Promise<boolean> {
    const built = buildQuotationRequest(lines, { notes, paymentTerms, validUntil });
    if (!built.ok) {
      setErrors(built.errors);
      action.setError(null);
      action.setDone("");
      return false;
    }
    setErrors({});
    const result = await action.run("PUT", url, built.request, "Draft saved.", { refresh });
    if (result.ok) setDirty(false);
    return result.ok;
  }

  async function send() {
    if (lines.length === 0) {
      setErrors({ lines: "Add at least one line before sending the quotation." });
      return;
    }
    const ok = window.confirm(
      `Send version ${quotation.version} to the customer? They will see it on their tracker and can download the PDF. It can't be edited after sending (start a new version to revise it).`,
    );
    if (!ok || !(await save({ refresh: false }))) return;
    const sent = await action.run("POST", `${url}/status`, { status: "sent" }, `Version ${quotation.version} sent to the customer.`);
    if (sent.ok) onSent?.(quotation.version);
  }

  const messages = Object.values(errors);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      aria-label={`Edit quotation version ${quotation.version}`}
    >
      {/* relative: the scroll box contains its absolutely placed screen-reader text, so it never widens the page */}
      <div className="relative overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-chalk">
            <tr>
              <th scope="col" className="w-8 px-2 py-2 font-semibold">
                #
              </th>
              {COLUMNS.map((c) => (
                <th key={c.field} scope="col" className={`px-2 py-2 font-semibold ${c.className}`}>
                  {c.label}
                </th>
              ))}
              <th scope="col" className="px-2 py-2 font-semibold">
                <span className="sr-only">Line actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.key} className="border-t border-line align-top">
                <td className="px-2 py-2 pt-4 text-muted">{i + 1}</td>
                {COLUMNS.map((c) => {
                  const error = errors[`${l.key}.${c.field}`];
                  const common = {
                    "aria-label": `Line ${i + 1} ${c.label}`,
                    "aria-invalid": error ? true : undefined,
                    value: l[c.field],
                    className: "field !px-2.5 !py-2",
                  };
                  return (
                    <td key={c.field} className="px-1.5 py-2">
                      {c.field === "description" ? (
                        <textarea {...common} rows={2} maxLength={500} onChange={(e) => update(l.key, c.field, e.target.value)} />
                      ) : (
                        <input
                          {...common}
                          inputMode={c.inputMode}
                          maxLength={c.field === "item" ? 120 : 16}
                          autoComplete="off"
                          onChange={(e) => update(l.key, c.field, e.target.value)}
                          className={`${common.className} ${c.inputMode ? "text-right" : ""}`}
                        />
                      )}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-1.5 py-2">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move line ${i + 1} up`} className="btn-secondary !min-h-11 !px-3 text-sm">
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === lines.length - 1}
                      aria-label={`Move line ${i + 1} down`}
                      className="btn-secondary !min-h-11 !px-3 text-sm"
                    >
                      ↓
                    </button>
                    <button type="button" onClick={() => remove(l.key)} aria-label={`Remove line ${i + 1}`} className="btn-secondary !min-h-11 !px-3 text-sm">
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line">
              <th scope="row" colSpan={6} className="px-3 py-2 text-right font-normal text-muted">
                Subtotal
              </th>
              <td className="whitespace-nowrap px-3 py-2 text-right">{formatPaise(total)}</td>
              <td />
            </tr>
            <tr className="border-t border-line">
              <th scope="row" colSpan={6} className="px-3 py-2 text-right">
                Total
              </th>
              <td className="whitespace-nowrap px-3 py-2 text-right font-display text-lg" aria-live="polite">
                {formatPaise(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={add} disabled={lines.length >= MAX_LINES} className="btn-secondary !min-h-11 !px-4 text-sm">
          Add line
        </button>
        <p className="text-xs text-muted">The amount fills in from area × rate; type over it to set your own.</p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor={`notes-${quotation.id}`} className="mb-1.5 block text-sm font-semibold">
            Notes
          </label>
          <textarea id={`notes-${quotation.id}`} value={notes} onChange={edit(setNotes)} maxLength={2000} rows={3} className="field" />
        </div>
        <div>
          <label htmlFor={`terms-${quotation.id}`} className="mb-1.5 block text-sm font-semibold">
            Payment terms
          </label>
          <textarea id={`terms-${quotation.id}`} value={paymentTerms} onChange={edit(setPaymentTerms)} maxLength={1000} rows={3} className="field" />
        </div>
        <div>
          <label htmlFor={`valid-${quotation.id}`} className="mb-1.5 block text-sm font-semibold">
            Valid until
          </label>
          <input
            id={`valid-${quotation.id}`}
            type="date"
            value={validUntil}
            onChange={edit(setValidUntil)}
            aria-invalid={errors.validUntil ? true : undefined}
            className="field w-auto"
          />
        </div>
      </div>

      {messages.length > 0 && (
        <ul role="alert" className="mt-4 list-disc space-y-1 rounded-xl bg-peach-wash py-3 pl-8 pr-3 text-sm font-semibold text-danger">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={action.busy} className="btn-secondary !min-h-11 !px-5 text-sm">
          {action.busy ? "Saving…" : "Save draft"}
        </button>
        <button type="button" onClick={send} disabled={action.busy} className="btn-primary !min-h-11 !px-5 text-sm">
          Send to customer
        </button>
        {pdfHref && (
          <a href={pdfHref} target="_blank" rel="noopener" className="text-sm font-semibold text-tangerine-text underline">
            Preview PDF{dirty ? " (last saved)" : ""}
          </a>
        )}
        {dirty && <span className="text-xs text-muted">Unsaved changes</span>}
      </div>
      <div className="mt-3">
        <ActionStatus error={action.error} done={action.done} />
      </div>
    </form>
  );
}
