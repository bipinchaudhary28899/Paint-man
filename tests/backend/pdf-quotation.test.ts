import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { promises, site } from "@/config/site";
import { pdfSafeText, PROMISE_LINE, quotationFilename, renderQuotationPdf, rupeePrefix } from "@/lib/pdf/quotation";
import type { Quotation, QuotationDocument, QuotationLine } from "@/lib/projects/repo";

// The quotation PDF (src/lib/pdf/quotation.ts), parsed back with pdf-lib.

const line = (n: number, extra: Partial<QuotationLine> = {}): QuotationLine => ({
  position: n,
  item: `Room ${n} walls`,
  description: "Putty touch-up, one coat primer, two coats Asian Paints Royale Luxury Emulsion (matt)",
  areaSqft: 120 * n,
  coats: 2,
  ratePaise: 1800,
  amountPaise: 120 * n * 1800,
  ...extra,
});

function doc(lines: QuotationLine[], q: Partial<Quotation> = {}): QuotationDocument {
  const total = lines.reduce((s, l) => s + l.amountPaise, 0);
  return {
    project: {
      id: "3f0c1a2b-1111-4222-8333-444455556666",
      name: "Asha Verma",
      phone: "9876543210",
      service: "Interior Painting",
      city: "Agra",
      locality: "Kamla Nagar",
      address: "12 Rose Villa, Nehru Road",
      pincode: "282005",
      stage: "quotation_shared",
      stageLabel: "Quotation shared",
    },
    quotation: {
      id: "9a8b7c6d-1111-4222-8333-444455556666",
      version: 2,
      status: "sent",
      sentAt: "2026-10-31T06:30:00.000Z",
      approvedAt: null,
      validUntil: "2026-11-30",
      notes: "Furniture moved and covered by our crew.\nTouch-ups included at handover.",
      paymentTerms: "Pay in two parts: half when the work is half done, the rest at handover.",
      lines,
      subtotalPaise: total,
      totalPaise: total,
      currency: "INR",
      pdf: "/api/v1/projects/x/quotations/y/pdf",
      ...q,
    },
  };
}

const parse = async (bytes: Uint8Array) => PDFDocument.load(bytes, { updateMetadata: false });

describe("renderQuotationPdf", () => {
  it("makes a one-page A4 PDF for a short quote, titled by version and brand (no personal data in the metadata)", async () => {
    const bytes = await renderQuotationPdf(doc([line(1), line(2), line(3)]));
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const pdf = await parse(bytes);
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect([Math.round(width), Math.round(height)]).toEqual([595, 842]);
    expect(pdf.getTitle()).toBe(`Quotation v2 – ${site.name}`);
    expect(pdf.getAuthor()).toBe(site.name);
    expect(pdf.getTitle()).not.toContain("Asha");
    expect(pdf.getCreationDate()?.toISOString()).toBe("2026-10-31T06:30:00.000Z");
  });

  it("breaks a long quote across pages, repeating the table header, and keeps every page's footer", async () => {
    const lines = Array.from({ length: 60 }, (_, i) => line(i + 1));
    const pdf = await parse(await renderQuotationPdf(doc(lines)));
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
  });

  it("splits a single line too long for one page instead of looping or overflowing", async () => {
    const huge = line(1, { description: "Scrape, sand, fill and prime every patch of the wall before painting. ".repeat(220) });
    const pdf = await parse(await renderQuotationPdf(doc([huge, line(2)])));
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  it("renders text the fonts lack (Hindi, emoji, tabs, very long words) without throwing", async () => {
    const odd = doc(
      [line(1, { item: "बैठक की दीवारें 🎨", description: `\tSupercalifragilistic${"x".repeat(300)}`, areaSqft: null, coats: null, ratePaise: null })],
      { notes: "नमस्ते\r\nWindows line ending\n\n", paymentTerms: null, validUntil: null },
    );
    odd.project = { ...odd.project, name: "आशा", address: null, locality: null, pincode: null, service: null, phone: "+44 20 7946 0000" };
    const pdf = await parse(await renderQuotationPdf(odd));
    expect(pdf.getPageCount()).toBe(1);
  });

  it("prints a quote with no lines, and each status (approved, superseded, declined, a draft preview)", async () => {
    for (const q of [
      { status: "approved" as const, approvedAt: "2026-11-02T05:00:00.000Z" },
      { status: "superseded" as const },
      { status: "declined" as const },
      { status: "draft" as const, sentAt: null },
    ]) {
      const pdf = await parse(await renderQuotationPdf(doc([], q), { now: new Date("2026-11-05T05:00:00.000Z") }));
      expect(pdf.getPageCount(), q.status).toBe(1);
      if (q.status === "draft") expect(pdf.getCreationDate()?.toISOString()).toBe("2026-11-05T05:00:00.000Z");
    }
  });

  it("long notes and payment terms flow onto further pages", async () => {
    const pdf = await parse(await renderQuotationPdf(doc([line(1)], { notes: "A note about the work. ".repeat(600), paymentTerms: "Terms. ".repeat(400) })));
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
  });
});

describe("PDF helpers", () => {
  it("names the download after the brand and version", () => {
    expect(quotationFilename(3)).toBe("Paint-Saathi-quotation-v3.pdf");
  });

  it("writes Rs. where the font has no rupee sign", () => {
    expect(rupeePrefix(new Set([0x20b9]))).toBe("₹");
    expect(rupeePrefix(new Set())).toBe("Rs. ");
  });

  it("replaces characters the font cannot draw with ? and keeps newlines", () => {
    const latin = new Set([..."Hello world?".split("").map((c) => c.codePointAt(0)!)]);
    expect(pdfSafeText("Hello\tworld\r\nनमस्ते 🎨", latin)).toBe("Hello world\n?????? ?");
  });

  it("prints the promises line from site.ts", () => {
    expect(PROMISE_LINE).toBe(`${promises[0].title}. Nothing is added without your written approval.`);
    expect(PROMISE_LINE).toBe("Zero advance payment. Nothing is added without your written approval.");
  });
});
