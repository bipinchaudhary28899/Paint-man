import { describe, expect, it } from "vitest";
import { inspectionScheduleSchema, inspectionVisitSchema, quotationSaveSchema, stageChangeSchema } from "@/lib/projects/inputs";
import {
  formatDay,
  formatVisit,
  isForward,
  isMainStage,
  isProjectStage,
  MAIN_STAGES,
  mainIndex,
  OFF_LINE_STAGES,
  PROJECT_STAGES,
  STAGE_LABELS,
  stageExplanation,
  stageSteps,
} from "@/lib/projects/stages";
import { projectStage } from "@/lib/db/schema";

describe("project stages", () => {
  it("lists the main line in order, then the off-line states, each with a customer label", () => {
    expect(MAIN_STAGES).toEqual(["booked", "call_confirmed", "inspection_scheduled", "inspected", "quotation_shared", "price_finalised", "work_scheduled", "in_progress", "completed"]);
    expect(OFF_LINE_STAGES).toEqual(["on_hold", "cancelled"]);
    expect(PROJECT_STAGES).toEqual([...MAIN_STAGES, ...OFF_LINE_STAGES]);
    expect(Object.keys(STAGE_LABELS)).toEqual([...PROJECT_STAGES]);
    expect(STAGE_LABELS).toMatchObject({ booked: "Booking received", price_finalised: "Price finalised", completed: "Handed over", on_hold: "On hold" });
    // the database enum is the same list, in the same order
    expect(projectStage.enumValues).toEqual([...PROJECT_STAGES]);
  });

  it("explains each stage in one line, naming the visit and start dates in India time when known", () => {
    for (const stage of PROJECT_STAGES) expect(stageExplanation(stage)).toMatch(/^[A-Z].+\.$/);
    expect(stageExplanation("booked")).toBe("We call you during working hours to fix the visit.");
    expect(stageExplanation("price_finalised")).toBe("You approved the quotation. Nothing else is added without your written approval.");
    expect(stageExplanation("inspection_scheduled", { inspectionAt: "2026-11-04T06:00:00Z" })).toBe(`Our inspector visits on ${formatVisit("2026-11-04T06:00:00Z")}.`);
    expect(formatVisit(new Date("2026-11-04T06:00:00Z"))).toMatch(/Wed.*4 Nov.*11:30\s?am/i);
    expect(stageExplanation("work_scheduled", { workStartsOn: "2026-11-10" })).toBe(`The crew starts on ${formatDay("2026-11-10")}.`);
    expect(formatDay("2026-11-10")).toMatch(/Tue.*10 Nov/);
    expect(stageExplanation("work_scheduled")).toMatch(/start date/);
    expect(stageExplanation("inspection_scheduled")).toMatch(/agreed/);
  });

  it("knows the main line's order and only moves forward along it", () => {
    expect(isProjectStage("booked")).toBe(true);
    expect(isProjectStage("lost")).toBe(false);
    expect(isProjectStage(3)).toBe(false);
    expect(isMainStage("on_hold")).toBe(false);
    expect(mainIndex("inspected")).toBe(3);
    expect(mainIndex("cancelled")).toBe(-1);
    expect(isForward("booked", "inspected")).toBe(true);
    expect(isForward("in_progress", "price_finalised")).toBe(false);
    expect(isForward("on_hold", "inspected")).toBe(false);
  });

  it("builds the stepper: done, current and ahead, with the time each stage was reached", () => {
    const events = [
      { stage: "booked" as const, at: "2026-10-30T05:00:00Z" },
      { stage: "call_confirmed" as const, at: new Date("2026-10-30T07:00:00Z") },
      { stage: "inspection_scheduled" as const, at: "2026-10-31T05:00:00Z" },
    ];
    const steps = stageSteps("inspection_scheduled", events);
    expect(steps).toHaveLength(9);
    expect(steps.slice(0, 3)).toEqual([
      { stage: "booked", label: "Booking received", done: true, current: false, at: "2026-10-30T05:00:00.000Z" },
      { stage: "call_confirmed", label: "Visit being arranged", done: true, current: false, at: "2026-10-30T07:00:00.000Z" },
      { stage: "inspection_scheduled", label: "Inspection scheduled", done: false, current: true, at: "2026-10-31T05:00:00.000Z" },
    ]);
    expect(steps[3]).toEqual({ stage: "inspected", label: "Inspection done", done: false, current: false });
  });

  it("shows a paused or cancelled project's progress, then that state as the current step", () => {
    const steps = stageSteps("on_hold", [
      { stage: "booked", at: "2026-10-30T05:00:00Z" },
      { stage: "call_confirmed", at: "2026-10-30T07:00:00Z" },
      { stage: "on_hold", at: "2026-10-31T05:00:00Z" },
    ]);
    expect(steps).toHaveLength(10);
    expect(steps.filter((s) => s.done).map((s) => s.stage)).toEqual(["booked", "call_confirmed"]);
    expect(steps.filter((s) => s.current)).toEqual([{ stage: "on_hold", label: "On hold", done: false, current: true, at: "2026-10-31T05:00:00.000Z" }]);
    // a stage moved back from is not shown with a time ahead of the current one
    const back = stageSteps("booked", [
      { stage: "booked", at: "2026-10-30T05:00:00Z" },
      { stage: "call_confirmed", at: "2026-10-30T07:00:00Z" },
      { stage: "booked", at: "2026-10-30T08:00:00Z" },
    ]);
    expect(back[1]).toEqual({ stage: "call_confirmed", label: "Visit being arranged", done: false, current: false });
    expect(stageSteps("cancelled", []).at(-1)).toEqual({ stage: "cancelled", label: "Cancelled", done: false, current: true });
  });
});

