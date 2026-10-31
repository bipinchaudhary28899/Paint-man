"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ACCOUNT_PATH, formatMobile, safeNextPath } from "@/lib/account";
import { callApi, errorText, retryAfter, type ApiFailure } from "@/lib/api-client";
import { hardNavigate } from "@/lib/browser";
import { FIELD_MESSAGES, MOBILE_PATTERN, normalizeMobile } from "@/lib/leads/field-checks";
import { useUrlQuery } from "../useUrlQuery";
import { useSignedInHint } from "./AccountLink";

// Logging in with a mobile number: the number, then the 6-digit code sent by SMS (one field, filled
// by the phone's SMS autofill or a paste, sent as soon as six digits are in), then back to the page
// that asked (?next=, a path on this site) or the account. Every error is the API's own message.

const CODE_LENGTH = 6;
const CODE_MESSAGE = `Enter the ${CODE_LENGTH}-digit code from the SMS`;
/** Waits longer than this are not counted down on the resend button (the message names the wait). */
const MAX_COUNTDOWN = 15 * 60;

type OtpSent = { sent: true; phone: string; expiresInSeconds: number; resendInSeconds: number };

/** "0:27", "4:05". */
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function LoginForm() {
  const query = useUrlQuery();
  const signedIn = useSignedInHint();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const inFlight = useRef(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const phoneField = useRef<HTMLInputElement>(null);

  // the resend countdown, one second at a time
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // moving between the steps puts the cursor in the new field (not on first load: no surprise keyboard)
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    (step === "code" ? codeInput : phoneField).current?.focus();
  }, [step]);

  const fail = (failure: ApiFailure) => {
    setError(errorText(failure));
    const wait = retryAfter(failure);
    if (wait && wait <= MAX_COUNTDOWN) setResendIn(wait);
  };

  async function requestCode(number: string): Promise<boolean> {
    const res = await callApi<OtpSent>("/api/v1/auth/otp", { body: { phone: number } });
    if (!res.ok) {
      fail(res);
      return false;
    }
    setResendIn(res.data.resendInSeconds);
    return true;
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const number = normalizeMobile(phoneInput);
    if (!MOBILE_PATTERN.test(number)) {
      setError(FIELD_MESSAGES.phone);
      phoneField.current?.focus();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNote("");
    if (await requestCode(number)) {
      setPhone(number);
      setCode("");
      setStep("code");
    }
    inFlight.current = false;
    setBusy(false);
  }

  async function resend() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNote("");
    if (await requestCode(phone)) {
      setCode("");
      setNote("A new code is on its way.");
      codeInput.current?.focus();
    }
    inFlight.current = false;
    setBusy(false);
  }

  async function verify(value: string) {
    if (inFlight.current) return;
    if (value.length !== CODE_LENGTH) {
      setError(CODE_MESSAGE);
      codeInput.current?.focus();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNote("");
    const res = await callApi("/api/v1/auth/verify", { body: { phone, code: value, client: "web" } });
    if (res.ok) {
      // a full page load: every part of the site (the header's "My account" too) sees the new session
      hardNavigate(safeNextPath(query.get("next")));
      return;
    }
    if (res.code === "invalid_request") {
      const details = res.details as Record<string, string> | undefined;
      setError(details?.code ?? details?.phone ?? res.message);
    } else {
      fail(res);
    }
    setCode("");
    inFlight.current = false;
    setBusy(false);
    codeInput.current?.focus();
  }

  function changeNumber() {
    setStep("phone");
    setCode("");
    setError("");
    setNote("");
  }

  const errorId = "login-error";
  const described = error ? { "aria-invalid": true as const, "aria-describedby": errorId } : {};

  return (
    <div>
      {signedIn && (
        <p className="mb-5 rounded-pm-md border border-line-soft bg-cream-wash px-4 py-3 text-sm leading-relaxed">
          You&apos;re already logged in on this device.{" "}
          <Link href={ACCOUNT_PATH} prefetch={false} className="font-semibold underline underline-offset-4 hover:text-terracotta">
            Go to my account
          </Link>
        </p>
      )}

      {step === "phone" ? (
        <form onSubmit={sendCode} noValidate aria-busy={busy} className="space-y-4">
          <div>
            <label htmlFor="login-phone" className="mb-1.5 block text-sm font-semibold">
              Mobile number
            </label>
            {/* +91 sits inside the field, as Indian forms show it (and as the booking form does) */}
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center border-r border-line pl-3.5 pr-2.5 text-[15px] font-medium text-muted desk:pl-4">
                +91
              </span>
              <input
                ref={phoneField}
                id="login-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                required
                placeholder="10-digit mobile"
                maxLength={16}
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="field min-h-12 !pl-[3.75rem] desk:!pl-[3.9rem]"
                {...described}
              />
            </div>
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Sending the code…" : "Send code"}
          </button>
          <p className="text-sm leading-relaxed text-muted">We send a {CODE_LENGTH}-digit code by SMS. No password to remember.</p>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify(code);
          }}
          noValidate
          aria-busy={busy}
          className="space-y-4"
        >
          <p className="text-[15px] leading-relaxed">
            We sent a {CODE_LENGTH}-digit code to <strong className="whitespace-nowrap font-semibold">{formatMobile(phone)}</strong>.{" "}
            <button type="button" onClick={changeNumber} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:text-terracotta">
              Change number
            </button>
          </p>
          <div>
            <label htmlFor="login-code" className="mb-1.5 block text-sm font-semibold">
              {CODE_LENGTH}-digit code
            </label>
            <input
              ref={codeInput}
              id="login-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              enterKeyHint="go"
              value={code}
              onChange={(e) => {
                // a pasted "123 456" or "Your code is 123456" keeps only its digits
                const digits = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
                setCode(digits);
                if (digits.length === CODE_LENGTH) void verify(digits);
              }}
              className="field min-h-14 text-center font-semibold !text-2xl tracking-[0.45em]"
              {...described}
            />
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <p role="status" className="text-sm text-success empty:hidden">
            {note}
          </p>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Checking…" : "Verify and log in"}
          </button>
          <div className="flex min-h-11 items-center justify-center text-sm">
            {resendIn > 0 ? (
              <p className="text-muted">
                Resend code in <span className="tabular-nums">{clock(resendIn)}</span>
              </p>
            ) : (
              <button type="button" onClick={resend} disabled={busy} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:text-terracotta disabled:opacity-60">
                Resend code
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
