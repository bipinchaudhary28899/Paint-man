import { launch } from "./cdp.mjs";
const b = await launch({ port: 9336 });
await b.send("Emulation.setDeviceMetricsOverride", { width: 600, height: 1000, deviceScaleFactor: 1, mobile: false });
await b.goto("http://localhost:8791/compose.html");
await b.evaluate("studio.setup()");
for (let i = 0; i < 50 && !(await b.evaluate("typeof studio.exportMp4")).startsWith("function"); i++) await b.sleep(200);
const t0 = Date.now();
console.log(JSON.stringify(await b.evaluate("studio.exportMp4()", 900000)), "wall", ((Date.now() - t0) / 1000).toFixed(1) + "s");
await b.close();
