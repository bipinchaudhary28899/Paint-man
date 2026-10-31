import { describe, expect, it } from "vitest";
import { z } from "zod";
import { NextRequest } from "next/server";
import { inputErrors, readAdminInput } from "@/lib/admin/guard";
import { formatIstDateTime, fromIstParts, toIstParts } from "@/lib/admin/ist";
import { autoAmount, blankLine, buildQuotationRequest, draftFromLine, draftTotal, parseWhole, type LineDraft } from "@/lib/admin/quotation-form";
import { paiseToInput, parseRupees } from "@/lib/admin/rupees";
import { quotationStatusSchema, workStartSchema } from "@/lib/projects/inputs";

// The pure helpers behind the admin tools: rupees ↔ paise without float drift, India-time inputs,
// the quotation editor's conversion to the save request, and the admin input schemas.

describe("rupees and paise", () => {
  it("parses typed rupee amounts to exact integer paise", () => {
    expect(parseRupees("1234")).toBe(123_400);
    expect(parseRupees("1,23,456.50")).toBe(12_345_650);
    expect(parseRupees("₹ 123,456.5")).toBe(12_345_650);
    expect(parseRupees("0.1")).toBe(10);
    expect(parseRupees(".05")).toBe(5);
    expect(parseRupees("12.")).toBe(1_200);
    // the classic float traps come out exact
    expect(parseRupees("0.29")).toBe(29);
    expect(parseRupees("1.15")).toBe(115);
    expect(parseRupees("4.35")).toBe(435);
    expect(parseRupees("9999999999.99")).toBe(999_999_999_999);
  });

  it("refuses anything that is not a plain rupee amount", () => {
    for (const bad of ["", "  ", ".", "-5", "12.345", "1e5", "abc", "12.3.4", "₹", "12345678901"]) expect(parseRupees(bad)).toBeNull();
  });

  it("writes paise back as an input value, and every typed amount round-trips exactly", () => {
    expect(paiseToInput(123_450)).toBe("1234.50");
    expect(paiseToInput(500_000)).toBe("5000");
    expect(paiseToInput(5)).toBe("0.05");
    for (const paise of [0, 1, 29, 115, 435, 1_050_000, 12_345_650, 999_999_999_999]) expect(parseRupees(paiseToInput(paise))).toBe(paise);
  });
});

describe("India time for the admin inputs", () => {
  it("splits an instant into India date and time, and joins them back with the offset", () => {
    expect(toIstParts("2026-11-04T06:00:00.000Z")).toEqual({ date: "2026-11-04", time: "11:30" });
    expect(toIstParts(new Date("2026-11-03T20:00:00Z"))).toEqual({ date: "2026-11-04", time: "01:30" });
    expect(fromIstParts("2026-11-04", "11:30")).toBe("2026-11-04T11:30:00+05:30");
    expect(new Date(fromIstParts("2026-11-04", "11:30")).toISOString()).toBe("2026-11-04T06:00:00.000Z");
    expect(formatIstDateTime("2026-11-04T06:00:00.000Z")).toMatch(/4 Nov 2026.*11:30/);
  });
});

