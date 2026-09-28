/*
 * Serves MediaPipe's WebAssembly runtime from this site's own origin.
 *
 * The on-device camera classifier (lib/vision/onDeviceClassifier.ts) needs
 * these files at a URL. Loading them from a CDN would put a third party's
 * availability in front of the one feature this exists to keep working when
 * others are down, so they are copied out of node_modules into public/ at
 * build time — always the exact version the JavaScript was built against.
 *
 * Not committed: public/mediapipe is generated (see .gitignore).
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const to = join(root, "public", "mediapipe", "wasm");

const FILES = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

if (!existsSync(from)) {
  console.warn("copy-mediapipe-wasm: @mediapipe/tasks-vision is not installed; skipping.");
  process.exit(0);
}

mkdirSync(to, { recursive: true });
for (const file of FILES) copyFileSync(join(from, file), join(to, file));
console.log(`copy-mediapipe-wasm: ${FILES.length} files → public/mediapipe/wasm`);
