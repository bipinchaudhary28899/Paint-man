import { useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button } from "~/components/ui/Button";
import { DateInput, Field, Input } from "~/components/ui/Field";
import { ListRows } from "~/components/ui/ListRows";
import { H } from "~/components/ui/Text";
import { ADMIN_QUOTATION_STATUS, openAdminPdf, shiftDay, type AdminProject, type AdminQuotation } from "~/lib/admin";
import { useAdmin } from "~/lib/admin-context";
import { errorMessage } from "~/lib/auth";
import { formatCalendarDay, formatRupees, lineDetails } from "~/lib/projects";
import {
  autoAmount,
  blankLine,
  blankMilestone,
  buildQuotationRequest,
  DEFAULT_PAYMENT_SCHEDULE,
  draftFromLine,
  draftFromMilestone,
  draftScheduleTotal,
  draftTotal,
  indiaToday,
  MAX_MILESTONES,
  MILESTONE_LABEL_MAX,
  parseWhole,
  type LineDraft,
  type MilestoneDraft,
} from "~/shared";
import { colors, fonts, radii } from "~/theme";
import { adminStyles, Help, Notice, Panel, useAdminAction, type AdminAction } from "./AdminKit";

// The project's quotations, as the website's admin has them: every version newest first (status and
// total), a new version (a copy of the latest) when none is in draft, the editor for the draft (lines,
// notes, payment terms, valid until; save, then send to the customer) and a read-only view of the
// others with the customer's answer recorded (approved / declined). Preview PDF opens the PDF as
// staff see it, drafts marked. The editor's rules are the website's (src/lib/admin/quotation-form.ts).

const MAX_LINES = 100;

/** Asks before something that cannot be undone; resolves true when confirmed. */
function confirm(title: string, message: string, ok: string): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: ok, onPress: () => resolve(true) },
    ]),
  );
}

export function QuotationsPanel({ project, reload }: { project: AdminProject; reload: () => void }) {
  const { quotations } = project;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const create = useAdminAction(reload);
  const answer = useAdminAction(reload);
  const selected = quotations.find((q) => q.id === selectedId) ?? quotations[0];
  const latest = quotations[0];
  const hasDraft = quotations.some((q) => q.status === "draft");
  const base = `/api/admin/projects/${project.id}/quotations`;

  async function startVersion() {
    answer.setDone("");
    const made = await create.run<{ id: string; version: number }>("POST", base, undefined, latest ? `Version ${latest.version + 1} started from version ${latest.version}.` : "Version 1 started.");
    if (made) setSelectedId(made.id);
  }

  async function record(q: AdminQuotation, status: "approved" | "declined") {
    create.setDone("");
    const ok =
      status === "approved"
        ? await confirm(
            `Mark version ${q.version} approved?`,
            `The price becomes final (${formatRupees(q.totalPaise)}), other sent versions are superseded and the project moves to “Price finalised”.`,
            "Mark approved",
          )
        : await confirm(`Mark version ${q.version} declined?`, "Record that the customer declined this version.", "Mark declined");
    if (!ok) return;
    await answer.run("POST", `${base}/${q.id}/status`, { status }, status === "approved" ? `Version ${q.version} approved: the price is final.` : `Version ${q.version} marked declined.`);
  }

  return (
    <Panel title="Quotations">
      {!hasDraft && (
        <Button
          label={latest ? `New version (copy of v${latest.version})` : "Start quotation"}
          busy={create.busy}
          busyLabel="Starting…"
          onPress={() => void startVersion()}
          small
          style={styles.start}
        />
      )}
      <View style={styles.notice}>
        <Notice error={create.error} done={create.done} />
      </View>

      {quotations.length === 0 ? (
        <Text style={[adminStyles.muted, styles.gap]}>No quotation yet. Start one after the inspection: it stays a draft, visible only to staff, until you send it.</Text>
      ) : (
        <>
          <ListRows
            accessibilityLabel="Versions"
            style={styles.versions}
            rows={quotations.map((q) => ({
              key: q.id,
              label: `Version ${q.version} · ${ADMIN_QUOTATION_STATUS[q.status]}`,
              detail: formatRupees(q.totalPaise),
              current: q.id === selected.id,
              onPress: () => setSelectedId(q.id),
            }))}
          />
          {hasDraft && selected.status !== "draft" && <Help>A draft is open: finish and send it before starting another version.</Help>}

          <View style={adminStyles.divider}>
            <H size={21} balance={false}>
              Version {selected.version}: {ADMIN_QUOTATION_STATUS[selected.status]}
            </H>
            {selected.status === "draft" ? (
              <>
                <Help>Drafts are visible only to staff. The customer sees this version once you send it.</Help>
                <QuotationEditor
                  key={selected.id}
                  projectId={project.id}
                  quotation={selected}
                  reload={reload}
                  onSent={(version) => {
                    create.setDone("");
                    answer.setError("");
                    answer.setDone(`Version ${version} sent to the customer.`);
                  }}
                />
              </>
            ) : (
              <>
                <QuotationView quotation={selected} />
                <View style={adminStyles.buttons}>
                  {(selected.status === "sent" || selected.status === "declined") && <Button label="Mark approved" small disabled={answer.busy} onPress={() => void record(selected, "approved")} />}
                  {selected.status === "sent" && <Button label="Mark declined" variant="secondary" small disabled={answer.busy} onPress={() => void record(selected, "declined")} />}
                  <PdfButton projectId={project.id} quotation={selected} action={answer} />
                </View>
              </>
            )}
            <Notice error={answer.error} done={answer.done} />
          </View>
        </>
      )}
    </Panel>
  );
}

