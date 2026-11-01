import { MAX_LINE_PAISE } from "@/lib/projects/limits";
import { scheduleProblem, type PaymentMilestone } from "@/lib/projects/payment-schedule";
import { paiseToInput, parseRupees } from "./rupees";

// The quotation editor's form state and its conversion to the save request. Staff type rupees,
// square feet and coats as text; the request carries integers (paise for money), so every amount
// is parsed exactly (src/lib/admin/rupees.ts). Plain functions, shared by the editor and tests.

/** One line as typed in the editor. `key` identifies the row while lines are added, removed and moved. */
export type LineDraft = { key: string; item: string; description: string; area: string; coats: string; rate: string; amount: string };

/** A saved line as the editor shows it. */
export type SavedLine = { item: string; description: string | null; areaSqft: number | null; coats: number | null; ratePaise: number | null; amountPaise: number };

/** One payment milestone as typed in the editor: when it is due and its share in percent. */
export type MilestoneDraft = { key: string; label: string; percent: string };

/** What the save endpoint takes (PUT /api/admin/projects/{id}/quotations/{qid}). */
export type QuotationRequest = {
  lines: SavedLine[];
  notes: string | null;
  paymentTerms: string | null;
  /** Sent when the editor shows milestones; an empty list clears them. */
  paymentSchedule?: PaymentMilestone[];
  validUntil: string | null;
};

export const MAX_AREA_SQFT = 1_000_000;
export const MAX_COATS = 10;

export function draftFromLine(line: SavedLine, key: string): LineDraft {
  return {
    key,
    item: line.item,
    description: line.description ?? "",
    area: line.areaSqft === null ? "" : String(line.areaSqft),
    coats: line.coats === null ? "" : String(line.coats),
    rate: line.ratePaise === null ? "" : paiseToInput(line.ratePaise),
    amount: paiseToInput(line.amountPaise),
  };
}

export const blankLine = (key: string): LineDraft => ({ key, item: "", description: "", area: "", coats: "", rate: "", amount: "" });

export const draftFromMilestone = (m: PaymentMilestone, key: string): MilestoneDraft => ({ key, label: m.label, percent: String(m.percent) });

export const blankMilestone = (key: string): MilestoneDraft => ({ key, label: "", percent: "" });

/** The milestones' shares that parse, added up (the editor's live "adds up to" line). */
export const draftScheduleTotal = (drafts: MilestoneDraft[]) => drafts.reduce((sum, d) => sum + (parseWhole(d.percent, 100) ?? 0), 0);

/** A whole number typed in a field (commas allowed): null when blank, undefined when it is not one or is above `max`. */
export function parseWhole(text: string, max: number): number | null | undefined {
  const cleaned = text.replace(/[,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d{1,9}$/.test(cleaned)) return undefined;
  const n = Number(cleaned);
  return n <= max ? n : undefined;
}

/** The amount for an area and a rate per sq ft, as the editor shows it, when both are valid (else null). */
export function autoAmount(area: string, rate: string): string | null {
  const sqft = parseWhole(area, MAX_AREA_SQFT);
  const ratePaise = rate.trim() ? parseRupees(rate) : null;
  if (typeof sqft !== "number" || ratePaise === null) return null;
  return paiseToInput(sqft * ratePaise);
}

/** The sum of the lines' amounts that parse, in paise (the live total while typing). */
export function draftTotal(lines: LineDraft[]): number {
  return lines.reduce((sum, l) => sum + (parseRupees(l.amount) ?? 0), 0);
}

const text = (v: string) => (v.trim() === "" ? null : v.trim());

/**
 * The save request for the editor's state, or the problems to fix first, keyed by
 * "{row key}.{field}" so each field can be marked, with a sentence that names the line.
 */
export function buildQuotationRequest(
  lines: LineDraft[],
  extra: { notes: string; paymentTerms: string; validUntil: string; schedule?: MilestoneDraft[] },
): { ok: true; request: QuotationRequest } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const out: SavedLine[] = [];
  lines.forEach((l, i) => {
    const n = `Line ${i + 1}`;
    const fail = (field: keyof LineDraft, message: string) => {
      errors[`${l.key}.${field}`] = `${n}: ${message}`;
    };
    if (!l.item.trim()) fail("item", "name the room or item.");
    else if (l.item.trim().length > 120) fail("item", "use 120 characters or fewer for the item.");
    if (l.description.trim().length > 500) fail("description", "use 500 characters or fewer for the description.");
    const areaSqft = parseWhole(l.area, MAX_AREA_SQFT);
    if (areaSqft === undefined) fail("area", "the area is a whole number of sq ft.");
    const coats = parseWhole(l.coats, MAX_COATS);
    if (coats === undefined) fail("coats", `coats is a whole number up to ${MAX_COATS}.`);
    const ratePaise = l.rate.trim() ? parseRupees(l.rate) : null;
    if (l.rate.trim() && (ratePaise === null || ratePaise > MAX_LINE_PAISE)) fail("rate", "enter the rate in rupees, e.g. 25 or 25.50.");
    const amountPaise = parseRupees(l.amount);
    if (amountPaise === null || amountPaise > MAX_LINE_PAISE) fail("amount", l.amount.trim() ? "enter the amount in rupees (up to ₹1 crore), e.g. 10500." : "enter the amount in rupees.");
    out.push({ item: l.item.trim(), description: text(l.description), areaSqft: areaSqft ?? null, coats: coats ?? null, ratePaise: ratePaise ?? null, amountPaise: amountPaise ?? 0 });
  });
  if (extra.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(extra.validUntil)) errors.validUntil = "Choose the valid-until date.";
  const schedule = extra.schedule?.map((d, i) => {
    const percent = parseWhole(d.percent, 100);
    if (!d.label.trim()) errors[`${d.key}.label`] = `Milestone ${i + 1}: say when it is due.`;
    if (typeof percent !== "number" || percent < 1) errors[`${d.key}.percent`] = `Milestone ${i + 1}: the share is a whole percent from 1 to 100.`;
    return { label: d.label.trim(), percent: typeof percent === "number" ? percent : 0 };
  });
  if (schedule && !Object.keys(errors).some((k) => k.endsWith(".label") || k.endsWith(".percent"))) {
    const problem = scheduleProblem(schedule);
    if (problem) errors.schedule = problem;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    request: { lines: out, notes: text(extra.notes), paymentTerms: text(extra.paymentTerms), ...(schedule && { paymentSchedule: schedule }), validUntil: extra.validUntil || null },
  };
}
