import { StyleSheet, View } from "react-native";

import { Card } from "~/components/ui/Bits";
import { RevealContainer } from "~/components/ui/Reveal";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { openHref } from "~/lib/links";
import { cityPath, images, liveCities, liveCityNames, site } from "~/shared";
import { colors, fonts } from "~/theme";
import { OutlineHeading, ShapedPhoto } from "./Decor";
import { TapLink } from "./Inline";

// The about page's sections under its hero (src/app/(site)/about/page.tsx), at the website's phone
// sizes: "Our model" with the team photo in a blob, "How we work" as four tinted cards, and the ink
// "Where we work" card listing each live city's localities.

/** "Our model": eyebrow, the outlined-word heading, two paragraphs, then the team photo (aspect 4/3) cropped to a blob on a yellow blob. */
export function AboutModel() {
  return (
    <RevealContainer style={styles.model}>
      <Eyebrow>Our model</Eyebrow>
      <OutlineHeading parts={["A managed service, ", { outline: "not" }, " a directory"]} size={36} leading={40 / 36} style={styles.mt12} />
      <P size={18} leading={1.625} color={colors.muted} style={styles.mt20}>
        We don&apos;t list painters for you to choose from. We inspect your property, prepare the quotation, assign a vetted painting team, arrange materials and
        check the work. You get one point of contact and one team responsible for the result.
      </P>
      <P size={18} leading={1.625} color={colors.muted} style={styles.mt16}>
        Hum naye nahi hain. We have been painting homes for {site.yearsPainting} years; what is new is that you can now book us online.
      </P>
      <ShapedPhoto image={images.workersTeam} shape="blob2" backdrop="#ffd84d" aspectRatio={4 / 3} style={styles.mt48} />
    </RevealContainer>
  );
}

/**
 * The four principles, each on its own tint (bg-sunshine, bg-sky-wash, bg-rose-wash, bg-peach-wash),
 * with its text in muted, or in ink-soft on golden, where muted reads under 4.5:1.
 */
export const principles = [
  { title: "Itemised quotations", text: "Inclusions, exclusions and a payment schedule, in writing.", tint: colors.golden, textColour: colors.inkSoft },
  { title: "No silent swaps", text: "The paint brand and range you approve is what goes on the wall.", tint: colors.sageWash, textColour: colors.muted },
  { title: "Approved changes only", text: "Any change in scope is priced and approved before it's charged.", tint: colors.roseWash, textColour: colors.muted },
  { title: "Checked before closing", text: "A quality checklist and a walkthrough with you before we hand over.", tint: colors.peachWash, textColour: colors.muted },
] as const;

/** "How we work": eyebrow, then the principles as cards 20pt apart. */
export function Principles() {
  return (
    <RevealContainer style={styles.section}>
      <Eyebrow>How we work</Eyebrow>
      <View style={styles.cards}>
        {principles.map((p) => (
          <Card key={p.title} style={[styles.principle, { backgroundColor: p.tint }]}>
            <H size={20} leading={1.4}>
              {p.title}
            </H>
            <P color={p.textColour} style={styles.mt8}>
              {p.text}
            </P>
          </Card>
        ))}
      </View>
    </RevealContainer>
  );
}

/** "Where we work": the ink card with each live city's localities in golden and a link to its localities. */
export function WhereWeWork({ live = liveCities() }: { live?: ReturnType<typeof liveCities> }) {
  return (
    <RevealContainer style={styles.section}>
      <Card style={styles.ink}>
        <H size={30} leading={1.2} style={styles.onInk}>
          Where we <Em>work</Em>
        </H>
        <P color={onInk75} style={styles.mt16}>
          We paint in {liveCityNames()}, in localities our supervisors can visit every day, so problems are fixed quickly:
        </P>
        {live.map((c) => (
          <View key={c.slug} style={styles.mt24}>
            {/* An h3 with font-sans on the website, which its global h3 rule overrides: DM Serif, 12px, uppercase. */}
            <H size={12} leading={16 / 12} style={styles.cityName}>
              {c.name}
            </H>
            <P size={20} leading={1.4} color={colors.golden} style={styles.areas}>
              {c.areas.join(" · ")}
            </P>
            <TapLink label={`How we work in ${c.name}`} onPress={() => openHref(`${cityPath(c)}#localities`)} textStyle={styles.cityLink} style={styles.mt8} />
          </View>
        ))}
      </Card>
    </RevealContainer>
  );
}

const onInk75 = "rgba(248, 245, 239, 0.75)";

const styles = StyleSheet.create({
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
  mt24: { marginTop: 24 },
  mt48: { marginTop: 48 },
  model: { marginTop: 80 },
  section: { marginTop: 96 },
  cards: { marginTop: 24, gap: 20 },
  principle: { padding: 24 },
  ink: { backgroundColor: colors.ink, borderColor: colors.lineSoft, padding: 32 },
  onInk: { color: colors.onInk },
  cityName: { textTransform: "uppercase", color: "rgba(248, 245, 239, 0.6)" },
  areas: { marginTop: 6, fontFamily: fonts.serif, letterSpacing: -0.3 },
  cityLink: { fontSize: 16, lineHeight: 24, color: colors.onInk, textDecorationColor: colors.golden },
});
