import DateTimePicker from "@react-native-community/datetimepicker";
import { useRef, useState, type ComponentRef, type ReactNode, type Ref } from "react";
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import {
  bookingRequiredFields,
  carpetAreaProblem,
  DETAIL_FIELDS,
  emptyBooking,
  FORM_ERROR,
  jobEstimate,
  submitBooking,
  type BookingField,
  type BookingValues,
} from "~/lib/booking";
import { webUrl } from "~/lib/config";
import { formatDate, isoToLocalDate, localDateToIso } from "~/lib/dates";
import {
  bookingDateRange,
  fieldProblem,
  floorOptions,
  formatSqft,
  homeSizes,
  liveCities,
  propertyTypes,
  serviceTypes,
  type City,
  type RequiredField,
} from "~/shared";
import { colors, fonts, gutter, radii } from "~/theme";
import { Button } from "./Button";
import { Chip } from "./Chip";
import { Muted, Strong } from "./Text";

// The booking form, field for field the website's LeadForm: name, mobile, address, city, locality
// and PIN code are required; what needs painting, the property, its size, a date and a note sit
// under "Add more details". Mistakes show with the website's own words, on submit or when the
// visitor leaves a field they typed in.

type Props = {
  prefill?: Partial<BookingValues>;
  onDone: (result: { sent: boolean }) => void;
  live?: readonly City[];
};

type Errors = Partial<Record<BookingField, string>>;
type InputHandle = ComponentRef<typeof TextInput>;

const isRequired = (field: BookingField, required: readonly RequiredField[]): field is RequiredField => (required as readonly string[]).includes(field);

/** Problem with one field's current value, by the same rules as submitting. */
function problemFor(field: BookingField, value: string, required: readonly RequiredField[]): string | undefined {
  if (field === "carpetArea") return carpetAreaProblem(value);
  return isRequired(field, required) ? fieldProblem(field, value) : undefined;
}

const floorLabel = (f: string) => (f === "1" ? "1 floor" : `${f} floors`);

