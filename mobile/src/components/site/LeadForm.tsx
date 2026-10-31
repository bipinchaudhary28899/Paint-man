import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight, LayoutAnimationConfig, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Button } from "~/components/ui/Button";
import { Plus } from "~/components/ui/Bits";
import { Collapse } from "~/components/ui/Collapse";
import { Skeleton } from "~/components/ui/Skeleton";
import { DateInput, Field, Input, optionsOf, PhoneInput, PillChoice, Select, type Focusable } from "~/components/ui/Field";
import { bookingRequiredFields, carpetAreaProblem, DETAIL_FIELDS, emptyBooking, FORM_ERROR, jobEstimate, type BookingField, type BookingValues } from "~/lib/booking";
import { submitBooking, submitContact, type SubmitResult } from "~/lib/leads";
import { openHref } from "~/lib/links";
import {
  bookingDateRange,
  fieldProblem,
  floorOptions,
  formatSqft,
  homeSizes,
  isRequiredField,
  liveCities,
  propertyTypes,
  requiredFieldErrors,
  serviceTypes,
  type City,
  type RequiredField,
} from "~/shared";
import { colors, fonts, radii } from "~/theme";

// The website's LeadForm on phones (src/components/LeadForm.tsx), with the website's fields, checks,
// messages and payload, laid out for a phone. A booking is two short steps under a progress bar:
// "Your details" (name, mobile and the city as pills), then "Where to paint" (address, locality with
// the city's localities as pills, PIN code, and everything about the job under "Add more details").
// Continue checks the first step only and slides the second step in from the right (the progress bar
// filling); Back slides it out again and keeps every answer. A contact request is one short form
// (name, mobile, message). Mistakes show with the website's own words on Continue, on submit, or when
// the visitor leaves a field they typed in, and the first one takes focus. A sent form opens the
// thank-you page, as on the website.

type FormType = "booking" | "contact";
type Values = BookingValues;
type Errors = Partial<Record<BookingField, string>>;
type Step = 1 | 2;

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
  onDone?: (result: { sent: boolean }) => void;
  /** something to add to the booking is still on its way (the shade the visitor picked): its place shows as a skeleton */
  carrying?: boolean;
};

const STEP_TITLES: Record<Step, string> = { 1: "Your details", 2: "Where to paint" };

/** The fields of the first step; the rest of the required ones are on the second. */
const FIRST_STEP: readonly RequiredField[] = ["name", "phone", "city"];

/** Every field in the order the form shows it: the first one with a problem takes focus. */
const ORDER: readonly BookingField[] = ["name", "phone", "city", "address", "locality", "pincode", "service", "propertyType", "floors", "homeSize", "carpetArea", "preferredDate", "message"];

const floorLabel = (f: string) => (f === "1" ? "1 floor" : `${f} floors`);

/** The localities to offer as pills: those containing what is typed, or all of them once one is chosen. */
export function localityChoices(areas: readonly string[], typed: string): string[] {
  const q = typed.trim().toLowerCase();
  if (areas.some((a) => a.toLowerCase() === q)) return [...areas];
  return areas.filter((a) => a.toLowerCase().includes(q));
}

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const STEP_OUT_MS = 160;
const STEP_IN_MS = 260;
/** The steps' slides: the step going out leaves first, the one coming in follows (instant under reduce motion, the builders' default). */
const stepMotion = {
  firstIn: FadeInLeft.duration(STEP_IN_MS).delay(STEP_OUT_MS - 40).easing(ease),
  firstOut: FadeOutLeft.duration(STEP_OUT_MS),
  secondIn: FadeInRight.duration(STEP_IN_MS).delay(STEP_OUT_MS - 40).easing(ease),
  secondOut: FadeOutRight.duration(STEP_OUT_MS),
};

