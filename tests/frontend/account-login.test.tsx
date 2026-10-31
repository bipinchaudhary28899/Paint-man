import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/account/LoginForm";

// The login form (/login): mobile number → SMS code → back to ?next= (a path on this site) or the
// account, with the API's own words for every error.

const nav = vi.hoisted(() => ({ hardNavigate: vi.fn() }));
vi.mock("@/lib/browser", () => nav);
vi.mock("next/navigation", () => ({ usePathname: () => "/login", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const envelope = (data: unknown) => ({ apiVersion: "v1", kind: "x", label: "x", data, meta: { generatedAt: "" } });
const failure = (code: string, message: string, details?: unknown) => ({ apiVersion: "v1", kind: "error", label: message, error: { code, message, ...(details !== undefined && { details }) }, meta: {} });
const sent = (resendInSeconds = 30) => envelope({ sent: true, phone: "******3210", expiresInSeconds: 300, resendInSeconds });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Answers each request in turn; records what was sent. */
function api(...answers: (Response | Error)[]) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    const next = answers.shift();
    if (!next) throw new Error("unexpected request");
    if (next instanceof Error) throw next;
    return next;
  });
}
const bodyOf = (spy: ReturnType<typeof api>, i: number) => JSON.parse(String(spy.mock.calls[i][1]?.body));

beforeEach(() => {
  window.history.replaceState(null, "", "/login");
  nav.hardNavigate.mockReset();
});
afterEach(() => {
  document.cookie = "ps_signed_in=; max-age=0; path=/";
});

async function toCodeStep(user: ReturnType<typeof userEvent.setup>, extra: (Response | Error)[] = []) {
  const spy = api(json(200, sent()), ...extra);
  await user.type(screen.getByLabelText("Mobile number"), "98765 43210");
  await user.click(screen.getByRole("button", { name: "Send code" }));
  await screen.findByLabelText("6-digit code");
  return spy;
}

describe("LoginForm: the number", () => {
  it("asks for the mobile number with +91 inside the field, the phone keypad and autofill", () => {
    render(<LoginForm />);
    const input = screen.getByLabelText("Mobile number");
    expect(input).toHaveAttribute("type", "tel");
    expect(input).toHaveAttribute("inputmode", "tel");
    expect(input).toHaveAttribute("autocomplete", "tel-national");
    expect(screen.getByText("+91")).toHaveAttribute("aria-hidden");
    expect(document.activeElement).not.toBe(input); // no keyboard popping up on load
  });

  it("checks the number before sending, in the API's words", async () => {
    const user = userEvent.setup();
    const spy = api();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Mobile number"), "12345");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid 10-digit mobile number");
    expect(screen.getByLabelText("Mobile number")).toHaveAttribute("aria-invalid", "true");
    expect(spy).not.toHaveBeenCalled();
  });

  it("sends the 10-digit number and moves to the code, naming the number it went to", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const spy = await toCodeStep(user);
    expect(spy.mock.calls[0][0]).toBe("/api/v1/auth/otp");
    expect(bodyOf(spy, 0)).toEqual({ phone: "9876543210" });
    expect(screen.getByText("+91 98765 43210")).toBeInTheDocument();
    expect(screen.getByLabelText("6-digit code")).toHaveFocus();
    expect(screen.getByText(/Resend code in/)).toHaveTextContent("Resend code in 0:30");
  });

  it("shows a rate limit's wait, in minutes when it is long, and the service being unavailable", async () => {
    const user = userEvent.setup();
    api(json(429, failure("rate_limited", "Too many requests. Try again in 3000 seconds.", { retryAfterSeconds: 3000 })), json(503, failure("otp_unavailable", "We can't send sign-in codes right now. Please call us or try again later.")));
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests. Try again in 50 minutes.");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("We can't send sign-in codes right now. Please call us or try again later."));
  });

  it("says so when the network fails", async () => {
    const user = userEvent.setup();
    api(new TypeError("Failed to fetch"));
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Mobile number"), "9876543210");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Network error. Please check your connection and try again.");
  });

  it("tells a visitor already logged in, with a link to the account", () => {
    document.cookie = "ps_signed_in=1; path=/";
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: "Go to my account" })).toHaveAttribute("href", "/account");
  });
});

