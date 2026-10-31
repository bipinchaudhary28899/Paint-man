"use client";

import { useState, type FormEvent } from "react";
import { MAIN_STAGES, OFF_LINE_STAGES, STAGE_LABELS, type ProjectStage } from "@/lib/projects/stages";
import { ActionStatus } from "./ActionStatus";
import { StagePill } from "./ProjectList";
import { useAdminAction } from "./useAdminAction";

/**
 * The stage control: choose any stage (forward, back, on hold, cancelled) with an optional note the
 * customer reads on their tracker. Choosing the current stage again with a note posts a progress
 * update. Then the crew's start date, which the "Work scheduled" step names.
 */
export function StageControl({ projectId, stage, stageExplanation, workStartsOn }: { projectId: string; stage: ProjectStage; stageExplanation: string; workStartsOn: string | null }) {
  const [next, setNext] = useState<ProjectStage>(stage);
  const [note, setNote] = useState("");
  // the stage can also move on its own (scheduling the inspection, sending a quotation): follow it
  const [shown, setShown] = useState(stage);
  if (shown !== stage) {
    setShown(stage);
    setNext(stage);
  }
  const action = useAdminAction();
  const unchanged = next === stage && note.trim() === "";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await action.run("POST", `/api/admin/projects/${projectId}/stage`, { stage: next, note }, next === stage ? "Update posted." : `Moved to “${STAGE_LABELS[next]}”.`);
    if (result.ok) setNote("");
  }

  return (
    <section aria-labelledby="stage-heading" className="card p-5">
      <h2 id="stage-heading" className="font-display text-xl font-normal">
        Stage
      </h2>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Now:</span> <StagePill stage={stage} />
      </p>
      <p className="mt-1 text-sm text-muted">Customer sees: “{stageExplanation}”</p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="stage-select" className="mb-1.5 block text-sm font-semibold">
            Set stage
          </label>
          <select id="stage-select" value={next} onChange={(e) => setNext(e.target.value as ProjectStage)} className="field">
            <optgroup label="Main line">
              {MAIN_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                  {s === stage ? " (current)" : ""}
                </option>
              ))}
            </optgroup>
            <optgroup label="Off the line">
              {OFF_LINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                  {s === stage ? " (current)" : ""}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label htmlFor="stage-note" className="mb-1.5 block text-sm font-semibold">
            Note for the customer <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea id="stage-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} aria-describedby="stage-note-help" className="field" />
          <p id="stage-note-help" className="mt-1 text-xs text-muted">
            Shown to the customer on their tracker, under this stage. To post a progress update, keep the current stage and add a note.
          </p>
        </div>
        <button type="submit" disabled={action.busy || unchanged} className="btn-primary !min-h-11 !px-5 text-sm">
          {action.busy ? "Saving…" : next === stage ? "Post update" : "Update stage"}
        </button>
        <ActionStatus error={action.error} done={action.done} />
      </form>

      <WorkStartControl projectId={projectId} workStartsOn={workStartsOn} />
    </section>
  );
}

/** The crew's start date: set, change or clear it without changing the stage. */
export function WorkStartControl({ projectId, workStartsOn }: { projectId: string; workStartsOn: string | null }) {
  const [day, setDay] = useState(workStartsOn ?? "");
  const action = useAdminAction();
  const url = `/api/admin/projects/${projectId}/work-start`;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await action.run("PUT", url, { workStartsOn: day || null }, day ? "Start date saved." : "Start date cleared.");
  }

  async function clear() {
    const result = await action.run("PUT", url, { workStartsOn: null }, "Start date cleared.");
    if (result.ok) setDay("");
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 border-t border-line pt-4">
      <label htmlFor="work-start" className="mb-1.5 block text-sm font-semibold">
        Work start date
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input id="work-start" type="date" value={day} onChange={(e) => setDay(e.target.value)} aria-describedby="work-start-help" className="field w-auto" />
        <button type="submit" disabled={action.busy || day === (workStartsOn ?? "")} className="btn-secondary !min-h-11 !px-4 text-sm">
          Save date
        </button>
        {workStartsOn && (
          <button type="button" onClick={clear} disabled={action.busy} className="btn-secondary !min-h-11 !px-4 text-sm">
            Clear
          </button>
        )}
      </div>
      <p id="work-start-help" className="mt-1 text-xs text-muted">
        The customer sees “The crew starts on …” while the project is in “Work scheduled”.
      </p>
      <div className="mt-2">
        <ActionStatus error={action.error} done={action.done} />
      </div>
    </form>
  );
}
