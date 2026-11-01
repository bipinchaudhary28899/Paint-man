import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { Loading } from "~/components/account/Account";
import { Container } from "~/components/site/Page";
import { Button } from "~/components/ui/Button";
import { DateInput, Field, Input, Select } from "~/components/ui/Field";
import { isTime, mapUrl, shiftDay, telUrl, type AdminProject as Project } from "~/lib/admin";
import { useAdmin } from "~/lib/admin-context";
import { ApiError } from "~/lib/api";
import { errorMessage } from "~/lib/auth";
import { formatDay, formatRupees } from "~/lib/projects";
import { estimatePaintArea, formatIstDateTime, fromIstParts, indiaToday, MAIN_STAGES, OFF_LINE_STAGES, STAGE_LABELS, toIstParts, type ProjectStage } from "~/shared";
import { colors, fonts } from "~/theme";
import { AdminHeader, adminStyles, Help, InfoRow, LoadFailed, Notice, Panel, useAdminAction, useRequireAdmin } from "./AdminKit";
import { QuotationsPanel } from "./AdminQuotations";

// The website's /admin/projects/{id} on a phone (GET /api/admin/projects/{id}): the customer and the
// job, the stage (any stage, with a note the customer reads) and the crew's start date, the site
// inspection (schedule it in India time, then the findings), every update newest first, and the
// quotations. Each action is the website's own /api/admin endpoint; after one the project is read again.

type Load = { status: "loading" } | { status: "ready"; project: Project } | { status: "missing" } | { status: "error"; message: string };

