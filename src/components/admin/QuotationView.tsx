import { formatIstDateTime } from "@/lib/admin/ist";
import { formatPaise } from "@/lib/money";
import type { AdminQuotation, QuotationStatus } from "@/lib/projects/repo";
import { formatDay } from "@/lib/projects/stages";

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  declined: "Declined",
  superseded: "Superseded",
};

const TINTS: Record<QuotationStatus, string> = {
  draft: "bg-peach-wash text-ink",
  sent: "bg-sky-wash text-ink",
  approved: "bg-sage-deep text-on-sage",
  declined: "bg-rose-wash text-ink",
  superseded: "bg-chalk text-muted",
};

export function QuotationStatusPill({ status }: { status: QuotationStatus }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${TINTS[status]}`}>{QUOTATION_STATUS_LABELS[status]}</span>;
}

/** A sent, approved, declined or superseded version as the customer has it: read-only. */
export function QuotationView({ quotation: q }: { quotation: AdminQuotation }) {
  return (
    <div>
      <p className="text-sm text-muted">
        {q.sentAt && <>Sent {formatIstDateTime(q.sentAt)}</>}
        {q.approvedAt && <> · Approved {formatIstDateTime(q.approvedAt)}</>}
        {q.validUntil && <> · Valid until {formatDay(q.validUntil)}</>}
      </p>
      <div className="relative mt-3 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-chalk">
            <tr>
              {["#", "Item", "Area (sq ft)", "Coats", "Rate (₹/sq ft)", "Amount"].map((h) => (
                <th key={h} scope="col" className={`px-3 py-2 font-semibold ${h === "Amount" || h.startsWith("Rate") || h.startsWith("Area") || h === "Coats" ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.lines.map((l) => (
              <tr key={l.position} className="border-t border-line align-top">
                <td className="px-3 py-2 text-muted">{l.position}</td>
                <td className="px-3 py-2">
                  <p className="font-semibold">{l.item}</p>
                  {l.description && <p className="text-muted">{l.description}</p>}
                </td>
                <td className="px-3 py-2 text-right">{l.areaSqft?.toLocaleString("en-IN") ?? "—"}</td>
                <td className="px-3 py-2 text-right">{l.coats ?? "—"}</td>
                <td className="px-3 py-2 text-right">{l.ratePaise !== null ? formatPaise(l.ratePaise) : "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{formatPaise(l.amountPaise)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line">
              <th scope="row" colSpan={5} className="px-3 py-2 text-right font-normal text-muted">
                Subtotal
              </th>
              <td className="whitespace-nowrap px-3 py-2 text-right">{formatPaise(q.subtotalPaise)}</td>
            </tr>
            <tr className="border-t border-line">
              <th scope="row" colSpan={5} className="px-3 py-2 text-right">
                Total
              </th>
              <td className="whitespace-nowrap px-3 py-2 text-right font-display text-lg">{formatPaise(q.totalPaise)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {(q.notes || q.paymentTerms) && (
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {q.notes && (
            <div>
              <dt className="font-semibold">Notes</dt>
              <dd className="whitespace-pre-line text-muted">{q.notes}</dd>
            </div>
          )}
          {q.paymentTerms && (
            <div>
              <dt className="font-semibold">Payment terms</dt>
              <dd className="whitespace-pre-line text-muted">{q.paymentTerms}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
