import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The camera's runtime is kept on the device under a cache named for the
 * MediaPipe version, because its file names never change between versions.
 * The page fills the cache and the worker answers from it, so the two names
 * and the installed package must agree, or an upgrade would keep running
 * the old runtime from the device.
 */

const forVisionTasks = vi.hoisted(() => vi.fn());
vi.mock("@mediapipe/tasks-vision", () => ({ FilesetResolver: { forVisionTasks } }));

import {
  MEDIAPIPE_VERSION,
  VISION_RUNTIME_CACHE,
  downloadObjectClassifier,
} from "@/lib/vision/onDeviceClassifier";

const installed = JSON.parse(
  readFileSync(join(process.cwd(), "node_modules/@mediapipe/tasks-vision/package.json"), "utf8"),
).version as string;
const worker = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

describe("the camera runtime's cache name", () => {
  it("follows the installed MediaPipe version", () => {
    expect(MEDIAPIPE_VERSION).toBe(installed);
  });

  it("is the one the service worker answers from", () => {
    expect(worker).toContain(`const VISION_RUNTIME_CACHE = "${VISION_RUNTIME_CACHE}";`);
  });
});

describe("downloading ahead", () => {
  let stored: Map<string, Set<string>>;
  let fetched: string[];

  beforeEach(() => {
    stored = new Map();
    fetched = [];
    forVisionTasks.mockResolvedValue({
      wasmLoaderPath: "/mediapipe/wasm/vision_wasm_internal.js",
      wasmBinaryPath: "/mediapipe/wasm/vision_wasm_internal.wasm",
    });
    vi.stubGlobal("caches", {
      open: async (name: string) => {
        const entries = stored.get(name) ?? new Set<string>();
        stored.set(name, entries);
        return {
          match: async (url: string) => (entries.has(url) ? new Response("kept") : undefined),
          put: async (url: string) => {
            entries.add(url);
          },
        };
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        fetched.push(url);
        return new Response("bytes", { status: 200 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the runtime and the model, and builds nothing", async () => {
    await expect(downloadObjectClassifier()).resolves.toBe(true);

    expect(stored.get(VISION_RUNTIME_CACHE)).toEqual(
      new Set(["/mediapipe/wasm/vision_wasm_internal.js", "/mediapipe/wasm/vision_wasm_internal.wasm"]),
    );
    expect([...(stored.get("exchange-notes-vision-efficientnet-lite0-int8-v1") ?? [])]).toHaveLength(1);
    expect(fetched).toHaveLength(3);
  });

  it("downloads nothing a second time", async () => {
    await downloadObjectClassifier();
    fetched.length = 0;

    await downloadObjectClassifier();
    expect(fetched).toEqual([]);
  });

  it("gives up quietly without a network", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }));

    await expect(downloadObjectClassifier()).resolves.toBe(false);
  });
});
