import { writeFileSync, mkdirSync } from "node:fs";
import { launch } from "./cdp.mjs";
const b = await launch({ port: 9334 });
await b.send("Emulation.setDeviceMetricsOverride", { width: 600, height: 1000, deviceScaleFactor: 1, mobile: false });
await b.goto("http://localhost:8791/compose.html");
const info = await b.evaluate("studio.setup()");
console.log(JSON.stringify(info));
console.log("mp4:", await b.evaluate(`["video/mp4;codecs=avc1.640028,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus"].map(m => m + "=" + MediaRecorder.isTypeSupported(m)).join(" ")`));
mkdirSync("frames", { recursive: true });
const times = (process.env.TIMES || "").split(",").filter(Boolean).map(Number);
const list = times.length ? times : info.scenes.map(([, s, d]) => s + Math.min(3.2, d / 2));
for (const t of list) {
  const url = await b.evaluate(`(studio.renderAt(${t}), document.getElementById('c').toDataURL('image/png'))`);
  writeFileSync(`frames/f-${t.toFixed(1)}.png`, Buffer.from(url.split(",")[1], "base64"));
}
console.log("frames", list.map((t) => t.toFixed(1)).join(" "));
await b.close();
