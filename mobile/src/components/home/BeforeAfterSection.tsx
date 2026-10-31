import { StyleSheet } from "react-native";

import { BeforeAfter } from "~/components/colours/BeforeAfter";
import { Container } from "~/components/site/Page";
import { Em, Eyebrow, H, P } from "~/components/ui/Text";
import { colors } from "~/theme";

// "Slide to see the walls repainted": the colour preview slider on the home page. There are no photos
// of our own jobs yet, so this is not a before/after of a job: it is the finder's example room, as
// photographed and with its walls in a real shade, and its caption says so.

export function BeforeAfterSection() {
  return (
    <Container style={styles.section}>
      <Eyebrow size={11} style={styles.eyebrow}>
        Colour preview
      </Eyebrow>
      <H size={30} leading={1.06} style={styles.mt12}>
        Slide to see the walls <Em>repainted.</Em>
      </H>
      <P size={15} leading={1.6} color={colors.muted} style={styles.mt12}>
        The same room twice: as photographed on the left, and with its walls in a real shade-card colour on the right. Pick a shade, then drag the divider.
      </P>
      <BeforeAfter style={styles.mt20} />
    </Container>
  );
}

const styles = StyleSheet.create({
  section: { paddingVertical: 56 },
  eyebrow: { lineHeight: 16.5 },
  mt12: { marginTop: 12 },
  mt20: { marginTop: 20 },
});
