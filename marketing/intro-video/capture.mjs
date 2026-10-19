// Captures the phone screens for the intro video from the local production build (port 3002).
import { launch } from "./cdp.mjs";

const BASE = "http://localhost:3002";
const OUT = new URL("./shots/", import.meta.url).pathname;
const b = await launch();
b.onConsole((t) => { if (/error/i.test(t)) console.log("  console:", t.slice(0, 160)); });
await b.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await b.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await b.send("Network.setUserAgentOverride", { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36" });

// in-page helpers
const helpers = `
  window.__waitImages = async (ms = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const imgs = [...document.images].filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; });
      if (imgs.every((i) => i.complete && i.naturalWidth > 0)) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await document.fonts.ready;
    await new Promise((r) => setTimeout(r, 900));
  };
  window.__scrollToText = async (sel, text, offset = 90) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(text));
    if (!el) throw new Error('not found: ' + text);
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - offset, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 700));
    await window.__waitImages();
  };`;

async function page(url) {
  await b.goto(BASE + url);
  await b.evaluate(helpers);
  await b.evaluate("window.__waitImages()");
}

const shots = [
  ["intro", async () => { await page("/"); }],
  ["problem", async () => { await page("/"); await b.evaluate(`window.__scrollToText('dt', 'Quotation', 380)`); }],
  ["inspection", async () => { await page("/"); await b.evaluate(`window.__scrollToText('h3', 'Inspection & measuring', 260)`); }],
  ["interior", async () => { await page("/services/interior-painting"); }],
  ["exterior", async () => { await page("/services/exterior-painting"); }],
  ["rental", async () => { await page("/services/rental-property-painting"); }],
  ["colours", async () => {
    await page("/colours?brand=asian-paints&family=green");
    await b.evaluate(`(async () => { for (let i = 0; i < 40 && !document.querySelector('button[aria-label^="See "]'); i++) await new Promise((r) => setTimeout(r, 250));
      const sw = [...document.querySelectorAll('ul[aria-label="Brand shades"] button')]; sw[24]?.click(); await new Promise((r) => setTimeout(r, 400));
      document.querySelector('button[aria-label^="See "]').click(); await new Promise((r) => setTimeout(r, 900)); await window.__waitImages(); })()`);
  }],
  ["colours-grid", async () => { await page("/colours?brand=asian-paints&family=green"); await b.evaluate(`window.__scrollToText('label', 'Search Asian Paints', 330)`); }],
  ["supervised", async () => { await page("/"); await b.evaluate(`window.__scrollToText('h3', 'A supervisor on site', 300)`); }],
  ["book", async () => { await page("/book"); await b.evaluate(`window.__scrollToText('label', 'Your name', 330)`); }],
];

for (const [name, run] of shots.filter(([n]) => (process.env.ONLY || n).split(",").includes(n))) {
  try {
    await run();
    await b.shot(`${OUT}${name}.png`);
    console.log("shot", name);
  } catch (e) {
    console.log("FAILED", name, String(e).slice(0, 200));
  }
}
await b.close();