/** "Step 1 of 2" with the step's name over two short bars, the done part in terracotta (the second filling from the left). */
function Progress({ step }: { step: Step }) {
  const fill = useSharedValue(step === 2 ? 1 : 0);
  useEffect(() => {
    fill.value = withTiming(step === 2 ? 1 : 0, { duration: 360, easing: ease, reduceMotion: ReduceMotion.System });
  }, [step, fill]);
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={STEP_TITLES[step]}
      // the text stands in for a percentage (step 1 of 1–2 would be read as 0%)
      accessibilityValue={{ min: 1, max: 2, now: step, text: `Step ${step} of 2` }}
      style={styles.progress}
    >
      <View style={styles.progressRow}>
        <Text style={styles.stepTitle}>{STEP_TITLES[step]}</Text>
        <Text style={styles.stepCount}>Step {step} of 2</Text>
      </View>
      <View style={styles.bars}>
        <View style={[styles.bar, styles.barOn]} />
        <View style={styles.bar}>
          <Animated.View style={[styles.barFill, fillStyle]} testID="progress-fill" />
        </View>
      </View>
    </View>
  );
}

export function LeadForm({ type, defaultService, defaultMessage, defaultCity, footnote, live = liveCities(), onDone, carrying = false }: Props) {
  const booking = type === "booking";
  const required: readonly RequiredField[] = booking ? bookingRequiredFields(live) : ["name", "phone", "message"];
  const askCity = booking && required.includes("city");
  const firstStep = required.filter((f) => FIRST_STEP.includes(f));
  const [values, setValues] = useState<Values>(() =>
    emptyBooking({ service: defaultService ?? "", message: defaultMessage ?? "", city: live.some((c) => c.slug === defaultCity) ? defaultCity : "" }),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>(1);
  // "Add more details" starts open only when the page prefilled the note, so the visitor sees it
  const [moreOpen, setMoreOpen] = useState(Boolean(defaultMessage) && booking);
  const [range] = useState(bookingDateRange);
  // focus moves after the render that shows the field (the next step, or the opened details)
  const [focusOn, setFocusOn] = useState<{ field: BookingField }>();
  const inputs = useRef<Partial<Record<BookingField, Focusable | null>>>({});

  useEffect(() => {
    if (focusOn) inputs.current[focusOn.field]?.focus();
  }, [focusOn]);

  const problemFor = (field: BookingField, value: string) => {
    if (field === "carpetArea") return carpetAreaProblem(value);
    return isRequiredField(field) && required.includes(field) ? fieldProblem(field, value) : undefined;
  };

  /** Sets a value and clears its error once the value is fine, so the visitor sees the fix land. */
  function set(field: BookingField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (!errors[field] || problemFor(field, value)) return;
    const next = { ...errors };
    delete next[field];
    setErrors(next);
    if (Object.keys(next).length === 0) setFormError("");
  }

  /** Leaving a required field the visitor typed in checks it there and then (an empty one waits for submit). */
  function blur(field: BookingField) {
    const value = values[field];
    if (value.trim() === "") return;
    const problem = problemFor(field, value);
    if (problem && errors[field] !== problem) setErrors((e) => ({ ...e, [field]: problem }));
  }

  /** Continue: the first step's fields with the website's checks; the second step once they are fine. */
  function next() {
    const problems: Errors = requiredFieldErrors("booking", values, firstStep);
    const rest = { ...errors };
    for (const f of firstStep) delete rest[f];
    setErrors({ ...rest, ...problems });
    const first = firstStep.find((f) => problems[f]);
    if (first) {
      setFormError(FORM_ERROR);
      setFocusOn({ field: first });
      return;
    }
    setFormError("");
    setStep(2);
    setFocusOn({ field: "address" });
  }

  /** Back to the first step; every answer stays (the second step's open problems show again on return). */
  function back() {
    setFormError("");
    setStep(1);
  }

  async function submit() {
    setSubmitting(true);
    const result: SubmitResult = booking ? await submitBooking(values, live) : await submitContact(values);
    setSubmitting(false);
    if (result.ok) {
      setErrors({});
      setFormError("");
      if (onDone) onDone({ sent: result.sent });
      else router.push({ pathname: "/thank-you", params: { type, sent: result.sent ? "1" : "0" } });
      return;
    }
    setErrors(result.errors);
    setFormError(result.message);
    if (DETAIL_FIELDS.some((f) => result.errors[f])) setMoreOpen(true);
    const first = ORDER.find((f) => result.errors[f]);
    if (first) setFocusOn({ field: first });
  }

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
  const localityLabel = city ? `Locality in ${city.name}` : "Locality";
  const localities = localityChoices(city?.areas ?? [], values.locality);
  const job = jobEstimate(values);

  const errorLine =
    formError !== "" ? (
      <Text accessibilityRole="alert" style={styles.formError}>
        {formError}
      </Text>
    ) : null;

  const notes = (
    <>
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
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
        <Button label="Send message" busyLabel="Sending…" busy={submitting} onPress={submit} height={54} fontSize={16} />
        {notes}
      </View>
    );
  }

  return (
    // the first step shows without a slide when the form appears, and the form leaves without one
    <LayoutAnimationConfig skipEntering skipExiting>
      <View style={styles.form} accessibilityState={{ busy: submitting }}>
        <Progress step={step} />

        {step === 1 ? (
          <Animated.View key="step-1" entering={stepMotion.firstIn} exiting={stepMotion.firstOut} style={styles.step}>
            {nameAndMobile}
            {askCity && (
              <Field label="City" error={errors.city}>
                <PillChoice ref={register("city")} label="City" value={values.city} options={live.map((c) => ({ value: c.slug, label: c.name }))} onChange={(v) => set("city", v)} error={errors.city} />
              </Field>
            )}
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
            {errorLine}
            <Button label="Continue" onPress={next} height={54} fontSize={16} accessibilityHint={`Next: ${STEP_TITLES[2]}`} />
          </Animated.View>
        ) : (
          <Animated.View key="step-2" entering={stepMotion.secondIn} exiting={stepMotion.secondOut} style={styles.step}>
            <Field label="House / flat no., building and street" error={errors.address}>
              <Input
                {...bind("address", "House / flat no., building and street")}
                autoComplete="street-address"
                textContentType="streetAddressLine1"
                placeholder="e.g. 12, Rose Villa, Nehru Road"
                maxLength={200}
                returnKeyType="next"
                onSubmitEditing={() => inputs.current.locality?.focus()}
              />
            </Field>
            <Field label={localityLabel} error={errors.locality}>
              <Input
                {...bind("locality", localityLabel)}
                autoComplete="address-line2"
                textContentType="sublocality"
                placeholder="Type it, or tap one below"
                maxLength={80}
                returnKeyType="next"
                onSubmitEditing={() => inputs.current.pincode?.focus()}
              />
              {localities.length > 0 && (
                <View style={styles.localities}>
                  <PillChoice scroll label={`Localities in ${city!.name}`} value={values.locality} options={optionsOf(localities)} onChange={(v) => set("locality", v)} />
                </View>
              )}
            </Field>
            <Field label="PIN code" error={errors.pincode}>
              <Input {...bind("pincode", "PIN code")} keyboardType="number-pad" autoComplete="postal-code" textContentType="postalCode" placeholder="6 digits" maxLength={7} />
            </Field>

            {/* Everything about the job is optional: a single wall or a door books as fast as a house. */}
            <View style={styles.details}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: moreOpen }} onPress={() => setMoreOpen((o) => !o)} style={styles.summary}>
                <Text style={styles.summaryText}>
                  <Text style={styles.summaryBold}>Add more details</Text> <Text style={styles.optional}>(optional)</Text>
                </Text>
                <View style={styles.plusBox}>
                  <Plus open={moreOpen} size={18} disc />
                </View>
              </Pressable>
              <Collapse open={moreOpen} style={styles.detailsBody}>
                <Field label="What needs painting?" error={errors.service}>
                  <Select label="What needs painting?" value={values.service} options={optionsOf(serviceTypes)} onChange={(v) => set("service", v)} error={errors.service} />
                </Field>
                <Field label="Property type" error={errors.propertyType}>
                  <Select label="Property type" value={values.propertyType} options={optionsOf(propertyTypes)} onChange={(v) => set("propertyType", v)} error={errors.propertyType} />
                </Field>
                <Field label="Floors to paint" error={errors.floors}>
                  <Select label="Floors to paint" value={values.floors} options={optionsOf(floorOptions, floorLabel)} onChange={(v) => set("floors", v)} error={errors.floors} />
                </Field>
                <Field label="Home size" error={errors.homeSize}>
                  <Select label="Home size" value={values.homeSize} options={optionsOf(homeSizes)} onChange={(v) => set("homeSize", v)} error={errors.homeSize} />
                </Field>
                <View>
                  <Field label="Carpet area per floor (sq ft)" error={errors.carpetArea}>
                    <Input {...bind("carpetArea", "Carpet area per floor (sq ft)")} keyboardType="number-pad" placeholder="e.g. 1200" maxLength={7} />
                  </Field>
                  <Text style={styles.hint} accessibilityLiveRegion="polite">
                    {job.area !== null ? (
                      <>
                        About <Text style={styles.hintStrong}>{formatSqft(job.area)}</Text> of walls and ceilings to paint, all floors together.
                      </>
                    ) : job.measuredOnSite ? (
                      "Measured on site for this job."
                    ) : (
                      "It's on your sale deed or society papers. Not sure? Leave it blank."
                    )}
                  </Text>
                </View>
                <Field label="Preferred inspection date" error={errors.preferredDate}>
                  <DateInput label="Preferred inspection date" value={values.preferredDate} min={range.min} max={range.max} onChange={(v) => set("preferredDate", v)} error={errors.preferredDate} />
                </Field>
                <Field label="Anything we should know?" error={errors.message}>
                  <Input
                    {...bind("message", "Anything we should know?")}
                    multiline
                    maxLength={1000}
                    placeholder="A single wall, two doors, the balcony grills, a full flat… and any damp or cracks"
                    style={styles.textarea}
                  />
                </Field>
              </Collapse>
            </View>

            {errorLine}
            <View style={styles.actions}>
              <Button label="Back" variant="secondary" onPress={back} height={54} fontSize={16} accessibilityHint={`Back to ${STEP_TITLES[1].toLowerCase()}`} style={styles.back} />
              <Button label="Book my inspection" busyLabel="Sending…" busy={submitting} onPress={submit} height={54} fontSize={16} style={styles.submit} />
            </View>
          </Animated.View>
        )}
        {notes}
      </View>
    </LayoutAnimationConfig>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  progress: { gap: 10, paddingBottom: 2 },
  progressRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  stepTitle: { flexShrink: 1, fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: colors.ink },
  stepCount: { fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: colors.muted },
  bars: { flexDirection: "row", gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: "hidden" },
  barOn: { backgroundColor: colors.terracotta },
  barFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.terracotta, transformOrigin: "left" },
  step: { gap: 14 },
  carriedLoading: { marginTop: 4, gap: 6 },
  carried: { borderRadius: radii.md, backgroundColor: colors.creamWash, paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  carriedKey: { fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 16, letterSpacing: 1.1, textTransform: "uppercase", color: colors.muted },
  carriedService: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 21, color: colors.ink },
  carriedNote: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.muted },
  localities: { marginTop: 10 },
  details: { borderRadius: radii.md, borderWidth: 1, borderStyle: "dashed", borderColor: colors.lineStrong, backgroundColor: colors.creamWash },
  summary: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  summaryText: { flex: 1, fontSize: 15, color: colors.ink },
  summaryBold: { fontFamily: fonts.sansBold, fontSize: 15 },
  optional: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  plusBox: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  detailsBody: { gap: 14, borderTopWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingBottom: 16, paddingTop: 14 },
  hint: { marginTop: 6, fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
  hintStrong: { fontFamily: fonts.sansBold, color: colors.ink },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  textareaTall: { minHeight: 120, textAlignVertical: "top" },
  // danger on white is 5.35:1 (on the peach wash it was 3.81:1)
  formError: { borderRadius: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.danger, padding: 12, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.danger },
  actions: { flexDirection: "row", gap: 10 },
  back: { paddingHorizontal: 22 },
  submit: { flex: 1, paddingHorizontal: 16 },
  footnote: { textAlign: "center", fontFamily: fonts.sans, fontSize: 13, lineHeight: 19.5, color: colors.muted },
  privacy: { textAlign: "center", fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
  link: { textDecorationLine: "underline" },
});
