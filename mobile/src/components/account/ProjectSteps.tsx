import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { LocationPicker, type PinResult } from "~/components/site/LocationPicker";
import { Card } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { DateInput, Field, Input, optionsOf, Select } from "~/components/ui/Field";
import { Em, H, P } from "~/components/ui/Text";
import { ApiError, BAD_RESPONSE_MESSAGE } from "~/lib/api";
import { useAuth } from "~/lib/auth-context";
import { carpetAreaProblem, FORM_ERROR } from "~/lib/booking";
import { cityRegion, fillFromPlace, locate, locateProblem, opensSettings, regionAt, type LatLng, type LocateProblem, type MapRegion } from "~/lib/location";
import type { ProjectDetail } from "~/lib/projects";
import { bookingDateRange, detailSteps, fieldProblem, floorOptions, homeSizes, liveCities, propertyTypes, serviceTypes, stepsProgress, type DetailStepKey } from "~/shared";
import { colors, fonts } from "~/theme";

// "Steps to complete" on the project screen (the website's ProjectSteps), until the inspection: the
// booking asked only who and where, so here the customer adds the address the inspector visits
// (typed, or filled from a pin dropped with "Use my current location" or "Pick on the map"; the pin
// goes along as the address's map pin) and tells us about the job. One step open at a time, the
// first one not done; a done step shows what was given, with Edit. Saving sends the step's fields to
// PATCH /api/v1/projects/{id} and the screen shows the project it answers with.

type Values = { address: string; locality: string; pincode: string; service: string; propertyType: string; floors: string; homeSize: string; carpetArea: string; preferredDate: string; notes: string };
type Errors = Partial<Record<keyof Values, string>>;

const floorLabel = (f: string) => (f === "1" ? "1 floor" : `${f} floors`);

const valuesOf = (p: ProjectDetail): Values => ({
  address: p.address ?? "",
  locality: p.locality ?? "",
  pincode: p.pincode ?? "",
  service: p.service ?? "",
  propertyType: p.propertyType ?? "",
  floors: p.floors ?? "",
  homeSize: p.homeSize ?? "",
  carpetArea: p.carpetArea === null ? "" : String(p.carpetArea),
  preferredDate: p.preferredDate ?? "",
  notes: p.notes ?? "",
});

/** What a done step says it has. */
export function stepSummary(key: DetailStepKey, p: ProjectDetail): string {
  if (key === "address") return [p.address, p.locality, p.pincode].filter(Boolean).join(", ");
  return [p.service, p.propertyType, p.homeSize, p.preferredDate && `visit from ${p.preferredDate}`].filter(Boolean).join(" · ");
}

/** The API's field messages for the fields of this form. */
function apiErrors(err: unknown): { errors: Errors; message: string } {
  if (!(err instanceof ApiError)) return { errors: {}, message: BAD_RESPONSE_MESSAGE };
  const errors: Errors = {};
  if (err.details && typeof err.details === "object") {
    for (const [k, v] of Object.entries(err.details)) if (typeof v === "string") errors[k as keyof Values] = v;
  }
  return Object.keys(errors).length > 0 ? { errors, message: FORM_ERROR } : { errors: {}, message: err.message };
}

