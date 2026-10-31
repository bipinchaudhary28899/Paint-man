// The accessibility audit the screen test runs over a rendered screen: what a screen reader meets,
// read from the host tree the way VoiceOver and TalkBack would (hidden subtrees skipped).
// It names controls with Testing Library's own accessibility helpers (the ones its *ByRole queries
// use), so a name here is the name getByRole matches.
import * as a11y from "@testing-library/react-native/dist/helpers/accessibility";
import { StyleSheet, type Insets } from "react-native";
import type { TestInstance } from "test-renderer";

import { contrast, over, parseColour, requiredContrast } from "~/lib/contrast";

export const nameOf = (i: TestInstance) => (a11y.computeAccessibleName(i) ?? "").replace(/\s+/g, " ").trim();
export const roleOf = (i: TestInstance) => a11y.getRole(i);

/** Every host element a screen reader can reach, in reading (tree) order. */
export function reachable(root: TestInstance): TestInstance[] {
  const cache = new WeakMap<TestInstance, boolean>();
  return root.queryAll((i) => i.type !== "" && !a11y.isHiddenFromAccessibility(i, { cache }), { includeSelf: true });
}

/** A control: a host view or text that answers a tap (Pressable and pressable Text give their host an onClick). */
export const isPressable = (i: TestInstance) => typeof i.props.onClick === "function";

/** A link inside a line of text (a pressable Text nested in a Text): sized by the paragraph, exempt from target size. */
export const isInlineLink = (i: TestInstance) => i.type === "RCTVirtualText" || (i.type === "Text" && i.parent?.type === "Text");

/** A raster picture (React Native's Image, expo-image's native view) or anything announced as an image. */
export const isImage = (i: TestInstance) => /(^|_)(Image|ExpoImage)$/.test(i.type) || roleOf(i) === "image";

/**
 * The accessible view this element sits inside, if any: VoiceOver and TalkBack read an accessible view
 * (a Pressable, an `accessible` group) as one element, so nothing inside it is reached on its own. A
 * link inside a line of text is the exception: both expose those as links of their own.
 */
export function enclosingElement(i: TestInstance): TestInstance | undefined {
  if (isInlineLink(i)) return undefined;
  for (let p = i.parent; p; p = p.parent) if (p.type === "View" && p.props.accessible === true) return p;
  return undefined;
}

/** A header a screen reader announces as one (not swallowed by an accessible view around it). */
export const isHeader = (i: TestInstance) => roleOf(i) === "header" && !enclosingElement(i);

const style = (i: TestInstance) => StyleSheet.flatten(i.props.style) ?? {};

export type Finding = string;

/** Controls without a role or a name, and pictures with neither a label nor hidden. */
export function controlAndImageFindings(nodes: TestInstance[]): Finding[] {
  const out: Finding[] = [];
  for (const n of nodes) {
    if (isPressable(n)) {
      const role = roleOf(n);
      const name = nameOf(n);
      if (role === "none" || role === "text") out.push(`control without a role: "${name}"`);
      if (!name) out.push(`control without a name (role ${role})`);
      const outer = enclosingElement(n);
      if (outer) out.push(`control "${name}" sits inside "${nameOf(outer)}", so a screen reader cannot reach it`);
    }
    // a picture inside a link or button is read as that control's name
    if (isImage(n) && !nameOf(n) && !enclosingElement(n)) out.push(`picture without a label and not hidden (${n.type})`);
  }
  return out;
}

/** The header outline: the page's h1 is the first header and appears once; every header has words. */
export function headerFindings(nodes: TestInstance[], h1: RegExp): Finding[] {
  const headers = nodes.filter(isHeader);
  if (headers.length === 0) return ["no header on the screen"];
  const out: Finding[] = [];
  if (!h1.test(nameOf(headers[0]))) out.push(`first header is "${nameOf(headers[0])}", not the page's h1 ${h1}`);
  if (headers.filter((h) => h1.test(nameOf(h))).length !== 1) out.push(`the h1 ${h1} is not exactly one header`);
  for (const h of headers) if (!nameOf(h)) out.push("a header without words");
  return out;
}

const MIN_TARGET = 44;
const slop = (hitSlop: number | Insets | undefined, a: keyof Insets, b: keyof Insets) =>
  typeof hitSlop === "number" ? hitSlop * 2 : (hitSlop?.[a] ?? 0) + (hitSlop?.[b] ?? 0);
const num = (v: unknown) => (typeof v === "number" ? v : undefined);

/**
 * The tap area of a control, where its style fixes it: its height (or min-height) and width plus any
 * hitSlop; a lone pressable Text is its line height and padding. Undefined when the content sizes it
 * (cards, tiles, rows), which the screens give room by design.
 */