export function BookingForm({ prefill, onDone, live = liveCities() }: Props) {
  const required = bookingRequiredFields(live);
  const askCity = required.includes("city");
  const [values, setValues] = useState(() => emptyBooking(prefill));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [moreOpen, setMoreOpen] = useState(() => DETAIL_FIELDS.some((f) => Boolean(prefill?.[f])));
  const [datePicking, setDatePicking] = useState(false);
  const [range] = useState(bookingDateRange);
  const inputs = useRef<Partial<Record<BookingField, InputHandle | null>>>({});

  /** Sets a value and clears its error once the value is fine, so the visitor sees the fix land. */
  function set(field: BookingField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (!errors[field] || problemFor(field, value, required)) return;
    const next = { ...errors };
    delete next[field];
    setErrors(next);
    if (Object.keys(next).length === 0) setFormError("");
  }

  /** Leaving a field the visitor typed in checks it there and then (an empty one waits for submit). */
  function blur(field: BookingField) {
    const value = values[field];
    if (value.trim() === "") return;
    const problem = problemFor(field, value, required);
    if (problem && errors[field] !== problem) setErrors((e) => ({ ...e, [field]: problem }));
  }

  const toggle = (field: BookingField, value: string) => set(field, values[field] === value ? "" : value);

  async function submit() {
    setSubmitting(true);
    const result = await submitBooking(values, live);
    setSubmitting(false);
    if (result.ok) {
      setErrors({});
      setFormError("");
      onDone({ sent: result.sent });
      return;
    }
    setErrors(result.errors);
    setFormError(result.message);
    if (DETAIL_FIELDS.some((f) => result.errors[f])) setMoreOpen(true);
    const first = (Object.keys(inputs.current) as BookingField[]).find((f) => result.errors[f]);
    if (first) inputs.current[first]?.focus();
  }

  const job = jobEstimate(values);
  const localityLabel = askCity ? "Locality" : `Locality in ${live[0]?.name ?? ""}`;
  const localities = live.find((c) => c.slug === values.city)?.areas ?? (askCity ? [] : live[0]?.areas ?? []);

  const field = (name: BookingField, label: string) => ({
    ref: (el: InputHandle | null) => {
      inputs.current[name] = el;
    },
    value: values[name],
    onChangeText: (v: string) => set(name, v),
    onBlur: () => blur(name),
    error: errors[name],
    accessibilityLabel: label,
  });

  const picker = (
    <DateTimePicker
      testID="date-picker"
      value={isoToLocalDate(values.preferredDate || range.min)}
      mode="date"
      display={Platform.OS === "ios" ? "inline" : "default"}
      minimumDate={isoToLocalDate(range.min)}
      maximumDate={isoToLocalDate(range.max)}
      accentColor={colors.terracotta}
      themeVariant="light"
      onValueChange={(_event, date) => {
        if (Platform.OS !== "ios") setDatePicking(false);
        set("preferredDate", localDateToIso(date));
      }}
      onDismiss={() => setDatePicking(false)}
    />
  );

  return (
    <View style={styles.form}>
      <Field label="Your name" error={errors.name}>
        <Input {...field("name", "Your name")} autoComplete="name" textContentType="name" autoCapitalize="words" maxLength={80} returnKeyType="next" />
      </Field>

      <Field label="Mobile number" error={errors.phone}>
        <View>
          <Text style={styles.prefix} aria-hidden>
            +91
          </Text>
          <Input
            {...field("phone", "Mobile number")}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="10-digit mobile"
            maxLength={16}
            style={styles.phoneInput}
          />
        </View>
      </Field>

      <Field label="House / flat no., building and street" error={errors.address}>
        <Input {...field("address", "House / flat no., building and street")} autoComplete="street-address" textContentType="streetAddressLine1" placeholder="e.g. 12, Rose Villa, Nehru Road" maxLength={200} />
      </Field>

      {askCity && (
        <Field label="City" error={errors.city}>
          <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="City">
            {live.map((c) => (
              <Chip key={c.slug} label={c.name} selected={values.city === c.slug} onPress={() => set("city", c.slug)} />
            ))}
          </View>
        </Field>
      )}

      <Field label={localityLabel} error={errors.locality}>
        <Input {...field("locality", localityLabel)} autoComplete="address-line2" textContentType="sublocality" placeholder="e.g. Kamla Nagar" maxLength={80} />
        {localities.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.bleed} contentContainerStyle={styles.suggestions}>
            {localities.map((a) => (
              <Chip key={a} label={a} selected={values.locality === a} onPress={() => set("locality", a)} />
            ))}
          </ScrollView>
        ) : (
          <Muted style={styles.hint}>Choose your city to pick from the localities we serve, or type yours.</Muted>
        )}
      </Field>

      <Field label="PIN code" error={errors.pincode}>
        <Input {...field("pincode", "PIN code")} keyboardType="number-pad" autoComplete="postal-code" textContentType="postalCode" placeholder="6 digits" maxLength={7} />
      </Field>

      <View style={styles.more}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: moreOpen }} onPress={() => setMoreOpen((o) => !o)} style={styles.moreToggle}>
          <Text style={styles.moreLabel}>
            Add more details <Text style={styles.optional}>(optional)</Text>
          </Text>
          <Text aria-hidden style={[styles.plus, moreOpen && styles.plusOpen]}>
            +
          </Text>
        </Pressable>
        {moreOpen && (
          <View style={styles.moreBody}>
            <Field label="What needs painting?" error={errors.service}>
              <ChoiceRow options={serviceTypes} value={values.service} onPick={(v) => toggle("service", v)} />
            </Field>
            <Field label="Property type" error={errors.propertyType}>
              <ChoiceRow options={propertyTypes} value={values.propertyType} onPick={(v) => toggle("propertyType", v)} />
            </Field>
            <Field label="Floors to paint" error={errors.floors}>
              <ChoiceRow options={floorOptions} value={values.floors} onPick={(v) => toggle("floors", v)} label={floorLabel} />
            </Field>
            <Field label="Home size" error={errors.homeSize}>
              <ChoiceRow options={homeSizes} value={values.homeSize} onPick={(v) => toggle("homeSize", v)} />
            </Field>
            <Field label="Carpet area per floor (sq ft)" error={errors.carpetArea}>
              <Input {...field("carpetArea", "Carpet area per floor (sq ft)")} keyboardType="number-pad" placeholder="e.g. 1200" maxLength={7} />
              <Muted style={styles.hint} accessibilityLiveRegion="polite">
                {job.area !== null ? (
                  <>
                    About <Strong>{formatSqft(job.area)}</Strong> of walls and ceilings to paint, all floors together.
                  </>
                ) : job.measuredOnSite ? (
                  "Measured on site for this job."
                ) : (
                  "It's on your sale deed or society papers. Not sure? Leave it blank."
                )}
              </Muted>
            </Field>
            <Field label="Preferred inspection date" error={errors.preferredDate}>
              <View style={styles.dateRow}>
                <Pressable accessibilityRole="button" accessibilityHint="Opens a calendar" onPress={() => setDatePicking(true)} style={[styles.input, styles.dateButton]}>
                  <Text style={values.preferredDate ? styles.dateText : styles.datePlaceholder}>
                    {values.preferredDate ? formatDate(values.preferredDate) : "Choose a date"}
                  </Text>
                </Pressable>
                {values.preferredDate !== "" && (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear the date" onPress={() => set("preferredDate", "")} style={styles.clear}>
                    <Text style={styles.clearText}>Clear</Text>
                  </Pressable>
                )}
              </View>
              {datePicking && Platform.OS !== "ios" && picker}
              {/* iOS: the inline calendar needs the screen's width, so it opens in a sheet */}
              <Modal visible={datePicking && Platform.OS === "ios"} transparent animationType="fade" onRequestClose={() => setDatePicking(false)}>
                <View style={styles.backdrop}>
                  <View style={styles.dateSheet}>
                    <Text style={styles.label}>Preferred inspection date</Text>
                    {picker}
                    <Button label="Done" onPress={() => setDatePicking(false)} />
                  </View>
                </View>
              </Modal>
            </Field>
            <Field label="Anything we should know?" error={errors.message}>
              <Input
                {...field("message", "Anything we should know?")}
                multiline
                maxLength={1000}
                placeholder="A single wall, two doors, the balcony grills, a full flat… and any damp or cracks"
                style={styles.textarea}
              />
            </Field>
          </View>
        )}
      </View>

      {formError !== "" && (
        <Text accessibilityRole="alert" style={styles.formError}>
          {formError}
        </Text>
      )}

      <Button label="Book my inspection" busyLabel="Sending…" busy={submitting} onPress={submit} />
      <Muted style={styles.privacy}>
        We use your details only to respond to this request. See our{" "}
        <Text accessibilityRole="link" style={styles.link} onPress={() => void Linking.openURL(webUrl("/privacy-policy"))}>
          privacy policy
        </Text>
        .
      </Muted>
    </View>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

