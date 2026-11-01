// A quotation's payment milestones: each a share of the quoted total, together 100%. Plain functions
// with no imports, shared by the server (saving and printing a quotation), the website's and the
// app's quotation editors and the customer's tracker. Money is integer paise; the shares of a total
// that does not divide evenly are rounded to the paisa, and the last milestone takes the remainder,
// so the amounts always add up to the total.

/** One milestone as stored: when it is due, and its share of the total in whole percent. */
export type PaymentMilestone = { label: string; percent: number };

/** A milestone with its amount of a quotation's total. */
export type PaymentMilestoneDue = PaymentMilestone & { amountPaise: number };

export const MAX_MILESTONES = 6;
export const MILESTONE_LABEL_MAX = 120;

/** The sum of the milestones' shares. */
export const scheduleTotal = (schedule: readonly Pick<PaymentMilestone, "percent">[]) => schedule.reduce((sum, m) => sum + m.percent, 0);

/** Each milestone's amount of `totalPaise`; together exactly the total. */
export function milestoneAmounts(totalPaise: number, schedule: readonly PaymentMilestone[]): PaymentMilestoneDue[] {
  let left = totalPaise;
  return schedule.map((m, i) => {
    const amountPaise = i === schedule.length - 1 ? left : Math.round((totalPaise * m.percent) / 100);
    left -= amountPaise;
    return { label: m.label, percent: m.percent, amountPaise };
  });
}

/** What is wrong with a schedule (a sentence for staff), or null when it can be saved. An empty schedule means none. */
export function scheduleProblem(schedule: readonly PaymentMilestone[]): string | null {
  if (schedule.length === 0) return null;
  if (schedule.length > MAX_MILESTONES) return `Use ${MAX_MILESTONES} payment milestones or fewer.`;
  for (const [i, m] of schedule.entries()) {
    if (!m.label.trim()) return `Milestone ${i + 1}: say when it is due.`;
    if (m.label.trim().length > MILESTONE_LABEL_MAX) return `Milestone ${i + 1}: use ${MILESTONE_LABEL_MAX} characters or fewer.`;
    if (!Number.isInteger(m.percent) || m.percent < 1 || m.percent > 100) return `Milestone ${i + 1}: the share is a whole percent from 1 to 100.`;
  }
  const total = scheduleTotal(schedule);
  return total === 100 ? null : `The payment milestones must add up to 100% (now ${total}%).`;
}
