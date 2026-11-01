import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, setCharacterSpacing, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { acceptanceStatement, QUOTATION_TERMS_UPDATED, QUOTATION_VALID_DAYS, quotationTerms } from "@/config/quotation-terms";
import { promises, site } from "@/config/site";
import { formatDate, formatMobile, placeLine, QUOTATION_STATUS_LABELS, quotationFilename } from "@/lib/account";
import { formatPaise } from "@/lib/money";
import type { QuotationDocument } from "@/lib/projects/repo";

// The branded quotation PDF a customer downloads from the project tracker (and the app), in two
// parts. First the quotation: the Paint Saathi logo, its reference, date and validity, the customer
// and address, the itemised lines (wrapping, and breaking across pages for a long quote), the
// totals, the payment milestones with their amounts, notes and payment terms, and the promises
// line. Then the Terms & Conditions that come with every quotation (src/config/quotation-terms.ts),
// ending with the customer's acceptance and the lines to sign. Every page carries the quotation
// reference in its footer, which ties the two parts together. Built with pdf-lib on the server; the
// brand fonts (DM Serif Display for headings, Manrope for text, both SIL OFL, licences beside them in
// ./fonts) are embedded and subset.

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

/**
 * Greedy word wrap to `width`; a word longer than the line is broken by characters. Each word is
 * measured once and the line's width kept as a running sum (a space between words), so the long
 * paragraphs of the terms wrap in linear time.
 */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  const space = font.widthOfTextAtSize(" ", size);
  for (const paragraph of text.split("\n")) {
    let line = "";
    let lineWidth = 0;
    for (const word of paragraph.split(/ +/).filter(Boolean)) {
      const wordWidth = font.widthOfTextAtSize(word, size);
      const candidateWidth = line ? lineWidth + space + wordWidth : wordWidth;
      if (candidateWidth <= width) {
        line = line ? `${line} ${word}` : word;
        lineWidth = candidateWidth;
        continue;
      }
      if (line) lines.push(line);
      // a word wider than the line: as many characters per line as fit
      let rest = word;
      let restWidth = wordWidth;
      while (restWidth > width) {
        // the most characters that fit, found by halving (at least one per line)
        let lo = 1;
        let hi = rest.length - 1;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (font.widthOfTextAtSize(rest.slice(0, mid), size) <= width) lo = mid;
          else hi = mid - 1;
        }
        const n = lo;
        lines.push(rest.slice(0, n));
        rest = rest.slice(n);
        restWidth = font.widthOfTextAtSize(rest, size);
      }
      line = rest;
      lineWidth = restWidth;
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
    /** What a later page's header says it continues (the quotation, then its terms). */
    public continuation: string,
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

  /** A paragraph of the terms, wrapped (indented after a bullet when `bullet`), kept off the footer. */
  paragraph(body: string, { bullet = false, size = 9, color = INK } = {}) {
    const indent = bullet ? 12 : 0;
    const lines = wrap(this.safe(body, this.f.regular), this.f.regular, size, CONTENT - indent);
    const lh = size + 4;
    lines.forEach((line, i) => {
      this.ensure(lh);
      if (bullet && i === 0) this.text("•", MARGIN + 2, this.y - size, this.f.regular, size, TERRACOTTA);
      this.text(line, MARGIN + indent, this.y - size, this.f.regular, size, color);
      this.y -= lh;
    });
    this.y -= bullet ? 3 : 6;
  }

  /** A numbered heading of the terms, kept with the start of its text. */
  termsHeading(text: string) {
    this.ensure(18 + 3 * 13);
    this.y -= 6;
    this.text(text, MARGIN, this.y - 11, this.f.serif, 12);
    this.y -= 19;
  }

  /** The footer of every page: the quotation reference first, then the business line and the page number. */
  footers(reference: string, lines: string) {
    const total = this.pages.length;
    this.pages.forEach((page, i) => {
      this.page = page;
      this.rule(BOTTOM - 26);
      this.text(reference, MARGIN, BOTTOM - 40, this.f.bold, 7.5, INK);
      const x = MARGIN + this.f.bold.widthOfTextAtSize(this.safe(reference, this.f.bold), 7.5) + 10;
      this.text(lines, x, BOTTOM - 40, this.f.regular, 7.5, MUTED);
      this.text(`Page ${i + 1} of ${total}`, W - MARGIN, BOTTOM - 40, this.f.regular, 7.5, MUTED, "right");
    });
  }
}

const grouped = new Intl.NumberFormat("en-IN");

export type QuotationPdfOptions = { /** The date printed when the quotation has not been sent (a draft preview). */ now?: Date };

