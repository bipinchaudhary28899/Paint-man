import { colors } from "~/theme";

// WCAG 2.2 colour contrast (1.4.3 text, 1.4.11 controls) for the app's colours: the relative luminance
// of sRGB colours, alpha laid over what is under it, and the ratio between two colours. The tests use
// it to check every text colour against its background; components use it to pick readable tints.

type RGBA = [number, number, number, number];

/** A colour as red, green, blue (0–255) and alpha (0–1), from #rgb, #rrggbb, #rrggbbaa or rgb()/rgba(); null for anything else. */
export function parseColour(value: string): RGBA | null {
  const v = value.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return [...[...m[1]].map((h) => parseInt(h + h, 16)), 1] as RGBA;
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(v);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), m[2] ? parseInt(m[2], 16) / 255 : 1];
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  if (v === "transparent") return [0, 0, 0, 0];
  return null;
}

const hex = ([r, g, b]: number[]) => `#${[r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`;

/** `colour` laid over the opaque `under` (its alpha blended in), as #rrggbb. */
export function over(colour: string, under: string): string {
  const [r, g, b, a] = parseColour(colour) ?? [0, 0, 0, 1];
  const [R, G, B] = parseColour(under) ?? [255, 255, 255, 1];
  return hex([r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)]);
}

/** The colour `t` of the way from `a` to `b` (0 = a, 1 = b), mixed in sRGB as CSS gradients do. */
export function mix(a: string, b: string, t: number): string {
  const [x, y] = [parseColour(a) ?? [0, 0, 0, 1], parseColour(b) ?? [0, 0, 0, 1]];
  return hex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t));
}

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of an opaque colour (0 black to 1 white). */
export function luminance(colour: string): number {
  const [r, g, b] = parseColour(colour) ?? [0, 0, 0, 1];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** The contrast ratio of a text or mark colour on a background (1 to 21); a translucent foreground is laid over the background first. */
export function contrast(foreground: string, background: string): number {
  const fg = over(foreground, background);
  const [hi, lo] = [luminance(fg), luminance(background)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG's large text: 24pt and up, or 18.66pt and up in bold. */
export const isLargeText = (fontSize: number, bold: boolean) => fontSize >= 24 || (bold && fontSize >= 18.66);

/** The ratio text needs: 4.5:1, or 3:1 for large text (and for controls and marks, WCAG 1.4.11). */
export const requiredContrast = (fontSize: number, bold: boolean) => (isLargeText(fontSize, bold) ? 3 : 4.5);

/**
 * The golden of the gradient words, deepened for text: the brand golden (#e9b949) is a fill colour
 * (1.7:1 on the cream canvas), so letters take it 40% of the way to ink, which keeps the warm gold and
 * reads at 3.3:1 on canvas, cream and white (the large-text minimum is 3:1).
 */
export const goldenText = mix(colors.golden, colors.ink, 0.4);
