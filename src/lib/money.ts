// Money is stored and sent as integer paise (AGENTS.md rule 3); people read rupees, with Indian
// digit grouping (4,50,000). Plain functions, no server imports: the account pages, the tracker and
// the quotation PDF all format amounts with this.

const WHOLE = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const WITH_PAISE = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * "₹4,50,000" for 45000000 paise, "₹1,234.50" when there are paise. `symbol` is what goes before
 * the number: "₹" by default, "Rs. " where a font has no rupee sign (the PDF's headings).
 */
export function formatPaise(paise: number, symbol = "₹"): string {
  const value = Math.round(paise);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const text = abs % 100 === 0 ? WHOLE.format(abs / 100) : WITH_PAISE.format(abs / 100);
  return `${sign}${symbol}${text}`;
}
