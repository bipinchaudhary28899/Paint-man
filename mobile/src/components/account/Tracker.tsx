import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { Container } from "~/components/site/Page";
import { Breadcrumbs } from "~/components/site/Sections";
import { WHATSAPP_GREEN, WhatsAppLogo } from "~/components/site/StickyCta";
import { Card } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { ApiError } from "~/lib/api";
import { errorMessage } from "~/lib/auth";
import { useAuth } from "~/lib/auth-context";
import { contactLinks } from "~/lib/contact";
import { openHref } from "~/lib/links";
import {
  downloadQuotationPdf,
  formatCalendarDay,
  formatDay,
  formatRupees,
  formatVisit,
  lineDetails,
  nextStep,
  projectTitle,
  QUOTATION_STATUS,
  spokenRupees,
  type Inspection,
  type ProjectDetail,
  type Quotation,
  type QuotationStatus,
  type TimelineEvent,
} from "~/lib/projects";
import { site, type StageStep } from "~/shared";
import { colors, fonts, radii } from "~/theme";
import { Loading, useRequireSignIn } from "./Account";

// The project tracker (the website's /account/projects/[id]): where the project stands and what
// happens next, the stages as a vertical stepper (done, now, to come, with the day each was reached),
// the inspection, the quotations newest first (status, itemised lines, totals in rupees, notes,
// payment terms, valid until, Download PDF), the agreed price once a quotation is approved, every
// update, and how to reach us. Signed out, it opens the login screen, which comes back here.

type Load = { status: "loading" } | { status: "ready"; project: ProjectDetail } | { status: "missing" } | { status: "error"; message: string };

export function ProjectTracker({ id }: { id: string }) {
  const auth = useAuth();
  useRequireSignIn(`/account/projects/${id}`);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const signedIn = auth.status === "signedIn";

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    auth
      .request<ProjectDetail>(`/api/v1/projects/${encodeURIComponent(id)}`)
      .then((res) => live && setLoad({ status: "ready", project: res.data }))
      .catch((err: unknown) => {
        if (!live) return;
        if (err instanceof ApiError && err.status === 404) setLoad({ status: "missing" });
        else setLoad({ status: "error", message: errorMessage(err) });
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loads when signed in, and again on "Try again"
  }, [signedIn, id, attempt]);

  if (load.status === "loading") {
    return (
      <Container style={styles.page}>
        <Loading label="Loading your project" />
      </Container>
    );
  }
  if (load.status === "missing" || load.status === "error") {
    const missing = load.status === "missing";
    return (
      <Container style={styles.page}>
        <Breadcrumbs items={[{ name: "My account", path: "/account" }, { name: "Project", path: `/account/projects/${id}` }]} />
        <H size={36} leading={1.1} style={styles.title}>
          {missing ? (
            <>
              Project not <Em>found</Em>
            </>
          ) : (
            <>
              Your project could not <Em>load</Em>
            </>
          )}
        </H>
        <P size={17} leading={1.6} color={colors.muted} style={styles.intro} accessibilityRole={missing ? undefined : "alert"}>
          {missing ? "We couldn't find this project in your account. It may belong to another mobile number." : load.message}
        </P>
        <View style={styles.row}>
          {!missing && (
            <Button
              label="Try again"
              onPress={() => {
                setLoad({ status: "loading" });
                setAttempt((a) => a + 1);
              }}
            />
          )}
          <Button label="My account" variant="secondary" accessibilityRole="link" onPress={() => router.navigate("/account")} />
        </View>
      </Container>
    );
  }
  return <TrackerBody project={load.project} />;
}

