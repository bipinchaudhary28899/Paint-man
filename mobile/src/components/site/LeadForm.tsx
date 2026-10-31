import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "~/components/ui/Button";
import { Skeleton } from "~/components/ui/Skeleton";
import { Field, Input, optionsOf, PhoneInput, PillChoice, type Focusable } from "~/components/ui/Field";
import { bookingRequiredFields, emptyBooking, type BookingField, type BookingValues } from "~/lib/booking";
import { useAuth } from "~/lib/auth-context";
import { submitBooking, submitContact, type SubmitResult } from "~/lib/leads";
import { openHref } from "~/lib/links";
import { heldBooking, holdBooking, takeBooking } from "~/lib/pending-booking";
import { NOT_LISTED_NOTE } from "~/lib/location";
import { customerLoginOpen, fieldProblem, isRequiredField, liveCities, type City, type RequiredField } from "~/shared";
import { colors, fonts, radii } from "~/theme";

// The website's LeadForm on phones (src/components/LeadForm.tsx), with the website's fields, checks,
// messages and payload, laid out for a phone. A booking asks only who and where, on one short form:
// name, mobile, the city as pills and the area (the city's localities as pills under it). The address
// (typed or pinned on the map) and the job are added afterwards on the project screen (ProjectSteps).
// A contact request is name, mobile and a message. Mistakes show with the website's own words on
// submit, or when the visitor leaves a field they typed in, and the first one takes focus. A sent form
// opens the thank-you page, as on the website.
// "Book my site visit" sends the booking (POST /api/v1/bookings) with the visitor's session. Signed
// out, the answers are held in memory (src/lib/pending-booking.ts) and the login screen opens; once
// signed in, the booking is sent from here without anything retyped. The API's field messages (the
// website's own words) show on their fields. Signed in, the name and mobile start as the account's.

type FormType = "booking" | "contact";
type Values = BookingValues;
type Errors = Partial<Record<BookingField, string>>;

type Props = {
  type: FormType;
  defaultService?: string;
  defaultMessage?: string;
  /** a live city's slug to start with chosen (a city's own page books that city) */
  defaultCity?: string;
  /** a short line under the submit button (BookingSection's note) */
  footnote?: ReactNode;
  live?: readonly City[];
  /** what happens after a successful submit; opens the thank-you page by default */
  onDone?: (result: { sent: boolean; projectId?: string }) => void;
  /** something to add to the booking is still on its way (the shade the visitor picked): its place shows as a skeleton */
  carrying?: boolean;
};

/** Every field in the order the form shows it: the first one with a problem takes focus. */
const ORDER: readonly BookingField[] = ["name", "phone", "city", "locality", "message"];

/** The note under "Book my site visit" while signed out: what happens before the booking is sent. */
export const SIGN_IN_NOTE = "Before it is sent, we text a code to your mobile to confirm the number.";

/** The localities to offer as pills: those containing what is typed, or all of them once one is chosen. */
export function localityChoices(areas: readonly string[], typed: string): string[] {
  const q = typed.trim().toLowerCase();
  if (areas.some((a) => a.toLowerCase() === q)) return [...areas];
  return areas.filter((a) => a.toLowerCase().includes(q));
}

