// The website's design tokens (src/app/globals.css, :root and @theme) for React Native, so screens
// can copy the website's phone layout value for value. Names follow the Tailwind utilities
// (bg-canvas, text-muted, border-line-soft, rounded-pm-lg...).

export const colors = {
  canvas: "#f8f5ef",
  paper: "#ffffff",
  sand: "#e8d7c5",
  chalk: "#f4f1ea",
  /** cream-wash / butter / brand-50 */
  creamWash: "#f4f1ea",
  /** peach-wash / brand-100 */
  peachWash: "#e8d7c5",
  sageWash: "#e4e8df",
  roseWash: "#f3e1dc",
  line: "rgba(36, 37, 34, 0.12)",
  lineSoft: "rgba(36, 37, 34, 0.1)",
  lineStrong: "rgba(36, 37, 34, 0.3)",
  ink: "#242522",
  inkSoft: "#3e3a34",
  muted: "#5f5a52",
  muted2: "#6e6862",
  onInk: "#f8f5ef",
  onInkMuted: "#d8d3ca",
  terracotta: "#a8532f",
  terracottaHover: "#8f4526",
  terracottaLight: "#c76b4a",
  golden: "#e9b949",
  sage: "#71856a",
  sageDeep: "#5b6e55",
  onSage: "#f8f5ef",
  blush: "#ebc4be",
  fern: "#4f6b4a",
  danger: "#b5473a",
  shadowInk: "rgba(36, 37, 34, 0.5)",
} as const;

/** Font family names as loaded in src/app/_layout.tsx (static Manrope weights stand in for the web's variable font). */
export const fonts = {
  serif: "DMSerifDisplay_400Regular",
  serifItalic: "DMSerifDisplay_400Regular_Italic",
  sans: "Manrope_400Regular",
  sansMedium: "Manrope_500Medium",
  sansSemiBold: "Manrope_600SemiBold",
  sansBold: "Manrope_700Bold",
  sansExtraBold: "Manrope_800ExtraBold",
} as const;

/** rounded-pm-* */
export const radii = { sm: 12, md: 14, lg: 20, xl: 24, xxl: 28, pill: 999 } as const;

/** .container-page side padding on phones (1.25rem). */
export const gutter = 20;

/** The phone header: min-h-[72px] plus its hairline. */
export const HEADER_HEIGHT = 73;

/** The footer's bottom padding on phones (pb-[120px]), which keeps its last line clear of the bottom nav. */
export const NAV_CLEARANCE = 120;

/** Tailwind's letter-spacing in em, as points for a font size. */
export const em = (value: number, fontSize: number) => value * fontSize;