function TrackerBody({ project }: { project: ProjectDetail }) {
  const { what, where } = projectTitle(project);
  const next = nextStep(project.stages);
  const approved = project.quotations.find((q) => q.status === "approved");
  const address = [project.address, project.locality, [project.city, project.pincode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return (
    <Container style={styles.page}>
      <Breadcrumbs items={[{ name: "My account", path: "/account" }, { name: what, path: `/account/projects/${project.id}` }]} />
      <H size={36} leading={1.1} style={styles.title}>
        {where ? (
          <>
            {what} in <Em>{where}</Em>
          </>
        ) : (
          <>
            {what}, <Em>tracked</Em>
          </>
        )}
      </H>
      {address !== "" && (
        <P size={15} leading={1.5} color={colors.muted} style={styles.address}>
          {address}
        </P>
      )}

      {project.finalPricePaise !== undefined && (
        <View style={styles.final} accessible accessibilityLabel={`Final price ${spokenRupees(project.finalPricePaise)}${approved ? `, quotation version ${approved.version}` : ""}`}>
          <Eyebrow>Final price</Eyebrow>
          <Text style={styles.finalAmount}>{formatRupees(project.finalPricePaise)}</Text>
          <Text style={styles.finalNote}>
            {approved ? `The quotation you approved (version ${approved.version}). ` : ""}Nothing else is added without your written approval.
          </Text>
        </View>
      )}

      <Card style={styles.now}>
        <Eyebrow>Where it stands</Eyebrow>
        <H size={26} leading={1.25} style={styles.nowTitle}>
          {project.stageLabel}
        </H>
        <P color={colors.inkSoft} style={styles.nowText}>
          {project.stageExplanation}
        </P>
        {next && (
          <View style={styles.next} accessible accessibilityLabel={`What happens next: ${next.label}`}>
            <Text style={styles.nextKey}>What happens next</Text>
            <Text style={styles.nextLabel}>{next.label}</Text>
          </View>
        )}
      </Card>

      <H size={28} leading={1.2} style={styles.section}>
        Every step
      </H>
      <Stepper steps={project.stages} />

      {project.inspection && <InspectionCard inspection={project.inspection} />}

      <H size={28} leading={1.2} style={styles.section}>
        Quotations
      </H>
      {project.quotations.length === 0 ? (
        <P color={colors.muted} style={styles.sectionBody}>
          Your itemised quotation shows here once the inspection is done. Nothing is booked until you approve it.
        </P>
      ) : (
        <View style={styles.quotes}>
          {project.quotations.map((q) => (
            <QuotationCard key={q.id} quotation={q} />
          ))}
        </View>
      )}

      {project.timeline.length > 0 && <Timeline events={project.timeline} />}

      <Help />
    </Container>
  );
}

const stepState = (s: StageStep) => (s.current ? "now" : s.done ? "done" : "to come");

/** The stages top to bottom: a filled dot for each done, the current one in terracotta, hollow dots for those to come. */
export function Stepper({ steps }: { steps: readonly StageStep[] }) {
  return (
    <View style={styles.stepper}>
      {steps.map((s, i) => {
        const day = s.at ? formatDay(s.at) : "";
        return (
          <View key={s.stage} accessible accessibilityLabel={`${s.label}, ${stepState(s)}${day ? `, ${day}` : ""}`} style={styles.step} testID={`step-${s.stage}`}>
            <View style={styles.rail}>
              <View style={[styles.dot, s.done && styles.dotDone, s.current && styles.dotNow]} />
              {i < steps.length - 1 && <View style={[styles.line, s.done && styles.lineDone]} />}
            </View>
            <View style={styles.stepText}>
              <Text style={[styles.stepLabel, s.current && styles.stepNow, !s.done && !s.current && styles.stepLater]}>{s.label}</Text>
              <Text style={styles.stepMeta}>{s.current ? (day ? `Now · since ${day}` : "Now") : s.done ? day || "Done" : "To come"}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function InspectionCard({ inspection }: { inspection: Inspection }) {
  const rows: [string, string][] = [];
  if (inspection.scheduledAt) rows.push([inspection.visitedAt ? "Booked for" : "Visit", formatVisit(inspection.scheduledAt)]);
  if (inspection.visitedAt) rows.push(["Visited", formatVisit(inspection.visitedAt)]);
  if (inspection.inspectorName) rows.push(["Inspector", inspection.inspectorName]);
  return (
    <>
      <H size={28} leading={1.2} style={styles.section}>
        Inspection
      </H>
      <Card style={styles.card}>
        {rows.map(([key, value]) => (
          <View key={key} style={styles.kv}>
            <Text style={styles.kvKey}>{key}</Text>
            <Text style={styles.kvValue}>{value}</Text>
          </View>
        ))}
        {inspection.findings ? (
          <View style={rows.length > 0 ? styles.findings : undefined}>
            <Text style={styles.kvKey}>What the inspector found</Text>
            <P style={styles.findingsText}>{inspection.findings}</P>
          </View>
        ) : rows.length === 0 ? (
          <P color={colors.muted}>We call you to fix the time of the visit.</P>
        ) : null}
      </Card>
    </>
  );
}

const STATUS_LOOK: Record<QuotationStatus, { bg: string; text: string }> = {
  sent: { bg: colors.golden, text: colors.ink },
  approved: { bg: colors.sageDeep, text: colors.onSage },
  declined: { bg: colors.roseWash, text: colors.ink },
  superseded: { bg: colors.creamWash, text: colors.muted },
};

/** One version of the quotation: status, every line with its amount, the totals, its notes and terms, and the PDF. */
export function QuotationCard({ quotation: q }: { quotation: Quotation }) {
  const auth = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const look = STATUS_LOOK[q.status];
  const approved = q.status === "approved";

  async function download() {
    setError("");
    setDownloading(true);
    try {
      await auth.withToken((token) => downloadQuotationPdf(token, q));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  const dated = approved && q.approvedAt ? `Approved ${formatDay(q.approvedAt)}` : q.sentAt ? `Shared ${formatDay(q.sentAt)}` : "";
  return (
    <View style={[styles.quote, approved && styles.quoteApproved]} testID={`quotation-${q.version}`}>
      <View style={styles.quoteHead}>
        <H size={22} leading={1.3} style={styles.flex}>
          Quotation, version {q.version}
        </H>
        <View style={[styles.status, { backgroundColor: look.bg }]}>
          <Text style={[styles.statusText, { color: look.text }]}>{QUOTATION_STATUS[q.status]}</Text>
        </View>
      </View>
      {dated !== "" && <Text style={styles.dated}>{dated}</Text>}

      <View style={styles.lines}>
        {q.lines.map((l) => {
          const details = lineDetails(l);
          return (
            <View key={l.position} style={styles.line_} accessible accessibilityLabel={[l.item, l.description, details, spokenRupees(l.amountPaise)].filter(Boolean).join(", ")}>
              <View style={styles.lineTop}>
                <Text style={styles.lineItem}>{l.item}</Text>
                <Text style={styles.lineAmount}>{formatRupees(l.amountPaise)}</Text>
              </View>
              {l.description ? <Text style={styles.lineText}>{l.description}</Text> : null}
              {details !== "" && <Text style={styles.lineText}>{details}</Text>}
            </View>
          );
        })}
      </View>

      <View style={styles.totals}>
        {q.subtotalPaise !== q.totalPaise && (
          <View style={styles.totalRow} accessible accessibilityLabel={`Subtotal ${spokenRupees(q.subtotalPaise)}`}>
            <Text style={styles.subtotalKey}>Subtotal</Text>
            <Text style={styles.subtotalValue}>{formatRupees(q.subtotalPaise)}</Text>
          </View>
        )}
        <View style={styles.totalRow} accessible accessibilityLabel={`${approved ? "Final price" : "Total"} ${spokenRupees(q.totalPaise)}`}>
          <Text style={styles.totalKey}>{approved ? "Final price" : "Total"}</Text>
          <Text style={[styles.totalValue, approved && styles.totalApproved]}>{formatRupees(q.totalPaise)}</Text>
        </View>
      </View>

      {q.notes ? <Detail label="Notes" text={q.notes} /> : null}
      {q.paymentTerms ? <Detail label="Payment terms" text={q.paymentTerms} /> : null}
      {q.validUntil && q.status === "sent" ? <Detail label="Valid until" text={formatCalendarDay(q.validUntil)} /> : null}

      <Button
        label="Download PDF"
        busyLabel="Preparing the PDF…"
        busy={downloading}
        variant={approved || q.status === "sent" ? "primary" : "secondary"}
        accessibilityLabel={`Download PDF of quotation version ${q.version}`}
        accessibilityHint="Saves the PDF and opens the share sheet"
        onPress={() => void download()}
        style={styles.download}
      />
      {error !== "" && (
        <Text accessibilityRole="alert" style={styles.formError}>
          {error}
        </Text>
      )}
    </View>
  );
}

function Detail({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.kvKey}>{label}</Text>
      <P size={15} leading={1.5}>
        {text}
      </P>
    </View>
  );
}

/** Every update on the project, newest first, with our note when there is one. */
function Timeline({ events }: { events: readonly TimelineEvent[] }) {
  const newest = [...events].reverse();
  return (
    <>
      <H size={28} leading={1.2} style={styles.section}>
        Updates
      </H>
      <View style={styles.timeline}>
        {newest.map((e, i) => (
          <View key={`${e.at}-${i}`} style={[styles.event, i > 0 && styles.eventRule]} accessible accessibilityLabel={[formatDay(e.at), e.label, e.note].filter(Boolean).join(". ")}>
            <Text style={styles.eventDay}>{formatDay(e.at)}</Text>
            <Text style={styles.eventLabel}>{e.label}</Text>
            {e.note ? <Text style={styles.eventNote}>{e.note}</Text> : null}
          </View>
        ))}
      </View>
    </>
  );
}

/** Call and WhatsApp when the website lists the numbers, else the contact page. */
function Help() {
  const direct = contactLinks(site, `Hi ${site.name}, I have a question about my painting project.`);
  return (
    <>
      <H size={28} leading={1.2} style={styles.section}>
        Need <Em>help</Em>?
      </H>
      <P color={colors.muted} style={styles.sectionBody}>
        Questions about a visit, a quotation or the work? We answer {site.hoursDisplay}.
      </P>
      <View style={styles.row}>
        {direct.length > 0 ? (
          direct.map((c) => (
            <Button
              key={c.kind}
              label={c.label}
              variant={c.kind === "call" ? "primary" : "secondary"}
              accessibilityRole="link"
              leading={c.kind === "whatsapp" ? <WhatsAppLogo size={18} color={WHATSAPP_GREEN} /> : undefined}
              onPress={() => void Linking.openURL(c.url)}
            />
          ))
        ) : (
          <Button label="Contact us" variant="secondary" accessibilityRole="link" onPress={() => openHref("/contact")} />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingTop: 40, paddingBottom: 64 },
  title: { marginTop: 24 },
  intro: { marginTop: 16 },
  address: { marginTop: 12 },
  row: { marginTop: 24, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  final: { marginTop: 28, borderRadius: radii.lg, backgroundColor: colors.sand, padding: 20, gap: 4 },
  finalAmount: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 48, letterSpacing: -0.6, color: colors.ink },
  finalNote: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  now: { marginTop: 28, padding: 20 },
  nowTitle: { marginTop: 10 },
  nowText: { marginTop: 8 },
  next: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderColor: colors.lineSoft, gap: 2 },
  nextKey: { fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 16, letterSpacing: 1.1, textTransform: "uppercase", color: colors.muted },
  nextLabel: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 22, color: colors.ink },
  section: { marginTop: 48 },
  sectionBody: { marginTop: 12 },
  stepper: { marginTop: 20 },
  step: { flexDirection: "row", gap: 14, minHeight: 56 },
  rail: { width: 16, alignItems: "center" },
  dot: { marginTop: 4, width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.lineStrong, backgroundColor: colors.canvas },
  dotDone: { borderColor: colors.sageDeep, backgroundColor: colors.sageDeep },
  dotNow: { width: 16, height: 16, borderRadius: 8, borderWidth: 4, borderColor: colors.terracotta, backgroundColor: colors.paper },
  line: { flex: 1, width: 2, marginVertical: 4, borderRadius: 1, backgroundColor: colors.line },
  lineDone: { backgroundColor: colors.sageDeep },
  stepText: { flex: 1, paddingBottom: 16 },
  stepLabel: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 22, color: colors.ink },
  stepNow: { color: colors.terracotta },
  stepLater: { fontFamily: fonts.sansMedium, color: colors.muted },
  stepMeta: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.muted },
  card: { marginTop: 20, padding: 20, gap: 12 },
  kv: { gap: 2 },
  kvKey: { fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 16, letterSpacing: 1.1, textTransform: "uppercase", color: colors.muted },
  kvValue: { fontFamily: fonts.sansMedium, fontSize: 16, lineHeight: 22, color: colors.ink },
  findings: { paddingTop: 12, borderTopWidth: 1, borderColor: colors.lineSoft, gap: 4 },
  findingsText: { marginTop: 2 },
  quotes: { marginTop: 20, gap: 20 },
  quote: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.paper, padding: 20 },
  quoteApproved: { borderWidth: 1.5, borderColor: colors.terracotta },
  quoteHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  status: { borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6, marginTop: 2 },
  statusText: { fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.3 },
  dated: { marginTop: 4, fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.muted },
  lines: { marginTop: 16, borderTopWidth: 1, borderColor: colors.lineSoft },
  line_: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.lineSoft, gap: 2 },
  lineTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  lineItem: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 21, color: colors.ink },
  lineAmount: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 21, color: colors.ink, fontVariant: ["tabular-nums"] },
  lineText: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.muted },
  totals: { marginTop: 12, gap: 6 },
  totalRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  subtotalKey: { fontFamily: fonts.sans, fontSize: 14, color: colors.muted },
  subtotalValue: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.ink },
  totalKey: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.ink },
  totalValue: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 32, color: colors.ink },
  totalApproved: { color: colors.terracotta },
  detail: { marginTop: 14, gap: 2 },
  download: { marginTop: 20 },
  formError: { marginTop: 12, borderRadius: 8, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.danger, padding: 12, fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.danger },
  timeline: { marginTop: 16 },
  event: { paddingVertical: 14, gap: 2 },
  eventRule: { borderTopWidth: 1, borderColor: colors.lineSoft },
  eventDay: { fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: colors.muted },
  eventLabel: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 22, color: colors.ink },
  eventNote: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.inkSoft },
});
