import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acceptanceStatement,
  DEFAULT_PAYMENT_SCHEDULE,
  JURISDICTION,
  QUOTATION_TERMS_UPDATED,
  QUOTATION_VALID_DAYS,
  quotationTerms,
  scheduleSentence,
  termsParty,
  WORKMANSHIP_DAYS,
} from "@/config/quotation-terms";
import { promises, site } from "@/config/site";
import { contentUpdated } from "@/config/seo-dates";
import { isCalendarDate } from "@/lib/leads/dates";
import { milestoneAmounts, scheduleProblem, scheduleTotal } from "@/lib/projects/payment-schedule";

// The Terms & Conditions that come with every quotation (src/config/quotation-terms.ts) and the
// payment milestones (src/lib/projects/payment-schedule.ts): one text for the PDF, the website and
// the app, true to the promises (no advance payment), with milestones that always add up.

afterEach(() => vi.restoreAllMocks());

const allText = () =>
  quotationTerms()
    .flatMap((s) => [s.title, ...s.blocks.flatMap((b) => (b.kind === "p" ? [b.text] : b.items))])
    .join("\n");

describe("the quotation terms", () => {
  it("have unique section ids, a title and some text in every section", () => {
    const terms = quotationTerms();
    expect(terms.length).toBeGreaterThan(15);
    expect(new Set(terms.map((s) => s.id)).size).toBe(terms.length);
    for (const s of terms) {
      expect(s.title.trim()).not.toBe("");
      expect(s.blocks.length).toBeGreaterThan(0);
      for (const b of s.blocks) expect(b.kind === "p" ? b.text.trim() : b.items.length).toBeTruthy();
    }
    expect(terms.map((s) => s.id)).toEqual(expect.arrayContaining(["quotation", "payment", "prices", "scope", "warranty", "cancellation", "disputes"]));
  });

  it("keep the zero advance promise and state the owner's numbers", () => {
    const text = allText();
    expect(promises[0].title).toBe("Zero advance payment");
    expect(text).toContain("There is no advance payment: nothing is due before the work starts.");
    expect(text).toContain(`valid for ${QUOTATION_VALID_DAYS} days from its issue date`);
    expect(text).toContain(`within ${WORKMANSHIP_DAYS} days of handover`);
    expect(text).toContain("include GST where applicable");
    expect(text).toContain("1.5% per month");
    expect(text).toContain(`the competent courts at ${JURISDICTION}`);
    // a contract cannot take away a customer's right to a Consumer Commission
    expect(text).toContain("Consumer Commission");
    expect(text).not.toMatch(/advance (?!payment: nothing)/i);
  });

  it("start every new quotation with milestones that add up to 100% and ask nothing before the work starts", () => {
    expect(scheduleProblem([...DEFAULT_PAYMENT_SCHEDULE])).toBeNull();
    expect(DEFAULT_PAYMENT_SCHEDULE[0].label).toMatch(/first day of work/);
    expect(DEFAULT_PAYMENT_SCHEDULE.map((m) => m.percent)).toEqual([50, 40, 10]);
    expect(scheduleSentence()).toBe("50% on the first day of work, when the materials arrive, 40% when the painting is complete and 10% after the final inspection and handover");
    expect(scheduleSentence([{ label: "At handover", percent: 100 }])).toBe("100% at handover");
    expect(scheduleSentence([])).toBe("");
  });

  it("name the business by its registered name once it is set", () => {
    expect(site.legalName).toBe("");
    expect(termsParty()).toBe(`the business trading as ${site.name}`);
    vi.spyOn(site, "legalName", "get").mockReturnValue("Saathi Home Services LLP" as typeof site.legalName);
    expect(termsParty()).toBe(`Saathi Home Services LLP, trading as ${site.name}`);
    expect(allText()).toContain(`mean Saathi Home Services LLP, trading as ${site.name}`);
  });

  it("end with the customer's acceptance and the lines to sign, and carry a real date", () => {
    const a = acceptanceStatement();
    expect(a.title).toBe("Customer acknowledgement and acceptance");
    expect(a.paragraphs).toHaveLength(3);
    expect(a.fields).toEqual(["Customer name", "Property address", "Quotation reference", "Date", "Customer signature", `For ${site.name}`]);
    expect(isCalendarDate(QUOTATION_TERMS_UPDATED)).toBe(true);
    expect(contentUpdated("/quotation-terms")).toBe(QUOTATION_TERMS_UPDATED);
  });
});

describe("payment milestones", () => {
  it("split a total into amounts that always add up to it", () => {
    expect(milestoneAmounts(100_000, [...DEFAULT_PAYMENT_SCHEDULE]).map((m) => m.amountPaise)).toEqual([50_000, 40_000, 10_000]);
    const odd = milestoneAmounts(100_001, [
      { label: "a", percent: 33 },
      { label: "b", percent: 33 },
      { label: "c", percent: 34 },
    ]);
    expect(odd.map((m) => m.amountPaise)).toEqual([33_000, 33_000, 34_001]);
    expect(odd.reduce((s, m) => s + m.amountPaise, 0)).toBe(100_001);
    expect(milestoneAmounts(100, [])).toEqual([]);
    expect(scheduleTotal([{ percent: 30 }, { percent: 20 }])).toBe(50);
  });

  it("say what to fix before a schedule can be saved", () => {
    expect(scheduleProblem([])).toBeNull();
    expect(scheduleProblem([{ label: "At handover", percent: 100 }])).toBeNull();
    expect(scheduleProblem(Array.from({ length: 7 }, () => ({ label: "x", percent: 10 })))).toBe("Use 6 payment milestones or fewer.");
    expect(scheduleProblem([{ label: " ", percent: 100 }])).toBe("Milestone 1: say when it is due.");
    expect(scheduleProblem([{ label: "x".repeat(121), percent: 100 }])).toBe("Milestone 1: use 120 characters or fewer.");
    expect(scheduleProblem([{ label: "x", percent: 50.5 }, { label: "y", percent: 49.5 }])).toBe("Milestone 1: the share is a whole percent from 1 to 100.");
    expect(scheduleProblem([{ label: "x", percent: 0 }])).toBe("Milestone 1: the share is a whole percent from 1 to 100.");
    expect(scheduleProblem([{ label: "x", percent: 60 }, { label: "y", percent: 30 }])).toBe("The payment milestones must add up to 100% (now 90%).");
  });
});
