import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { renderQuotationPdf } from "@/lib/pdf/quotation";
import type { QuotationDocument } from "@/lib/projects/repo";

// The terms start on a page of their own after the quotation: with one short section of terms, a
// short quote is exactly two pages (the quotation, then the terms and the acceptance lines).

vi.mock("@/config/quotation-terms", async (actual) => ({
  ...(await actual<typeof import("@/config/quotation-terms")>()),
  quotationTerms: () => [{ id: "about", title: "About these terms", blocks: [{ kind: "p", text: "Short terms." }, { kind: "list", items: ["One point."] }] }],
}));

const doc: QuotationDocument = {
  project: { id: "3f0c1a2b-1111-4222-8333-444455556666", name: "Asha Verma", phone: "9876543210", service: "Interior Painting", city: "Agra", locality: "Kamla Nagar", address: null, pincode: null, stage: "price_finalised", stageLabel: "Price finalised" },
  quotation: {
    id: "9a8b7c6d-1111-4222-8333-444455556666",
    version: 1,
    reference: "PS-3F0C1A2B-V1",
    status: "approved",
    sentAt: "2026-10-31T06:30:00.000Z",
    approvedAt: "2026-11-01T06:30:00.000Z",
    validUntil: null,
    notes: null,
    paymentTerms: null,
    paymentSchedule: [],
    lines: [{ position: 1, item: "Walls", description: null, areaSqft: null, coats: null, ratePaise: null, amountPaise: 100_000 }],
    subtotalPaise: 100_000,
    totalPaise: 100_000,
    currency: "INR",
    pdf: "/x",
  },
};

describe("the Terms & Conditions in the quotation PDF", () => {
  it("begin on a new page after the quotation, with the acceptance lines after them", async () => {
    const pdf = await PDFDocument.load(await renderQuotationPdf(doc), { updateMetadata: false });
    expect(pdf.getPageCount()).toBe(2);
  });
});
