import { describe, expect, it } from "vitest";
import { leadSchema } from "@/lib/leads/schema";

const booking = {
  type: "booking",
  name: "Asha Verma",
  phone: "9876543210",
  locality: "Kamla Nagar",
  propertyType: "Apartment / Flat",
  service: "Interior Painting",
};

const errorFields = (input: unknown) => {
  const r = leadSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => String(i.path[0]));
};

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

  it("accepts an empty or ISO preferred date, rejects other formats", () => {
    expect(leadSchema.safeParse({ ...booking, preferredDate: "" }).success).toBe(true);
    expect(leadSchema.safeParse({ ...booking, preferredDate: "2026-11-02" }).success).toBe(true);
    expect(errorFields({ ...booking, preferredDate: "02/11/2026" })).toContain("preferredDate");
  });

  it("caps field lengths to stop oversized payloads", () => {
    expect(errorFields({ ...booking, name: "a".repeat(81) })).toContain("name");
    expect(errorFields({ ...booking, message: "a".repeat(1001) })).toContain("message");
  });

  it("rejects submissions where the hidden honeypot field is filled", () => {
    expect(errorFields({ ...booking, website: "http://spam.example" })).toContain("website");
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
