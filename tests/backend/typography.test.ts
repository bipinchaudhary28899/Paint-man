import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Type and text colour rules for the website, read from the source: no text under 11px (iOS's
// legibility floor, which the app's screen audit holds too), and every text colour token readable on
// the page (WCAG AA: 4.5:1 for text, 3:1 for the large headline accents).

const root = join(__dirname, "../../src");
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx|ts|css)$/.test(name) ? [path] : [];
  });
const sources = files(root).map((path) => ({ path: path.slice(root.length + 1), text: readFileSync(path, "utf8") }));
const css = readFileSync(join(root, "app/globals.css"), "utf8");

const MIN_PX = 11;

describe("type sizes", () => {
  it("never set text under 11px, in a Tailwind class or a stylesheet", () => {
    const small: string[] = [];
    for (const { path, text } of sources) {
      for (const m of text.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) if (Number(m[1]) < MIN_PX) small.push(`${path}: ${m[0]}`);
      for (const m of text.matchAll(/font-size:\s*(\d*\.?\d+)(px|rem)/g)) {
        const px = Number(m[1]) * (m[2] === "rem" ? 16 : 1);
        if (px < MIN_PX) small.push(`${path}: ${m[0]}`);
      }
    }
    expect(small).toEqual([]);
  });
});

/** The light theme's raw colour tokens (:root), e.g. token("muted") = "#5f5a52". */
function token(name: string): string {
  // the :root block at the start of a line (the file's header comment mentions :root too)
  const block = css.slice(css.indexOf("\n:root"), css.indexOf("\n[data-theme=\"night\"]"));
  const m = new RegExp(`--pm-${name}:\\s*(#[0-9a-f]{6})`, "i").exec(block);
  if (!m) throw new Error(`no --pm-${name}`);
  return m[1];
}
const luminance = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe("text colours", () => {
  it("keep 4.5:1 for every body text token on the page and on white cards", () => {
    for (const text of ["ink", "ink-soft", "muted", "muted-2", "terracotta", "sage-deep", "fern"]) {
      for (const ground of ["canvas", "paper"]) expect(contrast(token(text), token(ground)), `${text} on ${ground}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keep 3:1 for the large headline accents: the italic accent and every stop of the gradient words", () => {
    for (const accent of ["terracotta-light", "golden-text", "sage"]) expect(contrast(token(accent), token("canvas")), accent).toBeGreaterThanOrEqual(3);
    for (const name of ["text-gradient", "text-gradient-warm"]) {
      const rule = new RegExp(`\\.${name} \\{[^}]*linear-gradient\\(([^)]*)\\)`).exec(css)?.[1] ?? "";
      expect(rule).not.toMatch(/--pm-golden\)/);
      for (const v of rule.matchAll(/var\(--pm-([a-z-]+)\)/g)) expect(contrast(token(v[1]), token("canvas")), `${name} ${v[1]}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("keep the cream text on the action and sage colours at 4.5:1", () => {
    for (const ground of ["terracotta", "sage-deep", "ink"]) expect(contrast(token("on-ink"), token(ground)), `on-ink on ${ground}`).toBeGreaterThanOrEqual(4.5);
  });
});
