import { describe, expect, it } from "vitest";
import { FIELD_MESSAGES, fieldProblem, isRequiredField, normalizeMobile, REQUIRED_FIELDS, requiredFieldErrors } from "@/lib/leads/field-checks";
import { bookingSchema, contactSchema } from "@/lib/leads/schema";

const booking = { type: "booking", name: "Asha Verma", phone: "9876543210", address: "12, Rose Villa, Nehru Road", locality: "Kamla Nagar", pincode: "282005" };

describe("field checks shared by the form and the server", () => {
  it("reads a mobile number the way people type it", () => {
    expect(normalizeMobile(" +91 98765-43210 ")).toBe("9876543210");
    expect(normalizeMobile("09876543210")).toBe("9876543210");
    expect(normalizeMobile("919876543210")).toBe("9876543210");
    expect(normalizeMobile("98765")).toBe("98765");
  });

  it("names each problem in the words the server uses, and passes good values", () => {
    expect(fieldProblem("name", " A ")).toBe(FIELD_MESSAGES.name);
    expect(fieldProblem("name", "Ravi")).toBeUndefined();
    expect(fieldProblem("phone", "5876543210")).toBe(FIELD_MESSAGES.phone);
    expect(fieldProblem("phone", "+91 98765 43210")).toBeUndefined();
    expect(fieldProblem("address", "12")).toBe(FIELD_MESSAGES.address);
    expect(fieldProblem("locality", "K")).toBe(FIELD_MESSAGES.locality);
    expect(fieldProblem("pincode", "28200")).toBe(FIELD_MESSAGES.pincode);
    expect(fieldProblem("pincode", "282 005")).toBeUndefined();
    expect(fieldProblem("pincode", "082005")).toBe(FIELD_MESSAGES.pincode);
    expect(fieldProblem("message", "hi")).toBe(FIELD_MESSAGES.message);
  });

  it("lists every required field that needs fixing, per form, and nothing for a complete one", () => {
    expect(Object.keys(requiredFieldErrors("booking", {}))).toEqual(REQUIRED_FIELDS.booking);
    expect(Object.keys(requiredFieldErrors("contact", {}))).toEqual(["name", "phone", "message"]);
    expect(requiredFieldErrors("booking", booking)).toEqual({});
    expect(requiredFieldErrors("booking", { ...booking, pincode: "1234" })).toEqual({ pincode: FIELD_MESSAGES.pincode });
  });

  it("knows which names are required fields", () => {
    expect(isRequiredField("pincode")).toBe(true);
    expect(isRequiredField("carpetArea")).toBe(false);
  });

  it("agrees with the server schema: what the form passes, the server accepts, with the same messages", () => {
    expect(bookingSchema.safeParse(booking).success).toBe(true);
    const bad = bookingSchema.safeParse({ ...booking, phone: "12345", pincode: "1234" });
    expect(bad.success).toBe(false);
    const messages = bad.error!.issues.map((i) => i.message);
    expect(messages).toEqual(expect.arrayContaining([FIELD_MESSAGES.phone, FIELD_MESSAGES.pincode]));
    const contact = contactSchema.safeParse({ type: "contact", name: "Ravi", phone: "9123456789", message: "hi" });
    expect(contact.error!.issues.map((i) => i.message)).toEqual([FIELD_MESSAGES.message]);
  });
});
