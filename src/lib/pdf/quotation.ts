import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, setCharacterSpacing, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { promises, site } from "@/config/site";
import { formatDate, formatMobile, placeLine, QUOTATION_STATUS_LABELS, quotationFilename } from "@/lib/account";
import { formatPaise } from "@/lib/money";
import type { QuotationDocument } from "@/lib/projects/repo";

// The branded quotation PDF a customer downloads from the project tracker (and the app): the
// Paint Saathi logo, the customer and address, the itemised lines (wrapping, and breaking across
// pages for a long quote), the totals, notes and payment terms, the promises line and a footer on
// every page. Built with pdf-lib on the server; the brand fonts (DM Serif Display for headings,
// Manrope for text, both SIL OFL, licences beside them in ./fonts) are embedded and subset.

const FONT_DIR = join(process.cwd(), "src", "lib", "pdf", "fonts");
const LOGO_FILE = join(process.cwd(), "public", "brand", "01-horizontal", "paintsaathi-horizontal-color@2x.png");

export { quotationFilename };

/** The promises line printed above the footer: no advance, nothing added without written approval. */
export const PROMISE_LINE = `${promises[0].title}. Nothing is added without your written approval.`;

const RUPEE = 0x20b9;

/** "₹" when the font has the rupee sign, else "Rs. " (never a missing-glyph box). */
export const rupeePrefix = (charset: ReadonlySet<number>) => (charset.has(RUPEE) ? "₹" : "Rs. ");

/**
 * Text the font can draw: tabs become spaces and every character the font lacks (another script,
 * an emoji) becomes "?", so nothing prints as an empty box. Newlines are kept for wrapping.
 */
export function pdfSafeText(text: string, charset: ReadonlySet<number>): string {
  let out = "";
  for (const ch of text.replace(/\r\n?/g, "\n").replace(/\t/g, " ")) {
    const code = ch.codePointAt(0)!;
    out += ch === "\n" || charset.has(code) ? ch : "?";
  }
  return out;
}

type Assets = { serif: Uint8Array; regular: Uint8Array; bold: Uint8Array; logo: Uint8Array };
let assets: Promise<Assets> | undefined;

/** The fonts and logo, read once per server instance (and read again if a read failed). */
function loadAssets(): Promise<Assets> {
  assets ??= Promise.all([
    readFile(join(FONT_DIR, "DMSerifDisplay-Regular.ttf")),
    readFile(join(FONT_DIR, "Manrope-Regular.ttf")),
    readFile(join(FONT_DIR, "Manrope-Bold.ttf")),
    readFile(LOGO_FILE),
  ])
    .then(([serif, regular, bold, logo]) => ({ serif, regular, bold, logo }))
    .catch((err) => {
      assets = undefined;
      throw err;
    });
  return assets;
}

// ---------- Layout ----------

const PAGE: [number, number] = [595.28, 841.89]; // A4 in points
const [W, H] = PAGE;
const MARGIN = 48;
const CONTENT = W - MARGIN * 2;
/** The lowest a line of content may sit: the footer lives below it. */
const BOTTOM = 72;

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const INK = hex("#242522");
const MUTED = hex("#5f5a52");
const TERRACOTTA = hex("#a8532f");
const SAGE_DEEP = hex("#5b6e55");
const SAND = hex("#e8d7c5");
const CHALK = hex("#f4f1ea");
const LINE = hex("#dcd8d0");

type Fonts = { serif: PDFFont; regular: PDFFont; bold: PDFFont };
type Run = { text: string; font: PDFFont; size: number; color: ReturnType<typeof rgb>; lh: number };

