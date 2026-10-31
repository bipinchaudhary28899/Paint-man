import { afterEach, describe, expect, it, vi } from "vitest";
import { callApi, errorText, fieldError, NETWORK_ERROR, retryAfter, waitText } from "@/lib/api-client";

// The browser's reader for the account API (src/lib/api-client.ts): envelopes in, plain results out.

afterEach(() => vi.restoreAllMocks());

const respond = (status: number, body: string) => vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body, { status }));

describe("callApi", () => {
  it("posts JSON same-origin and returns the envelope's data", async () => {
    const spy = respond(200, JSON.stringify({ apiVersion: "v1", data: { ok: 1 } }));
    expect(await callApi("/api/v1/x", { body: { a: 1 } })).toEqual({ ok: true, status: 200, data: { ok: 1 } });
    expect(spy).toHaveBeenCalledWith("/api/v1/x", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: '{"a":1}' });
  });

  it("sends no body or content type when there is none", async () => {
    const spy = respond(200, JSON.stringify({ data: null }));
    await callApi("/api/v1/me", { method: "DELETE" });
    expect(spy).toHaveBeenCalledWith("/api/v1/me", { method: "DELETE", credentials: "same-origin" });
  });

  it("returns the error's code, message and details", async () => {
    respond(400, JSON.stringify({ kind: "error", error: { code: "invalid_request", message: "Check it.", details: { name: "Too long" } } }));
    expect(await callApi("/x")).toEqual({ ok: false, status: 400, code: "invalid_request", message: "Check it.", details: { name: "Too long" } });
  });

  it("copes with a body that is not JSON, or an error without a message", async () => {
    respond(502, "<html>Bad gateway</html>");
    expect(await callApi("/x")).toEqual({ ok: false, status: 502, code: "unknown", message: "Something went wrong on our side. Please try again." });
    respond(500, JSON.stringify({ error: {} }));
    expect(await callApi("/x")).toMatchObject({ ok: false, code: "unknown" });
  });

  it("reports a network failure in the booking form's words", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await callApi("/x")).toEqual({ ok: false, status: 0, code: "network_error", message: NETWORK_ERROR });
  });
});

describe("error wording", () => {
  const limited = (retryAfterSeconds: unknown) => ({ ok: false as const, status: 429, code: "rate_limited", message: "Too many requests. Try again in 90 seconds.", details: { retryAfterSeconds } });

  it("names a rate limit's wait in seconds, then minutes", () => {
    expect(waitText(1)).toBe("1 second");
    expect(waitText(45)).toBe("45 seconds");
    expect(waitText(60)).toBe("1 minute");
    expect(waitText(3000)).toBe("50 minutes");
    expect(errorText(limited(90))).toBe("Too many requests. Try again in 2 minutes.");
    expect(retryAfter(limited(12.2))).toBe(13);
  });

  it("falls back to the API's message when there is no usable wait", () => {
    expect(retryAfter(limited("soon"))).toBeUndefined();
    expect(errorText(limited(0))).toBe("Too many requests. Try again in 90 seconds.");
  });

  it("picks one field's message from the details, else the general message", () => {
    const bad = { ok: false as const, status: 400, code: "invalid_request", message: "Please check the highlighted fields.", details: { name: "Use 80 characters or fewer" } };
    expect(fieldError(bad, "name")).toBe("Use 80 characters or fewer");
    expect(fieldError(bad, "phone")).toBe("Please check the highlighted fields.");
    expect(fieldError({ ...bad, details: undefined }, "name")).toBe("Please check the highlighted fields.");
  });
});
