import type { PaymentMilestone } from "@/lib/projects/payment-schedule";
import { site } from "./site";

// The Terms & Conditions that come with every quotation, whatever the job (interior or exterior, home
// or business): printed after the quotation in its PDF (src/lib/pdf/quotation.ts), published at
// /quotation-terms on the website and in the app, and linked where a customer accepts. One text,
// three places. They follow the promises in site.ts: no advance payment (nothing is due before the
// work starts), a full estimate before work, written approval for every change. Have an advocate
// practising in Uttar Pradesh review them; bump QUOTATION_TERMS_UPDATED (and the /quotation-terms
// date in seo-dates.ts) whenever the wording changes, so a quotation records the terms it went with.

/** When these terms last changed (YYYY-MM-DD): printed on every quotation and recorded when one is accepted. */
export const QUOTATION_TERMS_UPDATED = "2026-11-01";

/** Days a quotation holds from its issue date, unless it states another date. */
export const QUOTATION_VALID_DAYS = 15;
/** Days after a payment's due date before interest applies. */
export const PAYMENT_GRACE_DAYS = 7;
/** Interest on an overdue, undisputed amount, per month, worked out for the days it is late. */
export const LATE_INTEREST_PERCENT_PER_MONTH = 1.5;
/** Days after handover to report a defect in the workmanship. */
export const WORKMANSHIP_DAYS = 30;
/** Days to settle a disagreement by talking before mediation. */
export const DISPUTE_DAYS = 15;
/** The courts the terms name for disputes (where they otherwise have jurisdiction). */
export const JURISDICTION = "Mathura, Uttar Pradesh";

/**
 * The milestones a new quotation starts with; staff can change them per quotation. Nothing is due
 * before the work starts (the zero advance promise).
 */
export const DEFAULT_PAYMENT_SCHEDULE: readonly PaymentMilestone[] = [
  { label: "On the first day of work, when the materials arrive", percent: 50 },
  { label: "When the painting is complete", percent: 40 },
  { label: "After the final inspection and handover", percent: 10 },
];

export type TermsBlock = { kind: "p"; text: string } | { kind: "list"; items: string[] };
export type TermsSection = { id: string; title: string; blocks: TermsBlock[] };

const p = (text: string): TermsBlock => ({ kind: "p", text });
const list = (...items: string[]): TermsBlock => ({ kind: "list", items });

