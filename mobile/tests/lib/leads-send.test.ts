import { ApiError, BAD_RESPONSE_MESSAGE, NETWORK_MESSAGE } from "~/lib/api";
import { emptyBooking, toBookingPayload } from "~/lib/booking";
import { bookingErrors, FORM_ERROR, submitBooking } from "~/lib/leads";
import { heldBooking, HOLD_MS, holdBooking, releaseBooking, takeBooking } from "~/lib/pending-booking";
import { FIELD_MESSAGES, liveCities } from "~/shared";

const live = liveCities();
const complete = emptyBooking({ name: "Asha Verma", phone: "98765 43210", address: "12, Rose Villa, Nehru Road", city: "agra", locality: "Kamla Nagar", pincode: "282005" });
const ok = (data: unknown) => ({ apiVersion: "v1" as const, kind: "booking", label: "x", data, meta: { generatedAt: "x" } });

describe("submitBooking", () => {
  it("checks the booking first and sends nothing with a mistake in it", async () => {
    const request = jest.fn();
    await expect(submitBooking({ ...complete, pincode: "12" }, { live, request })).resolves.toEqual({ ok: false, errors: { pincode: FIELD_MESSAGES.pincode }, message: FORM_ERROR });
    expect(request).not.toHaveBeenCalled();
  });

  it("sends the website's booking with the pinned spot to /api/v1/bookings and returns the project", async () => {
    const request = jest.fn().mockResolvedValue(ok({ received: true, projectId: "p-1" }));
    const location = { lat: 27.20461234, lng: 78.00419876 };
    await expect(submitBooking(complete, { live, location, request })).resolves.toEqual({ ok: true, sent: true, projectId: "p-1" });
    expect(request).toHaveBeenCalledWith("/api/v1/bookings", { method: "POST", body: toBookingPayload(complete, live, location) });
    expect(request.mock.calls[0][1].body.location).toEqual({ lat: 27.204612, lng: 78.004199 });
  });

  it("counts a booking received without a project id as sent", async () => {
    const request = jest.fn().mockResolvedValue(ok({ received: true }));
    await expect(submitBooking(complete, { live, request })).resolves.toEqual({ ok: true, sent: true, projectId: undefined });
  });

  it("asks for sign-in when there is no session or it expired", async () => {
    const request = jest.fn().mockRejectedValue(new ApiError("unauthenticated", "Sign in to continue", 401));
    await expect(submitBooking(complete, { live, request })).resolves.toEqual({ ok: false, signIn: true });
  });

  it("shows the API's field messages, and its one message otherwise", async () => {
    const mismatch = new ApiError("invalid_request", "Please check the highlighted fields.", 400, { phone: "Use the mobile number you signed in with (******3210)" });
    await expect(submitBooking(complete, { live, request: jest.fn().mockRejectedValue(mismatch) })).resolves.toEqual({
      ok: false,
      errors: { phone: "Use the mobile number you signed in with (******3210)" },
      message: FORM_ERROR,
    });
    const limited = new ApiError("rate_limited", "Too many requests. Try again in 40 seconds.", 429, { retryAfterSeconds: 40 });
    await expect(submitBooking(complete, { live, request: jest.fn().mockRejectedValue(limited) })).resolves.toEqual({ ok: false, errors: {}, message: limited.message });
    await expect(submitBooking(complete, { live, request: jest.fn().mockRejectedValue(new ApiError("network", NETWORK_MESSAGE)) })).resolves.toEqual({
      ok: false,
      errors: {},
      message: NETWORK_MESSAGE,
    });
  });
});

describe("bookingErrors", () => {
  it("keeps only the form's own fields with words, and falls back to the API's message", () => {
    expect(bookingErrors(new ApiError("invalid_request", "Please check the highlighted fields.", 400, { body: "x", location: "lat must be a number", pincode: 5 }))).toEqual({
      errors: {},
      message: "Please check the highlighted fields.",
    });
    expect(bookingErrors(new ApiError("invalid_request", "x", 400, ["not", "a", "record"]))).toEqual({ errors: {}, message: "x" });
    expect(bookingErrors(new ApiError("invalid_request", "x", 400, { carpetArea: "Enter a whole number of sq ft", city: "Choose your city" }))).toEqual({
      errors: { carpetArea: "Enter a whole number of sq ft", city: "Choose your city" },
      message: FORM_ERROR,
    });
    expect(bookingErrors(new TypeError("boom"))).toEqual({ errors: {}, message: BAD_RESPONSE_MESSAGE });
  });
});

describe("a booking held for sign-in", () => {
  afterEach(releaseBooking);

  it("is kept in memory and taken once, by the screen it came from", () => {
    holdBooking({ path: "/book", values: complete });
    expect(heldBooking()).toEqual({ path: "/book", values: complete });
    expect(takeBooking("/")).toBeNull();
    expect(takeBooking("/book")).toEqual({ path: "/book", values: complete });
    expect(takeBooking("/book")).toBeNull();
    expect(heldBooking()).toBeNull();
  });

  it("is let go when the visitor leaves, or when it has waited too long", () => {
    holdBooking({ path: "/book", values: complete });
    releaseBooking();
    expect(heldBooking()).toBeNull();
    holdBooking({ path: "/book", values: complete }, 1_000);
    expect(heldBooking(1_000 + HOLD_MS)).not.toBeNull();
    expect(takeBooking("/book", 1_001 + HOLD_MS)).toBeNull();
    expect(heldBooking()).toBeNull();
  });
});
