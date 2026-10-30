// The website's design tokens (src/app/globals.css, :root) for React Native: cream canvas, ink,
// terracotta action, golden, sage and sand; DM Serif Display for headings, Manrope for text.
// Hairline borders and soft radii on cards; standalone photos keep sharp corners.

export const colors = {
  canvas: "#f8f5ef",
  paper: "#ffffff",
  sand: "#e8d7c5",
  chalk: "#f4f1ea",
  line: "rgba(36, 37, 34, 0.12)",
  lineSoft: "rgba(36, 37, 34, 0.1)",
  lineStrong: "rgba(36, 37, 34, 0.3)",
  ink: "#242522",
  inkSoft: "#3e3a34",
  muted: "#5f5a52",
  onInk: "#f8f5ef",
  onInkMuted: "#d8d3ca",
  terracotta: "#a8532f",
  terracottaHover: "#8f4526",
  terracottaLight: "#c76b4a",
  golden: "#e9b949",
  sage: "#71856a",
  sageDeep: "#5b6e55",
  danger: "#b5473a",
} as const;

/** Font family names as loaded in src/app/_layout.tsx (static Manrope weights stand in for the web's variable font). */
export const fonts = {
  serif: "DMSerifDisplay_400Regular",
  serifItalic: "DMSerifDisplay_400Regular_Italic",
  sans: "Manrope_400Regular",
  sansMedium: "Manrope_500Medium",
  sansSemiBold: "Manrope_600SemiBold",
  sansBold: "Manrope_700Bold",
} as const;

export const radii = { sm: 14, md: 20, lg: 24, xl: 28, pill: 999 } as const;

/** Side gutter of every screen. */
export const gutter = 20;

/** Space the floating tab bar takes at the bottom of a screen (bar height + its margin + breathing room). */
export const TAB_BAR_SPACE = 112;
