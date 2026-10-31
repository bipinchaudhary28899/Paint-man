import DateTimePicker from "@react-native-community/datetimepicker";
import { useImperativeHandle, useRef, useState, type ComponentRef, type ReactNode, type Ref } from "react";
import { AccessibilityInfo, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type LayoutChangeEvent, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDate, isoToLocalDate, localDateToIso } from "~/lib/dates";
import { colors, fonts, gutter, radii } from "~/theme";
import { Button } from "./Button";
import { Chevron } from "./Bits";
import { MAX_SCALE } from "./Text";

// The website's form fields (.field and LeadForm's phone sizes): 16px text in a white box with a
// hairline and radius 14, 11px/12px padding (48pt tall), ink border when focused, danger when
// invalid. Selects keep the field's look with the hairline chevron and open a sheet of choices; the
// date opens the system calendar; a short list of choices (a city, a locality) is a row of pills.
// The box's hairline is ink at 50% (3:1 on white and on the canvas, WCAG 1.4.11): the field has no
// other edge, and the website's line-strong (30%) is 1.9:1. Text in fields grows with the phone's
// text size; the "+91" in the phone field measures itself, so the number never runs under it.

/** The field box's edge: ink at 50%, 3:1 against white and the canvas. */
export const FIELD_BORDER = "rgba(36, 37, 34, 0.5)";

export type InputHandle = ComponentRef<typeof TextInput>;

/** label: text-sm font-semibold, 6px above the field; the error under it in danger. */
export function Field({ label, error, children, style }: { label: string; error?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** A text input in the field box. */
export function Input({ error, style, ref, ...props }: TextInputProps & { error?: string; ref?: Ref<InputHandle> }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.muted2}
      accessibilityHint={error}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[styles.field, focused && styles.focused, error ? styles.invalid : undefined, style]}
    />
  );
}

/** The gap between the "+91" box's hairline and the number. */
const PREFIX_GAP = 9.6;

/** The mobile number with "+91" inside the field, behind a hairline; the number starts after the prefix at any text size. */
export function PhoneInput(props: TextInputProps & { error?: string; ref?: Ref<InputHandle> }) {
  const [prefix, setPrefix] = useState(48);
  const onLayout = (e: LayoutChangeEvent) => setPrefix(e.nativeEvent.layout.width);
  return (
    <View>
      <View style={styles.prefix} pointerEvents="none" onLayout={onLayout} testID="phone-prefix">
        <Text style={styles.prefixText}>+91</Text>
      </View>
      <Input
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder="10-digit mobile"
        maxLength={16}
        {...props}
        style={{ paddingLeft: prefix + PREFIX_GAP }}
      />
    </View>
  );
}

type Option = { value: string; label: string };