/** Greedy word wrap to `width`; a word longer than the line is broken by characters. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/ +/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      // a word wider than the line: as many characters per line as fit
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let n = rest.length - 1;
        while (n > 1 && font.widthOfTextAtSize(rest.slice(0, n), size) > width) n--;
        lines.push(rest.slice(0, n));
        rest = rest.slice(n);
      }
      line = rest;
    }
    lines.push(line);
  }
  // no blank lines at the end (a trailing newline in a note)
  while (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

const COLUMNS = [
  { key: "item", label: "Item", width: 245, align: "left" },
  { key: "area", label: "Area", width: 66, align: "right" },
  { key: "coats", label: "Coats", width: 44, align: "right" },
  { key: "rate", label: "Rate", width: 66, align: "right" },
  { key: "amount", label: "Amount", width: CONTENT - 245 - 66 - 44 - 66, align: "right" },
] as const;
const CELL_PAD = 6;
const ROW_PAD = 7;
const HEADER_ROW = 22;

class Writer {
  pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;
  private inTable = false;
  private rowsOnPage = 0;

  constructor(
    private pdf: PDFDocument,
    private f: Fonts,
    private logo: PDFImage,
    private charsets: Map<PDFFont, Set<number>>,
    private continuation: string,
  ) {}

  safe = (text: string, font: PDFFont) => pdfSafeText(text, this.charsets.get(font)!);

  text(text: string, x: number, y: number, font: PDFFont, size: number, color = INK, align: "left" | "right" = "left") {
    const t = this.safe(text, font);
    const dx = align === "right" ? font.widthOfTextAtSize(t, size) : 0;
    this.page.drawText(t, { x: x - dx, y, size, font, color });
  }

  /** A small capitals label, letter-spaced. */
  label(text: string, x: number, y: number, color = TERRACOTTA) {
    this.page.pushOperators(setCharacterSpacing(0.9));
    this.page.drawText(this.safe(text.toUpperCase(), this.f.bold), { x, y, size: 7.5, font: this.f.bold, color });
    this.page.pushOperators(setCharacterSpacing(0));
  }

  rule(y: number, x1 = MARGIN, x2 = W - MARGIN, color = LINE, thickness = 0.75) {
    this.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
  }

  addPage(first = false) {
    this.page = this.pdf.addPage(PAGE);
    this.pages.push(this.page);
    this.rowsOnPage = 0;
    this.y = H - MARGIN;
    if (first) return;
    // a later page: the logo small, and which document this continues
    const lw = 92;
    const lh = (lw * this.logo.height) / this.logo.width;
    this.page.drawImage(this.logo, { x: MARGIN, y: this.y - lh, width: lw, height: lh });
    this.text(this.continuation, W - MARGIN, this.y - lh + 6, this.f.regular, 8.5, MUTED, "right");
    this.y -= lh + 14;
    this.rule(this.y);
    this.y -= 18;
    if (this.inTable) this.tableHeader();
  }

  /** Room for `height` more points on this page, else a new page. */
  ensure(height: number) {
    if (this.y - height < BOTTOM) this.addPage();
  }

  tableHeader() {
    this.page.drawRectangle({ x: MARGIN, y: this.y - HEADER_ROW, width: CONTENT, height: HEADER_ROW, color: SAND });
    let x = MARGIN;
    for (const c of COLUMNS) {
      const tx = c.align === "right" ? x + c.width - CELL_PAD : x + CELL_PAD;
      this.text(c.label, tx, this.y - 14.5, this.f.bold, 8.5, INK, c.align);
      x += c.width;
    }
    this.y -= HEADER_ROW;
  }

  beginTable() {
    this.inTable = true;
    this.ensure(HEADER_ROW + 40);
    this.tableHeader();
  }

  endTable() {
    this.inTable = false;
  }

  /** The room a row could have at the top of a fresh page (below the continuation header and table header). */
  private freshRoom() {
    return H - MARGIN - 70 - HEADER_ROW - BOTTOM;
  }

  /**
   * One line of the quotation: the item and description wrap in the first column, the numbers sit on
   * its first line. A row that fits on a fresh page is never split; a longer one continues on the next.
   */
  row(runs: Run[], cells: string[]) {
    const height = runs.reduce((s, r) => s + r.lh, 0) + ROW_PAD * 2;
    if (this.y - height < BOTTOM && height <= this.freshRoom() && this.rowsOnPage > 0) this.addPage();
    let i = 0;
    let first = true;
    while (i < runs.length) {
      const room = this.y - BOTTOM - ROW_PAD * 2;
      let n = 0;
      let h = 0;
      while (i + n < runs.length && h + runs[i + n].lh <= room) {
        h += runs[i + n].lh;
        n++;
      }
      if (n === 0) {
        this.addPage();
        continue;
      }
      let ty = this.y - ROW_PAD;
      for (const r of runs.slice(i, i + n)) {
        ty -= r.lh;
        this.text(r.text, MARGIN + CELL_PAD, ty + (r.lh - r.size) / 2 + 1.5, r.font, r.size, r.color);
      }
      if (first) {
        const baseline = this.y - ROW_PAD - runs[0].lh + (runs[0].lh - runs[0].size) / 2 + 1.5;
        let x = MARGIN + COLUMNS[0].width;
        COLUMNS.slice(1).forEach((c, k) => {
          const last = k === COLUMNS.length - 2;
          this.text(cells[k], x + c.width - CELL_PAD, baseline, last ? this.f.bold : this.f.regular, 9.5, INK, "right");
          x += c.width;
        });
      }
      this.y -= h + ROW_PAD * 2;
      this.rule(this.y);
      this.rowsOnPage++;
      i += n;
      first = false;
      if (i < runs.length) this.addPage();
    }
  }

  /** A heading and a paragraph that may run over several pages (notes, payment terms). */
  section(heading: string, body: string) {
    const lines = wrap(this.safe(body, this.f.regular), this.f.regular, 9.5, CONTENT);
    this.ensure(22 + 14 * Math.min(lines.length, 3));
    this.text(heading, MARGIN, this.y - 13, this.f.serif, 13);
    this.y -= 22;
    for (const line of lines) {
      this.ensure(14);
      this.text(line, MARGIN, this.y - 10, this.f.regular, 9.5, MUTED);
      this.y -= 14;
    }
    this.y -= 12;
  }

  footers(lines: string) {
    const total = this.pages.length;
    this.pages.forEach((page, i) => {
      this.page = page;
      this.rule(BOTTOM - 26);
      this.text(lines, MARGIN, BOTTOM - 40, this.f.regular, 7.5, MUTED);
      this.text(`Page ${i + 1} of ${total}`, W - MARGIN, BOTTOM - 40, this.f.regular, 7.5, MUTED, "right");
    });
  }
}

