import { StyleSheet, Text, type TextProps } from "react-native";

import { colors, fonts } from "~/theme";

// Type for the app, as on the website: DM Serif Display headings with exactly one italic accent
// word (<Accent>), Manrope for everything else.

type HeadingProps = TextProps & { level?: 1 | 2 | 3 };

const headingStyle = { 1: { fontSize: 38, lineHeight: 42 }, 2: { fontSize: 30, lineHeight: 34 }, 3: { fontSize: 22, lineHeight: 27 } } as const;

/** A heading: announced as one by screen readers. Level 1 is the screen's single main heading. */
export function Heading({ level = 2, style, ...props }: HeadingProps) {
  return <Text accessibilityRole="header" style={[styles.heading, headingStyle[level], style]} {...props} />;
}

/** The one italic accent word inside a heading. */
export function Accent({ style, ...props }: TextProps) {
  return <Text style={[styles.accent, style]} {...props} />;
}

/** A title from the website's config with its last word as the accent ("Interior Wall Painting *Services*"). */
export function AccentLast({ text }: { text: string }) {
  const cut = text.trimEnd().lastIndexOf(" ");
  if (cut < 0) return <Accent>{text}</Accent>;
  return (
    <>
      {text.slice(0, cut + 1)}
      <Accent>{text.slice(cut + 1).trimEnd()}</Accent>
    </>
  );
}

/** Body text. */
export function Body({ style, ...props }: TextProps) {
  return <Text style={[styles.body, style]} {...props} />;
}

/** Secondary text. */
export function Muted({ style, ...props }: TextProps) {
  return <Text style={[styles.body, styles.muted, style]} {...props} />;
}

/** Bold text inside a paragraph. */
export function Strong({ style, ...props }: TextProps) {
  return <Text style={[styles.strong, style]} {...props} />;
}

/** A small uppercase label above a heading. */
export function Eyebrow({ style, ...props }: TextProps) {
  return <Text style={[styles.eyebrow, style]} {...props} />;
}

const styles = StyleSheet.create({
  heading: { fontFamily: fonts.serif, color: colors.ink, letterSpacing: -0.4 },
  accent: { fontFamily: fonts.serifItalic, color: colors.terracottaLight },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 25, color: colors.inkSoft },
  muted: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  strong: { fontFamily: fonts.sansBold, color: colors.ink },
  eyebrow: { fontFamily: fonts.sansSemiBold, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: colors.muted },
});