function Input({ error, style, ref, ...props }: TextInputProps & { error?: string; ref?: Ref<InputHandle> }) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.muted}
      accessibilityHint={error}
      style={[styles.input, error ? styles.inputError : undefined, style]}
      {...props}
    />
  );
}

function ChoiceRow({ options, value, onPick, label = (o) => o }: { options: readonly string[]; value: string; onPick: (v: string) => void; label?: (o: string) => string }) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => (
        <Chip key={o} label={label(o)} selected={value === o} onPress={() => onPick(o)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink, marginBottom: 6 },
  input: {
    minHeight: 50,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    backgroundColor: colors.paper,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger, borderWidth: 1 },
  prefix: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
    width: 52,
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 50,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.muted,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  phoneInput: { paddingLeft: 62 },
  error: { marginTop: 6, fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.danger },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bleed: { marginHorizontal: -gutter, marginTop: 10 },
  suggestions: { paddingHorizontal: gutter, gap: 8 },
  hint: { marginTop: 6, fontSize: 13, lineHeight: 19 },
  more: { borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, borderStyle: "dashed", borderColor: colors.lineStrong, backgroundColor: colors.chalk },
  moreToggle: { minHeight: 52, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  moreLabel: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink },
  optional: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted },
  plus: { fontFamily: fonts.sans, fontSize: 24, color: colors.ink, width: 28, textAlign: "center" },
  plusOpen: { transform: [{ rotate: "45deg" }] },
  moreBody: { gap: 18, padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  dateRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  dateButton: { flex: 1, justifyContent: "center" },
  dateText: { fontFamily: fonts.sans, fontSize: 16, color: colors.ink },
  datePlaceholder: { fontFamily: fonts.sans, fontSize: 16, color: colors.muted },
  clear: { minHeight: 44, minWidth: 56, justifyContent: "center", alignItems: "center" },
  clearText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.terracotta },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(36, 37, 34, 0.4)" },
  dateSheet: { backgroundColor: colors.canvas, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: gutter, paddingBottom: 40, gap: 12 },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  formError: { borderRadius: 10, backgroundColor: colors.sand, padding: 12, fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.danger },
  privacy: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  link: { textDecorationLine: "underline", color: colors.ink },
});
