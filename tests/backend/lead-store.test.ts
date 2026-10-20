import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeadInput } from "@/lib/leads/schema";

const booking: LeadInput = {
  type: "booking",
  name: "Asha",
  phone: "9876543210",
  address: "12, Rose Villa, Nehru Road",
  locality: "Dayalbagh",
  pincode: "282005",
  city: "agra",
  propertyType: "Independent House",
  service: "Exterior Painting",
  preferredDate: "2026-11-02",
  message: "Cracks on the east wall",
  floors: "2",
  homeSize: "3 BHK",
  carpetArea: 1200,
  page: "/book",
  tracking: { utmSource: "google", utmMedium: "cpc", utmCampaign: "diwali", landingPage: "/", referrer: "https://google.com" },
};

const contact: LeadInput = { type: "contact", name: "Ravi", phone: "9123456789", message: "Hello there" };

describe("toRow", () => {
  it("maps a booking to the sheet columns in order", async () => {
    const { toRow, LEAD_COLUMNS } = await import("@/lib/leads/store");
    const row = toRow(booking, "L1", new Date("2026-10-18T06:30:00Z"));
    expect(row).toHaveLength(LEAD_COLUMNS.length);
    expect(row.slice(1, 10)).toEqual([
      "L1", "booking", "Asha", "9876543210", "Dayalbagh", "Independent House", "Exterior Painting", "2026-11-02", "Cracks on the east wall",
    ]);
    expect(row.slice(10, 17)).toEqual(["/book", "google", "cpc", "diwali", "/", "https://google.com", "New"]);
    // job size; exterior-only, so no paint-area estimate
    expect(row.slice(17, 21)).toEqual(["2", "3 BHK", "1200", ""]);
    // the full address, in the columns added after the job size
    expect(row.slice(21)).toEqual(["12, Rose Villa, Nehru Road", "282005", "Agra"]);
  });

  it("formats the timestamp in Indian time", async () => {
    const { toRow } = await import("@/lib/leads/store");
    const row = toRow(booking, "L1", new Date("2026-10-18T06:30:00Z"));
    expect(row[0]).toMatch(/18\/10\/2026, 12:00:00\s?pm/i);
  });

  it("leaves booking-only columns blank for contact messages", async () => {
    const { toRow } = await import("@/lib/leads/store");
    const row = toRow(contact, "L2", new Date());
    expect(row.slice(5, 9)).toEqual(["", "", "", ""]);
    expect(row[9]).toBe("Hello there");
  });
});

describe("csvCell", () => {
  it.each(["=HYPERLINK(\"http://evil\")", "+1+1", "-2", "@SUM(A1)", "\tcmd"])("neutralises formula injection in %j", async (v) => {
    const { csvCell } = await import("@/lib/leads/store");
    expect(csvCell(v).startsWith(`"'`)).toBe(true);
  });

  it("quotes values and escapes double quotes", async () => {
    const { csvCell } = await import("@/lib/leads/store");
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
  });
});

describe("parseCsv and rowsToLeads", () => {
  it("parses quoted fields, escaped quotes, commas and newlines", async () => {
    const { parseCsv } = await import("@/lib/leads/store");
    const rows = parseCsv('a,b,c\r\n"x, y","say ""hi""","line1\nline2"\n');
    expect(rows).toEqual([["a", "b", "c"], ["x, y", 'say "hi"', "line1\nline2"]]);
  });

  it("maps rows by header name, skips blank rows and returns newest first", async () => {
    const { rowsToLeads } = await import("@/lib/leads/store");
    const leads = rowsToLeads([
      ["Name", "Lead ID", "Type"],
      ["First", "L1", "booking"],
      ["", "", ""],
      ["Second", "L2", "contact"],
    ]);
    expect(leads.map((l) => l.Name)).toEqual(["Second", "First"]);
    expect(leads[0]["Lead ID"]).toBe("L2");
    expect(leads[0].Phone).toBe("");
  });

  it("returns no leads for an empty sheet", async () => {
    const { rowsToLeads } = await import("@/lib/leads/store");
    expect(rowsToLeads([])).toEqual([]);
  });
});

