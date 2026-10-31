import { BAR_STOPS, BAR_TOP, items } from "~/components/site/BottomNav";
import { FIELD_BORDER } from "~/components/ui/Field";
import { contrast, goldenText, isLargeText, luminance, mix, over, parseColour, requiredContrast } from "~/lib/contrast";
import { colors } from "~/theme";

// WCAG contrast for the theme's colours where the app uses them: body text needs 4.5:1, large text
// (24pt, or 18.66pt bold) and controls or marks 3:1. Each row names where the pair appears. The screen
// audit (screens.test.tsx) checks every rendered text against its real background as well; this table
// is the reference for the tokens, including the pairs to avoid.

type Row = [use: string, foreground: string, background: string, need: 4.5 | 3];

const BODY = 4.5;
const LARGE = 3;

/** The bar under the bottom nav's labels: the label well (black at 16%) over the bar's charcoal at the top and the bottom. */
const barTop = over(BAR_TOP, colors.canvas);
const barBottom = over(`rgba(27, 28, 25, ${BAR_STOPS[2].opacity})`, colors.canvas);
const well = (bar: string) => over("rgba(0, 0, 0, 0.16)", bar);
/** A sticker or pill (cream at 90%) over the darkest photo. */
const stickerOnDark = over("rgba(248, 245, 239, 0.9)", "#000000");

const rows: Row[] = [
  // body text on the page, cards and panels
  ...(["canvas", "paper", "sand", "creamWash", "sageWash", "roseWash"] as const).flatMap((bg): Row[] => [
    [`ink text on ${bg}`, colors.ink, colors[bg], BODY],
    [`ink-soft text on ${bg}`, colors.inkSoft, colors[bg], BODY],
    [`muted text on ${bg}`, colors.muted, colors[bg], BODY],
  ]),
  ["muted-2 captions, counters and placeholders on canvas", colors.muted2, colors.canvas, BODY],
  ["muted-2 placeholders in a white field", colors.muted2, colors.paper, BODY],
  ["muted-2 on the cream wash (chalk)", colors.muted2, colors.creamWash, BODY],
  ["terracotta eyebrows on canvas", colors.terracotta, colors.canvas, BODY],
  ["terracotta chosen option in a sheet (white)", colors.terracotta, colors.paper, BODY],
  ["danger field errors on canvas", colors.danger, colors.canvas, BODY],
  ["danger field errors in a white card", colors.danger, colors.paper, BODY],
  ["ink-soft principle text on the golden card", colors.inkSoft, colors.golden, BODY],
  ...(["golden", "sageWash", "roseWash", "peachWash", "creamWash"] as const).map((bg): Row => [`contact row label (ink 75%) on ${bg}`, "rgba(36, 37, 34, 0.75)", colors[bg], BODY]),
  // on ink: the footer, the ink cards
  ["on-ink text on ink", colors.onInk, colors.ink, BODY],
  ["on-ink muted text on ink (footer)", colors.onInkMuted, colors.ink, BODY],
  ["on-ink 75% text on the ink card", "rgba(248, 245, 239, 0.75)", colors.ink, BODY],
  ["golden labels and localities on ink", colors.golden, colors.ink, BODY],
  // buttons and stickers
  ["primary button: cream on terracotta", colors.onInk, colors.terracotta, BODY],
  ["primary button pressed: cream on terracotta-hover", colors.onInk, colors.terracottaHover, BODY],
  ["dark button: cream on ink", colors.onInk, colors.ink, BODY],
  ["dark button pressed: cream on ink-soft", colors.onInk, colors.inkSoft, BODY],
  ["secondary button: ink on canvas", colors.ink, colors.canvas, BODY],
  ["interior sticker: cream on terracotta", colors.onInk, colors.terracotta, BODY],
  ["exterior and small-jobs stickers: cream on deep sage", colors.onInk, colors.sageDeep, BODY],
  ["rental sticker: ink on golden", colors.ink, colors.golden, BODY],
  ["sticker and pill: ink on 90% cream over a black photo", colors.ink, stickerOnDark, BODY],
  // the bottom nav
  ["bottom nav label (cream 92%) in its well, bar top", "rgba(248, 245, 239, 0.92)", well(barTop), BODY],
  ["bottom nav label (cream 92%) in its well, bar bottom", "rgba(248, 245, 239, 0.92)", well(barBottom), BODY],
  ["bottom nav active label (cream 70%) on the bar top", "rgba(248, 245, 239, 0.7)", barTop, BODY],
  // large text: the italic accent word in headings (24pt and up), the gradient words
  ["italic accent (terracotta-light) in headings on canvas", colors.terracottaLight, colors.canvas, LARGE],
  ["italic accent in headings on white cards", colors.terracottaLight, colors.paper, LARGE],
  ["italic accent in headings on the cream wash", colors.terracottaLight, colors.creamWash, LARGE],
  ["gradient words' golden (text golden) on canvas", goldenText, colors.canvas, LARGE],
  ["gradient words' golden on the cream wash", goldenText, colors.creamWash, LARGE],
  ["gradient words' sage on canvas", colors.sage, colors.canvas, LARGE],
  // controls and marks (WCAG 1.4.11)
  ["field edge on white", FIELD_BORDER, colors.paper, LARGE],
  ["field edge against the canvas", FIELD_BORDER, colors.canvas, LARGE],
  ...items.map((i): Row => [`bottom nav ${i.label} dab icon on its colour`, i.on, i.hue, LARGE]),
  ["bottom nav dab (cream, Estimate) against the bar", colors.canvas, barTop, LARGE],
];