/** Opens the version's PDF as staff see it (the share sheet: open, save, send). */
function PdfButton({ projectId, quotation, action, dirty = false }: { projectId: string; quotation: AdminQuotation; action: Pick<AdminAction, "setError" | "setDone">; dirty?: boolean }) {
  const admin = useAdmin();
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    action.setError("");
    try {
      await admin.withToken((token) => openAdminPdf(token, projectId, quotation));
    } catch (err) {
      action.setDone("");
      action.setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return <Button label={dirty ? "Preview PDF (last saved)" : "Preview PDF"} variant="secondary" small busy={busy} busyLabel="Opening…" onPress={() => void open()} />;
}

/** When each share of the total is due, with its amount. */
function Milestones({ quotation: q }: { quotation: AdminQuotation }) {
  const schedule = q.paymentSchedule ?? [];
  if (schedule.length === 0) return null;
  return (
    <View style={styles.milestones}>
      <Text style={adminStyles.strong}>Payment schedule</Text>
      {schedule.map((m, i) => (
        <View key={i} style={styles.milestone} accessible accessibilityLabel={`${m.label}: ${m.percent}%, ${formatRupees(m.amountPaise)}`}>
          <Text style={[adminStyles.text, adminStyles.flex]}>{m.label}</Text>
          <Text style={adminStyles.muted}>{m.percent}%</Text>
          <Text style={styles.amount}>{formatRupees(m.amountPaise)}</Text>
        </View>
      ))}
    </View>
  );
}

/** A sent, approved, declined or superseded version: its reference, lines, total, milestones and terms. */
function QuotationView({ quotation: q }: { quotation: AdminQuotation }) {
  return (
    <View style={styles.view}>
      {q.reference && <Text style={adminStyles.muted}>{q.reference}</Text>}
      {q.lines.map((l) => {
        const details = lineDetails(l);
        return (
          <View key={l.position} style={styles.line} accessible>
            <View style={adminStyles.flex}>
              <Text style={adminStyles.strong}>{l.item}</Text>
              {l.description && <Text style={adminStyles.muted}>{l.description}</Text>}
              {details !== "" && <Text style={adminStyles.muted}>{details}</Text>}
            </View>
            <Text style={styles.amount}>{formatRupees(l.amountPaise)}</Text>
          </View>
        );
      })}
      <View style={styles.total} accessible>
        <Text style={adminStyles.strong}>Total</Text>
        <Text style={styles.totalAmount}>{formatRupees(q.totalPaise)}</Text>
      </View>
      <Milestones quotation={q} />
      {q.notes && <Text style={adminStyles.text}>{q.notes}</Text>}
      {q.paymentTerms && (
        <Text style={adminStyles.text}>
          <Text style={adminStyles.strong}>Payment terms: </Text>
          {q.paymentTerms}
        </Text>
      )}
      {q.validUntil && <Text style={adminStyles.muted}>Valid until {formatCalendarDay(q.validUntil)}</Text>}
    </View>
  );
}

type LineField = Exclude<keyof LineDraft, "key">;

/**
 * The editor of a draft: each line as a small form (item, description, area, coats, rate, amount;
 * the amount fills in from area × rate and can be typed over), notes, payment terms and validity, with
 * the total live in rupees. Save keeps it a draft; Send saves it, then shares it with the customer.
 */
export function QuotationEditor({ projectId, quotation, reload, onSent }: { projectId: string; quotation: AdminQuotation; reload: () => void; onSent?: (version: number) => void }) {
  // the saved lines are line-1…line-n; lines added later count on from there
  const [lines, setLines] = useState<LineDraft[]>(() => (quotation.lines.length ? quotation.lines.map((l, i) => draftFromLine(l, `line-${i + 1}`)) : [blankLine("line-1")]));
  const counter = useRef(Math.max(quotation.lines.length, 1));
  const newKey = () => `line-${++counter.current}`;
  const [schedule, setSchedule] = useState<MilestoneDraft[]>(() => (quotation.paymentSchedule ?? []).map((m, i) => draftFromMilestone(m, `milestone-${i + 1}`)));
  const milestoneCounter = useRef((quotation.paymentSchedule ?? []).length);
  const newMilestoneKey = () => `milestone-${++milestoneCounter.current}`;
  const [notes, setNotes] = useState(quotation.notes ?? "");
  const [paymentTerms, setPaymentTerms] = useState(quotation.paymentTerms ?? "");
  const [validUntil, setValidUntil] = useState(quotation.validUntil ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const action = useAdminAction(reload);
  const url = `/api/admin/projects/${projectId}/quotations/${quotation.id}`;
  const total = draftTotal(lines);
  const today = indiaToday();

  const touch = () => setDirty(true);

  function update(key: string, field: LineField, value: string) {
    setLines((all) =>
      all.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, [field]: value };
        if (field === "area" || field === "rate") next.amount = autoAmount(next.area, next.rate) ?? next.amount;
        return next;
      }),
    );
    touch();
  }

  function move(index: number, by: -1 | 1) {
    setLines((all) => {
      const next = [...all];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
    touch();
  }

  function remove(key: string) {
    setLines((all) => all.filter((l) => l.key !== key));
    touch();
  }

  /** Saves the draft; true when it was saved. */
  async function save({ reload: again = true } = {}): Promise<boolean> {
    const built = buildQuotationRequest(lines, { notes, paymentTerms, validUntil, schedule });
    if (!built.ok) {
      setErrors(built.errors);
      action.setError("");
      action.setDone("");
      return false;
    }
    setErrors({});
    const saved = await action.run("PUT", url, built.request, "Draft saved.", { reload: again });
    if (saved) setDirty(false);
    return saved !== null;
  }

  async function send() {
    if (lines.length === 0) {
      setErrors({ lines: "Add at least one line before sending the quotation." });
      return;
    }
    const ok = await confirm(
      `Send version ${quotation.version} to the customer?`,
      "They will see it on their tracker and can download the PDF. It can't be edited after sending (start a new version to revise it).",
      "Send",
    );
    if (!ok || !(await save({ reload: false }))) return;
    // the panel says it was sent (this editor gives way to the read-only view once the project reloads)
    const sent = await action.run("POST", `${url}/status`, { status: "sent" }, "");
    if (sent) onSent?.(quotation.version);
  }

  const messages = [...new Set(Object.values(errors))];

  return (
    <View accessibilityLabel={`Edit quotation version ${quotation.version}`} style={styles.editor}>
      {lines.map((l, i) => {
        const err = (field: LineField) => errors[`${l.key}.${field}`];
        return (
          <View key={l.key} style={styles.lineForm}>
            <View style={styles.lineTop}>
              <Text style={styles.lineTitle}>Line {i + 1}</Text>
              <View style={styles.lineButtons}>
                <Button label="Up" variant="secondary" small accessibilityLabel={`Move line ${i + 1} up`} disabled={i === 0} onPress={() => move(i, -1)} style={styles.tiny} />
                <Button label="Down" variant="secondary" small accessibilityLabel={`Move line ${i + 1} down`} disabled={i === lines.length - 1} onPress={() => move(i, 1)} style={styles.tiny} />
                <Button label="Remove" variant="secondary" small accessibilityLabel={`Remove line ${i + 1}`} onPress={() => remove(l.key)} style={styles.tiny} />
              </View>
            </View>
            <Field label="Item" error={err("item")}>
              <Input value={l.item} onChangeText={(v) => update(l.key, "item", v)} accessibilityLabel={`Line ${i + 1} item`} error={err("item")} maxLength={120} />
            </Field>
            <Field label="Description" error={err("description")}>
              <Input value={l.description} onChangeText={(v) => update(l.key, "description", v)} accessibilityLabel={`Line ${i + 1} description`} error={err("description")} multiline maxLength={500} style={styles.multiline} />
            </Field>
            <View style={adminStyles.pair}>
              <Field label="Area (sq ft)" error={err("area")} style={adminStyles.flex}>
                <Input value={l.area} onChangeText={(v) => update(l.key, "area", v)} accessibilityLabel={`Line ${i + 1} area in square feet`} error={err("area")} keyboardType="number-pad" maxLength={16} />
              </Field>
              <Field label="Coats" error={err("coats")} style={adminStyles.flex}>
                <Input value={l.coats} onChangeText={(v) => update(l.key, "coats", v)} accessibilityLabel={`Line ${i + 1} coats`} error={err("coats")} keyboardType="number-pad" maxLength={16} />
              </Field>
            </View>
            <View style={adminStyles.pair}>
              <Field label="Rate (₹/sq ft)" error={err("rate")} style={adminStyles.flex}>
                <Input value={l.rate} onChangeText={(v) => update(l.key, "rate", v)} accessibilityLabel={`Line ${i + 1} rate in rupees per square foot`} error={err("rate")} keyboardType="decimal-pad" maxLength={16} />
              </Field>
              <Field label="Amount (₹)" error={err("amount")} style={adminStyles.flex}>
                <Input value={l.amount} onChangeText={(v) => update(l.key, "amount", v)} accessibilityLabel={`Line ${i + 1} amount in rupees`} error={err("amount")} keyboardType="decimal-pad" maxLength={16} />
              </Field>
            </View>
          </View>
        );
      })}
      <Button
        label="Add line"
        variant="secondary"
        small
        disabled={lines.length >= MAX_LINES}
        onPress={() => {
          setLines((all) => [...all, blankLine(newKey())]);
          touch();
        }}
        style={styles.add}
      />
      <Help>The amount fills in from area × rate; type over it to set your own.</Help>
      <View style={styles.total} accessible accessibilityLiveRegion="polite">
        <Text style={adminStyles.strong}>Total</Text>
        <Text style={styles.totalAmount}>{formatRupees(total)}</Text>
      </View>

      <View style={styles.lineForm} accessibilityLabel="Payment milestones">
        <Text style={styles.lineTitle}>Payment milestones</Text>
        <Help>When each share of the total is due, together 100%. Nothing may be due before the work starts (no advance payment).</Help>
        {schedule.length === 0 && <Text style={adminStyles.muted}>No milestones: the PDF shows only the payment terms below.</Text>}
        {schedule.map((m, i) => {
          const share = parseWhole(m.percent, 100);
          const labelError = errors[`${m.key}.label`];
          const percentError = errors[`${m.key}.percent`];
          return (
            <View key={m.key} style={styles.milestoneForm}>
              <Field label={`Milestone ${i + 1}: when it is due`} error={labelError}>
                <Input
                  value={m.label}
                  onChangeText={(v) => {
                    setSchedule((all) => all.map((x) => (x.key === m.key ? { ...x, label: v } : x)));
                    touch();
                  }}
                  accessibilityLabel={`Milestone ${i + 1}: when it is due`}
                  error={labelError}
                  maxLength={MILESTONE_LABEL_MAX}
                />
              </Field>
              <View style={[adminStyles.pair, styles.milestoneRow]}>
                <Field label="Share (%)" error={percentError} style={adminStyles.flex}>
                  <Input
                    value={m.percent}
                    onChangeText={(v) => {
                      setSchedule((all) => all.map((x) => (x.key === m.key ? { ...x, percent: v } : x)));
                      touch();
                    }}
                    accessibilityLabel={`Milestone ${i + 1}: share in percent`}
                    error={percentError}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </Field>
                <Text style={[styles.amount, styles.milestoneAmount]}>{typeof share === "number" ? formatRupees(Math.round((total * share) / 100)) : ""}</Text>
                <Button
                  label="Remove"
                  variant="secondary"
                  small
                  accessibilityLabel={`Remove milestone ${i + 1}`}
                  onPress={() => {
                    setSchedule((all) => all.filter((x) => x.key !== m.key));
                    touch();
                  }}
                  style={styles.tiny}
                />
              </View>
            </View>
          );
        })}
        <View style={adminStyles.buttons}>
          <Button
            label="Add milestone"
            variant="secondary"
            small
            disabled={schedule.length >= MAX_MILESTONES}
            onPress={() => {
              setSchedule((all) => [...all, blankMilestone(newMilestoneKey())]);
              touch();
            }}
          />
          <Button
            label="Use the standard milestones"
            variant="secondary"
            small
            onPress={() => {
              setSchedule(DEFAULT_PAYMENT_SCHEDULE.map((d) => draftFromMilestone(d, newMilestoneKey())));
              touch();
            }}
          />
        </View>
        {schedule.length > 0 && (
          <Text style={draftScheduleTotal(schedule) === 100 ? adminStyles.muted : styles.errorText} accessibilityLiveRegion="polite">
            Adds up to {draftScheduleTotal(schedule)}%
          </Text>
        )}
      </View>

      <Field label="Notes">
        <Input
          value={notes}
          onChangeText={(v) => {
            setNotes(v);
            touch();
          }}
          accessibilityLabel="Notes"
          multiline
          maxLength={2000}
          style={styles.multiline}
        />
      </Field>
      <Field label="Payment terms">
        <Input
          value={paymentTerms}
          onChangeText={(v) => {
            setPaymentTerms(v);
            touch();
          }}
          accessibilityLabel="Payment terms"
          multiline
          maxLength={1000}
          style={styles.multiline}
        />
      </Field>
      <Field label="Valid until" error={errors.validUntil}>
        <DateInput
          label="Valid until"
          value={validUntil}
          min={today}
          max={shiftDay(today, 365)}
          onChange={(v) => {
            setValidUntil(v);
            touch();
          }}
          error={errors.validUntil}
        />
      </Field>

      {messages.length > 0 && (
        <View accessibilityRole="alert" style={styles.errors}>
          {messages.map((m) => (
            <Text key={m} style={styles.errorText}>
              {m}
            </Text>
          ))}
        </View>
      )}

      <View style={adminStyles.buttons}>
        <Button label="Save draft" variant="secondary" small busy={action.busy} busyLabel="Saving…" onPress={() => void save()} />
        <Button label="Send to customer" small disabled={action.busy} onPress={() => void send()} />
        <PdfButton projectId={projectId} quotation={quotation} action={action} dirty={dirty} />
      </View>
      {dirty && <Text style={adminStyles.muted}>Unsaved changes</Text>}
      <Notice error={action.error} done={action.done} />
    </View>
  );
}

const styles = StyleSheet.create({
  start: { marginTop: 12, alignSelf: "flex-start" },
  notice: { marginTop: 8 },
  gap: { marginTop: 8 },
  versions: { marginTop: 8 },
  view: { marginTop: 12, gap: 10 },
  line: { flexDirection: "row", gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  amount: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 22, color: colors.ink },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.ink },
  totalAmount: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, color: colors.ink },
  editor: { marginTop: 12, gap: 14 },
  lineForm: { borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.canvas, padding: 14, gap: 12 },
  lineTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  lineTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.ink },
  lineButtons: { flexDirection: "row", gap: 6 },
  tiny: { paddingHorizontal: 12 },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  add: { alignSelf: "flex-start" },
  errors: { borderRadius: 8, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.paper, padding: 12, gap: 4 },
  errorText: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.danger },
  milestones: { gap: 2 },
  milestone: { flexDirection: "row", alignItems: "baseline", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  milestoneForm: { gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  milestoneRow: { alignItems: "flex-end" },
  milestoneAmount: { paddingBottom: 14, minWidth: 80, textAlign: "right" },
});