const grouped = new Intl.NumberFormat("en-IN");

export type QuotationPdfOptions = { /** The date printed when the quotation has not been sent (a draft preview). */ now?: Date };

/** The quotation as a PDF file: A4, every page with the footer and its page number. */
export async function renderQuotationPdf({ project, quotation: q }: QuotationDocument, opts: QuotationPdfOptions = {}): Promise<Uint8Array> {
  const files = await loadAssets();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const f: Fonts = {
    serif: await pdf.embedFont(files.serif, { subset: true }),
    regular: await pdf.embedFont(files.regular, { subset: true }),
    bold: await pdf.embedFont(files.bold, { subset: true }),
  };
  const charsets = new Map(Object.values(f).map((font) => [font, new Set(font.getCharacterSet())]));
  const logo = await pdf.embedPng(files.logo);
  const rs = rupeePrefix(charsets.get(f.bold)!);
  const money = (paise: number) => formatPaise(paise, rs);

  const title = `Quotation v${q.version}`;
  pdf.setTitle(`${title} – ${site.name}`);
  pdf.setAuthor(site.name);
  pdf.setSubject(`${site.name} painting quotation, version ${q.version}`);
  pdf.setCreator(site.name);
  pdf.setProducer(site.name);
  pdf.setLanguage("en-IN");
  const issued = q.sentAt ?? (opts.now ?? new Date()).toISOString();
  pdf.setCreationDate(new Date(issued));

  const w = new Writer(pdf, f, logo, charsets, `${title} (continued)`);
  w.addPage(true);

  // ----- Heading: logo left, "Quotation" and its dates right -----
  const lw = 150;
  const lh = (lw * logo.height) / logo.width;
  w.page.drawImage(logo, { x: MARGIN, y: w.y - lh, width: lw, height: lh });
  w.text("Quotation", W - MARGIN, w.y - 24, f.serif, 28, INK, "right");
  const meta = [`Version ${q.version}`, `Date ${formatDate(issued)}`, ...(q.validUntil ? [`Valid until ${formatDate(q.validUntil)}`] : [])];
  let my = w.y - 42;
  for (const m of meta) {
    w.text(m, W - MARGIN, my, f.regular, 9, MUTED, "right");
    my -= 13;
  }
  if (q.status !== "sent") {
    const status =
      q.status === "approved" && q.approvedAt
        ? `Approved on ${formatDate(q.approvedAt)}`
        : q.status === "draft"
          ? "Draft: not sent to the customer"
          : QUOTATION_STATUS_LABELS[q.status];
    w.text(status, W - MARGIN, my, f.bold, 9, q.status === "approved" ? SAGE_DEEP : TERRACOTTA, "right");
    my -= 13;
  }
  w.y = Math.min(w.y - lh, my) - 14;
  w.rule(w.y);
  w.y -= 20;

  // ----- Customer and project -----
  const colW = CONTENT / 2 - 12;
  const right = MARGIN + CONTENT / 2 + 12;
  const top = w.y;
  w.label("Prepared for", MARGIN, top);
  let ly = top - 16;
  w.text(project.name, MARGIN, ly, f.bold, 11);
  ly -= 14;
  w.text(formatMobile(project.phone), MARGIN, ly, f.regular, 9.5, MUTED);
  ly -= 13;
  const where = [project.address, placeLine(project.locality, [project.city, project.pincode].filter(Boolean).join(" "))].filter(Boolean) as string[];
  for (const part of where) {
    for (const line of wrap(w.safe(part, f.regular), f.regular, 9.5, colW)) {
      w.text(line, MARGIN, ly, f.regular, 9.5, MUTED);
      ly -= 13;
    }
  }
  w.label("Project", right, top);
  let ry = top - 16;
  for (const line of wrap(w.safe(project.service ?? "House painting", f.bold), f.bold, 11, colW)) {
    w.text(line, right, ry, f.bold, 11);
    ry -= 14;
  }
  w.text(`Reference PS-${project.id.slice(0, 8).toUpperCase()}-V${q.version}`, right, ry, f.regular, 9.5, MUTED);
  ry -= 13;
  w.text(project.stageLabel, right, ry, f.regular, 9.5, MUTED);
  ry -= 13;
  w.y = Math.min(ly, ry) - 16;

  // ----- Lines -----
  w.beginTable();
  const itemWidth = COLUMNS[0].width - CELL_PAD * 2;
  if (q.lines.length === 0) {
    w.row([{ text: "No lines yet.", font: f.regular, size: 9.5, color: MUTED, lh: 13 }], ["", "", "", ""]);
  }
  for (const line of q.lines) {
    const runs: Run[] = [
      ...wrap(w.safe(line.item, f.bold), f.bold, 9.5, itemWidth).map((text) => ({ text, font: f.bold, size: 9.5, color: INK, lh: 13 })),
      ...(line.description ? wrap(w.safe(line.description, f.regular), f.regular, 8.5, itemWidth) : []).map((text) => ({ text, font: f.regular, size: 8.5, color: MUTED, lh: 11.5 })),
    ];
    w.row(runs, [
      line.areaSqft != null ? `${grouped.format(line.areaSqft)} sq ft` : "–",
      line.coats != null ? String(line.coats) : "–",
      line.ratePaise != null ? money(line.ratePaise) : "–",
      money(line.amountPaise),
    ]);
  }
  w.endTable();

  // ----- Totals (kept together) -----
  w.ensure(64);
  const boxX = W - MARGIN - 230;
  w.y -= 14;
  w.text("Subtotal", boxX, w.y - 10, f.regular, 9.5, MUTED);
  w.text(money(q.subtotalPaise), W - MARGIN - CELL_PAD, w.y - 10, f.regular, 9.5, INK, "right");
  w.y -= 20;
  w.rule(w.y, boxX, W - MARGIN, INK, 0.75);
  w.y -= 8;
  w.text("Total", boxX, w.y - 15, f.serif, 16);
  w.text(money(q.totalPaise), W - MARGIN - CELL_PAD, w.y - 15, f.bold, 13, INK, "right");
  w.y -= 40;

  // ----- Notes and payment terms -----
  if (q.notes?.trim()) w.section("Notes", q.notes.trim());
  if (q.paymentTerms?.trim()) w.section("Payment terms", q.paymentTerms.trim());

  // ----- The promises line -----
  const promise = wrap(w.safe(PROMISE_LINE, f.bold), f.bold, 10, CONTENT - 32);
  const boxH = promise.length * 14 + 22;
  w.ensure(boxH + 4);
  w.page.drawRectangle({ x: MARGIN, y: w.y - boxH, width: CONTENT, height: boxH, color: CHALK, borderColor: SAND, borderWidth: 1 });
  let py = w.y - 11 - 10;
  for (const line of promise) {
    w.text(line, MARGIN + 16, py, f.bold, 10);
    py -= 14;
  }
  w.y -= boxH;

  const host = new URL(site.url).host;
  w.footers([site.name, host, site.hoursDisplay, site.phone ? site.phoneDisplay || site.phone : ""].filter(Boolean).join("  ·  "));
  return pdf.save();
}