describe("saveLead / readLeads with the local CSV fallback", () => {
  let dir: string;
  const env = { ...process.env };

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "pm-leads-"));
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    delete process.env.GOOGLE_SHEETS_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
    vi.resetModules();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    process.env = { ...env };
    await rm(dir, { recursive: true, force: true });
  });

  it("writes a header once, appends rows and reads them back newest first", async () => {
    const { saveLead, readLeads } = await import("@/lib/leads/store");
    const id1 = await saveLead(booking);
    const id2 = await saveLead(contact);
    expect(id1).toMatch(/^L[A-Z0-9]+$/);
    expect(id1).not.toBe(id2);

    const csv = await readFile(path.join(dir, "data", "leads.csv"), "utf8");
    expect(csv.match(/Submitted At/g)).toHaveLength(1);

    const leads = await readLeads();
    expect(leads.map((l) => l.Name)).toEqual(["Ravi", "Asha"]);
    expect(leads[1].Locality).toBe("Dayalbagh");
  });

  it("stores formula-like input safely", async () => {
    const { saveLead } = await import("@/lib/leads/store");
    await saveLead({ ...contact, message: "=IMPORTXML(\"http://evil\")" });
    const csv = await readFile(path.join(dir, "data", "leads.csv"), "utf8");
    expect(csv).toContain(`"'=IMPORTXML(""http://evil"")"`);
  });

  it("returns an empty list when no leads have been saved", async () => {
    const { readLeads } = await import("@/lib/leads/store");
    expect(await readLeads()).toEqual([]);
  });

  it("refuses to fall back to a local file on Vercel (read-only disk)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    const { saveLead, readLeads, StorageNotConfiguredError } = await import("@/lib/leads/store");
    await expect(saveLead(booking)).rejects.toBeInstanceOf(StorageNotConfiguredError);
    await expect(readLeads()).rejects.toBeInstanceOf(StorageNotConfiguredError);
    vi.unstubAllEnvs();
  });

  it("uses the local CSV for a production build on your own machine (npm start)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "");
    const { saveLead, readLeads } = await import("@/lib/leads/store");
    await saveLead(contact);
    expect((await readLeads()).map((l) => l.Name)).toEqual(["Ravi"]);
    vi.unstubAllEnvs();
  });
});

describe("job size columns", () => {
  it("adds floors, size, carpet area and the estimated paint area at the end of the row", async () => {
    const { toRow, LEAD_COLUMNS, columnLetter } = await import("@/lib/leads/store");
    const interior = toRow({ ...booking, service: "Interior Painting" }, "L2", new Date());
    const at = (c: string) => interior[LEAD_COLUMNS.indexOf(c as (typeof LEAD_COLUMNS)[number])];
    expect(LEAD_COLUMNS.slice(17, 21)).toEqual(["Floors", "Home Size", "Carpet Area per Floor (sq ft)", "Est. Paint Area (sq ft)"]);
    expect(LEAD_COLUMNS.slice(21)).toEqual(["Address", "PIN Code", "City"]);
    expect(LEAD_COLUMNS.indexOf("Status")).toBe(16); // existing columns keep their places
    expect(at("Floors")).toBe("2");
    expect(at("Home Size")).toBe("3 BHK");
    expect(at("Carpet Area per Floor (sq ft)")).toBe("1200");
    expect(at("Est. Paint Area (sq ft)")).toBe("8400"); // 1200 × 2 floors × 3.5
    // exterior-only: measured on site; messages: no job size at all
    expect(toRow(booking, "L3", new Date())[LEAD_COLUMNS.indexOf("Est. Paint Area (sq ft)")]).toBe("");
    expect(toRow(contact, "L4", new Date()).slice(-7)).toEqual(["", "", "", "", "", "", ""]);
    // a small job (one wall, a door) is measured on site; with no floors given, one floor is assumed
    const { floors: _f, ...noFloors } = { ...booking, service: "Interior Painting" as const };
    expect(toRow(noFloors, "L5", new Date())[LEAD_COLUMNS.indexOf("Est. Paint Area (sq ft)")]).toBe("4200");
    expect(toRow({ ...booking, service: "Doors, Windows & Small Jobs" }, "L6", new Date())[LEAD_COLUMNS.indexOf("Est. Paint Area (sq ft)")]).toBe("");
    // a booking with no job details leaves those columns blank
    const { propertyType: _p, service: _s, homeSize: _h, ...bare } = noFloors;
    const row = toRow(bare, "L7", new Date());
    expect([row[6], row[7], row[17], row[18]]).toEqual(["", "", "", ""]);
    expect([columnLetter(1), columnLetter(21), columnLetter(26), columnLetter(27)]).toEqual(["A", "U", "Z", "AA"]);
  });
});