export function ProjectSteps({ project, onSaved }: { project: ProjectDetail; onSaved: (project: ProjectDetail) => void }) {
  const auth = useAuth();
  const steps = detailSteps(project);
  const progress = stepsProgress(steps);
  const [open, setOpen] = useState<DetailStepKey | null>(steps.find((s) => !s.done)?.key ?? null);
  const [values, setValues] = useState<Values>(() => valuesOf(project));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [range] = useState(bookingDateRange);
  // the map picker: where it opens (open while set), the phone's position once shared, and the confirmed pin
  const [picker, setPicker] = useState<MapRegion>();
  const [gps, setGps] = useState<LatLng>();
  const [pin, setPin] = useState<LatLng | null>(project.location);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<LocateProblem>();
  const live = liveCities();
  const city = live.find((c) => c.slug === project.citySlug);

  const set = (field: keyof Values, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors(({ [field]: _, ...rest }) => rest);
  };

  function edit(key: DetailStepKey) {
    setValues(valuesOf(project));
    setErrors({});
    setFormError("");
    setOpen(key);
  }

  async function locateMe() {
    setLocError(undefined);
    setLocating(true);
    const found = await locate();
    setLocating(false);
    if (!found.ok) return setLocError(found.problem);
    setGps(found.coords);
    setPicker(regionAt(found.coords));
  }

  async function pickOnMap() {
    setLocError(undefined);
    setPicker(pin ? regionAt(pin) : await cityRegion((city ?? live[0])?.name));
  }

  /** The confirmed pin fills the address fields it has answers for, all still editable. */
  function confirmPin({ coords, place }: PinResult) {
    setPicker(undefined);
    setPin(coords);
    const found = place ? fillFromPlace(place, live, city) : undefined;
    if (!found) return;
    setValues((v) => ({ ...v, ...(found.address && { address: found.address }), ...(found.locality && { locality: found.locality }), ...(found.pincode && { pincode: found.pincode }) }));
    setErrors({});
  }

  async function save(key: DetailStepKey) {
    const problems: Errors = {};
    if (key === "address") {
      for (const f of ["address", "locality", "pincode"] as const) {
        const problem = fieldProblem(f, values[f]);
        if (problem) problems[f] = problem;
      }
    } else {
      if (!values.service) problems.service = "Choose what needs painting";
      const carpet = carpetAreaProblem(values.carpetArea);
      if (carpet) problems.carpetArea = carpet;
    }
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      setFormError(FORM_ERROR);
      return;
    }
    const body =
      key === "address"
        ? { address: values.address, locality: values.locality, pincode: values.pincode, ...(pin && { location: pin }) }
        : { service: values.service, propertyType: values.propertyType, floors: values.floors, homeSize: values.homeSize, carpetArea: values.carpetArea, preferredDate: values.preferredDate, notes: values.notes };
    setSaving(true);
    setErrors({});
    setFormError("");
    try {
      const res = await auth.request<ProjectDetail>(`/api/v1/projects/${encodeURIComponent(project.id)}`, { method: "PATCH", body });
      setSaving(false);
      onSaved(res.data);
      setValues(valuesOf(res.data));
      setOpen(detailSteps(res.data).find((s) => !s.done)?.key ?? null);
    } catch (err) {
      setSaving(false);
      const { errors: fieldErrors, message } = apiErrors(err);
      setErrors(fieldErrors);
      setFormError(message);
    }
  }

  const bind = (field: keyof Values, label: string) => ({ value: values[field], onChangeText: (v: string) => set(field, v), error: errors[field], accessibilityLabel: label });

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <H size={26} leading={1.2} style={styles.flexShrink}>
          Steps to <Em>complete</Em>
        </H>
        <Text style={styles.count}>{progress.label}</Text>
      </View>
      <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.barFill, { width: `${(progress.done / progress.total) * 100}%` }]} />
      </View>
      <P size={14} leading={1.55} color={colors.muted} style={styles.mt10}>
        {progress.done === progress.total
          ? "All done. You can still change these until the inspector visits."
          : "Your booking had just the essentials. Add these before the inspection, so the inspector comes prepared."}
      </P>

      {steps.map((step, i) => (
        <View key={step.key} style={styles.step}>
          <View style={styles.stepHead}>
            <View style={[styles.no, step.done && styles.noDone]}>
              <Text style={[styles.noText, step.done && styles.noTextDone]}>{i + 1}</Text>
            </View>
            <View style={styles.flex}>
              <Text accessibilityRole="header" accessibilityLabel={`${step.title}, ${step.done ? "done" : "to do"}`} style={styles.stepTitle}>
                {step.title}
              </Text>
              {open !== step.key && (
                <>
                  <P size={14} leading={1.5} color={colors.muted} style={styles.mt4}>
                    {step.done ? stepSummary(step.key, project) : step.text}
                  </P>
                  <Pressable accessibilityRole="button" onPress={() => edit(step.key)} style={styles.edit}>
                    <Text style={styles.editText}>{step.done ? "Edit" : step.key === "address" ? "Add the address" : "Add the job details"}</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {open === step.key && step.key === "address" && (
            <View style={styles.form}>
              <View style={styles.locate}>
                <Button label={pin ? "Pinned on the map: change" : "Use my current location"} busyLabel="Finding you…" busy={locating} variant="secondary" onPress={pin ? pickOnMap : locateMe} height={48} />
                {!pin && (
                  <Pressable accessibilityRole="button" disabled={locating} onPress={pickOnMap} style={styles.pick}>
                    <Text style={styles.editText}>Pick on the map</Text>
                  </Pressable>
                )}
              </View>
              {locError && (
                <View>
                  <Text style={styles.note} accessibilityLiveRegion="polite">
                    {locateProblem(locError, "form")}
                  </Text>
                  {opensSettings(locError) && (
                    <Pressable accessibilityRole="link" onPress={() => void Linking.openSettings()} style={styles.pick}>
                      <Text style={styles.editText}>Open Settings</Text>
                    </Pressable>
                  )}
                </View>
              )}
              <Field label="House / flat no., building and street" error={errors.address}>
                <Input {...bind("address", "House / flat no., building and street")} autoComplete="street-address" textContentType="streetAddressLine1" placeholder="e.g. 12, Rose Villa, Nehru Road" maxLength={200} />
              </Field>
              <Field label="Area / locality" error={errors.locality}>
                <Input {...bind("locality", "Area / locality")} textContentType="sublocality" maxLength={80} />
              </Field>
              <Field label="PIN code" error={errors.pincode}>
                <Input {...bind("pincode", "PIN code")} keyboardType="number-pad" autoComplete="postal-code" textContentType="postalCode" placeholder="6 digits" maxLength={7} />
              </Field>
            </View>
          )}

          {open === step.key && step.key === "job" && (
            <View style={styles.form}>
              <Field label="What needs painting?" error={errors.service}>
                <Select label="What needs painting?" value={values.service} options={optionsOf(serviceTypes)} onChange={(v) => set("service", v)} error={errors.service} />
              </Field>
              <Field label="Property type (optional)" error={errors.propertyType}>
                <Select label="Property type" value={values.propertyType} options={optionsOf(propertyTypes)} onChange={(v) => set("propertyType", v)} error={errors.propertyType} />
              </Field>
              <Field label="Floors to paint (optional)" error={errors.floors}>
                <Select label="Floors to paint" value={values.floors} options={optionsOf(floorOptions, floorLabel)} onChange={(v) => set("floors", v)} error={errors.floors} />
              </Field>
              <Field label="Home size (optional)" error={errors.homeSize}>
                <Select label="Home size" value={values.homeSize} options={optionsOf(homeSizes)} onChange={(v) => set("homeSize", v)} error={errors.homeSize} />
              </Field>
              <Field label="Carpet area per floor, sq ft (optional)" error={errors.carpetArea}>
                <Input {...bind("carpetArea", "Carpet area per floor, sq ft")} keyboardType="number-pad" placeholder="e.g. 1200" maxLength={7} />
              </Field>
              <Field label="Good day for the visit (optional)" error={errors.preferredDate}>
                <DateInput label="Good day for the visit" value={values.preferredDate} min={range.min} max={range.max} onChange={(v) => set("preferredDate", v)} error={errors.preferredDate} />
              </Field>
              <Field label="Anything we should know? (optional)" error={errors.notes}>
                <Input {...bind("notes", "Anything we should know?")} multiline maxLength={1000} placeholder="A single wall, two doors, the balcony grills… and any damp or cracks" style={styles.textarea} />
              </Field>
            </View>
          )}

          {open === step.key && (
            <View style={styles.form}>
              {formError !== "" && (
                <Text accessibilityRole="alert" style={styles.formError}>
                  {formError}
                </Text>
              )}
              <View style={styles.actions}>
                <Button label="Save" busyLabel="Saving…" busy={saving} onPress={() => void save(step.key)} height={50} style={styles.flex} />
                {step.done && <Button label="Cancel" variant="secondary" onPress={() => setOpen(null)} height={50} style={styles.flex} />}
              </View>
            </View>
          )}
        </View>
      ))}
      {picker && <LocationPicker start={picker} gps={gps} onConfirm={confirmPin} onClose={() => setPicker(undefined)} onLocated={setGps} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, padding: 20 },
  head: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  flexShrink: { flexShrink: 1 },
  count: { fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 18, color: colors.muted },
  bar: { marginTop: 12, height: 6, borderRadius: 3, backgroundColor: colors.creamWash, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.terracotta },
  mt10: { marginTop: 10 },
  mt4: { marginTop: 4 },
  step: { marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 16 },
  stepHead: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  no: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.lineStrong, alignItems: "center", justifyContent: "center" },
  noDone: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
  noText: { fontFamily: fonts.serif, fontSize: 14, color: colors.terracotta },
  noTextDone: { color: colors.canvas },
  flex: { flex: 1 },
  stepTitle: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, color: colors.ink },
  edit: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  editText: { fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.terracotta, textDecorationLine: "underline" },
  form: { marginTop: 14, gap: 14 },
  locate: { gap: 4 },
  pick: { minHeight: 44, justifyContent: "center", alignSelf: "center" },
  note: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  textarea: { minHeight: 96, textAlignVertical: "top" },
  // danger on white is 5.35:1, as in LeadForm (on the peach wash it would be 3.81:1)
  formError: { borderRadius: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.danger, padding: 12, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.danger },
  actions: { flexDirection: "row", gap: 10 },
});