/** "50% on the first day of work, …, 40% when …, and 10% after …" */
export function scheduleSentence(schedule: readonly PaymentMilestone[] = DEFAULT_PAYMENT_SCHEDULE): string {
  const parts = schedule.map((m) => `${m.percent}% ${m.label.charAt(0).toLowerCase()}${m.label.slice(1)}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : (parts[0] ?? "");
}

/** The business as the terms name it: its registered name once set in site.ts, else the business trading under the brand. */
export const termsParty = () => (site.legalName ? `${site.legalName}, trading as ${site.name}` : `the business trading as ${site.name}`);

/** The terms, section by section, in order. */
export function quotationTerms(): TermsSection[] {
  const name = site.name;
  const party = termsParty();
  return [
    {
      id: "about",
      title: "About these terms",
      blocks: [
        p(`These terms apply to every painting job ${name} quotes for: interior or exterior, home or business. They form one agreement with the quotation they come with, and both carry the same quotation reference number.`),
        p(`"We", "us" and "${name}" mean ${party}. "You" means the customer named on the quotation. "The work" means the work the quotation lists.`),
      ],
    },
    {
      id: "quotation",
      title: "Quotation, validity and acceptance",
      blocks: [
        list(
          "Every quotation has a reference number, a version and an issue date.",
          `A quotation is valid for ${QUOTATION_VALID_DAYS} days from its issue date, unless it states another date.`,
          `You accept a quotation by signing it, by accepting it in the ${name} app, or by a clear written acceptance of the quotation and these terms by email or WhatsApp.`,
          "Work starts only after you accept. There is no advance payment: nothing is due before the work starts.",
          "Any change to an accepted quotation is made as a new version, which you accept again.",
        ),
      ],
    },
    {
      id: "payment",
      title: "Payment schedule",
      blocks: [
        p(`You pay in the milestones the quotation lists, each a share of the quoted total. Unless the quotation says otherwise, that is ${scheduleSentence()}.`),
        p("Each payment is due on the day its milestone is reached, and we tell you in writing when it is due."),
        p(
          `A grace period of ${PAYMENT_GRACE_DAYS} calendar days applies after each due date. An undisputed amount still unpaid after that carries interest at ${LATE_INTEREST_PERCENT_PER_MONTH}% per month, worked out for the days it is late, subject to applicable law.`,
        ),
        p("If a payment stays overdue, we may pause the work, the buying of further materials or other services after telling you in writing. Amounts due remain payable while the work is paused."),
      ],
    },
    {
      id: "prices",
      title: "Prices and taxes",
      blocks: [
        list(
          "Prices are in Indian rupees and include GST where applicable. The invoice at the end of the job shows GST details where applicable.",
          "The quoted total is what you pay for the work listed. Nothing is added without your written approval.",
        ),
      ],
    },
    {
      id: "scope",
      title: "Scope of work and changes",
      blocks: [
        list(
          "Only the work listed in the quotation is included.",
          "More rooms, walls, ceilings, coatings, textures or other work are priced separately and done only after you approve the price in writing.",
          "A change of paint brand, range, colour or finish may change the price. We tell you the new price before making the change.",
          "A request made in person or on a call is confirmed in writing (a WhatsApp message is enough) before it is carried out.",
        ),
      ],
    },
    {
      id: "materials",
      title: "Materials",
      blocks: [
        p(
          "The quotation states, for each item, the paint brand and range, interior or exterior grade, the number of coats, the putty and primer, the finish (matte, satin, gloss and so on), and whether materials, labour, scaffolding, transport and consumables are included.",
        ),
        p("We use genuine branded paint. A different but equivalent product is used only with your approval."),
      ],
    },
    {
      id: "measurements",
      title: "Site inspection and measurements",
      blocks: [
        p(
          "The quotation is based on our site inspection. If the area actually painted turns out larger or smaller than quoted, the quoted rates apply to the actual area. We show you the measurements and agree any difference in writing before the extra work is done.",
        ),
      ],
    },
    {
      id: "surfaces",
      title: "Wall condition and surface preparation",
      blocks: [
        p("The quotation lists the preparation it covers. Existing dampness, seepage, structural cracks, plumbing leaks and other defects of the building are not part of the work unless the quotation lists them."),
        p("If preparation uncovers a defect that could not be seen at the inspection, we stop and tell you, with the options and their price, before going on."),
      ],
    },
    {
      id: "customer",
      title: "Your part",
      blocks: [
        list(
          "Give our team reasonable access to the property on the agreed days.",
          "Provide electricity and water where the work needs them.",
          "Remove or protect valuables, electronics and fragile items before the work starts.",
          "Approve colours and finishes on time.",
          "Tell us about any dampness, seepage, cracks or other defects you know of.",
          "Keep the property available to the agreed schedule.",
        ),
      ],
    },
    {
      id: "colours",
      title: "Colours",
      blocks: [
        p(
          "You choose and approve each shade in writing before it is applied. A shade looks different on a screen, on a shade card and on a wall in your own light, which is why we bring shade cards to the inspection. Changing a colour after it has been applied is extra work.",
        ),
      ],
    },
    {
      id: "timeline",
      title: "Timeline and delays",
      blocks: [
        list(
          "The quotation states how long the work takes, and the start date is agreed before work begins.",
          "Late approvals, restricted access, an overdue payment, weather, a shortage of materials or other events outside our control extend the timeline. We tell you the revised completion date.",
          "We make every reasonable effort to finish within the agreed time.",
        ),
      ],
    },
    {
      id: "quality",
      title: "Quality, inspection and handover",
      blocks: [
        list(
          "The work is done with the agreed materials and to the agreed specification, and a supervisor checks each stage.",
          "You may inspect the work at reasonable stages. A stage done as the quotation says is paid at its milestone; anything you want corrected is noted in writing and corrected.",
          "At handover we go through every item against the quotation with you, finish the touch-ups you point out and clean the site. The work is handed over once the listed work and those touch-ups are done.",
        ),
      ],
    },
    {
      id: "warranty",
      title: "Workmanship warranty",
      blocks: [
        p(
          `Report any defect in our workmanship on the surfaces we painted (peeling, patches, uneven coats) within ${WORKMANSHIP_DAYS} days of handover. We inspect it and, where the defect is due to our workmanship, put it right at no charge.`,
        ),
        p(
          "Paint makers' own warranties apply under the maker's terms. Our warranty does not cover dampness, seepage or structural defects, damage by others, accidents, normal wear, or surfaces the quotation did not cover.",
        ),
      ],
    },
    {
      id: "cancellation",
      title: "Cancellation",
      blocks: [
        list(
          "You may cancel at any time by telling us in writing.",
          "If you cancel after the work has started, you pay for the work done, for materials bought specially for your job that cannot be returned, and for other reasonable costs we can show.",
          "Any amount you have paid beyond that is refunded after these deductions.",
          "We may pause or end the job for a serious breach, such as continued non-payment, after giving you written notice.",
        ),
      ],
    },
    {
      id: "liability",
      title: "Your property and our responsibility",
      blocks: [
        p("We take reasonable care to protect your property: floors, furniture and fittings are covered before work starts. We repair or pay for damage caused by our team's negligence."),
        p("We are not responsible for damage that existed before the work, damage to items you were asked to remove or protect and did not, or defects of the building revealed during preparation."),
      ],
    },
    {
      id: "force-majeure",
      title: "Events outside anyone's control",
      blocks: [
        p(
          "Floods, extreme weather, natural disasters, government restrictions, civil disturbances and sudden supply shortages can delay or stop work. Affected dates move by a reasonable period. If such an event goes on, we agree with you whether to reschedule or end the job, with payment only for the work done.",
        ),
      ],
    },
    {
      id: "records",
      title: "Photos and written records",
      blocks: [
        list(
          "We photograph the site before, during and after the work (your daily photo updates) for documentation, quality checks and to settle any disagreement.",
          "We use photos of your home in advertising, on our website or on social media only with your separate consent. Accepting a quotation is not that consent.",
          "Written messages (WhatsApp, email, the app) are the record of what was agreed. A spoken promise counts once it is confirmed in writing.",
        ),
      ],
    },
    {
      id: "team",
      title: "Our team",
      blocks: [p("We may carry out the work with our own crews or with painters and specialists we engage. We remain responsible for their work.")],
    },
    {
      id: "unpaid",
      title: "Unpaid amounts",
      blocks: [
        p(
          "If an amount due is not paid, we send reminders and then a formal written demand. If it remains unpaid, we may stop the remaining work after reasonable written notice and take lawful steps to recover the amount, with interest under these terms and the legal costs the law allows. This does not limit any other remedy available under the laws of India.",
        ),
      ],
    },
    {
      id: "disputes",
      title: "Disagreements and jurisdiction",
      blocks: [
        list(
          `First, either of us raises the matter in writing, and we try to settle it in good faith within ${DISPUTE_DAYS} days.`,
          "If that does not settle it, we may agree to refer it to an independent mediator.",
          `Subject to applicable law and your statutory rights, the competent courts at ${JURISDICTION} have jurisdiction over disputes about this work, provided they otherwise have jurisdiction under applicable law.`,
          "Nothing in these terms stops either of us from approaching a Consumer Commission or any other forum with jurisdiction under applicable law.",
        ),
      ],
    },
    {
      id: "general",
      title: "General",
      blocks: [
        list(
          "The quotation and these terms are the whole agreement for the work. Changes are made only in writing.",
          "If any part of these terms cannot be enforced, the rest still applies.",
          "These terms are governed by the laws of India.",
        ),
      ],
    },
  ];
}

/** The customer's acknowledgement at the end of the terms, and the lines to fill in. */
export function acceptanceStatement(): { title: string; paragraphs: string[]; fields: string[] } {
  return {
    title: "Customer acknowledgement and acceptance",
    paragraphs: [
      "I/We confirm that I/we have read and understood the quotation, the scope of work, the pricing, the payment schedule and these Terms & Conditions.",
      "I/We agree to the terms in the quotation, and understand that any additional work or change needs mutual written approval.",
      `By signing below, by accepting in the ${site.name} app, or by giving clear written acceptance of the quotation and these terms, I/we accept the obligations they describe.`,
    ],
    fields: ["Customer name", "Property address", "Quotation reference", "Date", "Customer signature", `For ${site.name}`],
  };
}