describe("the quotation editor's form", () => {
  const draft = (over: Partial<LineDraft>): LineDraft => ({ ...blankLine("k1"), item: "Hall", amount: "100", ...over });

  it("shows a saved line as text, and fills the amount from area × rate", () => {
    expect(draftFromLine({ item: "Hall", description: null, areaSqft: 420, coats: 2, ratePaise: 2_550, amountPaise: 1_071_000 }, "k")).toEqual({
      key: "k",
      item: "Hall",
      description: "",
      area: "420",
      coats: "2",
      rate: "25.50",
      amount: "10710",
    });
    expect(draftFromLine({ item: "Door", description: "Enamel", areaSqft: null, coats: null, ratePaise: null, amountPaise: 250_000 }, "k")).toMatchObject({ description: "Enamel", area: "", coats: "", rate: "", amount: "2500" });
    expect(autoAmount("420", "25.5")).toBe("10710");
    expect(autoAmount("1,200", "12.25")).toBe("14700");
    expect(autoAmount("", "25")).toBeNull();
    expect(autoAmount("420", "")).toBeNull();
    expect(autoAmount("12.5", "25")).toBeNull();
    expect(autoAmount("420", "abc")).toBeNull();
  });

  it("reads whole numbers, blank as none", () => {
    expect(parseWhole("1,200", 1_000_000)).toBe(1_200);
    expect(parseWhole(" ", 10)).toBeNull();
    expect(parseWhole("11", 10)).toBeUndefined();
    expect(parseWhole("2.5", 10)).toBeUndefined();
    expect(parseWhole("-1", 10)).toBeUndefined();
  });

  it("totals the amounts that parse", () => {
    expect(draftTotal([draft({ amount: "10710" }), draft({ amount: "2,500.50" }), draft({ amount: "oops" })])).toBe(1_321_050);
    expect(draftTotal([])).toBe(0);
  });

  it("builds the save request in paise, with blank text as null", () => {
    const built = buildQuotationRequest([draft({ item: " Hall ", description: " Two coats ", area: "420", coats: "2", rate: "25.50", amount: "10,710" }), draft({ key: "k2", item: "Door", amount: "2500" })], {
      notes: " ",
      paymentTerms: "50% at start",
      validUntil: "2026-11-30",
    });
    expect(built).toEqual({
      ok: true,
      request: {
        lines: [
          { item: "Hall", description: "Two coats", areaSqft: 420, coats: 2, ratePaise: 2_550, amountPaise: 1_071_000 },
          { item: "Door", description: null, areaSqft: null, coats: null, ratePaise: null, amountPaise: 250_000 },
        ],
        notes: null,
        paymentTerms: "50% at start",
        validUntil: "2026-11-30",
      },
    });
    expect(buildQuotationRequest([], { notes: "", paymentTerms: "", validUntil: "" })).toEqual({ ok: true, request: { lines: [], notes: null, paymentTerms: null, validUntil: null } });
  });

  it("names every problem with its line, keyed by the row and field", () => {
    const built = buildQuotationRequest(
      [
        draft({ key: "a" }),
        draft({ key: "b", item: "", description: "x".repeat(501), area: "12.5", coats: "11", rate: "lots", amount: "" }),
        draft({ key: "c", item: "x".repeat(121), amount: "100000000.01" }),
      ],
      { notes: "", paymentTerms: "", validUntil: "30/11/2026" },
    );
    expect(built).toEqual({
      ok: false,
      errors: {
        "b.item": "Line 2: name the room or item.",
        "b.description": "Line 2: use 500 characters or fewer for the description.",
        "b.area": "Line 2: the area is a whole number of sq ft.",
        "b.coats": "Line 2: coats is a whole number up to 10.",
        "b.rate": "Line 2: enter the rate in rupees, e.g. 25 or 25.50.",
        "b.amount": "Line 2: enter the amount in rupees.",
        "c.item": "Line 3: use 120 characters or fewer for the item.",
        "c.amount": "Line 3: enter the amount in rupees (up to ₹1 crore), e.g. 10500.",
        validUntil: "Choose the valid-until date.",
      },
    });
  });
});

describe("admin input schemas and messages", () => {
  it("validates the work start date and the quotation status change", () => {
    expect(workStartSchema.parse({ workStartsOn: "2026-11-10" })).toEqual({ workStartsOn: "2026-11-10" });
    expect(workStartSchema.parse({ workStartsOn: " " })).toEqual({ workStartsOn: null });
    expect(workStartSchema.safeParse({ workStartsOn: "2026-13-01" }).success).toBe(false);
    expect(quotationStatusSchema.parse({ status: "approved" })).toEqual({ status: "approved" });
    expect(quotationStatusSchema.safeParse({ status: "draft" }).success).toBe(false);
  });

  it("turns validation issues into field messages, listing the choices of a bad option", () => {
    const schema = z.object({ kind: z.enum(["a", "b"], { message: "Pick one" }), lines: z.array(z.object({ n: z.number() })) });
    const result = schema.safeParse({ kind: "c", lines: [{ n: 1 }, { n: "x" }] });
    expect(result.success).toBe(false);
    expect(inputErrors(result.error!)).toEqual({ kind: "Pick one (one of: a, b)", "lines.1.n": expect.stringMatching(/number/) });
    expect(inputErrors(z.object({}).safeParse(null).error!)).toEqual({ body: expect.any(String) });
  });
});

describe("readAdminInput", () => {
  it("refuses a body sent without a content type", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/x", { method: "POST", body: new Blob(["{}"]) });
    const result = await readAdminInput(req, z.object({}));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(415);
  });
});