export function AdminProject({ id }: { id: string }) {
  useRequireAdmin();
  const admin = useAdmin();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const signedIn = admin.status === "signedIn";

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    admin
      .request<Project>(`/api/admin/projects/${encodeURIComponent(id)}`)
      .then((res) => live && setLoad({ status: "ready", project: res.data }))
      .catch((err) => {
        if (!live) return;
        if (err instanceof ApiError && err.status === 404) setLoad({ status: "missing" });
        else setLoad({ status: "error", message: errorMessage(err) });
      });
    return () => {
      live = false;
    };
    // `admin` changes identity every render; the call depends only on the session being there
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, id, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const project = load.status === "ready" ? load.project : null;

  return (
    <Container style={styles.page}>
      <AdminHeader title={project?.name ?? "Project"} current="projects" onRefresh={reload} />
      <Text accessibilityRole="link" accessibilityLabel="All projects" onPress={() => router.navigate("/admin/projects" as never)} style={styles.back}>
        ← All projects
      </Text>
      {load.status === "loading" || !signedIn ? (
        <Loading label="Loading the project" />
      ) : load.status === "missing" ? (
        <LoadFailed title="No such project" message="It may have been removed, or the link is wrong." onRetry={reload} />
      ) : load.status === "error" ? (
        <LoadFailed title="Couldn't load this project" message={load.message} onRetry={reload} />
      ) : (
        <>
          <Text style={[adminStyles.muted, styles.summary]}>
            {[load.project.service, [load.project.locality, load.project.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
            {" · "}Booked {formatIstDateTime(load.project.createdAt)} · Updated {formatIstDateTime(load.project.updatedAt)}
            {load.project.finalPricePaise !== undefined && <Text style={adminStyles.strong}> · Final price {formatRupees(load.project.finalPricePaise)}</Text>}
          </Text>
          <Customer project={load.project} />
          <StagePanel project={load.project} reload={reload} />
          <InspectionPanel project={load.project} reload={reload} />
          <QuotationsPanel project={load.project} reload={reload} />
          <Timeline events={load.project.timeline} />
        </>
      )}
    </Container>
  );
}

/** The customer, the address (with the app booking's map pin) and the job, as the website's admin shows them. */
function Customer({ project }: { project: Project }) {
  const { lead } = project;
  const place = [project.address, project.locality, [project.city, project.pincode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const job = {
    propertyType: project.propertyType ?? lead?.propertyType ?? null,
    floors: project.floors ?? lead?.floors ?? null,
    homeSize: project.homeSize ?? lead?.homeSize ?? null,
    carpetArea: project.carpetArea ?? lead?.carpetArea ?? null,
    preferredDate: project.preferredDate ?? lead?.preferredDate ?? null,
    notes: project.notes ?? lead?.message ?? null,
  };
  const size = [job.floors ? `${job.floors} floor${job.floors === "1" ? "" : "s"}` : "", job.homeSize ?? "", job.carpetArea ? `${job.carpetArea.toLocaleString("en-IN")} sq ft/floor` : ""].filter(Boolean).join(" · ");
  const paintArea = estimatePaintArea(job.carpetArea ?? undefined, job.floors ?? "1", project.service ?? "");
  const pin = project.location ?? lead?.location ?? null;

  return (
    <Panel title="Customer">
      <View style={styles.rows}>
        <InfoRow label="Name">{project.name}</InfoRow>
        <InfoRow label="Phone">
          <Text accessibilityRole="link" accessibilityLabel={`Call ${project.name}, ${project.phone}`} onPress={() => void Linking.openURL(telUrl(project.phone))} style={adminStyles.link}>
            {project.phone}
          </Text>
        </InfoRow>
        <InfoRow label="Address">{project.address ? place : `${place || "—"} (house and street not added yet: the customer adds them in their account, or ask on the call)`}</InfoRow>
        {pin && (
          <InfoRow label="Map pin">
            <Text accessibilityRole="link" onPress={() => void Linking.openURL(mapUrl(pin))} style={adminStyles.link}>
              Open in Google Maps
            </Text>
          </InfoRow>
        )}
        <InfoRow label="Account">{project.userId ? "Signed in: sees this project on their tracker" : "Not signed in yet (sees it once they log in with this number)"}</InfoRow>
        <InfoRow label="Service">{project.service ?? "—"}</InfoRow>
        {job.propertyType && <InfoRow label="Property">{job.propertyType}</InfoRow>}
        {size !== "" && <InfoRow label="Job size">{size}</InfoRow>}
        {paintArea !== null && <InfoRow label="Est. paint area">{`≈ ${paintArea.toLocaleString("en-IN")} sq ft`}</InfoRow>}
        {job.preferredDate && <InfoRow label="Preferred visit">{formatDay(job.preferredDate)}</InfoRow>}
        {job.notes && <InfoRow label="Notes">{job.notes}</InfoRow>}
        {lead && <InfoRow label="Booked">{`${formatIstDateTime(lead.createdAt)} · ${lead.source === "app" ? "App" : "Website"}`}</InfoRow>}
      </View>
    </Panel>
  );
}

const STAGE_CHOICES = (current: ProjectStage) =>
  [...MAIN_STAGES, ...OFF_LINE_STAGES].map((s) => ({
    value: s,
    label: `${(OFF_LINE_STAGES as readonly string[]).includes(s) ? "Off the line: " : ""}${STAGE_LABELS[s]}${s === current ? " (current)" : ""}`,
  }));

/**
 * The stage: any stage (on, back, on hold, cancelled) with an optional note the customer reads on
 * their tracker; the current stage again with a note posts a progress update. Then the crew's start date.
 */
function StagePanel({ project, reload }: { project: Project; reload: () => void }) {
  const [next, setNext] = useState<ProjectStage>(project.stage);
  const [note, setNote] = useState("");
  // the stage also moves on its own (scheduling the inspection, sending a quotation): follow it
  const [shown, setShown] = useState(project.stage);
  if (shown !== project.stage) {
    setShown(project.stage);
    setNext(project.stage);
  }
  const action = useAdminAction(reload);
  const unchanged = next === project.stage && note.trim() === "";

  async function submit() {
    const ok = await action.run("POST", `/api/admin/projects/${project.id}/stage`, { stage: next, note }, next === project.stage ? "Update posted." : `Moved to “${STAGE_LABELS[next]}”.`);
    if (ok) setNote("");
  }

  return (
    <Panel title="Stage">
      <Text style={[adminStyles.text, styles.gapTop]}>
        <Text style={adminStyles.muted}>Now: </Text>
        <Text style={adminStyles.strong}>{project.stageLabel}</Text>
      </Text>
      <Text style={adminStyles.muted}>Customer sees: “{project.stageExplanation}”</Text>
      <View style={adminStyles.fields}>
        <Field label="Set stage">
          <Select label="Set stage" value={next} options={STAGE_CHOICES(project.stage)} allowBlank={false} onChange={(s) => setNext(s as ProjectStage)} />
        </Field>
        <Field label="Note for the customer (optional)">
          <Input value={note} onChangeText={setNote} accessibilityLabel="Note for the customer" multiline maxLength={500} style={styles.multiline} />
          <Help>Shown to the customer on their tracker, under this stage. To post a progress update, keep the current stage and add a note.</Help>
        </Field>
        <Button label={next === project.stage ? "Post update" : "Update stage"} busy={action.busy} busyLabel="Saving…" disabled={unchanged} onPress={() => void submit()} small />
        <Notice error={action.error} done={action.done} />
      </View>
      <WorkStart project={project} reload={reload} />
    </Panel>
  );
}

/** The crew's start date: set, change or clear it without changing the stage. */
function WorkStart({ project, reload }: { project: Project; reload: () => void }) {
  const [day, setDay] = useState(project.workStartsOn ?? "");
  const action = useAdminAction(reload);
  const url = `/api/admin/projects/${project.id}/work-start`;
  const today = indiaToday();

  async function save(value: string) {
    const ok = await action.run("PUT", url, { workStartsOn: value || null }, value ? "Start date saved." : "Start date cleared.");
    if (ok) setDay(value);
  }

  return (
    <View style={adminStyles.divider}>
      <Field label="Work start date">
        <DateInput label="Work start date" value={day} min={shiftDay(today, -365)} max={shiftDay(today, 365)} onChange={setDay} />
        <Help>The customer sees “The crew starts on …” while the project is in “Work scheduled”.</Help>
      </Field>
      <View style={adminStyles.buttons}>
        <Button label="Save date" variant="secondary" small busy={action.busy} disabled={day === (project.workStartsOn ?? "")} onPress={() => void save(day)} />
        {project.workStartsOn && <Button label="Clear" variant="secondary" small disabled={action.busy} onPress={() => void save("")} />}
      </View>
      <Notice error={action.error} done={action.done} />
    </View>
  );
}

/**
 * The site inspection: schedule it (India date and time, inspector), then mark it visited with the
 * findings. Scheduling moves the project to "Inspection scheduled", the visit to "Inspection done".
 */
function InspectionPanel({ project, reload }: { project: Project; reload: () => void }) {
  const { inspection } = project;
  const scheduled = inspection?.scheduledAt ? toIstParts(inspection.scheduledAt) : null;
  const [date, setDate] = useState(scheduled?.date ?? "");
  const [time, setTime] = useState(scheduled?.time ?? "11:00");
  const [inspector, setInspector] = useState(inspection?.inspectorName ?? "");
  const [findings, setFindings] = useState(inspection?.findings ?? "");
  const schedule = useAdminAction(reload);
  const visit = useAdminAction(reload);
  const base = `/api/admin/projects/${project.id}/inspection`;
  const today = indiaToday();

  async function onSchedule() {
    if (!date || !isTime(time)) {
      schedule.setDone("");
      schedule.setError(!date ? "Choose the inspection date." : "Enter the time as 24-hour HH:MM, e.g. 11:00 or 16:30.");
      return;
    }
    await schedule.run("PUT", base, { scheduledAt: fromIstParts(date, time), inspectorName: inspector }, "Inspection scheduled.");
  }

  async function onVisit() {
    // a second save keeps the recorded visit time and only changes the findings
    await visit.run("POST", `${base}/visit`, { findings, ...(inspection?.visitedAt && { visitedAt: inspection.visitedAt }) }, inspection?.visitedAt ? "Findings saved." : "Marked visited.");
  }

  const facts = [
    inspection?.scheduledAt && `Scheduled for ${formatIstDateTime(inspection.scheduledAt)}`,
    inspection?.visitedAt && `Visited ${formatIstDateTime(inspection.visitedAt)}`,
    inspection?.inspectorName && `Inspector: ${inspection.inspectorName}`,
  ].filter(Boolean);

  return (
    <Panel title="Inspection">
      <Text style={[facts.length ? adminStyles.text : adminStyles.muted, styles.gapTop]}>{facts.join(" · ") || "Not scheduled yet."}</Text>
      <View style={adminStyles.fields}>
        <Field label="Date">
          <DateInput label="Inspection date" value={date} min={shiftDay(today, -60)} max={shiftDay(today, 365)} onChange={setDate} />
        </Field>
        <Field label="Time (India, 24-hour)">
          <Input value={time} onChangeText={setTime} accessibilityLabel="Inspection time, 24-hour" placeholder="11:00" keyboardType="numbers-and-punctuation" maxLength={5} />
        </Field>
        <Field label="Inspector">
          <Input value={inspector} onChangeText={setInspector} accessibilityLabel="Inspector" maxLength={80} autoCorrect={false} />
        </Field>
        <Help>The customer sees the date and time on their tracker.</Help>
        <Button label={inspection?.scheduledAt ? "Reschedule" : "Schedule inspection"} busy={schedule.busy} busyLabel="Saving…" onPress={() => void onSchedule()} small />
        <Notice error={schedule.error} done={schedule.done} />
      </View>
      <View style={adminStyles.divider}>
        <Field label="Findings">
          <Input value={findings} onChangeText={setFindings} accessibilityLabel="Findings" multiline maxLength={2000} style={styles.multiline} />
          <Help>Shown to the customer: wall condition, damp, what the quotation will cover.</Help>
        </Field>
        <Button label={inspection?.visitedAt ? "Save findings" : "Mark visited"} variant="secondary" small busy={visit.busy} busyLabel="Saving…" onPress={() => void onVisit()} />
        <Notice error={visit.error} done={visit.done} />
      </View>
    </Panel>
  );
}

/** Every stage change and update, newest first, with the note the customer was shown. */
function Timeline({ events }: { events: Project["timeline"] }) {
  const newestFirst = [...events].reverse();
  return (
    <Panel title="Timeline">
      {newestFirst.length === 0 ? (
        <Text style={[adminStyles.muted, styles.gapTop]}>No events yet.</Text>
      ) : (
        <View style={styles.events}>
          {newestFirst.map((e) => (
            <View key={e.id} style={styles.event} accessible>
              <Text style={adminStyles.strong}>{e.label}</Text>
              <Text style={styles.when}>{formatIstDateTime(e.at)}</Text>
              {e.note && (
                <Text style={adminStyles.text}>
                  <Text style={adminStyles.muted}>Customer sees: </Text>
                  {e.note}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: 64 },
  back: { marginTop: 8, minHeight: 44, paddingVertical: 12, alignSelf: "flex-start", fontFamily: fonts.sansSemiBold, fontSize: 15, color: colors.muted },
  summary: { marginTop: 4 },
  rows: { marginTop: 12 },
  gapTop: { marginTop: 10 },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  events: { marginTop: 12, gap: 12 },
  event: { borderLeftWidth: 2, borderLeftColor: colors.lineStrong, paddingLeft: 12, gap: 2 },
  when: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, color: colors.muted },
});
