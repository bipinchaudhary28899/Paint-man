import { router } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";

import { Container } from "~/components/site/Page";
import { Button } from "~/components/ui/Button";
import { Art } from "~/components/ui/Media";
import { H, P } from "~/components/ui/Text";
import { webUrl } from "~/lib/config";
import { contactLinks } from "~/lib/contact";
import { bookingSteps, illustrations, site } from "~/shared";
import { colors, fonts, radii } from "~/theme";
import { ButtonRow } from "./Inline";

// The thank-you page (src/app/(site)/thank-you/page.tsx and ThankYouMessage): the toolbox, the
// heading and line for the form that was sent (?type=booking|visit|waitlist|contact) and, for a
// booking, what happens next. A booking sent from the app (POST /api/v1/bookings, signed in) arrives
// with sent=1 and its project id (?project=), and the page links to "Track this booking" in the
// account. A form the app checked but did not send (the contact form: there is no app endpoint for
// messages yet) arrives with sent=0, and then the page says plainly that nothing was sent and points
// to the website and the ways to reach us, never to a call back.

export type ThankYouType = "booking" | "visit" | "waitlist" | "contact";

/** The page's wording: the website's types, anything else reads as a booking (as on the website). */
export function thankYouType(param: string | string[] | undefined): ThankYouType {
  const value = Array.isArray(param) ? param[0] : param;
  return value === "waitlist" || value === "contact" || value === "visit" ? value : "booking";
}

/** Only a form that says it was sent (sent=1) gets the website's thank-you; anything else is treated as not sent. */
export const wasSent = (param: string | string[] | undefined) => (Array.isArray(param) ? param[0] : param) === "1";

/** The booking's project id from ?project= (an id the API gave: letters, digits and dashes), or undefined. */
export function projectParam(param: string | string[] | undefined): string | undefined {
  const value = Array.isArray(param) ? param[0] : param;
  return value && /^[A-Za-z0-9-]{1,64}$/.test(value) ? value : undefined;
}

type Copy = { title: string; text: string };

/** What the page says for a sent form: ThankYouMessage's words. */
export function sentCopy(type: ThankYouType): Copy {
  if (type === "waitlist") return { title: "You're on the waitlist", text: "We'll call you as soon as we start painting in your city." };
  const booking = type !== "contact";
  return {
    title: booking ? "Your inspection request is in" : "Thanks for your message",
    text: `Shukriya! ${booking ? "Our team will call you shortly to confirm a time for the site visit." : "We'll get back to you as soon as possible."} Hours: ${site.hoursDisplay}.`,
  };
}

/** What the page says when the app checked the form but did not send it. */
export function notSentCopy(type: ThankYouType): Copy {
  if (type === "contact")
    return {
      title: "Your message was not sent",
      text: "Your message is filled in correctly, but sending from the app isn't switched on yet. Nothing was sent, so we won't see it or reply to it. Please send it from our website instead.",
    };
  if (type === "waitlist")
    return {
      title: "You're not on the waitlist yet",
      text: "Your details are filled in correctly, but joining the waitlist from the app isn't switched on yet. Nothing was sent, so we won't call you about it. Please contact us through our website instead.",
    };
  return {
    title: "Your request was not sent",
    text: "Your details are filled in correctly, but booking from the app isn't switched on yet. Nothing was sent, so no one will call you about this request. Please book on our website instead.",
  };
}

/** The website pages to finish on: booking first for a booking or visit, the contact page first for a message or the waitlist. */
export function webActions(type: ThankYouType): { label: string; url: string }[] {
  const book = { label: "Book on the website", url: webUrl("/book") };
  const contact = { label: "Contact us on the website", url: webUrl("/contact") };
  return type === "contact" || type === "waitlist" ? [contact, book] : [book, contact];
}

/** The whole message under the toolbox, with its buttons; `project` (a booking sent from the app) adds "Track this booking". */
export function ThankYou({ type, sent, project }: { type: ThankYouType; sent: boolean; project?: string }) {
  return (
    <Container style={styles.page}>
      <Art art={illustrations.toolbox} width={240} style={styles.art} />
      {sent ? <Sent type={type} project={project} /> : <NotSent type={type} />}
    </Container>
  );
}

