"use client";

import { useState, type FormEvent } from "react";
import { fromIstParts, toIstParts } from "@/lib/admin/ist";
import type { Inspection } from "@/lib/projects/repo";
import { formatVisit } from "@/lib/projects/stages";
import { ActionStatus } from "./ActionStatus";
import { useAdminAction } from "./useAdminAction";

/**
 * The site inspection: schedule it (India date and time, inspector), then mark it visited with the
 * findings. Scheduling moves a project earlier on the main line to "Inspection scheduled" and the
 * visit to "Inspection done"; the customer sees the time and the findings.
 */
export function InspectionPanel({ projectId, inspection }: { projectId: string; inspection: Inspection | null }) {
  const scheduled = inspection?.scheduledAt ? toIstParts(inspection.scheduledAt) : null;
  const [date, setDate] = useState(scheduled?.date ?? "");
  const [time, setTime] = useState(scheduled?.time ?? "11:00");
  const [inspector, setInspector] = useState(inspection?.inspectorName ?? "");
  const [findings, setFindings] = useState(inspection?.findings ?? "");
  const schedule = useAdminAction();
  const visit = useAdminAction();
  const base = `/api/admin/projects/${projectId}/inspection`;

  async function onSchedule(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await schedule.run("PUT", base, { scheduledAt: fromIstParts(date, time), inspectorName: inspector }, "Inspection scheduled.");
  }

  async function onVisit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // a second save keeps the recorded visit time and only changes the findings
    await visit.run("POST", `${base}/visit`, { findings, ...(inspection?.visitedAt && { visitedAt: inspection.visitedAt }) }, inspection?.visitedAt ? "Findings saved." : "Marked visited.");
  }

  return (
    <section aria-labelledby="inspection-heading" className="card p-5">
      <h2 id="inspection-heading" className="font-display text-xl font-normal">
        Inspection
      </h2>
      <p className="mt-2 text-sm">
        {[
          inspection?.scheduledAt && `Scheduled for ${formatVisit(inspection.scheduledAt)}`,
          inspection?.visitedAt && `Visited ${formatVisit(inspection.visitedAt)}`,
          inspection?.inspectorName && `Inspector: ${inspection.inspectorName}`,
        ]
          .filter(Boolean)
          .join(" · ") || <span className="text-muted">Not scheduled yet.</span>}
      </p>

      <form onSubmit={onSchedule} className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="inspection-date" className="mb-1.5 block text-sm font-semibold">
              Date
            </label>
            <input id="inspection-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="field w-auto" />
          </div>
          <div>
            <label htmlFor="inspection-time" className="mb-1.5 block text-sm font-semibold">
              Time (India)
            </label>
            <input id="inspection-time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="field w-auto" />
          </div>
          <div className="min-w-48 flex-1">
            <label htmlFor="inspection-inspector" className="mb-1.5 block text-sm font-semibold">
              Inspector
            </label>
            <input id="inspection-inspector" value={inspector} onChange={(e) => setInspector(e.target.value)} maxLength={80} autoComplete="off" className="field" />
          </div>
        </div>
        <p className="text-xs text-muted">The customer sees the date and time on their tracker.</p>
        <button type="submit" disabled={schedule.busy || !date || !time} className="btn-primary !min-h-11 !px-5 text-sm">
          {schedule.busy ? "Saving…" : inspection?.scheduledAt ? "Reschedule" : "Schedule inspection"}
        </button>
        <ActionStatus error={schedule.error} done={schedule.done} />
      </form>

      <form onSubmit={onVisit} className="mt-6 space-y-3 border-t border-line pt-4">
        <div>
          <label htmlFor="inspection-findings" className="mb-1.5 block text-sm font-semibold">
            Findings
          </label>
          <textarea id="inspection-findings" value={findings} onChange={(e) => setFindings(e.target.value)} maxLength={2000} rows={3} aria-describedby="inspection-findings-help" className="field" />
          <p id="inspection-findings-help" className="mt-1 text-xs text-muted">
            Shown to the customer: wall condition, damp, what the quotation will cover.
          </p>
        </div>
        <button type="submit" disabled={visit.busy} className="btn-secondary !min-h-11 !px-5 text-sm">
          {visit.busy ? "Saving…" : inspection?.visitedAt ? "Save findings" : "Mark visited"}
        </button>
        <ActionStatus error={visit.error} done={visit.done} />
      </form>
    </section>
  );
}
