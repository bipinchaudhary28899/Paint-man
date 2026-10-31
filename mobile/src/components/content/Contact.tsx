import { StyleSheet, Text, View } from "react-native";

import { LeadForm } from "~/components/site/LeadForm";
import { Anchor, usePage } from "~/components/site/Page";
import { Button } from "~/components/ui/Button";
import { Card, LinkArrow } from "~/components/ui/Bits";
import { RevealContainer } from "~/components/ui/Reveal";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { cityPath, liveCities, liveCityNames, servicePath, services, site } from "~/shared";
import { colors, fonts } from "~/theme";
import { ButtonRow, InlineLink } from "./Inline";

// The contact page under its title (src/app/(site)/contact/page.tsx) at its phone sizes: the two hero
// actions, the cream detail rows, "Send us a message" with the contact form, the three steps after
// you get in touch, and the cards of localities and services.

/** The business details the page shows (src/config/site.ts); empty ones are left out, as on the website. */
type Details = { phone: string; phoneDisplay: string; whatsapp: string; email: string; city: string; region: string; hoursDisplay: string; address: { street: string; postalCode: string } };

/** The hero's buttons: book, then call, WhatsApp or (with neither number set) a jump to the message form. */
export function ContactHeroActions({ details = site }: { details?: Details }) {
  const { scrollTo } = usePage();
  return (
    <ButtonRow style={styles.mt32}>
      <Button label="Book an inspection" accessibilityRole="link" onPress={() => openHref("/book")} />
      {details.phone ? (
        <Button label={`Call ${details.phoneDisplay || details.phone}`} variant="secondary" accessibilityRole="link" onPress={() => openHref(`tel:${details.phone}`)} />
      ) : details.whatsapp ? (
        <Button label="Chat on WhatsApp" variant="secondary" accessibilityRole="link" onPress={() => openHref(`https://wa.me/${details.whatsapp}`)} />
      ) : (
        <Button label="Ask for a call back" variant="secondary" accessibilityRole="link" onPress={() => scrollTo("send-message")} />
      )}
    </ButtonRow>
  );
}

/** `tall`: a 44pt tap target on the row's 28pt line (the service area link). */
export type ContactRow = { label: string; tint: string; value: string; href?: string; tall?: boolean };

/** The detail rows: phone, WhatsApp, email and address only once they are filled in on the website, then the service area and hours. */
export function contactRows(details: Details = site): ContactRow[] {
  const rows: (ContactRow | false)[] = [
    !!details.phone && { label: "Phone", tint: colors.golden, value: details.phoneDisplay || details.phone, href: `tel:${details.phone}` },
    !!details.whatsapp && { label: "WhatsApp", tint: colors.sageWash, value: "Chat on WhatsApp", href: `https://wa.me/${details.whatsapp}` },
    !!details.email && { label: "Email", tint: colors.roseWash, value: details.email, href: `mailto:${details.email}` },
    !!details.address.street && { label: "Address", tint: colors.peachWash, value: `${details.address.street}, ${details.city}, ${details.region} ${details.address.postalCode}` },
    { label: "Service area", tint: colors.creamWash, value: `${details.city}, ${details.region}`, href: "/services/house-painting/agra#localities", tall: true },
    { label: "Hours", tint: colors.creamWash, value: details.hoursDisplay },
  ];
  return rows.filter((r): r is ContactRow => r !== false);
}

