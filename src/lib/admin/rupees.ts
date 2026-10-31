// Rupee amounts as staff type them in /admin, and back into an input. Money is stored as integer
// paise (AGENTS.md rule 3), so a typed amount is parsed as a decimal string, never through a float:
// "1,234.5" is 1234 rupees and 50 paise, exactly 123450. Amounts to read are formatted with
// formatPaise (src/lib/money.ts). Plain functions with no server imports, shared by the quotation
// editor (a client component) and its tests.

/** The largest rupee part accepted (10 digits): well inside a safe integer once in paise. */
const MAX_RUPEE_DIGITS = 10;
const AMOUNT = /^(\d*)(?:\.(\d{0,2}))?$/;

/**
 * Integer paise for a typed rupee amount ("₹1,23,456.50", "1234", "99.5"), or null when it is
 * not one: blank, negative, letters, or more than two decimal places. Commas and spaces are
 * ignored wherever they are, so Indian (1,23,456) and western (123,456) grouping both work.
 */
export function parseRupees(text: string): number | null {
  const cleaned = text.trim().replace(/^₹/, "").replace(/[,\s]/g, "");
  const m = AMOUNT.exec(cleaned);
  if (!m) return null;
  const [, whole, fraction = ""] = m;
  if (whole === "" && fraction === "") return null;
  if (whole.length > MAX_RUPEE_DIGITS) return null;
  return Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
}

/** Paise as an editable rupee value, without grouping: 123450 → "1234.50", 500000 → "5000". */
export function paiseToInput(paise: number): string {
  const rupees = Math.trunc(paise / 100);
  const rest = Math.abs(paise % 100);
  return rest ? `${rupees}.${String(rest).padStart(2, "0")}` : String(rupees);
}
