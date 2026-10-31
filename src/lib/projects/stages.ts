// The stages of a painting project as the customer sees them: one list, shared by the website's
// tracker, the app (through the API's labels) and /admin. Plain data and pure functions, no
// database or server imports, so client components can use it too.
//
// The copy follows the site's promises (src/config/site.ts `promises`, `workFlow`): a call during
// working hours, a site inspection, an itemised quotation approved before any work, supervised
// painting with photo updates, a walkthrough at handover.

/** The main line, in order: every project moves along it from `booked` to `completed`. */
export const MAIN_STAGES = [
  "booked",
  "call_confirmed",
  "inspection_scheduled",
  "inspected",
  "quotation_shared",
  "price_finalised",
  "work_scheduled",
  "in_progress",
  "completed",
] as const;

/** Off the main line: a project can be paused or cancelled at any point. */
export const OFF_LINE_STAGES = ["on_hold", "cancelled"] as const;

/** Every stage, main line first (the order of the database enum). */
export const PROJECT_STAGES = [...MAIN_STAGES, ...OFF_LINE_STAGES] as const;

export type MainStage = (typeof MAIN_STAGES)[number];
export type ProjectStage = (typeof PROJECT_STAGES)[number];

/** The customer-facing label of each stage. */
export const STAGE_LABELS: Record<ProjectStage, string> = {
  booked: "Booking received",
  call_confirmed: "Visit being arranged",
  inspection_scheduled: "Inspection scheduled",
  inspected: "Inspection done",
  quotation_shared: "Quotation shared",
  price_finalised: "Price finalised",
  work_scheduled: "Work scheduled",
  in_progress: "Painting in progress",
  completed: "Handed over",
  on_hold: "On hold",
  cancelled: "Cancelled",
};

/** Dates a stage's explanation can name: the inspection visit and the crew's start. */
export type StageDates = { inspectionAt?: Date | string | null; workStartsOn?: string | null };

const IST = "Asia/Kolkata";

/** "Tue, 4 Nov, 11:30 am" in India time. */
export function formatVisit(at: Date | string): string {
  return new Date(at).toLocaleString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** "Mon, 10 Nov" for a calendar date (YYYY-MM-DD). */
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00+05:30`).toLocaleDateString("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" });
}

/** One line on what the stage means for the customer, with the visit or start date when it is known. */
export function stageExplanation(stage: ProjectStage, dates: StageDates = {}): string {
  switch (stage) {
    case "booked":
      return "We call you during working hours to fix the visit.";
    case "call_confirmed":
      return "We have spoken and are fixing a time for the inspection.";
    case "inspection_scheduled":
      return dates.inspectionAt ? `Our inspector visits on ${formatVisit(dates.inspectionAt)}.` : "Our inspector visits at the time agreed on the call.";
    case "inspected":
      return "Measurements and wall checks are done; your quotation is being prepared.";
    case "quotation_shared":
      return "Your itemised quotation is ready to review.";
    case "price_finalised":
      return "You approved the quotation. Nothing else is added without your written approval.";
    case "work_scheduled":
      return dates.workStartsOn ? `The crew starts on ${formatDay(dates.workStartsOn)}.` : "We are fixing the crew's start date with you.";
    case "in_progress":
      return "Supervised work, with photo updates.";
    case "completed":
      return "Walkthrough done and the job closed.";
    case "on_hold":
      return "This project is paused for now.";
    case "cancelled":
      return "This project was cancelled.";
  }
}

export const isProjectStage = (value: unknown): value is ProjectStage => typeof value === "string" && (PROJECT_STAGES as readonly string[]).includes(value);
export const isMainStage = (stage: ProjectStage): stage is MainStage => (MAIN_STAGES as readonly string[]).includes(stage);

/** Position on the main line (0 for `booked`), or -1 for a stage off it. */
export const mainIndex = (stage: ProjectStage) => (MAIN_STAGES as readonly string[]).indexOf(stage);

/** True when `target` is later on the main line than `current` (moving forward, never back or out of a hold). */
export function isForward(current: ProjectStage, target: MainStage): boolean {
  const from = mainIndex(current);
  return from !== -1 && mainIndex(target) > from;
}

export type StageStep = { stage: ProjectStage; label: string; done: boolean; current: boolean; at?: string };

/**
 * The stepper for a project: each main-line stage, done (passed), current or still ahead, with the
 * time it was last reached. `events` is the timeline (oldest first). A project on hold or cancelled
 * shows the main line up to the furthest stage it reached, then that state as the current step.
 */
export function stageSteps(current: ProjectStage, events: { stage: ProjectStage; at: Date | string }[]): StageStep[] {
  const reachedAt = new Map<ProjectStage, string>();
  for (const e of events) reachedAt.set(e.stage, new Date(e.at).toISOString());

  let furthest = mainIndex(current);
  if (furthest === -1) {
    // the furthest main-line stage the timeline reached before the hold or cancellation
    furthest = events.reduce((max, e) => Math.max(max, mainIndex(e.stage)), -1);
  }
  const onLine = isMainStage(current);

  const steps: StageStep[] = MAIN_STAGES.map((stage, i) => {
    const at = reachedAt.get(stage);
    const step: StageStep = {
      stage,
      label: STAGE_LABELS[stage],
      done: onLine ? i < furthest : i <= furthest,
      current: onLine && i === furthest,
    };
    return at && i <= furthest ? { ...step, at } : step;
  });
  if (!onLine) {
    const at = reachedAt.get(current);
    steps.push({ stage: current, label: STAGE_LABELS[current], done: false, current: true, ...(at && { at }) });
  }
  return steps;
}
