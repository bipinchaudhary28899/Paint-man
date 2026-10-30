// The checks for the fields a visitor must fill in, shared by the server schema (schema.ts) and the
// form in the browser (LeadForm), so a mistake shows the moment the visitor submits or leaves the
// field, with the same words the server would send back. No zod here: it stays out of the page bundle.

export const FIELD_MESSAGES = {
  name: "Enter your name",
  phone: "Enter a valid 10-digit mobile number",
  address: "Enter your house or flat number and street",
  locality: "Enter your locality",
  pincode: "Enter your 6-digit PIN code",
  message: "Tell us a little about what you need",
} as const;

export type RequiredField = keyof typeof FIELD_MESSAGES;

/** A mobile number without spaces, dashes or a leading +91, 91 or 0 (when ten digits follow). */
export function normalizeMobile(value: string): string {
  return value.trim().replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
}

/** An Indian mobile: ten digits starting 6 to 9. */
export const MOBILE_PATTERN = /^[6-9]\d{9}$/;
/** A PIN code: six digits, not starting with 0. */
export const PINCODE_PATTERN = /^[1-9]\d{5}$/;

const valid: Record<RequiredField, (v: string) => boolean> = {
  name: (v) => v.trim().length >= 2,
  phone: (v) => MOBILE_PATTERN.test(normalizeMobile(v)),
  address: (v) => v.trim().length >= 5,
  locality: (v) => v.trim().length >= 2,
  pincode: (v) => PINCODE_PATTERN.test(v.replace(/\s/g, "")),
  message: (v) => v.trim().length >= 5,
};

/** The fields each form requires, in the order they appear. */
export const REQUIRED_FIELDS: Record<"booking" | "contact", RequiredField[]> = {
  booking: ["name", "phone", "address", "locality", "pincode"],
  contact: ["name", "phone", "message"],
};

/** The message for one required field, or undefined when its value is fine. */
export function fieldProblem(field: RequiredField, value: string): string | undefined {
  return valid[field](value) ? undefined : FIELD_MESSAGES[field];
}

/** Every required field of the form that needs fixing, with its message. */
export function requiredFieldErrors(type: "booking" | "contact", values: Record<string, string | undefined>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of REQUIRED_FIELDS[type]) {
    const problem = fieldProblem(field, values[field] ?? "");
    if (problem) errors[field] = problem;
  }
  return errors;
}

export const isRequiredField = (name: string): name is RequiredField => name in FIELD_MESSAGES;
