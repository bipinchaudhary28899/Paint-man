import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Container } from "~/components/site/Page";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Bits";
import { Field, Input, PhoneInput, type InputHandle } from "~/components/ui/Field";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { TapLink } from "~/components/content/Inline";
import { ApiError } from "~/lib/api";
import { cleanCode, CODE_LENGTH, codeProblem, errorMessage, phoneProblem, retryAfter, sendCode } from "~/lib/auth";
import { useAuth } from "~/lib/auth-context";
import { openHref } from "~/lib/links";
import { heldBooking, releaseBooking } from "~/lib/pending-booking";
import { colors, fonts, radii } from "~/theme";

// The login screen (the website's /login): the mobile number with "+91" as the booking form shows it,
// "Send code", then one field for the 6-digit code from the SMS (the phone offers it from the
// message: oneTimeCode / sms-otp) with a countdown before a new code can be sent. A complete code is
// checked at once. Every refusal shows the API's own words: a wrong code with the tries left, an
// expired code, too many tries with the wait, sign-in codes not set up yet. Signed in, the visitor
// goes back where they came from: the booking they were sending (`resume`), the screen in `next`,
// or their account.

type Phase = "phone" | "code";

/** "0:27": the wait before a new code, as minutes and seconds. */
export const countdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** After signing in: back to the booking being sent (it is open under this screen), else the `next` screen or the account. */
export function goAfterSignIn(next: string | undefined, resume: boolean): void {
  if (resume && router.canGoBack()) router.back();
  else router.replace((next ?? "/account") as never);
}

/** A countdown in whole seconds, ticking each second while it runs: the seconds left and a way to start one. */
function useCountdown(): [number, (seconds: number) => void] {
  const [clock, setClock] = useState({ until: 0, now: 0 });
  const left = Math.max(0, Math.ceil((clock.until - clock.now) / 1000));
  const running = left > 0;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setClock((c) => ({ ...c, now: Date.now() })), 1000);
    return () => clearInterval(id);
  }, [running]);
  const start = (seconds: number) => {
    const now = Date.now();
    setClock({ until: now + seconds * 1000, now });
  };
  return [left, start];
}

type Props = {
  /** the app screen to open after signing in (already checked with safeNext) */
  next?: string;
  /** a booking is waiting to be sent once signed in */
  resume?: boolean;
};