describe("Google Sheets storage", () => {
  const sheetEnv = () => {
    vi.stubEnv("GOOGLE_SHEETS_ID", "sheet123");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "bot@example.iam.gserviceaccount.com");
    vi.stubEnv("GOOGLE_PRIVATE_KEY", "unused");
  };
  const tokenCalls = vi.fn();
  const mockAuth = () =>
    vi.doMock("google-auth-library", () => ({
      JWT: class {
        async getAccessToken() {
          tokenCalls();
          return { token: "t" };
        }
      },
    }));
  const lead = { type: "contact" as const, name: "Ravi", phone: "9123456789", message: "Shop repaint" };

  afterEach(() => {
    vi.doUnmock("google-auth-library");
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    tokenCalls.mockReset();
  });

  it("appends a lead with one Google request, reusing the token fetched early", async () => {
    sheetEnv();
    vi.resetModules();
    mockAuth();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ updates: { updatedRange: "Leads!A7:Q7" } })),
    );
    const { saveLead, warmLeadStorage } = await import("@/lib/leads/store");
    const { createTimer } = await import("@/lib/timing");
    warmLeadStorage();
    const timer = createTimer();
    await saveLead(lead, timer);
    await saveLead(lead);

    expect(tokenCalls).toHaveBeenCalledTimes(1); // one token, shared by the warm-up and both leads
    expect(fetchSpy).toHaveBeenCalledTimes(2); // one append per lead, no header check
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("/values/Leads!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer t");
    expect(Object.keys(timer.summary())).toEqual(expect.arrayContaining(["sheets-token", "sheets-append"]));
  });

  it("writes the header above the first lead when the sheet was empty", async () => {
    sheetEnv();
    vi.resetModules();
    mockAuth();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ updates: { updatedRange: "Leads!A1:Q1" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({})));
    const { saveLead, LEAD_COLUMNS } = await import("@/lib/leads/store");
    await saveLead(lead);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const [url, init] = fetchSpy.mock.calls[1];
    expect(String(url)).toContain("/values/Leads!A1?valueInputOption=RAW");
    expect(init?.method).toBe("PUT");
    const values = JSON.parse(String(init?.body)).values;
    expect(values[0]).toEqual([...LEAD_COLUMNS]);
    expect(values[1]).toContain("Ravi");
  });

  it("retries the token after a failed token request", async () => {
    sheetEnv();
    vi.resetModules();
    let fail = true;
    vi.doMock("google-auth-library", () => ({
      JWT: class {
        async getAccessToken() {
          tokenCalls();
          if (fail) throw new Error("invalid_grant");
          return { token: "t2" };
        }
      },
    }));
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(JSON.stringify({ updates: { updatedRange: "Leads!A3:Q3" } })));
    const { saveLead, warmLeadStorage } = await import("@/lib/leads/store");
    warmLeadStorage(); // a failing warm-up is swallowed
    await expect(saveLead(lead)).rejects.toThrow("invalid_grant");
    fail = false;
    await expect(saveLead(lead)).resolves.toMatch(/^L/);
    expect(tokenCalls.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("repairs the header row after a lead (once per instance), leaving other rows alone", async () => {
    sheetEnv();
    vi.resetModules();
    mockAuth();
    const old = ["Submitted At (IST)", "Lead ID", "Type"]; // a sheet made before the job-size columns
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ values: [old] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({})));
    const { ensureSheetHeader, LEAD_COLUMNS } = await import("@/lib/leads/store");
    await ensureSheetHeader();
    await ensureSheetHeader(); // second call: nothing to do
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[0][0])).toContain("/values/Leads!A1:X1");
    const [url, init] = fetchSpy.mock.calls[1];
    expect(String(url)).toContain("/values/Leads!A1:X1?valueInputOption=RAW");
    expect(JSON.parse(String(init?.body)).values).toEqual([[...LEAD_COLUMNS]]);
  });

  it("leaves a current header alone", async () => {
    sheetEnv();
    vi.resetModules();
    mockAuth();
    const { ensureSheetHeader, LEAD_COLUMNS } = await import("@/lib/leads/store");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ values: [[...LEAD_COLUMNS]] })));
    await ensureSheetHeader();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does nothing on warm-up when Sheets is not configured", async () => {
    vi.stubEnv("GOOGLE_SHEETS_ID", "");
    vi.resetModules();
    const { warmLeadStorage, ensureSheetHeader } = await import("@/lib/leads/store");
    expect(() => warmLeadStorage()).not.toThrow();
    await expect(ensureSheetHeader()).resolves.toBeUndefined();
  });
});

