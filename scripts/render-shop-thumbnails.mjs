/**
 * Write the shop's piece pictures to public/shop-thumbs.
 *
 * The shop shows these instead of rendering seventy-odd thumbnails on the
 * reader's phone (Chi, 2026-10-12: "動畫很卡"). They are made by the same
 * builders the stand uses (lib/yumi3d/outfit.ts), through
 * app/yumi-shop-thumbnails-review, so rerun this whenever a piece changes —
 * and bump THUMBNAIL_VERSION in lib/yumi3d/thumbnails.ts so phones fetch
 * the new ones.
 *
 * Usage, with `npm run dev` already running:
 *
 *   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *     --headless=new --remote-debugging-port=9222 \
 *     --user-data-dir=/tmp/shop-thumbs about:blank &
 *   node scripts/render-shop-thumbnails.mjs
 *
 * Options: --base http://localhost:3000 --port 9222 --out public/shop-thumbs
 *
 * No dependencies: Node's global WebSocket speaks the DevTools protocol
 * directly (see scripts/capture-opening-frames.mjs).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
}
const base = args.get("base") ?? "http://localhost:3000";
const port = args.get("port") ?? "9222";
const outDir = args.get("out") ?? "public/shop-thumbs";

const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener("open", resolve, { once: true }));

let nextId = 0;
const waiting = new Map();
ws.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.id && waiting.has(message.id)) {
    waiting.get(message.id)(message);
    waiting.delete(message.id);
  }
});
const send = (method, params = {}, sessionId) => new Promise(resolve => {
  const id = ++nextId;
  waiting.set(id, resolve);
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { result: { targetId } } = await send("Target.createTarget", { url: "about:blank" });
const { result: { sessionId } } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Page.navigate", { url: `${base}/yumi-shop-thumbnails-review` }, sessionId);

let pictures = null;
for (let tries = 0; tries < 240 && !pictures; tries += 1) {
  await new Promise(resolve => setTimeout(resolve, 500));
  const answer = await send("Runtime.evaluate", {
    expression: "window.__shopThumbs ? JSON.stringify(window.__shopThumbs) : null",
    returnByValue: true,
  }, sessionId);
  const value = answer.result?.result?.value;
  if (value) pictures = JSON.parse(value);
}
if (!pictures) {
  console.error("The thumbnails page never finished rendering.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
let bytes = 0;
for (const [id, url] of Object.entries(pictures)) {
  const data = Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
  writeFileSync(join(outDir, `${id}.webp`), data);
  bytes += data.length;
}
console.log(`Wrote ${Object.keys(pictures).length} pictures to ${outDir} (${Math.round(bytes / 1024)} KB).`);

await send("Target.closeTarget", { targetId });
ws.close();
process.exit(0);