describe("admin inputs", () => {
  it("validates a stage change, turning blanks into null", () => {
    expect(stageChangeSchema.parse({ stage: "work_scheduled", note: " ", workStartsOn: "2026-11-10" })).toEqual({ stage: "work_scheduled", note: null, workStartsOn: "2026-11-10" });
    expect(stageChangeSchema.safeParse({ stage: "lost" }).success).toBe(false);
    expect(stageChangeSchema.safeParse({ stage: "booked", workStartsOn: "2026-02-30" }).success).toBe(false);
    expect(stageChangeSchema.safeParse({ stage: "booked", note: "x".repeat(501) }).success).toBe(false);
  });

  it("parses inspection times with their offset", () => {
    expect(inspectionScheduleSchema.parse({ scheduledAt: "2026-11-04T11:30:00+05:30", inspectorName: "Ramesh" })).toEqual({ scheduledAt: new Date("2026-11-04T06:00:00Z"), inspectorName: "Ramesh" });
    expect(inspectionScheduleSchema.safeParse({ scheduledAt: "tomorrow" }).success).toBe(false);
    expect(inspectionVisitSchema.parse({ findings: "Damp on the north wall" })).toEqual({ findings: "Damp on the north wall" });
  });

  it("bounds quotation lines: whole paise, a required amount, at most 100 lines", () => {
    const parsed = quotationSaveSchema.parse({ lines: [{ item: " Living room walls ", amountPaise: 1_250_000, areaSqft: 420, coats: 2, ratePaise: 2_976 }], validUntil: "", paymentTerms: "50% on start, 50% on handover" });
    expect(parsed).toEqual({
      lines: [{ item: "Living room walls", description: null, areaSqft: 420, coats: 2, ratePaise: 2_976, amountPaise: 1_250_000 }],
      validUntil: null,
      paymentTerms: "50% on start, 50% on handover",
    });
    expect(quotationSaveSchema.safeParse({ lines: [{ item: "Door", amountPaise: 10.5 }] }).success).toBe(false);
    expect(quotationSaveSchema.safeParse({ lines: [{ item: "", amountPaise: 100 }] }).success).toBe(false);
    expect(quotationSaveSchema.safeParse({ lines: [{ item: "Door" }] }).success).toBe(false);
    expect(quotationSaveSchema.safeParse({ lines: Array.from({ length: 101 }, () => ({ item: "Wall", amountPaise: 1 })) }).success).toBe(false);
  });
});
