import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Container, usePage } from "~/components/site/Page";
import { Chevron } from "~/components/ui/Bits";
import { Button } from "~/components/ui/Button";
import { Collapse, Turn } from "~/components/ui/Collapse";
import { Art, Photo } from "~/components/ui/Media";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { illustrations, images, workFlow, type SiteImage } from "~/shared";
import { colors, fonts, radii } from "~/theme";

// The painting journey, from booking to handover, in one place: the website's "How the work gets done"
// (workFlow in site.ts) as a vertical stepper. Each step shows its number, title and one line; tapping it
// opens the whole step, with a photo where one shows that stage (the shade cards at your home, the
// skimming, the coats). One step is open at a time, the first to begin with: the step slides open as
// the one before slides shut, its one-line preview folding away. "Book a site visit" at the end glides
// to the booking card (#book-visit).

type Step = (typeof workFlow)[number];

/** Photos that show a step, by its title in workFlow (the website's process photos and their captions). */
export const stepPhotos: Record<string, { image: SiteImage; position?: { left: `${number}%`; top: `${number}%` }; caption?: string }> = {
  "Site inspection": { image: images.coupleHome, caption: "Apni roshni mein rang chuniye: shade cards come to your home" },
  Preparation: { image: images.uniformSkimming, position: { left: "50%", top: "30%" } },
  "Painting, supervised": { image: images.uniformCeiling, position: { left: "50%", top: "45%" }, caption: "Har coat, quote ke hisaab se: the finish you approved" },
};

/** A step's picture: the owner's own illustration when the step has one, else the photo of that stage, if any. */
function StepPicture({ step }: { step: Step }) {
  if (step.image) {
    return (
      <View style={styles.art}>
        <Photo image={step.image} aspectRatio={4 / 3} fit="contain" style={styles.artPhoto} />
      </View>
    );
  }
  const photo = stepPhotos[step.title];
  if (!photo) return null;
  return (
    <View style={styles.figure}>
      <Photo image={photo.image} aspectRatio={16 / 10} position={photo.position} />
      {photo.caption && <Text style={styles.caption}>{photo.caption}</Text>}
    </View>
  );
}

export function Journey({ steps = workFlow }: { steps?: readonly Step[] }) {
  const { scrollTo } = usePage();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Container style={styles.section}>
      <View style={styles.head}>
        <View style={styles.flexShrink}>
          <Eyebrow size={11} style={styles.eyebrow}>
            From booking to handover
          </Eyebrow>
          <H size={30} leading={1.06} style={styles.mt8}>
            How the work <Em>gets done</Em>
          </H>
        </View>
        <Art art={illustrations.toolbox} width={96} />
      </View>
      <P size={15} leading={1.6} color={colors.muted} style={styles.mt12}>
        Ek team, ek quotation, ek hi contact: from the first call to the final walkthrough.
      </P>

      <View style={styles.list}>
        {steps.map((s, i) => {
          const expanded = open === i;
          const last = i === steps.length - 1;
          return (
            <View key={s.title} style={styles.step}>
              <View style={styles.rail}>
                <View style={[styles.no, expanded && styles.noOn]}>
                  <Text style={[styles.noText, expanded && styles.noTextOn]}>{i + 1}</Text>
                </View>
                {!last && <View style={styles.railLine} />}
              </View>
              <View style={[styles.body, last && styles.bodyLast]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Step ${i + 1} of ${steps.length}: ${s.title}`}
                  accessibilityState={{ expanded }}
                  onPress={() => setOpen(expanded ? null : i)}
                  style={styles.toggle}
                >
                  <View style={styles.flex}>
                    <Text accessibilityRole="header" style={styles.title}>
                      {s.title}
                    </Text>
                    <Collapse open={!expanded}>
                      <Text numberOfLines={1} style={styles.preview}>
                        {s.text}
                      </Text>
                    </Collapse>
                  </View>
                  <Turn open={expanded}>
                    <Chevron size={14} color={colors.muted} />
                  </Turn>
                </Pressable>
                <Collapse open={expanded} style={styles.detail} testID={`step-detail-${i}`}>
                  <P size={14} leading={1.6} color={colors.inkSoft}>
                    {s.text}
                  </P>
                  <StepPicture step={s} />
                </Collapse>
              </View>
            </View>
          );
        })}
      </View>
      <Button label="Book a site visit" large height={54} onPress={() => scrollTo("book-visit")} style={styles.mt8} />
    </Container>
  );
}

const styles = StyleSheet.create({
  // the reveal that follows starts with 20pt of its own
  section: { paddingBottom: 36 },
  flex: { flex: 1, minWidth: 0 },
  flexShrink: { flexShrink: 1 },
  eyebrow: { lineHeight: 16.5 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  head: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  list: { marginTop: 20 },
  step: { flexDirection: "row", gap: 14 },
  rail: { width: 32, alignItems: "center", paddingTop: 6 },
  no: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.terracotta, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  noOn: { backgroundColor: colors.terracotta },
  noText: { fontFamily: fonts.serif, fontSize: 15, color: colors.terracotta },
  noTextOn: { color: colors.onInk },
  railLine: { flex: 1, width: 1, marginTop: 6, backgroundColor: colors.line },
  body: { flex: 1, minWidth: 0, paddingBottom: 10 },
  bodyLast: { paddingBottom: 14 },
  toggle: { minHeight: 48, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 22, letterSpacing: -0.16, color: colors.ink },
  preview: { paddingTop: 2, fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, letterSpacing: -0.08, color: colors.muted },
  detail: { paddingTop: 2, paddingBottom: 8, gap: 12 },
  art: { borderRadius: radii.lg, overflow: "hidden", backgroundColor: colors.sand },
  artPhoto: { backgroundColor: "transparent" },
  figure: { gap: 8 },
  caption: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16.8, letterSpacing: -0.08, color: colors.muted2 },
});
