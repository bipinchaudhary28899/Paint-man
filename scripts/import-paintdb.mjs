// Builds src/data/paintdb.json, the brand paint-shade catalogue, from PaintDB's open dataset.
//
//   node scripts/import-paintdb.mjs              # downloads https://paintdb.com/data/paintdb-colors.csv
//   node scripts/import-paintdb.mjs ./file.csv   # or reads a local copy
//
// Data: PaintDB (https://paintdb.com), CC BY 4.0. Keep the attribution in the output and on
// every page that shows these shades. Hex values are PaintDB's approximations of each brand's
// published colours; Paint Saathi is not affiliated with any paint brand.
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "https://paintdb.com/data/paintdb-colors.csv";
const OUT = new URL("../src/data/paintdb.json", import.meta.url);

/** RFC 4180 CSV → array of string arrays (handles quotes, escaped quotes and newlines in fields). */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// A Map, not a plain object: a lookup on an object would also find inherited names ("&constructor;").
const NAMED_ENTITIES = new Map(Object.entries({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", reg: "®", copy: "©", trade: "™" }));

/**
 * PaintDB names arrive HTML-escaped from its source sites ("Dove&#039;s Wing-w", "Spick &amp; Span").
 * Decodes named, decimal and hex entities in one pass (the same rules as decodeEntities in
 * src/lib/colours/brands.ts, which also decodes data imported before this step existed).
 */
function decodeEntities(s) {
  return s.replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z]+);/gi, (whole, body) => {
    if (body[0] !== "#") return NAMED_ENTITIES.get(body.toLowerCase()) ?? whole;
    const n = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
  });
}

const text = process.argv[2]
  ? readFileSync(process.argv[2], "utf8")
  : await fetch(SOURCE).then((r) => {
      if (!r.ok) throw new Error(`PaintDB download failed: ${r.status}`);
      return r.text();
    });

const [header, ...data] = parseCsv(text);
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`PaintDB CSV is missing the "${name}" column`);
  return i;
};
const C = Object.fromEntries(["brand_slug", "brand_name", "code", "name", "hex", "lrv", "color_family", "undertone", "interior", "exterior"].map((n) => [n, col(n)]));

const brands = [], brandIndex = new Map();
const families = [], familyIndex = new Map();
const undertones = [], undertoneIndex = new Map();
const indexOf = (list, map, value) => {
  if (!map.has(value)) { map.set(value, list.length); list.push(value); }
  return map.get(value);
};

const seen = new Set();
const shades = [];
for (const r of data) {
  const slug = r[C.brand_slug].trim();
  const code = r[C.code].trim();
  const hex = r[C.hex].trim().replace(/^#/, "").toLowerCase();
  if (!slug || !code || !/^[0-9a-f]{6}$/.test(hex)) continue; // skip malformed rows
  const key = `${slug}:${code.toLowerCase()}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (!brandIndex.has(slug)) {
    brandIndex.set(slug, brands.length);
    brands.push({ slug, name: decodeEntities(r[C.brand_name].trim()) || slug });
  }
  const b = brandIndex.get(slug);
  const lrv = Math.max(0, Math.min(100, Math.round(Number(r[C.lrv]) || 0)));
  const where = (r[C.interior] === "true" ? 1 : 0) | (r[C.exterior] === "true" ? 2 : 0);
  // [brand, code, name, hex, lrv, family, undertone, interior|exterior bits]
  shades.push([b, code, decodeEntities(r[C.name].trim()), hex, lrv, indexOf(families, familyIndex, r[C.color_family].trim() || "other"), indexOf(undertones, undertoneIndex, r[C.undertone].trim()), where]);
}
const out = {
  source: "https://paintdb.com",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  attribution: "Shade data: PaintDB (paintdb.com), CC BY 4.0",
  note: "Hex values approximate each brand's published colours. Paint Saathi is not affiliated with any paint brand.",
  generatedAt: new Date().toISOString().slice(0, 10),
  fields: ["brand", "code", "name", "hex", "lrv", "family", "undertone", "where (1 interior, 2 exterior)"],
  brands,
  families,
  undertones,
  shades,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`${shades.length} shades from ${brands.length} brands → src/data/paintdb.json`);