describe("leadLoadErrorMessage (shown to the signed-in admin)", () => {
  it("explains each failure with the setting to fix, never a value", async () => {
    const { StorageNotConfiguredError, SheetsRequestError } = await import("@/lib/leads/store");
    const { leadLoadErrorMessage } = await import("@/lib/leads/load-error");
    expect(leadLoadErrorMessage(new StorageNotConfiguredError())).toMatch(/isn't connected yet.*GOOGLE_SHEETS_ID/);
    expect(leadLoadErrorMessage(new SheetsRequestError(403))).toMatch(/Share the sheet/);
    expect(leadLoadErrorMessage(new SheetsRequestError(404))).toMatch(/GOOGLE_SHEETS_ID/);
    expect(leadLoadErrorMessage(new SheetsRequestError(400))).toMatch(/tab named "Leads"/);
    expect(leadLoadErrorMessage(new SheetsRequestError(429))).toMatch(/rate-limiting/);
    expect(leadLoadErrorMessage(new Error("invalid_grant: Invalid JWT Signature."))).toMatch(/GOOGLE_PRIVATE_KEY/);
    expect(leadLoadErrorMessage(new Error("something else"))).toMatch(/Couldn't load leads/);
  });

  it("does not include the Sheets response body in errors", async () => {
    vi.stubEnv("GOOGLE_SHEETS_ID", "sheet123");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "bot@example.iam.gserviceaccount.com");
    vi.stubEnv("GOOGLE_PRIVATE_KEY", "unused");
    vi.resetModules();
    vi.doMock("google-auth-library", () => ({ JWT: class { async getAccessToken() { return { token: "t" }; } } }));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("secret details 9876543210", { status: 403 }));
    const { readLeads, SheetsRequestError } = await import("@/lib/leads/store");
    const err = await readLeads().catch((e) => e);
    expect(err).toBeInstanceOf(SheetsRequestError);
    expect(err.message).not.toContain("9876543210");
    vi.doUnmock("google-auth-library");
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
});

describe("toRow: quick site visits and the waitlist", () => {
  it("files a live-city request as a site visit, with the city in the locality column", async () => {
    const { toRow, LEAD_COLUMNS } = await import("@/lib/leads/store");
    const row = toRow({ type: "visit", name: "Asha", phone: "9876543210", city: "agra", locality: "Kamla Nagar" }, "L3", new Date());
    expect(row).toHaveLength(LEAD_COLUMNS.length);
    expect(row.slice(2, 6)).toEqual(["visit", "Asha", "9876543210", "Kamla Nagar, Agra"]);
    expect(row[9]).toMatch(/Quick site-visit request/);
    expect(row.slice(6, 9)).toEqual(["", "", ""]); // property, service and date are taken on the call
  });

  it("files a request for a city that is not live as a waitlist entry", async () => {
    const { toRow } = await import("@/lib/leads/store");
    const row = toRow({ type: "visit", name: "Ravi", phone: "9123456789", city: "bangalore" }, "L4", new Date());
    expect(row[2]).toBe("waitlist");
    expect(row[5]).toBe("Bangalore");
    expect(row[9]).toMatch(/Waitlist: not painting in Bangalore yet/);
  });
});
