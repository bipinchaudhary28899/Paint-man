import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { countdown, goAfterSignIn, Login } from "~/components/account/Login";
import { AuthProvider } from "~/lib/auth-context";
import { emptyBooking } from "~/lib/booking";
import { heldBooking, holdBooking, releaseBooking } from "~/lib/pending-booking";
import { FIELD_MESSAGES } from "~/shared";
import { asha, mockApi, offline, savedToken, seedToken, type Answer } from "./helpers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  usePathname: jest.fn(() => "/login"),
  useLocalSearchParams: jest.fn(() => ({})),
}));

const sent: Answer = { data: { sent: true, phone: "******3210", expiresInSeconds: 300, resendInSeconds: 30 } };
const session: Answer = { data: { user: asha, token: "new-token", expiresAt: "2027-01-29T00:00:00.000Z" } };
const press = (name: string | RegExp) => fireEvent.press(screen.getByRole("button", { name }));
const phoneField = () => screen.getByLabelText("Mobile number");
const codeField = () => screen.getByLabelText("6-digit code");

async function show(props: { next?: string; resume?: boolean } = {}) {
  await render(
    <AuthProvider>
      <Login {...props} />
    </AuthProvider>,
  );
}

async function toCode() {
  await fireEvent.changeText(phoneField(), "98765 43210");
  await press("Send code");
  await screen.findByLabelText("6-digit code");
}

beforeEach(() => {
  jest.clearAllMocks();
  releaseBooking();
});