export function Login({ next, resume = false }: Props) {
  const auth = useAuth();
  const [phase, setPhase] = useState<Phase>("phone");
  // a held booking already has the mobile number the visitor typed
  const [phone, setPhone] = useState(() => (resume ? (heldBooking()?.values.phone ?? "") : ""));
  const [code, setCode] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [sentTo, setSentTo] = useState({ phone: "", minutes: 5 });
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [wait, startWait] = useCountdown();
  const codeInput = useRef<InputHandle>(null);
  const phoneInput = useRef<InputHandle>(null);
  const signedIn = useRef(false);
  const signingIn = useRef(false);

  // already signed in (a link to the login screen): straight on to where it was going
  useEffect(() => {
    if (auth.status === "signedIn" && !signingIn.current) router.replace((next ?? "/account") as never);
  }, [auth.status, next]);

  // leaving without signing in lets the held booking go (the form still has every answer)
  useEffect(
    () => () => {
      if (resume && !signedIn.current) releaseBooking();
    },
    [resume],
  );

  useEffect(() => {
    if (phase === "code") codeInput.current?.focus();
  }, [phase, sentTo]);

  /** Sends a code (the first, or a new one), with the API's words for anything that stops it. */
  async function send() {
    setFormError("");
    setNotice("");
    const problem = phoneProblem(phone);
    if (problem) {
      setPhoneError(problem);
      phoneInput.current?.focus();
      return;
    }
    setPhoneError("");
    setSending(true);
    try {
      const sent = await sendCode(phone);
      setSentTo({ phone: sent.phone, minutes: Math.max(1, Math.round(sent.expiresInSeconds / 60)) });
      startWait(sent.resendInSeconds);
      setCode("");
      setCodeError("");
      if (phase === "code") setNotice(`We sent a new code to ${sent.phone}.`);
      setPhase("code");
    } catch (err) {
      const message = errorMessage(err);
      if (err instanceof ApiError && err.code === "invalid_phone") setPhoneError(message);
      else setFormError(message);
      const seconds = retryAfter(err);
      if (seconds) startWait(seconds);
    } finally {
      setSending(false);
    }
  }

  /** Checks the code and signs in. */
  async function check(value = code) {
    setFormError("");
    setNotice("");
    const problem = codeProblem(value);
    if (problem) {
      setCodeError(problem);
      codeInput.current?.focus();
      return;
    }
    setCodeError("");
    setChecking(true);
    signingIn.current = true;
    try {
      await auth.signIn(phone, value);
      signedIn.current = true;
      goAfterSignIn(next, resume);
    } catch (err) {
      signingIn.current = false;
      const message = errorMessage(err);
      if (err instanceof ApiError && (err.code === "invalid_code" || err.code === "code_expired")) {
        setCodeError(message);
        setCode("");
      } else if (err instanceof ApiError && err.code === "invalid_request") {
        const details = (err.details ?? {}) as { code?: string; phone?: string };
        if (details.phone) {
          setPhoneError(details.phone);
          setPhase("phone");
        } else setCodeError(details.code ?? message);
      } else setFormError(message);
    } finally {
      setChecking(false);
    }
  }

  function typeCode(text: string) {
    const digits = cleanCode(text);
    setCode(digits);
    if (codeError) setCodeError("");
    // a whole code (typed, pasted or filled in from the SMS) is checked at once
    if (digits.length === CODE_LENGTH && code.length !== CODE_LENGTH && !checking) void check(digits);
  }

  function changeNumber() {
    setPhase("phone");
    setCode("");
    setCodeError("");
    setFormError("");
    setNotice("");
  }

  const errorLine =
    formError !== "" ? (
      <Text accessibilityRole="alert" style={styles.formError}>
        {formError}
      </Text>
    ) : null;

  return (
    <Container style={styles.page}>
      <Eyebrow>Your account</Eyebrow>
      <H size={40} leading={1.04} tracking={-0.02} style={styles.title}>
        Log in to your <Em>account</Em>
      </H>
      <P size={18} leading={1.6} color={colors.muted} style={styles.intro}>
        Follow your painting project from the first call to the handover: the inspection, your itemised quotations and every update. We text a {CODE_LENGTH}-digit code to your
        mobile; there is no password.
      </P>
      {resume && (
        <View style={styles.resume}>
          <Text style={styles.resumeKey}>Your booking is waiting</Text>
          <P size={15} leading={1.5}>
            Log in with your mobile number and we send your booking straight after. Everything you filled in is kept.
          </P>
        </View>
      )}

      <Card style={styles.card}>
        {phase === "phone" ? (
          <View style={styles.form}>
            <Field label="Mobile number" error={phoneError}>
              <PhoneInput
                ref={phoneInput}
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  if (phoneError && !phoneProblem(v)) setPhoneError("");
                }}
                accessibilityLabel="Mobile number"
                error={phoneError || undefined}
                returnKeyType="send"
                onSubmitEditing={() => void send()}
              />
            </Field>
            {errorLine}
            <Button label="Send code" busyLabel="Sending…" busy={sending} disabled={wait > 0} onPress={() => void send()} height={54} fontSize={16} />
            {wait > 0 && <Text style={styles.hint}>You can ask for a code again in {countdown(wait)}.</Text>}
          </View>
        ) : (
          <View style={styles.form}>
            <View>
              <Text style={styles.sent} accessibilityLiveRegion="polite">
                We sent a {CODE_LENGTH}-digit code to <Text style={styles.sentPhone}>{sentTo.phone}</Text>. It works for {sentTo.minutes} minutes.
              </Text>
              <TapLink label="Change number" onPress={changeNumber} textStyle={styles.change} />
            </View>
            <Field label={`${CODE_LENGTH}-digit code`} error={codeError}>
              <Input
                ref={codeInput}
                value={code}
                onChangeText={typeCode}
                accessibilityLabel={`${CODE_LENGTH}-digit code`}
                error={codeError || undefined}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={CODE_LENGTH + 4}
                returnKeyType="done"
                onSubmitEditing={() => void check()}
                style={styles.code}
              />
            </Field>
            {notice !== "" && (
              <Text style={styles.hint} accessibilityLiveRegion="polite">
                {notice}
              </Text>
            )}
            {errorLine}
            <Button label="Log in" busyLabel="Checking…" busy={checking} onPress={() => void check()} height={54} fontSize={16} />
            <Button
              label={wait > 0 ? `Send a new code in ${countdown(wait)}` : "Send a new code"}
              accessibilityLabel={wait > 0 ? `Send a new code in ${wait} seconds` : "Send a new code"}
              variant="secondary"
              small
              busy={sending}
              disabled={wait > 0 || checking}
              onPress={() => void send()}
            />
          </View>
        )}
      </Card>

      <Text style={styles.privacy}>
        We use your number only to sign you in and link your bookings. See our{" "}
        <Text accessibilityRole="link" style={styles.link} onPress={() => openHref("/privacy-policy")}>
          privacy policy
        </Text>
        .
      </Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 64 },
  title: { marginTop: 16 },
  intro: { marginTop: 20 },
  resume: { marginTop: 24, borderRadius: radii.md, backgroundColor: colors.creamWash, paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  resumeKey: { fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 16, letterSpacing: 1.1, textTransform: "uppercase", color: colors.muted },
  card: { marginTop: 28, padding: 20 },
  form: { gap: 14 },
  sent: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.ink },
  sentPhone: { fontFamily: fonts.sansBold },
  change: { fontSize: 15, color: colors.ink },
  code: { fontFamily: fonts.sansSemiBold, fontSize: 22, letterSpacing: 6 },
  hint: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: "center" },
  // danger on white is 5.35:1
  formError: { borderRadius: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.danger, padding: 12, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.danger },
  privacy: { marginTop: 20, textAlign: "center", fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
  link: { textDecorationLine: "underline" },
});