/** A select: the field showing the chosen option (or the prompt), opening a sheet of choices. */
export function Select({
  label,
  value,
  options,
  placeholder = "Select",
  onChange,
  error,
  allowBlank = true,
}: {
  label: string;
  value: string;
  options: readonly Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  error?: string;
  /** a "Select" choice that clears the answer (optional selects); off for a required prompt */
  allowBlank?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const chosen = options.find((o) => o.value === value);
  const choices = allowBlank ? [{ value: "", label: placeholder }, ...options] : options;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: chosen?.label ?? placeholder }}
        accessibilityHint={error}
        onPress={() => setOpen(true)}
        style={[styles.field, styles.select, error ? styles.invalid : undefined]}
      >
        <Text style={styles.selectText} numberOfLines={1}>
          {chosen?.label ?? placeholder}
        </Text>
        <View style={styles.chevron}>
          <Chevron size={13} strokeWidth={1.6} />
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} testID="select-sheet">
        <Sheet onClose={() => setOpen(false)} bottom={insets.bottom}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <ScrollView style={styles.sheetList}>
            {choices.map((o) => {
              const on = o.value === value;
              return (
                <Pressable
                  key={o.value || "blank"}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={styles.option}
                >
                  <Text style={[styles.optionText, on && styles.optionOn]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Button label="Cancel" variant="secondary" onPress={() => setOpen(false)} />
        </Sheet>
      </Modal>
    </>
  );
}

/** Options from a list of strings (a select whose values are its labels). */
export const optionsOf = (values: readonly string[], label: (v: string) => string = (v) => v): Option[] => values.map((v) => ({ value: v, label: label(v) }));

/** The date input: shows the chosen day and opens the calendar (a sheet on iOS, the system dialog on Android). */
export function DateInput({ label, value, min, max, onChange, error }: { label: string; value: string; min: string; max: string; onChange: (iso: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const picker = (
    <DateTimePicker
      testID="date-picker"
      value={isoToLocalDate(value || min)}
      mode="date"
      display={Platform.OS === "ios" ? "inline" : "default"}
      minimumDate={isoToLocalDate(min)}
      maximumDate={isoToLocalDate(max)}
      accentColor={colors.terracotta}
      themeVariant="light"
      onValueChange={(_event, date) => {
        if (Platform.OS !== "ios") setOpen(false);
        onChange(localDateToIso(date));
      }}
      onDismiss={() => setOpen(false)}
    />
  );
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ? formatDate(value) : "No date chosen" }}
        accessibilityHint={error ?? "Opens a calendar"}
        onPress={() => setOpen(true)}
        style={[styles.field, styles.select, error ? styles.invalid : undefined]}
      >
        <Text style={value ? styles.selectText : styles.placeholder}>{value ? formatDate(value) : "dd/mm/yyyy"}</Text>
      </Pressable>
      {open && Platform.OS !== "ios" && picker}
      <Modal visible={open && Platform.OS === "ios"} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Sheet onClose={() => setOpen(false)} bottom={insets.bottom} dismissOnBackdrop={false}>
          <Text style={styles.sheetTitle}>{label}</Text>
          {picker}
          <View style={styles.sheetRow}>
            {value !== "" && (
              <Button
                label="Clear"
                variant="secondary"
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
                style={styles.flex}
              />
            )}
            <Button label="Done" onPress={() => setOpen(false)} style={styles.flex} />
          </View>
        </Sheet>
      </Modal>
    </>
  );
}

/** Something that can take focus: a text input, or a pill group (which moves the screen reader there). */
export type Focusable = { focus: () => void };

/**
 * One choice from a few as a row of pills instead of a sheet (the city, a locality): one tap picks, and
 * the chosen pill fills with ink. Announced as a radio group. `scroll` keeps the pills on one sideways
 * line (a long list); otherwise they wrap. Each pill is 44pt tall.
 */
export function PillChoice({
  label,
  options,
  value,
  onChange,
  error,
  scroll = false,
  ref,
}: {
  label: string;
  options: readonly Option[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  scroll?: boolean;
  ref?: Ref<Focusable>;
}) {
  const group = useRef<ComponentRef<typeof View>>(null);
  useImperativeHandle(ref, () => ({
    focus: () => {
      Keyboard.dismiss();
      AccessibilityInfo.sendAccessibilityEvent(group.current as ComponentRef<typeof View>, "focus");
    },
  }));
  const pills = options.map((o) => {
    const on = o.value === value;
    return (
      <Pressable
        key={o.value}
        accessibilityRole="radio"
        accessibilityLabel={o.label}
        accessibilityState={{ checked: on }}
        onPress={() => onChange(o.value)}
        style={({ pressed }) => [styles.pill, error ? styles.invalid : undefined, on && styles.pillOn, pressed && !on && styles.pillPressed]}
      >
        <Text maxFontSizeMultiplier={MAX_SCALE.fixed} style={[styles.pillText, on && styles.pillTextOn]}>
          {o.label}
        </Text>
      </Pressable>
    );
  });
  return (
    <View ref={group} accessibilityRole="radiogroup" accessibilityLabel={label} accessibilityHint={error}>
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pills}>
          {pills}
        </ScrollView>
      ) : (
        <View style={[styles.pills, styles.wrap]}>{pills}</View>
      )}
    </View>
  );
}

/**
 * A sheet rising from the bottom over a dimmed backdrop. The backdrop is a sibling behind the sheet,
 * hidden from screen readers (a tap on it closes, when `dismissOnBackdrop`), so the sheet's own
 * controls stay reachable one by one; the sheet is modal to VoiceOver and the escape gesture closes it.
 */
function Sheet({ onClose, bottom, dismissOnBackdrop = true, children }: { onClose: () => void; bottom: number; dismissOnBackdrop?: boolean; children: ReactNode }) {
  return (
    <View style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={dismissOnBackdrop ? onClose : undefined}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID="sheet-backdrop"
      />
      <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[styles.sheet, { paddingBottom: bottom + 16 }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.ink },
  error: { marginTop: 4, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.danger },
  field: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.ink,
  },
  focused: { borderColor: colors.ink },
  invalid: { borderColor: colors.danger },
  prefix: { position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 1, justifyContent: "center", paddingLeft: 12, paddingRight: 10, borderRightWidth: 1, borderColor: colors.line },
  prefixText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.muted },
  select: { justifyContent: "center", paddingRight: 46 },
  selectText: { fontFamily: fonts.sans, fontSize: 16, color: colors.ink },
  placeholder: { fontFamily: fonts.sans, fontSize: 16, color: colors.muted2 },
  chevron: { position: "absolute", right: 16 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(36, 37, 34, 0.4)" },
  sheet: { maxHeight: "80%", backgroundColor: colors.canvas, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: gutter, gap: 12 },
  sheetTitle: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  sheetList: { flexGrow: 0 },
  sheetRow: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  option: { minHeight: 52, justifyContent: "center", borderBottomWidth: 1, borderColor: colors.line },
  optionText: { fontFamily: fonts.sans, fontSize: 16, color: colors.ink },
  optionOn: { fontFamily: fonts.sansBold, color: colors.terracotta },
  pills: { flexDirection: "row", gap: 8 },
  wrap: { flexWrap: "wrap" },
  pill: { minHeight: 44, justifyContent: "center", borderRadius: radii.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.paper, paddingHorizontal: 18 },
  pillOn: { borderColor: colors.ink, backgroundColor: colors.ink },
  pillPressed: { backgroundColor: colors.creamWash },
  pillText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.ink },
  pillTextOn: { fontFamily: fonts.sansSemiBold, color: colors.onInk },
});