export function tapSize(i: TestInstance): { height?: number; width?: number } {
  const s = style(i);
  const pad = (a: unknown, b: unknown, both: unknown, all: unknown) => (num(a) ?? num(both) ?? num(all) ?? 0) + (num(b) ?? num(both) ?? num(all) ?? 0);
  const line = (t: TestInstance) => num(style(t).lineHeight) ?? (num(style(t).fontSize) ?? 14) * 1.2;
  const padY = pad(s.paddingTop, s.paddingBottom, s.paddingVertical, s.padding) + 2 * (num(s.borderWidth) ?? 0);
  let height = num(s.height) ?? (num(s.minHeight) || undefined);
  // a lone pressable Text, or a pressable holding only text: one line of it plus the padding
  const kids = i.children.filter((c): c is TestInstance => typeof c !== "string");
  if (height === undefined && i.type === "Text") height = line(i) + padY;
  else if (height === undefined && kids.length > 0 && kids.every((k) => k.type === "Text")) height = Math.max(...kids.map(line)) + padY;
  const width = num(s.width) ?? (num(s.minWidth) || undefined);
  return {
    height: height === undefined ? undefined : height + slop(i.props.hitSlop, "top", "bottom"),
    width: width === undefined ? undefined : width + slop(i.props.hitSlop, "left", "right"),
  };
}

/** Controls whose fixed tap area is under 44pt (inline links in a paragraph are exempt, as in WCAG 2.5.8). */
export function targetFindings(nodes: TestInstance[]): Finding[] {
  const out: Finding[] = [];
  for (const n of nodes) {
    if (!isPressable(n) || isInlineLink(n)) continue;
    const { height, width } = tapSize(n);
    if (height !== undefined && height < MIN_TARGET) out.push(`"${nameOf(n)}" is ${Math.round(height)}pt tall`);
    if (width !== undefined && width < MIN_TARGET) out.push(`"${nameOf(n)}" is ${Math.round(width)}pt wide`);
  }
  return out;
}

/** Text the phone's larger text settings cannot reach: scaling turned off, or capped below 1.3×. */
export function scalingFindings(nodes: TestInstance[]): Finding[] {
  const out: Finding[] = [];
  for (const n of nodes) {
    if (n.type !== "Text") continue;
    const cap = n.props.maxFontSizeMultiplier as number | undefined;
    if (n.props.allowFontScaling === false) out.push(`"${nameOf(n)}" does not scale with the text size setting`);
    else if (cap !== undefined && cap !== null && cap > 0 && cap < 1.3) out.push(`"${nameOf(n)}" stops growing at ${cap}x`);
  }
  return out;
}

/** The style value a text node shows, inherited from the Text around it when it sets none itself. */
function inherited<T>(i: TestInstance, key: string): T | undefined {
  for (let n: TestInstance | null = i; n && (n.type === "Text" || n.type === "RCTVirtualText"); n = n.parent) {
    const v = style(n)[key as keyof ReturnType<typeof style>];
    if (v !== undefined) return v as T;
  }
  return undefined;
}

/** Backgrounds drawn by a graphic rather than a view's colour, by the testID of the view the graphic fills (its lightest point). */
export type Drawn = Record<string, string>;

/**
 * What a text node is drawn on: the background colours of the views around it, nearest first, laid over
 * one another until one is opaque (or a view whose background a graphic draws, from `drawn`); the
 * page's cream canvas when none is.
 */
export function backgroundOf(i: TestInstance, page: string, drawn: Drawn = {}): string {
  const layers: string[] = [];
  for (let p = i.parent; p; p = p.parent) {
    if (p.type === "Text" || p.type === "RCTVirtualText") continue;
    const graphic = drawn[p.props.testID as string];
    if (graphic) {
      layers.push(graphic);
      break;
    }
    const bg = style(p).backgroundColor;
    if (typeof bg !== "string") continue;
    const parsed = parseColour(bg);
    if (!parsed || parsed[3] === 0) continue;
    layers.push(bg);
    if (parsed[3] === 1) break;
  }
  return layers.reduceRight((under, layer) => over(layer, under), page);
}

/** Text whose colour does not stand out enough from what it is drawn on (4.5:1, or 3:1 for large text). */
export function contrastFindings(root: TestInstance, page: string, drawn: Drawn = {}): Finding[] {
  const out = new Set<Finding>();
  for (const n of root.queryAll((i) => i.type === "Text" || i.type === "RCTVirtualText")) {
    const own = n.children.filter((c): c is string => typeof c === "string").join("").trim();
    if (!own) continue;
    const colour = inherited<string>(n, "color") ?? "#000000";
    if (!parseColour(colour)) continue;
    const size = inherited<number>(n, "fontSize") ?? 14;
    const family = inherited<string>(n, "fontFamily") ?? "";
    const weight = String(inherited<string>(n, "fontWeight") ?? "400");
    const bold = /Bold/.test(family) || Number(weight) >= 700 || weight === "bold";
    const bg = backgroundOf(n, page, drawn);
    const need = requiredContrast(size, bold);
    // an outlined word (the website's .text-outline-ink): its fill matches the page and the copies of it
    // drawn around it in ink are what reads, so the best of the word's copies counts
    const copies = (n.parent?.children ?? []).filter((c): c is TestInstance => typeof c !== "string" && c.type === n.type && c.children.join("").trim() === own);
    const ratio = Math.max(...copies.map((c) => contrast(inherited<string>(c, "color") ?? colour, bg)), contrast(colour, bg));
    if (ratio < need) out.add(`"${own.slice(0, 40)}" ${colour} on ${bg} is ${ratio.toFixed(2)}:1 at ${size}pt (needs ${need}:1)`);
  }
  return [...out];
}