/** The rows as rounded cream cards 16pt apart: a small uppercase label over the value in DM Serif. */
export function ContactRows({ rows = contactRows() }: { rows?: ContactRow[] }) {
  return (
    <View style={styles.rows}>
      {rows.map((r) => (
        <View key={r.label} style={[styles.row, { backgroundColor: r.tint }]}>
          <Text style={styles.rowLabel}>{r.label}</Text>
          {r.href ? (
            // the service area link is 44pt tall on a 28pt line; the negative margins keep the row's height
            <Text accessibilityRole="link" onPress={() => openHref(r.href!)} style={[styles.rowValue, r.tall && styles.rowTap]}>
              {r.value}
            </Text>
          ) : (
            <Text style={styles.rowValue}>{r.value}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

/** "Send us a message": the white card with the contact form (the #send-message anchor). */
export function SendMessage() {
  return (
    <Anchor id="send-message" style={styles.mt40}>
      <Card style={styles.messageCard}>
        <H size={24} leading={32 / 24}>
          Send us a message
        </H>
        <P size={14} leading={20 / 14} color={colors.muted} style={styles.mt4}>
          Leave your mobile number and we call you back. Want a quote?{" "}
          <InlineLink href="/book" style={styles.boldTerracotta}>
            Book an inspection
          </InlineLink>{" "}
          instead.
        </P>
        <View style={styles.mt24}>
          <LeadForm type="contact" />
        </View>
      </Card>
    </Anchor>
  );
}

const steps = [
  { title: "We call you back", text: `During working hours (${site.hoursDisplay}), to understand the job and fix a time for the site visit.` },
  { title: "An inspector visits", text: "They measure the walls, check for damp, cracks and peeling paint, and bring shade cards to your home." },
  { title: "You get an itemised quotation", text: "Scope, materials, inclusions, exclusions and the payment schedule in writing. Nothing is booked until you approve it." },
];

/** "After you get in touch": the heading and line, then the three steps between hairlines. */
export function AfterContact() {
  return (
    <RevealContainer style={styles.mt96}>
      <Eyebrow>After you get in touch</Eyebrow>
      <H size={30} leading={1.2} style={styles.mt12}>
        From first call to an itemised <Em>quote</Em>
      </H>
      <P leading={1.65} color={colors.muted} style={[styles.mt16, styles.maxMd]}>
        The same steps for a single bedroom or a whole house, anywhere we work in {liveCityNames()}.
      </P>
      <View style={styles.ruleList}>
        {steps.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <Text aria-hidden style={styles.stepNo}>
              {i + 1}
            </Text>
            <View style={styles.flex}>
              <H size={20} leading={1.4}>
                {s.title}
              </H>
              <P leading={1.65} color={colors.muted} style={styles.mt4}>
                {s.text}
              </P>
            </View>
          </View>
        ))}
      </View>
    </RevealContainer>
  );
}

/** "Localities we cover" and "What we paint": two white cards 40pt apart. */
export function Coverage({ live = liveCities() }: { live?: ReturnType<typeof liveCities> }) {
  return (
    <RevealContainer style={styles.mt96} containerStyle={styles.cards}>
      <Card style={styles.coverCard}>
        <H size={24} leading={32 / 24}>
          Localities we cover
        </H>
        {live.map((c) => (
          <View key={c.slug} style={styles.mt16}>
            {/* font-sans on the website, overridden by its global h3 rule: DM Serif at 14px */}
            <H size={14} leading={20 / 14}>
              {c.name}
            </H>
            <P leading={1.65} color={colors.muted} style={styles.mt4}>
              {c.areas.join(" · ")}
            </P>
            <LinkArrow label={`Areas we serve in ${c.name}`} onPress={() => openHref(`${cityPath(c)}#localities`)} />
          </View>
        ))}
        <P size={14} leading={20 / 14} color={colors.muted} style={styles.mt12}>
          Not on the list? Ask anyway. We&apos;ll tell you honestly whether we can supervise your job.
        </P>
      </Card>
      <Card style={styles.coverCard}>
        <H size={24} leading={32 / 24}>
          What we paint
        </H>
        <View style={styles.mt12}>
          {services.map((s) => (
            <LinkArrow key={s.slug} label={s.name} onPress={() => openHref(servicePath(s))} />
          ))}
        </View>
      </Card>
    </RevealContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mt4: { marginTop: 4 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
  mt32: { marginTop: 32 },
  mt40: { marginTop: 40 },
  mt96: { marginTop: 96 },
  maxMd: { maxWidth: 448 },
  rows: { gap: 16 },
  row: { borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 20 },
  // ink at 75% (the website's 60% reads under 4.5:1 on the tints): 4.8:1 on golden, 5.5:1 or more on the washes
  rowLabel: { fontFamily: fonts.sansBold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(36, 37, 34, 0.75)" },
  rowValue: { marginTop: 4, fontFamily: fonts.serif, fontSize: 20, lineHeight: 28, letterSpacing: -0.3, color: colors.ink },
  rowTap: { marginVertical: -8, paddingVertical: 8, marginTop: -4, alignSelf: "flex-start" },
  messageCard: { padding: 24 },
  boldTerracotta: { fontFamily: fonts.sansBold, color: colors.terracotta, textDecorationColor: colors.terracotta },
  ruleList: { marginTop: 48, borderTopWidth: 1, borderColor: colors.line },
  step: { flexDirection: "row", gap: 20, paddingVertical: 24, borderBottomWidth: 1, borderColor: colors.line },
  stepNo: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36, letterSpacing: -0.45, color: colors.terracotta },
  cards: { gap: 40 },
  coverCard: { padding: 28 },
});
