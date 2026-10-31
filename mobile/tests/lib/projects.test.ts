import { File } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { apiBase } from "~/lib/config";
import {
  downloadError,
  downloadQuotationPdf,
  downloadStatus,
  formatCalendarDay,
  formatDay,
  formatRupees,
  formatVisit,
  indianGrouping,
  lineDetails,
  nextStep,
  pdfFileName,
  projectTitle,
  QUOTATION_STATUS,
  spokenRupees,
  summaryExplanation,
} from "~/lib/projects";
import { ApiError } from "~/lib/api";
import { STAGE_LABELS, type StageStep } from "~/shared";

const download = File.downloadFileAsync as unknown as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("money", () => {
  it("groups rupees the Indian way", () => {
    expect(indianGrouping(0)).toBe("0");
    expect(indianGrouping(999)).toBe("999");
    expect(indianGrouping(1000)).toBe("1,000");
    expect(indianGrouping(100000)).toBe("1,00,000");
    expect(indianGrouping(12345678)).toBe("1,23,45,678");
  });

  it("writes integer paise as rupees, with paise only when there are any", () => {
    expect(formatRupees(4500000)).toBe("₹45,000");
    expect(formatRupees(12345)).toBe("₹123.45");
    expect(formatRupees(150050)).toBe("₹1,500.50");
    expect(formatRupees(0)).toBe("₹0");
    expect(formatRupees(-250000)).toBe("−₹2,500");
    expect(spokenRupees(4500000)).toBe("45,000 rupees");
  });
});

describe("dates in India time", () => {
  it("gives the day of a moment in India, even across midnight UTC", () => {
    expect(formatDay("2026-10-31T06:30:00.000Z")).toBe("Sat 31 Oct 2026");
    // 20:00 UTC is 1:30 am the next day in India
    expect(formatDay("2026-10-31T20:00:00.000Z")).toBe("Sun 1 Nov 2026");
    expect(formatDay("not a date")).toBe("");
  });

  it("gives a visit's day and time", () => {
    expect(formatVisit("2026-11-04T06:00:00.000Z")).toBe("Wed 4 Nov 2026, 11:30 am");
    expect(formatVisit("2026-11-04T12:30:00.000Z")).toBe("Wed 4 Nov 2026, 6:00 pm");
    expect(formatVisit("2026-11-04T18:30:00.000Z")).toBe("Thu 5 Nov 2026, 12:00 am");
    expect(formatVisit("nope")).toBe("");
  });

  it("writes a calendar day, and leaves anything else as it is", () => {
    expect(formatCalendarDay("2026-11-10")).toBe("Tue 10 Nov 2026");
    expect(formatCalendarDay("soon")).toBe("soon");
  });
});

describe("stages and quotations in words", () => {
  const step = (stage: StageStep["stage"], done: boolean, current: boolean): StageStep => ({ stage, label: STAGE_LABELS[stage], done, current });

  it("explains a stage in the website's words", () => {
    expect(summaryExplanation("booked")).toBe("We call you during working hours to fix the visit.");
    expect(summaryExplanation("inspection_scheduled")).toBe("Our inspector visits at the time agreed on the call.");
  });

  it("names the next step on the main line, and none after a hold or the handover", () => {
    expect(nextStep([step("booked", true, false), step("call_confirmed", false, true), step("inspection_scheduled", false, false)])?.label).toBe("Inspection scheduled");
    expect(nextStep([step("booked", true, false), step("completed", false, true)])).toBeUndefined();
    expect(nextStep([step("booked", true, false), step("call_confirmed", false, false), step("on_hold", false, true)])).toBeUndefined();
    expect(nextStep([step("booked", false, false)])).toBeUndefined();
  });

  it("words each quotation status for the customer", () => {
    expect(QUOTATION_STATUS).toEqual({ sent: "Ready to review", approved: "Approved", declined: "Declined", superseded: "Replaced by a newer version" });
  });

  it("lists a line's measurements when the quotation gives them", () => {
    expect(lineDetails({ areaSqft: 1200, coats: 2, ratePaise: 1800 })).toBe("1,200 sq ft · 2 coats · ₹18 per sq ft");
    expect(lineDetails({ areaSqft: null, coats: 1, ratePaise: 250000 })).toBe("1 coat · ₹2,500");
    expect(lineDetails({ areaSqft: null, coats: null, ratePaise: null })).toBe("");
  });

  it("names the project and where it is", () => {
    expect(projectTitle({ service: "Interior Painting", locality: "Kamla Nagar", city: "Agra" })).toEqual({ what: "Interior Painting", where: "Kamla Nagar, Agra" });
    expect(projectTitle({ service: null, locality: null, city: null })).toEqual({ what: "Painting project", where: null });
  });
});

describe("the quotation PDF", () => {
  const quotation = { pdf: "/api/v1/projects/p1/quotations/q1/pdf", version: 2 };

  it("downloads with the bearer token into the cache and opens the share sheet as a PDF", async () => {
    await downloadQuotationPdf("tok", quotation);
    expect(download).toHaveBeenCalledWith(`${apiBase()}/api/v1/projects/p1/quotations/q1/pdf`, expect.objectContaining({ uri: `file:///cache/${pdfFileName(2)}` }), {
      headers: { Authorization: "Bearer tok", Accept: "application/pdf" },
      idempotent: true,
    });
    expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///cache/Paint-Saathi-quotation-v2.pdf", { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Quotation version 2" });
  });

  it("refuses a link that is not the API's", async () => {
    await expect(downloadQuotationPdf("tok", { pdf: "https://elsewhere.example/x.pdf", version: 1 })).rejects.toMatchObject({ code: "bad_response" });
    expect(download).not.toHaveBeenCalled();
  });

  it("reads the status of a failed download and says what went wrong", async () => {
    download.mockRejectedValueOnce(new Error("Unable to download a file: response has status 401"));
    await expect(downloadQuotationPdf("tok", quotation)).rejects.toMatchObject({ code: "unauthenticated", status: 401 });
    download.mockRejectedValueOnce(new Error("Unable to download a file: response has status: 404"));
    await expect(downloadQuotationPdf("tok", quotation)).rejects.toMatchObject({ code: "not_found", status: 404 });
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(downloadStatus(new Error("HTTP 503"))).toBe(503);
    expect(downloadStatus("nothing")).toBe(0);
    expect(downloadError(new Error("HTTP 500"))).toMatchObject({ code: "download_failed", status: 500 });
    expect(downloadError(new Error("The Internet connection appears to be offline."))).toMatchObject({ code: "network" });
    const own = new ApiError("x", "y");
    expect(downloadError(own)).toBe(own);
  });

  it("says so when the phone cannot share files", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    await expect(downloadQuotationPdf("tok", quotation)).rejects.toMatchObject({ code: "sharing_unavailable" });
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});