describe("the login screen: the mobile number", () => {
  it("shows the h1, the +91 number field and Send code", async () => {
    mockApi({});
    await show();
    expect(screen.getByRole("header", { name: "Log in to your account" })).toBeOnTheScreen();
    expect(screen.getByTestId("phone-prefix")).toHaveTextContent("+91");
    expect(phoneField()).toHaveProp("keyboardType", "phone-pad");
    expect(screen.queryByText("Your booking is waiting")).toBeNull();
  });

  it("checks the number with the website's message before asking for a code", async () => {
    const calls = mockApi({ "POST /api/v1/auth/otp": sent });
    await show();
    await press("Send code");
    expect(screen.getByText(FIELD_MESSAGES.phone)).toBeOnTheScreen();
    await fireEvent.changeText(phoneField(), "98765");
    expect(screen.getByText(FIELD_MESSAGES.phone)).toBeOnTheScreen();
    await fireEvent.changeText(phoneField(), "9876543210");
    expect(screen.queryByText(FIELD_MESSAGES.phone)).toBeNull();
    expect(calls).toEqual([]);
  });

  it("sends the code and asks for it in one SMS-ready field, with a countdown to a new one", async () => {
    const calls = mockApi({ "POST /api/v1/auth/otp": sent });
    await show();
    await toCode();
    expect(calls[0]).toMatchObject({ method: "POST", path: "/api/v1/auth/otp", body: { phone: "9876543210" } });
    expect(screen.getByText(/We sent a 6-digit code to/)).toHaveTextContent("We sent a 6-digit code to ******3210. It works for 5 minutes.");
    expect(codeField()).toHaveProp("textContentType", "oneTimeCode");
    expect(codeField()).toHaveProp("autoComplete", "sms-otp");
    expect(codeField()).toHaveProp("keyboardType", "number-pad");
    expect(screen.getByRole("button", { name: /^Send a new code in \d+ seconds$/ })).toBeDisabled();
  });

  it("shows the API's words when the number is refused, codes are not set up, or there were too many", async () => {
    mockApi({
      "POST /api/v1/auth/otp": [
        { status: 400, error: { code: "invalid_phone", message: FIELD_MESSAGES.phone } },
        { status: 503, error: { code: "otp_unavailable", message: "We can't send sign-in codes right now. Please call us or try again later." } },
        { status: 429, error: { code: "rate_limited", message: "Too many requests. Try again in 27 seconds.", details: { retryAfterSeconds: 27 } } },
      ],
    });
    await show();
    await fireEvent.changeText(phoneField(), "9876543210");
    await press("Send code");
    expect(screen.getByText(FIELD_MESSAGES.phone)).toBeOnTheScreen();
    await press("Send code");
    expect(screen.getByRole("alert")).toHaveTextContent("We can't send sign-in codes right now. Please call us or try again later.");
    await press("Send code");
    expect(screen.getByRole("alert")).toHaveTextContent("Too many requests. Try again in 27 seconds.");
    expect(screen.getByText(/You can ask for a code again in 0:2\d\./)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Send code" })).toBeDisabled();
  });

  it("starts with the number of the booking waiting for sign-in, and says the booking is kept", async () => {
    mockApi({});
    holdBooking({ path: "/book", values: emptyBooking({ phone: "98765 43210" }) });
    await show({ resume: true });
    expect(phoneField()).toHaveProp("value", "98765 43210");
    expect(screen.getByText("Your booking is waiting")).toBeOnTheScreen();
  });
});

describe("the login screen: the code", () => {
  it("checks a whole code at once and opens the account", async () => {
    const calls = mockApi({ "POST /api/v1/auth/otp": sent, "POST /api/v1/auth/verify": session });
    await show();
    await toCode();
    await fireEvent.changeText(codeField(), "123 456");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account"));
    expect(calls.at(-1)).toMatchObject({ path: "/api/v1/auth/verify", body: { phone: "9876543210", code: "123456", client: "app" } });
    expect(savedToken()).toBe("new-token");
  });

  it("goes on to the screen it was opened for", async () => {
    mockApi({ "POST /api/v1/auth/otp": sent, "POST /api/v1/auth/verify": session });
    await show({ next: "/account/projects/p-1" });
    await toCode();
    await fireEvent.changeText(codeField(), "123456");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account/projects/p-1"));
  });

  it("goes back to the booking waiting under it, keeping the booking for the form", async () => {
    mockApi({ "POST /api/v1/auth/otp": sent, "POST /api/v1/auth/verify": session });
    holdBooking({ path: "/book", values: emptyBooking({ phone: "9876543210" }) });
    await show({ next: "/book", resume: true });
    await press("Send code");
    await fireEvent.changeText(await screen.findByLabelText("6-digit code"), "123456");
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(router.replace).not.toHaveBeenCalled();
    await screen.unmount();
    expect(heldBooking()).not.toBeNull();
  });

  it("lets the waiting booking go when the visitor leaves without signing in", async () => {
    mockApi({});
    holdBooking({ path: "/book", values: emptyBooking() });
    await show({ resume: true });
    await screen.unmount();
    expect(heldBooking()).toBeNull();
  });

  it("shows a wrong code with the tries left, and an expired one, in the API's words", async () => {
    mockApi({
      "POST /api/v1/auth/otp": sent,
      "POST /api/v1/auth/verify": [
        { status: 401, error: { code: "invalid_code", message: "That code is not right. 2 tries left.", details: { attemptsLeft: 2 } } },
        { status: 410, error: { code: "code_expired", message: "This code has expired or was used up. Ask for a new code." } },
      ],
    });
    await show();
    await toCode();
    await fireEvent.changeText(codeField(), "000000");
    expect(await screen.findByText("That code is not right. 2 tries left.")).toBeOnTheScreen();
    expect(codeField()).toHaveProp("value", "");
    await fireEvent.changeText(codeField(), "111111");
    expect(await screen.findByText("This code has expired or was used up. Ask for a new code.")).toBeOnTheScreen();
    await fireEvent.changeText(codeField(), "1");
    expect(screen.queryByText("This code has expired or was used up. Ask for a new code.")).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("asks for all six digits before checking, and shows a refusal of the code or the number", async () => {
    mockApi({
      "POST /api/v1/auth/otp": sent,
      "POST /api/v1/auth/verify": [
        { status: 400, error: { code: "invalid_request", message: "Please check the highlighted fields.", details: { code: "Enter the 6-digit code from the SMS" } } },
        { status: 429, error: { code: "rate_limited", message: "Too many requests. Try again in 600 seconds.", details: { retryAfterSeconds: 600 } } },
        offline,
        { status: 400, error: { code: "invalid_request", message: "Please check the highlighted fields.", details: { phone: FIELD_MESSAGES.phone } } },
      ],
    });
    await show();
    await toCode();
    await fireEvent.changeText(codeField(), "12");
    await press("Log in");
    expect(screen.getByText("Enter the 6-digit code from the SMS")).toBeOnTheScreen();
    await fireEvent.changeText(codeField(), "123456");
    expect(await screen.findByText("Enter the 6-digit code from the SMS")).toBeOnTheScreen();
    await press("Log in");
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests. Try again in 600 seconds.");
    await press("Log in");
    expect(await screen.findByRole("alert")).toHaveTextContent("Network error. Please check your connection and try again.");
    await press("Log in");
    // a refused number goes back to the number, with its message
    expect(await screen.findByText(FIELD_MESSAGES.phone)).toBeOnTheScreen();
    expect(phoneField()).toBeOnTheScreen();
  });

  it("changes the number, and sends a new code once the countdown is over", async () => {
    jest.useFakeTimers();
    try {
      const calls = mockApi({ "POST /api/v1/auth/otp": sent });
      await show();
      await toCode();
      await act(() => jest.advanceTimersByTime(31_000));
      const resend = screen.getByRole("button", { name: "Send a new code" });
      expect(resend).toBeEnabled();
      await fireEvent.press(resend);
      expect(await screen.findByText("We sent a new code to ******3210.")).toBeOnTheScreen();
      expect(calls.filter((c) => c.path === "/api/v1/auth/otp")).toHaveLength(2);
      await fireEvent.press(screen.getByRole("link", { name: "Change number" }));
      expect(phoneField()).toHaveProp("value", "98765 43210");
      expect(screen.queryByLabelText("6-digit code")).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("the login screen when already signed in", () => {
  it("goes straight on to where it was going", async () => {
    seedToken();
    mockApi({ "GET /api/v1/me": { data: asha } });
    await show({ next: "/account/projects/p-1" });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account/projects/p-1"));
  });
});

describe("helpers", () => {
  it("writes the countdown as minutes and seconds", () => {
    expect(countdown(27)).toBe("0:27");
    expect(countdown(65)).toBe("1:05");
  });

  it("goes back to a waiting booking only when there is a screen to go back to", () => {
    (router.canGoBack as jest.Mock).mockReturnValueOnce(false);
    goAfterSignIn("/book", true);
    expect(router.replace).toHaveBeenCalledWith("/book");
    goAfterSignIn(undefined, false);
    expect(router.replace).toHaveBeenLastCalledWith("/account");
  });
});
