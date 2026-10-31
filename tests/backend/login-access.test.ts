import { afterEach, describe, expect, it, vi } from "vitest";
import { customerLoginOpen } from "@/config/login";
import { isTester, testerCode, testerCodeMatches, testerPhones } from "@/lib/auth/testers";

describe("customer login", () => {
  it("is open in development and tests, closed in production until it is opened", () => {
    expect(customerLoginOpen({ NODE_ENV: "development" })).toBe(true);
    expect(customerLoginOpen({ NODE_ENV: "test" })).toBe(true);
    expect(customerLoginOpen({ NODE_ENV: "production" })).toBe(false);
    expect(customerLoginOpen({ NODE_ENV: "production", NEXT_PUBLIC_CUSTOMER_LOGIN: " Open " })).toBe(true);
    // "closed" previews the production state on a development server
    expect(customerLoginOpen({ NODE_ENV: "development", NEXT_PUBLIC_CUSTOMER_LOGIN: "closed" })).toBe(false);
    expect(customerLoginOpen({ NODE_ENV: "production", NEXT_PUBLIC_CUSTOMER_LOGIN: "yes" })).toBe(false);
    expect(customerLoginOpen()).toBe(true);
  });
});

describe("the booking copy (src/config/site.ts)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const copy = async () => {
    const { bookingFaqs, bookingSteps, workFlow } = await import("@/config/site");
    return [workFlow[0].text, bookingSteps[0].text, ...bookingFaqs.map((f) => f.a)].join("\n");
  };

  it("sends customers to their account for the address and the job once login is open", async () => {
    vi.resetModules();
    expect(await copy()).toMatch(/later in your account/);
  });

  it("while login is closed, says the address and the job are taken on the call, and never mentions an account", async () => {
    vi.stubEnv("NEXT_PUBLIC_CUSTOMER_LOGIN", "closed");
    vi.resetModules();
    const text = await copy();
    expect(text).toMatch(/We take the address and what needs painting on the call/);
    expect(text).toMatch(/Tell us a good day when we call/);
    expect(text).not.toMatch(/account|log in/i);
  });
});

describe("testers", () => {
  const env = { LOGIN_TEST_PHONES: "+91 98765 43210, 09000000009, 12345, ", LOGIN_TEST_CODE: " 482915 " };

  it("are the listed Indian mobiles, normalised, signing in with a real 6-digit secret", () => {
    expect([...testerPhones(env)]).toEqual(["9876543210", "9000000009"]);
    expect(testerCode(env)).toBe("482915");
    expect(isTester("9000000009", env)).toBe(true);
    expect(isTester("9123456789", env)).toBe(false);
    expect(testerCodeMatches("482915", env)).toBe(true);
    expect(testerCodeMatches("482916", env)).toBe(false);
    expect(testerCodeMatches("48291", env)).toBe(false);
  });

  it("do not exist without both settings, or with a code anyone would guess", () => {
    expect(isTester("9876543210", { LOGIN_TEST_PHONES: "9876543210" })).toBe(false);
    expect(testerPhones({})).toEqual(new Set());
    for (const code of ["000000", "999999", "123456", "654321", "12345", "abcdef"]) {
      expect(testerCode({ LOGIN_TEST_CODE: code }), code).toBeUndefined();
      expect(isTester("9876543210", { LOGIN_TEST_PHONES: "9876543210", LOGIN_TEST_CODE: code })).toBe(false);
    }
    expect(testerCodeMatches("123456", { LOGIN_TEST_CODE: "123456" })).toBe(false);
    expect(testerCode()).toBe(process.env.LOGIN_TEST_CODE ? testerCode({ LOGIN_TEST_CODE: process.env.LOGIN_TEST_CODE }) : undefined);
  });
});