/** The day `days` after a calendar day (YYYY-MM-DD). */
function addDays(day: string, days: number): string {
  const d = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The quotation and its Terms & Conditions as a PDF file: A4, every page with the reference, the footer and its page number. */
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

  const reference = q.reference;
  const w = new Writer(pdf, f, logo, charsets, `${title} · ${reference} (continued)`);
  w.addPage(true);

  // ----- Heading: logo left, "Quotation" and its dates right -----
  const lw = 150;
  const lh = (lw * logo.height) / logo.width;
  w.page.drawImage(logo, { x: MARGIN, y: w.y - lh, width: lw, height: lh });
  w.text("Quotation", W - MARGIN, w.y - 24, f.serif, 28, INK, "right");
  // a quotation holds QUOTATION_VALID_DAYS from its issue unless it states a date (a draft: from when it is sent)
  const validity = q.validUntil
    ? `Valid until ${formatDate(q.validUntil)}`
    : q.status === "draft"
      ? `Valid ${QUOTATION_VALID_DAYS} days from sending`
      : `Valid until ${formatDate(addDays(issued, QUOTATION_VALID_DAYS))}`;
  const meta = [`Reference ${reference}`, `Version ${q.version}`, `Date ${formatDate(issued)}`, validity];
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

  // ----- Payment milestones (kept together) -----
  if (q.paymentSchedule.length) {
    const rowH = 20;
    w.ensure(22 + HEADER_ROW + rowH * q.paymentSchedule.length + 12);
    w.text("Payment schedule", MARGIN, w.y - 13, f.serif, 13);
    w.y -= 22;
    const pctX = W - MARGIN - 150;
    w.page.drawRectangle({ x: MARGIN, y: w.y - HEADER_ROW, width: CONTENT, height: HEADER_ROW, color: SAND });
    w.text("Milestone", MARGIN + CELL_PAD, w.y - 14.5, f.bold, 8.5);
    w.text("Share", pctX, w.y - 14.5, f.bold, 8.5, INK, "right");
    w.text("Amount", W - MARGIN - CELL_PAD, w.y - 14.5, f.bold, 8.5, INK, "right");
    w.y -= HEADER_ROW;
    for (const m of q.paymentSchedule) {
      const label = wrap(w.safe(m.label, f.regular), f.regular, 9.5, pctX - MARGIN - 60)[0] ?? "";
      w.text(label, MARGIN + CELL_PAD, w.y - 13.5, f.regular, 9.5);
      w.text(`${m.percent}%`, pctX, w.y - 13.5, f.regular, 9.5, MUTED, "right");
      w.text(money(m.amountPaise), W - MARGIN - CELL_PAD, w.y - 13.5, f.bold, 9.5, INK, "right");
      w.y -= rowH;
      w.rule(w.y);
    }
    w.y -= 8;
    w.paragraph("Nothing is due before the work starts. Each payment is due on the day its milestone is reached.", { size: 8.5, color: MUTED });
    w.y -= 6;
  }

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
  w.y -= boxH + 12;
  w.paragraph(`The Terms & Conditions on the following pages are part of this quotation (${reference}).`, { size: 8.5, color: MUTED });

  // ----- Terms & Conditions, on their own pages -----
  w.continuation = `Terms & Conditions · ${reference} (continued)`;
  w.addPage();
  w.label("Part of quotation " + reference, MARGIN, w.y - 4);
  w.y -= 14;
  w.text("Terms & Conditions", MARGIN, w.y - 22, f.serif, 24);
  w.y -= 34;
  w.paragraph(`These terms of ${formatDate(QUOTATION_TERMS_UPDATED)} come with ${site.name} quotation ${reference}, version ${q.version}, and form one agreement with it.`, { size: 9, color: MUTED });
  w.y -= 4;
  quotationTerms().forEach((section, i) => {
    w.termsHeading(`${i + 1}. ${section.title}`);
    for (const block of section.blocks) {
      if (block.kind === "p") w.paragraph(block.text);
      else for (const item of block.items) w.paragraph(item, { bullet: true });
    }
  });

  // ----- Acceptance: the statement, then the lines to fill in, kept together -----
  const acceptance = acceptanceStatement();
  const statement = acceptance.paragraphs.flatMap((t) => wrap(w.safe(t, f.regular), f.regular, 9, CONTENT));
  const fieldH = 30;
  w.ensure(40 + statement.length * 13 + acceptance.paragraphs.length * 6 + acceptance.fields.length * fieldH);
  w.y -= 10;
  w.rule(w.y, MARGIN, W - MARGIN, INK, 0.75);
  w.y -= 8;
  w.text(acceptance.title, MARGIN, w.y - 15, f.serif, 15);
  w.y -= 26;
  for (const t of acceptance.paragraphs) w.paragraph(t);
  const filled: Record<string, string> = {
    "Customer name": project.name,
    "Property address": [project.address, placeLine(project.locality, [project.city, project.pincode].filter(Boolean).join(" "))].filter(Boolean).join(", "),
    "Quotation reference": `${reference} (version ${q.version})`,
    Date: q.status === "approved" && q.approvedAt ? `${formatDate(q.approvedAt)} (accepted)` : "",
  };
  w.y -= 4;
  for (const field of acceptance.fields) {
    const value = filled[field] ?? "";
    w.text(field, MARGIN, w.y - 18, f.bold, 8.5, MUTED);
    const x = MARGIN + 130;
    if (value) w.text(wrap(w.safe(value, f.regular), f.regular, 9.5, W - MARGIN - x)[0] ?? "", x, w.y - 18, f.regular, 9.5);
    w.rule(w.y - 22, x, W - MARGIN, LINE, 0.75);
    w.y -= fieldH;
  }

  const host = new URL(site.url).host;
  w.footers(reference, [site.name, host, site.hoursDisplay, site.phone ? site.phoneDisplay || site.phone : ""].filter(Boolean).join("  ·  "));
  return pdf.save();
}
