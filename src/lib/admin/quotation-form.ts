import { MAX_LINE_PAISE } from "@/lib/projects/inputs";
import { paiseToInput, parseRupees } from "./rupees";

// The quotation editor's form state and its conversion to the save request. Staff type rupees,
// square feet and coats as text; the request carries integers (paise for money), so every amount
// is parsed exactly (src/lib/admin/rupees.ts). Plain functions, shared by the editor and tests.

/** One line as typed in the editor. `key` identifies the row while lines are added, removed and moved. */
export type LineDraft = { key: string; item: string; description: string; area: string; coats: string; rate: string; amount: string };

/** A saved line as the editor shows it. */
export type SavedLine = { item: string; description: string | null; areaSqft: number | null; coats: number | null; ratePaise: number | null; amountPaise: number };

/** What the save endpoint takes (PUT /api/admin/projects/{id}/quotations/{qid}). */
export type QuotationRequest = {
  lines: SavedLine[];
  notes: string | null;
  paymentTerms: string | null;
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
  extra: { notes: string; paymentTerms: string; validUntil: string },
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
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, request: { lines: out, notes: text(extra.notes), paymentTerms: text(extra.paymentTerms), validUntil: extra.validUntil || null } };
}
