"use client";

import { useState } from "react";
import { formatPaise } from "@/lib/money";
import type { AdminQuotation } from "@/lib/projects/repo";
import { ActionStatus } from "./ActionStatus";
import { QuotationEditor } from "./QuotationEditor";
import { QuotationStatusPill, QuotationView } from "./QuotationView";
import { useAdminAction } from "./useAdminAction";

/**
 * The project's quotations: every version with its status and total (newest first), a new version
 * (a copy of the latest) when none is in draft, the editor for the draft and a read-only view of the
 * others, with the customer's answer (approved / declined) recorded on a sent version.
 * `pdf` turns on the "Preview PDF" link (the admin PDF route).
 */
export function QuotationsPanel({ projectId, quotations, pdf = false }: { projectId: string; quotations: AdminQuotation[]; pdf?: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const create = useAdminAction();
  const answer = useAdminAction();
  const selected = quotations.find((q) => q.id === selectedId) ?? quotations[0];
  const latest = quotations[0];
  const hasDraft = quotations.some((q) => q.status === "draft");
  const base = `/api/admin/projects/${projectId}/quotations`;
  const pdfHref = (id: string) => (pdf ? `${base}/${id}/pdf` : undefined);

  async function startVersion() {
    const result = await create.run<{ id: string; version: number }>("POST", base, undefined, latest ? `Version ${latest.version + 1} started from version ${latest.version}.` : "Version 1 started.");
    if (result.ok) setSelectedId(result.data.id);
  }

  async function record(q: AdminQuotation, status: "approved" | "declined") {
    create.setDone("");
    const question =
      status === "approved"
        ? `Mark version ${q.version} approved? The price becomes final (${formatPaise(q.totalPaise)}), other sent versions are superseded and the project moves to “Price finalised”.`
        : `Mark version ${q.version} declined by the customer?`;
    if (!window.confirm(question)) return;
    await answer.run("POST", `${base}/${q.id}/status`, { status }, status === "approved" ? `Version ${q.version} approved: the price is final.` : `Version ${q.version} marked declined.`);
  }

  return (
    <section aria-labelledby="quotations-heading" className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="quotations-heading" className="font-display text-xl font-normal">
          Quotations
        </h2>
        {!hasDraft && (
          <button type="button" onClick={startVersion} disabled={create.busy} className="btn-primary !min-h-11 !px-5 text-sm">
            {create.busy ? "Starting…" : latest ? `New version (copy of v${latest.version})` : "Start quotation"}
          </button>
        )}
      </div>
      <div className="mt-2">
        <ActionStatus error={create.error} done={create.done} />
      </div>

      {quotations.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No quotation yet. Start one after the inspection: it stays a draft, visible only here, until you send it.</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Versions">
            {quotations.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(q.id)}
                  aria-pressed={q.id === selected.id}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm ${q.id === selected.id ? "border-ink bg-chalk font-semibold" : "border-line-strong"}`}
                >
                  v{q.version} <QuotationStatusPill status={q.status} /> {formatPaise(q.totalPaise)}
                </button>
              </li>
            ))}
          </ul>
          {hasDraft && selected.status !== "draft" && <p className="mt-2 text-xs text-muted">A draft is open: finish and send it before starting another version.</p>}

          <div className="mt-5 border-t border-line pt-4">
            <h3 className="flex flex-wrap items-center gap-2 font-display text-lg font-normal">
              Version {selected.version} <QuotationStatusPill status={selected.status} />
            </h3>
            {selected.status === "draft" ? (
              <>
                <p className="mb-3 mt-1 text-xs text-muted">Drafts are visible only to staff. The customer sees this version once you send it.</p>
                <QuotationEditor
                  key={selected.id}
                  projectId={projectId}
                  quotation={selected}
                  pdfHref={pdfHref(selected.id)}
                  onSent={(version) => {
                    create.setDone("");
                    answer.setError(null);
                    answer.setDone(`Version ${version} sent to the customer.`);
                  }}
                />
              </>
            ) : (
              <div className="mt-2">
                <QuotationView quotation={selected} />
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {(selected.status === "sent" || selected.status === "declined") && (
                    <button type="button" onClick={() => record(selected, "approved")} disabled={answer.busy} className="btn-primary !min-h-11 !px-5 text-sm">
                      Mark approved
                    </button>
                  )}
                  {selected.status === "sent" && (
                    <button type="button" onClick={() => record(selected, "declined")} disabled={answer.busy} className="btn-secondary !min-h-11 !px-5 text-sm">
                      Mark declined
                    </button>
                  )}
                  {pdf && (
                    <a href={pdfHref(selected.id)} target="_blank" rel="noopener" className="text-sm font-semibold text-tangerine-text underline">
                      Preview PDF
                    </a>
                  )}
                </div>
                <div className="mt-3">
                  <ActionStatus error={answer.error} done={answer.done} />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