/** Pairs the theme offers that read under their minimum: never use them for text. */
const avoid: [use: string, foreground: string, background: string, need: number][] = [
  ["muted-2 text on sand", colors.muted2, colors.sand, BODY],
  ["terracotta text on sand", colors.terracotta, colors.sand, BODY],
  ["danger text on sand (peach wash)", colors.danger, colors.sand, BODY],
  ["deep sage text on sand", colors.sageDeep, colors.sand, BODY],
  ["muted text on golden", colors.muted, colors.golden, BODY],
  ["ink text on deep sage", colors.ink, colors.sageDeep, BODY],
  ["italic accent (terracotta-light) on sand", colors.terracottaLight, colors.sand, LARGE],
  ["italic accent on the rose wash", colors.terracottaLight, colors.roseWash, LARGE],
  ["the brand golden as text on canvas", colors.golden, colors.canvas, LARGE],
  ["line-strong (30% ink) as a field edge", colors.lineStrong, colors.paper, LARGE],
];

describe("contrast", () => {
  it.each(rows)("%s reads at its minimum", (_use, fg, bg, need) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(need);
  });

  it.each(avoid)("%s falls short, so the app never uses it", (_use, fg, bg, need) => {
    expect(contrast(fg, bg)).toBeLessThan(need);
  });
});

describe("the WCAG arithmetic", () => {
  it("measures black on white at 21:1 and a colour on itself at 1:1", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#fff", "#000")).toBeCloseTo(21, 5);
    expect(contrast(colors.terracotta, colors.terracotta)).toBe(1);
    expect(luminance("#ffffff")).toBeCloseTo(1, 5);
    expect(luminance("#000000")).toBe(0);
  });

  it("lays a translucent colour over what is under it", () => {
    expect(over("rgba(0, 0, 0, 0.5)", "#ffffff")).toBe("#808080");
    expect(over("#a8532f", "#ffffff")).toBe("#a8532f");
    expect(over("rgba(0,0,0,0)", "#123456")).toBe("#123456");
    expect(over("#00000080", "#ffffff")).toBe("#7f7f7f");
    // something it cannot read falls back to black over white
    expect(over("tomato", "papayawhip")).toBe("#000000");
  });

  it("reads hex, rgb() and rgba() and nothing else", () => {
    expect(parseColour("#abc")).toEqual([170, 187, 204, 1]);
    expect(parseColour("rgb(1, 2, 3)")).toEqual([1, 2, 3, 1]);
    expect(parseColour("RGBA(1,2,3,0.5)")).toEqual([1, 2, 3, 0.5]);
    expect(parseColour("transparent")).toEqual([0, 0, 0, 0]);
    expect(parseColour("red")).toBeNull();
  });

  it("mixes in sRGB and knows large text", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#000000", "nonsense", 1)).toBe("#000000");
    expect(goldenText).toBe(mix(colors.golden, colors.ink, 0.4));
    expect(isLargeText(24, false)).toBe(true);
    expect(isLargeText(19, true)).toBe(true);
    expect(isLargeText(19, false)).toBe(false);
    expect(requiredContrast(16, false)).toBe(4.5);
    expect(requiredContrast(30, false)).toBe(3);
  });
});
