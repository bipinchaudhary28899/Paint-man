import { Pressable, StyleSheet, Text, View } from "react-native";

import { BeforeAfter } from "~/components/colours/BeforeAfter";
import { Anchor, usePage } from "~/components/site/Page";
import { Photo } from "~/components/ui/Media";
import { Reveal } from "~/components/ui/Reveal";
import { Em, H, P } from "~/components/ui/Text";
import { galleryGroups, type GalleryGroup } from "~/shared";
import { colors, fonts, radii } from "~/theme";

// The gallery page under its hero (src/app/(site)/gallery/page.tsx and GalleryGrid): the note that
// these are example homes, the row of section chips, the colour preview slider (an example room, its
// walls repainted in a shade of the visitor's choice), and each group's photos in one column on phones,
// each reserving its own proportions, with its caption under it.

/** The white note: example homes for ideas, not our own jobs. */
export function GalleryNote() {
  return (
    <View style={styles.note}>
      <P size={14} leading={1.625} color={colors.muted}>
        These are example homes for ideas, not our own jobs. Photos of homes we paint are added as each one is handed over, with the owner&apos;s permission.
      </P>
    </View>
  );
}

/** "Gallery sections": a chip per group that scrolls the page to that group's heading. */
export function GalleryNav({ groups = galleryGroups }: { groups?: readonly GalleryGroup[] }) {
  const { scrollTo } = usePage();
  return (
    <View accessibilityLabel="Gallery sections" style={styles.nav}>
      {groups.map((g) => (
        <Pressable key={g.id} accessibilityRole="link" onPress={() => scrollTo(`${g.id}-heading`)} style={styles.chip}>
          <Text style={styles.chipText}>{g.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** One group: its heading (the #<id>-heading anchor) and its photos with captions. */
export function GalleryGrid({ group, first = false }: { group: GalleryGroup; first?: boolean }) {
  return (
    <Anchor id={`${group.id}-heading`} style={first ? undefined : styles.group}>
      <H size={26} leading={1.25}>
        {group.title}
      </H>
      <View style={styles.photos}>
        {group.photos.map((p) => (
          <Reveal key={p.src} style={styles.figure}>
            <Photo image={p} aspectRatio={p.width / p.height} priority="low" />
            <P size={14} leading={20 / 14} color={colors.muted} style={styles.caption}>
              {p.caption}
            </P>
          </Reveal>
        ))}
      </View>
    </Anchor>
  );
}

/** The colour preview above the ideas: the example room, as photographed and repainted, side by side under a divider. */
export function GalleryPreview() {
  return (
    <View>
      <H size={26} leading={1.25}>
        Try a shade on an example <Em>room</Em>
      </H>
      <P size={14} leading={1.625} color={colors.muted} style={styles.previewIntro}>
        Pick a wall colour and drag the divider to compare the room as photographed with its walls repainted.
      </P>
      <BeforeAfter style={styles.previewBody} />
    </View>
  );
}

/** The colour preview (unless `preview` is false), then every group; the first item sits flush under the chips' 48pt gap. */
export function GalleryGroups({ groups = galleryGroups, preview = true }: { groups?: readonly GalleryGroup[]; preview?: boolean }) {
  return (
    <View style={styles.groups}>
      {preview && <GalleryPreview />}
      {groups.map((g, i) => (
        <GalleryGrid key={g.id} group={g} first={!preview && i === 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { borderRadius: 18, borderWidth: 1, borderColor: colors.lineSoft, backgroundColor: colors.paper, paddingHorizontal: 20, paddingVertical: 16 },
  nav: { marginTop: 24, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, justifyContent: "center", borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 16 },
  chipText: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20, color: colors.ink, letterSpacing: -0.07 },
  groups: { marginTop: 48 },
  group: { marginTop: 56 },
  photos: { marginTop: 20 },
  figure: { marginBottom: 16 },
  caption: { marginTop: 8 },
  previewIntro: { marginTop: 8 },
  previewBody: { marginTop: 20 },
});
