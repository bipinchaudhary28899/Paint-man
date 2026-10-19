import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leadSchema } from "@/lib/leads/schema";

const booking = {
  type: "booking",
  name: "Asha Verma",
  phone: "9876543210",
  locality: "Kamla Nagar",
  propertyType: "Apartment / Flat",
  service: "Interior Painting",
  floors: "1",
  homeSize: "2 BHK",
};

const errorFields = (input: unknown) => {
  const r = leadSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => String(i.path[0]));
};

describe("lead schema: job size", () => {
  it("requires floors and home size on a booking", () => {
    const { floors: _f, homeSize: _h, ...rest } = booking;
    expect(errorFields(rest)).toEqual(expect.arrayContaining(["floors", "homeSize"]));
    expect(errorFields({ ...booking, floors: "9" })).toEqual(["floors"]);
  });

  it("takes an optional carpet area, with commas or spaces, in range", () => {
    const parse = (carpetArea: unknown) => leadSchema.parse({ ...booking, carpetArea });
    expect((parse("1,200") as { carpetArea?: number }).carpetArea).toBe(1200);
    expect((parse(" 850 ") as { carpetArea?: number }).carpetArea).toBe(850);
    expect((parse("") as { carpetArea?: number }).carpetArea).toBeUndefined();
    expect((parse(undefined) as { carpetArea?: number }).carpetArea).toBeUndefined();
    expect(errorFields({ ...booking, carpetArea: "50" })).toEqual(["carpetArea"]);
    expect(errorFields({ ...booking, carpetArea: "25000" })).toEqual(["carpetArea"]);
    expect(errorFields({ ...booking, carpetArea: "12.5" })).toEqual(["carpetArea"]);
    expect(errorFields({ ...booking, carpetArea: "lots" })).toEqual(["carpetArea"]);
  });
});

describe("lead schema: bookings", () => {
  it("accepts a valid booking", () => {
    expect(leadSchema.safeParse(booking).success).toBe(true);
  });

  it.each([
    ["+91 98765 43210", "9876543210"],
    ["+91-98765-43210", "9876543210"],
    ["919876543210", "9876543210"],
    ["09876543210", "9876543210"],
    ["  6123456789 ", "6123456789"],
  ])("normalises Indian mobile %s to %s", (input, expected) => {
    const r = leadSchema.parse({ ...booking, phone: input });
    expect(r.phone).toBe(expected);
  });

  it.each(["12345", "5876543210", "98765432101", "98765abcde", "", "+1 415 555 0100"])("rejects invalid phone %j", (phone) => {
    expect(errorFields({ ...booking, phone })).toContain("phone");
  });

  it("trims whitespace from text fields", () => {
    const r = leadSchema.parse({ ...booking, name: "  Asha  ", locality: " Sikandra " });
    expect(r.name).toBe("Asha");
    expect(r.type === "booking" && r.locality).toBe("Sikandra");
  });

  it("requires name, locality, property type and service", () => {
    const fields = errorFields({ type: "booking", phone: "9876543210" });
    expect(fields).toEqual(expect.arrayContaining(["name", "locality", "propertyType", "service"]));
  });

  it("rejects values outside the allowed lists", () => {
    expect(errorFields({ ...booking, propertyType: "Castle" })).toContain("propertyType");
    expect(errorFields({ ...booking, service: "Car wrap" })).toContain("service");
  });

  it("caps field lengths to stop oversized payloads", () => {
    expect(errorFields({ ...booking, name: "a".repeat(81) })).toContain("name");
    expect(errorFields({ ...booking, message: "a".repeat(1001) })).toContain("message");
  });

  it("rejects submissions where the hidden honeypot field is filled", () => {
    expect(errorFields({ ...booking, website: "http://spam.example" })).toContain("website");
  });
});

describe("lead schema: preferred inspection date", () => {
  /** Sets the clock; the times below are UTC, India is UTC+05:30. */
  const at = (iso: string) => vi.setSystemTime(new Date(iso));
  const dateError = (preferredDate: unknown) => {
    const r = leadSchema.safeParse({ ...booking, preferredDate });
    return r.success ? undefined : r.error.issues.find((i) => i.path[0] === "preferredDate")?.message;
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    at("2026-10-19T04:30:00Z"); // 10:00 on 19 October in Agra
  });
  afterEach(() => vi.useRealTimers());

  it("is optional: blank, spaces or missing all mean no date", () => {
    for (const preferredDate of ["", "   ", undefined]) {
      const r = leadSchema.parse({ ...booking, preferredDate });
      expect(r.type === "booking" && r.preferredDate).toBeUndefined();
    }
  });

  it("accepts today, tomorrow and any day up to a year ahead", () => {
    for (const preferredDate of ["2026-10-19", "2026-10-20", "2027-02-28", "2027-10-19", " 2026-11-02 "]) {
      expect(dateError(preferredDate)).toBeUndefined();
    }
    expect(leadSchema.parse({ ...booking, preferredDate: " 2026-11-02 " })).toMatchObject({ preferredDate: "2026-11-02" });
  });

  it("rejects a date before today with a friendly message", () => {
    expect(dateError("2026-10-18")).toBe("Choose today or a later date");
    expect(dateError("2025-12-31")).toBe("Choose today or a later date");
  });

  it("rejects a date more than a year ahead", () => {
    expect(dateError("2027-10-20")).toBe("Choose a date within the next year");
    expect(dateError("2099-01-01")).toBe("Choose a date within the next year");
  });

  it("goes by the date in India, not the server's clock", () => {
    at("2026-10-18T19:00:00Z"); // 00:30 on 19 October in Agra, still the 18th in UTC
    expect(dateError("2026-10-18")).toBe("Choose today or a later date");
    expect(dateError("2026-10-19")).toBeUndefined();
    at("2026-10-19T18:00:00Z"); // 23:30 on the 19th in Agra
    expect(dateError("2026-10-19")).toBeUndefined();
    expect(dateError("2027-10-20")).toBe("Choose a date within the next year");
  });

  it("rejects other formats and dates that do not exist, with one message each", () => {
    for (const bad of ["02/11/2026", "2026-11-2", "2026-02-30", "2026-13-01", "2027-02-29", "tomorrow", "2026-11-02T10:00"]) {
      expect(dateError(bad)).toBe("Choose a date from the calendar");
      const r = leadSchema.safeParse({ ...booking, preferredDate: bad });
      expect(r.success ? [] : r.error.issues.filter((i) => i.path[0] === "preferredDate")).toHaveLength(1);
    }
    expect(dateError(20261102)).toBeDefined();
  });
});

describe("lead schema: contact messages", () => {
  const contact = { type: "contact", name: "Ravi", phone: "9123456789", message: "Need a quote for my shop" };

  it("accepts a valid contact message", () => {
    expect(leadSchema.safeParse(contact).success).toBe(true);
  });

  it("requires a message of at least 5 characters", () => {
    expect(errorFields({ ...contact, message: "hi" })).toContain("message");
    expect(errorFields({ ...contact, message: undefined })).toContain("message");
  });

  it("does not require booking-only fields", () => {
    expect(leadSchema.safeParse(contact).success).toBe(true);
  });
});

describe("lead schema: unknown input", () => {
  it.each([null, "string", 42, [], {}, { type: "admin" }])("rejects %j", (input) => {
    expect(leadSchema.safeParse(input).success).toBe(false);
  });
});
