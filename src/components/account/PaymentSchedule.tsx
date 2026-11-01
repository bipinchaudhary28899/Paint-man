import { formatPaise } from "@/lib/money";
import type { PaymentMilestoneDue } from "@/lib/projects/payment-schedule";

// A quotation's payment milestones as the customer and the team read them: when each share of the
// total is due, its percent and its amount. Shown on the customer's tracker and in /admin.

/** When each share of the total is due, with its amount; nothing before the work starts. */
export function PaymentSchedule({ quotation }: { quotation: { version: number; paymentSchedule: PaymentMilestoneDue[] } }) {
  if (quotation.paymentSchedule.length === 0) return null;
  return (
    <div className="mt-5">
      <h4 className="text-sm font-semibold !font-sans">Payment schedule</h4>
      <table className="mt-2 w-full border-collapse text-left text-[15px]">
        <caption className="sr-only">Payment milestones, quotation version {quotation.version}</caption>
        <tbody>
          {quotation.paymentSchedule.map((m, i) => (
            <tr key={i} className="border-b border-line-soft align-top">
              <th scope="row" className="py-2 pr-3 font-normal">{m.label}</th>
              <td className="px-3 py-2 whitespace-nowrap text-right tabular-nums text-muted">{m.percent}%</td>
              <td className="whitespace-nowrap py-2 pl-3 text-right font-semibold tabular-nums">{formatPaise(m.amountPaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-sm text-muted">Nothing is due before the work starts. Each payment is due on the day its milestone is reached.</p>
    </div>
  );
}
