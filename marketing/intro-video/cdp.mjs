// Minimal Chrome DevTools Protocol driver: launch headless Chrome, open a page, evaluate, screenshot.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ port = 9333, extra = [] } = {}) {
  const profile = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "pm-video-chrome-"));
  const proc = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
    "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
    "--autoplay-policy=no-user-gesture-required", "--hide-scrollbars", ...extra, "about:blank",
  ], { stdio: "ignore" });
  let ws;
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) { ws = page.webSocketDebuggerUrl; break; }
    } catch {}
    await sleep(250);
  }
  if (!ws) throw new Error("Chrome did not start");
  const sock = new WebSocket(ws);
  await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });
  let id = 0;
  const pending = new Map();
  const listeners = [];
  sock.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    } else if (msg.method) listeners.forEach((l) => l(msg));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); sock.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression, timeout = 120000) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, timeout });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const waitEvent = (name, ms = 30000) => new Promise((res) => {
    const t = setTimeout(res, ms);
    listeners.push((m) => { if (m.method === name) { clearTimeout(t); res(m); } });
  });
  await send("Page.enable");
  await send("Runtime.enable");
  return {
    send, evaluate, sleep,
    async goto(url) { const loaded = waitEvent("Page.loadEventFired"); await send("Page.navigate", { url }); await loaded; },
    async shot(file) {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      const { writeFileSync } = await import("node:fs");
      writeFileSync(file, Buffer.from(data, "base64"));
    },
    async close() { try { await send("Browser.close"); } catch {} proc.kill(); },
    onConsole(fn) { listeners.push((m) => { if (m.method === "Runtime.consoleAPICalled") fn(m.params.args.map((a) => a.value ?? a.description).join(" ")); }); },
  };
}