export function LeadForm({ type, defaultService, defaultMessage, defaultCity, footnote, live = liveCities(), onDone, carrying = false }: Props) {
  const booking = type === "booking";
  const required: readonly RequiredField[] = booking ? bookingRequiredFields(live) : ["name", "phone", "message"];
  const askCity = booking && required.includes("city");
  const pathname = usePathname();
  const auth = useAuth();
  // a booking held for sign-in on this screen comes back as it was (the form opened again after signing in)
  const [resumed] = useState(() => {
    const held = booking ? heldBooking() : null;
    return held?.path === pathname ? held : null;
  });
  const [values, setValues] = useState<Values>(
    () =>
      resumed?.values ??
      emptyBooking({
        service: defaultService ?? "",
        message: defaultMessage ?? "",
        city: live.some((c) => c.slug === defaultCity) ? defaultCity : "",
        name: booking ? (auth.user?.name ?? "") : "",
        phone: booking ? (auth.user?.phone ?? "") : "",
      }),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // focus moves after the render that shows the problem
  const [focusOn, setFocusOn] = useState<{ field: BookingField }>();
  const inputs = useRef<Partial<Record<BookingField, Focusable | null>>>({});

  useEffect(() => {
    if (focusOn) inputs.current[focusOn.field]?.focus();
  }, [focusOn]);

  // the account loaded after the form opened: the name and mobile start as the account's while both are still blank
  const user = booking ? auth.user : null;
  const [prefilledFor, setPrefilledFor] = useState(user?.id);
  if (user && user.id !== prefilledFor) {
    setPrefilledFor(user.id);
    if (!values.name && !values.phone) setValues({ ...values, name: user.name ?? "", phone: user.phone });
  }

  const problemFor = (field: BookingField, value: string) => (isRequiredField(field) && required.includes(field) ? fieldProblem(field, value) : undefined);

  /** Sets values and clears their errors once they are fine, so the visitor sees the fix land. */
  function fill(patch: Partial<Values>) {
    setValues((v) => ({ ...v, ...patch }));
    const next = { ...errors };
    for (const [field, value] of Object.entries(patch) as [BookingField, string][]) if (next[field] && !problemFor(field, value)) delete next[field];
    if (Object.keys(next).length === Object.keys(errors).length) return;
    setErrors(next);
    if (Object.keys(next).length === 0) setFormError("");
  }

  const set = (field: BookingField, value: string) => fill({ [field]: value });

  /** Leaving a required field the visitor typed in checks it there and then (an empty one waits for submit). */
  function blur(field: BookingField) {
    const value = values[field];
    if (value.trim() === "") return;
    const problem = problemFor(field, value);
    if (problem && errors[field] !== problem) setErrors((e) => ({ ...e, [field]: problem }));
  }

  async function submit(current: Values = values) {
    setSubmitting(true);
    const result: SubmitResult = booking ? await submitBooking(current, { live, request: auth.request }) : await submitContact(current);
    setSubmitting(false);
    if (result.ok) {
      setErrors({});
      setFormError("");
      if (onDone) onDone({ sent: result.sent, projectId: result.projectId });
      else router.push({ pathname: "/thank-you", params: { type, sent: result.sent ? "1" : "0", ...(result.projectId && { project: result.projectId }) } });
      return;
    }
    if (result.signIn) {
      // keep every answer for after the sign-in, then ask for it
      setFormError("");
      holdBooking({ path: pathname, values: current });
      router.push({ pathname: "/login", params: { next: pathname, resume: "booking" } });
      return;
    }
    setErrors(result.errors);
    setFormError(result.message);
    const first = ORDER.find((f) => result.errors[f]);
    if (first) setFocusOn({ field: first });
  }

  // once the visitor has signed in, the booking held for it on this screen is sent: by the form still open
  // under the login screen (its answers are the held ones), or by the form opened again (it started with them)
  const status = auth.status;
  useEffect(() => {
    if (!booking || status !== "signedIn") return;
    const held = takeBooking(pathname);
    // sent from a task of its own, as a tap on "Book my site visit" would be
    if (held) queueMicrotask(() => void submit(held.values));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the sign-in lands, with the held answers
  }, [status]);

  const register = (name: BookingField) => (el: Focusable | null) => {
    inputs.current[name] = el;
  };

  const bind = (name: BookingField, label: string) => ({
    ref: register(name),
    value: values[name],
    onChangeText: (v: string) => set(name, v),
    onBlur: () => blur(name),
    error: errors[name],
    accessibilityLabel: label,
  });

  const city = askCity ? live.find((c) => c.slug === values.city) : live[0];
  const localityLabel = city ? `Area / locality in ${city.name}` : "Area / locality";
  const localities = localityChoices(city?.areas ?? [], values.locality);

  const errorLine =
    formError !== "" ? (
      <Text accessibilityRole="alert" style={styles.formError}>
        {formError}
      </Text>
    ) : null;

  const notes = (
    <>
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
      {/* while customer accounts are coming soon a signed-out booking goes without a code */}
      {booking && auth.status !== "signedIn" && customerLoginOpen() ? <Text style={styles.footnote}>{SIGN_IN_NOTE}</Text> : null}
      <Text style={styles.privacy}>
        We use your details only to respond to this request. See our{" "}
        <Text accessibilityRole="link" style={styles.link} onPress={() => openHref("/privacy-policy")}>
          privacy policy
        </Text>
        .
      </Text>
    </>
  );

  const nameAndMobile = (
    <>
      <Field label="Your name" error={errors.name}>
        <Input {...bind("name", "Your name")} autoComplete="name" textContentType="name" autoCapitalize="words" maxLength={80} returnKeyType="next" onSubmitEditing={() => inputs.current.phone?.focus()} />
      </Field>
      <Field label="Mobile number" error={errors.phone}>
        <PhoneInput {...bind("phone", "Mobile number")} />
      </Field>
    </>
  );

  if (!booking) {
    return (
      <View style={styles.form} accessibilityState={{ busy: submitting }}>
        {nameAndMobile}
        <Field label="How can we help?" error={errors.message}>
          <Input {...bind("message", "How can we help?")} multiline maxLength={1000} style={styles.textareaTall} />
        </Field>
        {errorLine}
        <Button label="Send message" busyLabel="Sending…" busy={submitting} onPress={() => void submit()} height={54} fontSize={16} />
        {notes}
      </View>
    );
  }

  return (
    <View style={styles.form} accessibilityState={{ busy: submitting }}>
      {nameAndMobile}
      {askCity && (
        <Field label="City" error={errors.city}>
          <PillChoice ref={register("city")} label="City" value={values.city} options={live.map((c) => ({ value: c.slug, label: c.name }))} onChange={(v) => set("city", v)} error={errors.city} />
        </Field>
      )}
      <Field label={localityLabel} error={errors.locality}>
        <Input {...bind("locality", localityLabel)} autoComplete="address-line2" textContentType="sublocality" placeholder="Type it, or tap one below" maxLength={80} returnKeyType="done" />
        {city && localities.length > 0 && (
          <View style={styles.localities}>
            <PillChoice scroll label={`Localities in ${city.name}`} value={values.locality} options={optionsOf(localities)} onChange={(v) => set("locality", v)} />
          </View>
        )}
      </Field>
      {city && values.locality.trim() !== "" && localities.length === 0 && <Text style={styles.note}>{NOT_LISTED_NOTE}</Text>}
      {(values.service !== "" || values.message !== "" || carrying) && (
        <View style={styles.carried}>
          <Text style={styles.carriedKey}>Added to your booking</Text>
          {values.service !== "" && <Text style={styles.carriedService}>{values.service}</Text>}
          {values.message !== "" ? (
            <Text style={styles.carriedNote} numberOfLines={2}>
              {values.message}
            </Text>
          ) : carrying ? (
            <View accessible accessibilityLabel="Adding the shade you picked" accessibilityState={{ busy: true }} style={styles.carriedLoading}>
              <Skeleton height={13} width="88%" />
              <Skeleton height={13} width="54%" />
            </View>
          ) : null}
        </View>
      )}
      <Text style={styles.note}>
        {customerLoginOpen()
          ? "That's all we need to call you. Add the address and what needs painting later in your account, or tell us on the call."
          : "That's all we need to call you. We take the address and what needs painting on the call."}
      </Text>
      {errorLine}
      <Button label="Book my site visit" busyLabel="Sending…" busy={submitting} onPress={() => void submit()} height={54} fontSize={16} />
      {notes}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  carriedLoading: { marginTop: 4, gap: 6 },
  carried: { borderRadius: radii.md, backgroundColor: colors.creamWash, paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  carriedKey: { fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 16, letterSpacing: 1.1, textTransform: "uppercase", color: colors.muted },
  carriedService: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 21, color: colors.ink },
  carriedNote: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.muted },
  localities: { marginTop: 10 },
  note: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.muted },
  textareaTall: { minHeight: 120, textAlignVertical: "top" },
  // danger on white is 5.35:1 (on the peach wash it was 3.81:1)
  formError: { borderRadius: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.danger, padding: 12, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.danger },
  footnote: { textAlign: "center", fontFamily: fonts.sans, fontSize: 13, lineHeight: 19.5, color: colors.muted },
  privacy: { textAlign: "center", fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
  link: { textDecorationLine: "underline" },
});