function Sent({ type, project }: { type: ThankYouType; project?: string }) {
  const copy = sentCopy(type);
  return (
    <>
      <H size={30} leading={1.2} style={styles.title}>
        {copy.title}
      </H>
      <P size={18} leading={28 / 18} color={colors.muted} style={styles.text}>
        {copy.text}
      </P>
      {type !== "waitlist" && type !== "contact" && (
        // What happens from here, so the visitor knows the next step is ours (the booking steps after "fill in the form")
        <View style={styles.next}>
          {/* An h2 with !font-sans: Manrope, but the global h2 rule keeps its weight 400 and -0.015em tracking */}
          <Text accessibilityRole="header" style={styles.nextTitle}>
            Aage kya hoga · What happens next
          </Text>
          <View style={styles.nextList}>
            {bookingSteps.slice(1).map((s, i) => (
              <View key={s.title} style={styles.nextRow}>
                <View aria-hidden style={styles.dot}>
                  <Text style={styles.dotText}>{i + 1}</Text>
                </View>
                <View style={styles.flex}>
                  <P weight="semibold">{s.title}</P>
                  <P size={14} leading={1.625} color={colors.muted} style={styles.mt2}>
                    {s.text}
                  </P>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
      {project && type !== "waitlist" && type !== "contact" && (
        <View style={styles.track}>
          <P size={14} leading={20 / 14} color={colors.muted} style={styles.trackText}>
            Your booking is in your account. Follow each step there, from the call to the handover.
          </P>
          <Button label="Track this booking" accessibilityRole="link" onPress={() => router.push(`/account/projects/${project}` as never)} />
        </View>
      )}
      <ButtonRow center style={styles.actions}>
        <Button label="Back to home" variant="secondary" textColor={colors.terracottaHover} accessibilityRole="link" onPress={() => router.navigate("/")} />
        <Button label="Explore services" variant={project ? "secondary" : "primary"} accessibilityRole="link" onPress={() => router.push("/services")} />
      </ButtonRow>
    </>
  );
}

function NotSent({ type }: { type: ThankYouType }) {
  const copy = notSentCopy(type);
  const [primary, secondary] = webActions(type);
  const direct = contactLinks();
  return (
    <>
      <H size={30} leading={1.2} style={styles.title}>
        {copy.title}
      </H>
      <P size={18} leading={28 / 18} color={colors.muted} style={styles.text}>
        {copy.text}
      </P>
      <ButtonRow center style={styles.actions}>
        <Button label={primary.label} accessibilityRole="link" accessibilityHint="Opens the website" onPress={() => void Linking.openURL(primary.url)} />
        <Button label={secondary.label} variant="secondary" accessibilityRole="link" accessibilityHint="Opens the website" onPress={() => void Linking.openURL(secondary.url)} />
        {direct.map((c) => (
          <Button key={c.kind} label={c.label} variant="secondary" accessibilityRole="link" onPress={() => void Linking.openURL(c.url)} />
        ))}
        <Button label="Back to home" variant="secondary" accessibilityRole="link" onPress={() => router.navigate("/")} />
      </ButtonRow>
      {direct.length > 0 && (
        <P size={14} leading={20 / 14} color={colors.muted} style={styles.hours}>
          We answer {site.hoursDisplay}.
        </P>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mt2: { marginTop: 2 },
  page: { paddingVertical: 80, alignItems: "stretch" },
  art: { alignSelf: "center" },
  title: { marginTop: 24, textAlign: "center" },
  text: { marginTop: 16, textAlign: "center" },
  next: { marginTop: 32, alignSelf: "center", width: "100%", maxWidth: 448, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.paper, padding: 20 },
  nextTitle: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, letterSpacing: -0.18, textTransform: "uppercase", color: colors.muted },
  nextList: { marginTop: 16, gap: 16 },
  nextRow: { flexDirection: "row", gap: 14 },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.sand, alignItems: "center", justifyContent: "center" },
  dotText: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20, color: colors.ink },
  actions: { marginTop: 32 },
  track: { marginTop: 32, alignSelf: "center", width: "100%", maxWidth: 448, gap: 14 },
  trackText: { textAlign: "center" },
  hours: { marginTop: 16, textAlign: "center" },
});
