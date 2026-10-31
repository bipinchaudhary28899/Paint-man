import { describe, expect, it } from "vitest";
import { site } from "@/config/site";
import {
  formatDate,
  formatDateTime,
  formatMobile,
  hasSignedInHint,
  loginHref,
  NEXT_STEPS,
  placeLine,
  QUOTATION_STATUS_LABELS,
  safeNextPath,
  SIGNED_IN_HINT,
} from "@/lib/account";
import { SIGNED_IN_COOKIE } from "@/lib/auth/user-session";
import { formatPaise } from "@/lib/money";
import { PROJECT_STAGES } from "@/lib/projects/stages";
import { VISIBLE_QUOTATION_STATUSES } from "@/lib/projects/repo";

// The account pages' plain helpers (src/lib/account.ts, src/lib/money.ts).

describe("formatPaise", () => {
  it("formats paise as rupees with Indian digit grouping", () => {
    expect(formatPaise(45_000_000)).toBe("₹4,50,000");
    expect(formatPaise(1_234_50)).toBe("₹1,234.50");
    expect(formatPaise(0)).toBe("₹0");
    expect(formatPaise(99)).toBe("₹0.99");
    expect(formatPaise(1_00_00_000_00)).toBe("₹1,00,00,000");
    expect(formatPaise(-5_000)).toBe("-₹50");
  });

  it("takes another prefix where the rupee sign cannot be drawn", () => {
    expect(formatPaise(4_500_000, "Rs. ")).toBe("Rs. 45,000");
  });
});

describe("the sign-in hint cookie", () => {
  it("is the cookie the verify endpoint sets", () => {
    expect(SIGNED_IN_HINT).toBe(SIGNED_IN_COOKIE);
  });

  it("is read from document.cookie, ignoring look-alikes and an emptied cookie", () => {
    expect(hasSignedInHint("ps_signed_in=1")).toBe(true);
    expect(hasSignedInHint("a=b; ps_signed_in=1; c=d")).toBe(true);
    expect(hasSignedInHint("")).toBe(false);
    expect(hasSignedInHint("ps_signed_in=")).toBe(false);
    expect(hasSignedInHint("xps_signed_in=1; ps_signed_in_old=1")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps a path on this site with its query and hash", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("/account/projects/abc?tab=quote#v2")).toBe("/account/projects/abc?tab=quote#v2");
    expect(safeNextPath("/book")).toBe("/book");
  });

  it("falls back for other sites in any disguise, the API, the login page and nonsense", () => {
    for (const bad of [null, undefined, "", "account", "//evil.com", "/\\evil.com", "/\nevil", "https://evil.com/account", "javascript:alert(1)", "/\tevil", "/login", "/login?next=/login", "/api/v1/me", `/${"a".repeat(600)}`]) {
      expect(safeNextPath(bad), String(bad)).toBe("/account");
    }
    expect(safeNextPath("//evil.com", "/")).toBe("/");
  });

  it("builds the login link that comes back to a page", () => {
    expect(loginHref()).toBe("/login?next=%2Faccount");
    expect(loginHref("/account/projects/x")).toBe("/login?next=%2Faccount%2Fprojects%2Fx");
  });
});

describe("dates, numbers and places", () => {
  it("formats timestamps and calendar dates in India time", () => {
    expect(formatDate("2026-10-31T20:00:00.000Z")).toBe("1 Nov 2026"); // 1:30 am IST
    expect(formatDate("2026-11-30")).toBe("30 Nov 2026");
    expect(formatDate(new Date("2026-01-05T06:00:00.000Z"))).toBe("5 Jan 2026");
    expect(formatDateTime("2026-11-04T06:00:00.000Z")).toMatch(/^4 Nov 2026, 11:30 am$/i);
  });

  it("shows a 10-digit mobile as +91 XXXXX XXXXX", () => {
    expect(formatMobile("9876543210")).toBe("+91 98765 43210");
    expect(formatMobile("+44 20 7946 0000")).toBe("+44 20 7946 0000");
  });

  it("joins the known parts of a place", () => {
    expect(placeLine("Kamla Nagar", "Agra")).toBe("Kamla Nagar, Agra");
    expect(placeLine(null, " ", "Agra", undefined)).toBe("Agra");
    expect(placeLine()).toBe("");
  });
});

describe("customer copy", () => {
  it("labels every quotation status the customer can see", () => {
    for (const s of VISIBLE_QUOTATION_STATUSES) expect(QUOTATION_STATUS_LABELS[s]).toBeTruthy();
  });

  it("says what happens next at every stage, in the site's promises", () => {
    for (const stage of PROJECT_STAGES) expect(NEXT_STEPS[stage].length, stage).toBeGreaterThan(10);
    expect(NEXT_STEPS.booked).toContain(site.hoursDisplay);
    expect(NEXT_STEPS.quotation_shared).toMatch(/Nothing starts until you approve it, and there is no advance payment/);
  });
});
