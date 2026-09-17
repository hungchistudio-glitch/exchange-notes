/**
 * Render the Yumi opening to disk, one authored frame at a time.
 *
 * A 2.8-second animation cannot be photographed through a tool that takes
 * seconds per round trip, and headless Chrome's --virtual-time-budget spends
 * most of its budget on the page load and lands somewhere arbitrary. So this
 * drives app/yumi-opening-review/frame, which holds one frame still, and waits
 * for that page to say the frame it was asked for is the frame on screen.
 *
 * Usage, with `npm run dev` already running:
 *
 *   node scripts/capture-opening-frames.mjs --out ./frames
 *   node scripts/capture-opening-frames.mjs --out ./frames --mode cosmic --fps 30
 *
 * Start the browser it talks to first:
 *
 *   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *     --headless=new --disable-gpu --remote-debugging-port=9222 \
 *     --user-data-dir=/tmp/opening-capture about:blank &
 *
 * No dependencies: Node's global WebSocket speaks the DevTools protocol
 * directly. Adding Puppeteer to production installs for a tool that runs by
 * hand a few times a year is the wrong trade.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
}

const outDir = args.get("out") ?? "./opening-frames";
const mode = args.get("mode") ?? "pearl";
const fps = Number(args.get("fps") ?? 30);
const duration = Number(args.get("duration") ?? 2800);
const base = args.get("base") ?? "http://localhost:3000/yumi-opening-review/frame";
const port = args.get("port") ?? "9222";
const width = Number(args.get("width") ?? 390);
const height = Number(args.get("height") ?? 844);
const scale = Number(args.get("scale") ?? 2);

mkdirSync(outDir, { recursive: true });

const times = [];
for (let i = 0; i <= Math.round((duration / 1000) * fps); i += 1) {
  times.push(Math.min(duration, Math.round((i * 1000) / fps)));
}

const version = await fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json());
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise(resolve => (socket.onopen = resolve));

let nextId = 0;
const waiting = new Map();
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.id && waiting.has(message.id)) {
    waiting.get(message.id)(message);
    waiting.delete(message.id);
  }
};
const send = (method, params = {}, sessionId) =>
  new Promise(resolve => {
    const id = ++nextId;
    waiting.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

const { result: target } = await send("Target.createTarget", { url: "about:blank" });
const { result: attached } = await send(
  "Target.attachToTarget",
  { targetId: target.targetId, flatten: true },
);
const session = attached.sessionId;

await send("Page.enable", {}, session);
await send("Runtime.enable", {}, session);
await send(
  "Emulation.setDeviceMetricsOverride",
  { width, height, deviceScaleFactor: scale, mobile: true },
  session,
);

let captured = 0;
for (const time of times) {
  const url = `${base}?t=${time}${mode === "cosmic" ? "&mode=cosmic" : ""}`;
  await send("Page.navigate", { url }, session);

  /*
   * The page decides when it is ready, by comparing what it has painted with
   * the frame the server computed. Polling anything this end — the scrubber,
   * a timeout — photographs the request rather than the answer.
   */
  let ready = false;
  for (let attempt = 0; attempt < 200 && !ready; attempt += 1) {
    await pause(50);
    const { result } = await send(
      "Runtime.evaluate",
      {
        expression: `document.documentElement.getAttribute('data-frame-ready') === '1'`,
        returnByValue: true,
      },
      session,
    );
    ready = result?.result?.value === true;
  }

  if (!ready) {
    console.error(`frame ${time}ms never became ready — skipped`);
    continue;
  }

  // One more paint, so the compositor has certainly caught up with the seek.
  await pause(90);
  const { result: shot } = await send("Page.captureScreenshot", { format: "png" }, session);
  writeFileSync(
    `${outDir}/f${String(time).padStart(5, "0")}.png`,
    Buffer.from(shot.data, "base64"),
  );
  captured += 1;
}

console.log(`captured ${captured}/${times.length} frames into ${outDir} (${mode})`);
socket.close();
process.exit(0);