describe("LoginForm: the code", () => {
  it("takes a pasted code (digits only), sends it as soon as six are in, and goes back to ?next=", async () => {
    window.history.replaceState(null, "", "/login?next=%2Faccount%2Fprojects%2Fabc");
    const user = userEvent.setup();
    render(<LoginForm />);
    const spy = await toCodeStep(user, [json(200, envelope({ user: { id: "u", phone: "9876543210", name: null }, expiresAt: "" }))]);
    const code = screen.getByLabelText("6-digit code");
    expect(code).toHaveAttribute("autocomplete", "one-time-code");
    expect(code).toHaveAttribute("inputmode", "numeric");
    await user.click(code);
    await user.paste("Your code is 123 456");
    await waitFor(() => expect(nav.hardNavigate).toHaveBeenCalledWith("/account/projects/abc"));
    expect(spy.mock.calls[1][0]).toBe("/api/v1/auth/verify");
    expect(bodyOf(spy, 1)).toEqual({ phone: "9876543210", code: "123456", client: "web" });
  });

  it("never follows ?next= to another site: the account instead", async () => {
    window.history.replaceState(null, "", "/login?next=%2F%2Fevil.com");
    const user = userEvent.setup();
    render(<LoginForm />);
    await toCodeStep(user, [json(200, envelope({ user: {}, expiresAt: "" }))]);
    await user.type(screen.getByLabelText("6-digit code"), "123456");
    await waitFor(() => expect(nav.hardNavigate).toHaveBeenCalledWith("/account"));
  });

  it("asks for all six digits before checking", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const spy = await toCodeStep(user);
    await user.type(screen.getByLabelText("6-digit code"), "12a3");
    expect(screen.getByLabelText("6-digit code")).toHaveValue("123");
    await user.click(screen.getByRole("button", { name: "Verify and log in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter the 6-digit code from the SMS");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("a wrong code: the API's message with the tries left, and a cleared field to try again", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await toCodeStep(user, [json(401, failure("invalid_code", "That code is not right. 4 tries left.", { attemptsLeft: 4 }))]);
    await user.type(screen.getByLabelText("6-digit code"), "000000");
    expect(await screen.findByRole("alert")).toHaveTextContent("That code is not right. 4 tries left.");
    expect(screen.getByLabelText("6-digit code")).toHaveValue("");
    expect(screen.getByLabelText("6-digit code")).toHaveFocus();
    expect(nav.hardNavigate).not.toHaveBeenCalled();
  });

  it("an expired code and a field problem come back in the API's words", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await toCodeStep(user, [
      json(410, failure("code_expired", "This code has expired or was used up. Ask for a new code.")),
      json(400, failure("invalid_request", "Please check the highlighted fields.", { code: "Enter the 6-digit code from the SMS" })),
      json(400, failure("invalid_request", "Please check the highlighted fields.")),
    ]);
    await user.type(screen.getByLabelText("6-digit code"), "111111");
    expect(await screen.findByRole("alert")).toHaveTextContent("This code has expired or was used up. Ask for a new code.");
    await user.type(screen.getByLabelText("6-digit code"), "222222");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Enter the 6-digit code from the SMS"));
    await user.type(screen.getByLabelText("6-digit code"), "333333");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Please check the highlighted fields."));
  });

  it("counts down to Resend, then sends a new code", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<LoginForm />);
      const spy = await toCodeStep(user, [json(200, sent(30))]);
      expect(screen.queryByRole("button", { name: "Resend code" })).toBeNull();
      for (let i = 0; i < 31; i++) await act(async () => void vi.advanceTimersByTime(1000));
      await user.click(screen.getByRole("button", { name: "Resend code" }));
      expect(await screen.findByRole("status")).toHaveTextContent("A new code is on its way.");
      expect(bodyOf(spy, 1)).toEqual({ phone: "9876543210" });
      expect(screen.getByText(/Resend code in/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("a rate-limited resend waits out the limit on the button", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<LoginForm />);
      api(json(200, sent(0)), json(429, failure("rate_limited", "Too many requests. Try again in 25 seconds.", { retryAfterSeconds: 25 })));
      await user.type(screen.getByLabelText("Mobile number"), "9876543210");
      await user.click(screen.getByRole("button", { name: "Send code" }));
      await user.click(await screen.findByRole("button", { name: "Resend code" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests. Try again in 25 seconds.");
      expect(screen.getByText(/Resend code in/)).toHaveTextContent("0:25");
    } finally {
      vi.useRealTimers();
    }
  });

  it("Change number goes back to the number, keeping what was typed", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await toCodeStep(user);
    await user.click(screen.getByRole("button", { name: "Change number" }));
    expect(screen.getByLabelText("Mobile number")).toHaveValue("98765 43210");
    expect(screen.getByLabelText("Mobile number")).toHaveFocus();
  });
});
