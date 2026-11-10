import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The worker caches build assets and, since 2026-11-10, the signed-in app's
 * pages so it opens without a network. Never /api, never the public pages,
 * never an RSC payload, never anything but a plain 200 page.
 */

type Handler = (event: never) => void;

type FakeFetchEvent = {
  request: Request;
  respondWith: (response: Promise<Response> | Response) => void;
  waitUntil: (promise: Promise<unknown>) => void;
};

const SOURCE = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
const ORIGIN = "https://app.test";
const STATIC_CACHE = "exchange-notes-v5";
const PAGE_CACHE = "exchange-notes-pages-v1";

let listeners: Map<string, Handler>;
let putCalls: Array<{ cache: string; url: string; status: number }>;
let addCalls: string[];
let openedCaches: number;
let fetchCalls: Array<{ url: string; init?: RequestInit }>;
let networkResponse: () => Response;
let networkError: Error | null;
let networkHang: boolean;
let cachePutError: Error | null;
let stores: Map<string, Map<string, Response>>;
let pending: Promise<unknown>[];

function keyOf(value: Request | string) {
  return typeof value === "string" ? new URL(value, ORIGIN).href : value.url;
}

function cacheNamed(name: string) {
  let entries = stores.get(name);
  if (!entries) {
    entries = new Map();
    stores.set(name, entries);
  }
  const store = entries;

  return {
    match: async (value: Request | string) => store.get(keyOf(value))?.clone(),
    put: async (value: Request | string, response: Response) => {
      putCalls.push({ cache: name, url: keyOf(value), status: response.status });
      if (cachePutError) throw cachePutError;
      // What the real Cache API does with anything that is not a plain 200.
      if (response.status !== 200) {
        throw new TypeError(
          "Failed to execute 'put' on 'Cache': Partial response (status code 206) is unsupported",
        );
      }
      store.set(keyOf(value), response.clone());
    },
    add: async (url: string) => {
      addCalls.push(url);
    },
    keys: async () => [...store.keys()].map((url) => new Request(url)),
    delete: async (value: Request | string) => store.delete(keyOf(value)),
  };
}

/* A response as the browser hands one to the worker: same-origin is "basic". */
function basic(body: string, init: ResponseInit = {}) {
  const response = new Response(body, init);
  Object.defineProperty(response, "type", { value: "basic" });
  return response;
}

function page(body = "<html>words</html>", init: ResponseInit = {}) {
  return basic(body, {
    status: 200,
    ...init,
    headers: { "content-type": "text/html; charset=utf-8", ...(init.headers ?? {}) },
  });
}

function loadServiceWorker() {
  listeners = new Map();

  const scope = {
    addEventListener: (type: string, handler: Handler) => {
      listeners.set(type, handler);
    },
    skipWaiting: () => {},
    clients: { claim: () => {}, matchAll: async () => [] },
    location: { origin: ORIGIN },
    registration: { showNotification: async () => {} },
    navigator: {},
  };

  const caches = {
    open: vi.fn(async (name: string) => {
      openedCaches += 1;
      return cacheNamed(name);
    }),
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async (name: string) => stores.delete(name)),
    match: vi.fn(async (value: Request | string) => {
      for (const entries of stores.values()) {
        const hit = entries.get(keyOf(value));
        if (hit) return hit.clone();
      }
      return undefined;
    }),
  };

  const fakeFetch = vi.fn(async (input: Request | string, init?: RequestInit) => {
    fetchCalls.push({ url: keyOf(input), init });
    if (networkHang) return new Promise<Response>(() => {});
    if (networkError) throw networkError;
    return networkResponse();
  });

  new Function("self", "caches", "fetch", SOURCE)(scope, caches, fakeFetch);
}

function seed(cache: string, url: string, response: Response) {
  if (!stores.has(cache)) stores.set(cache, new Map());
  stores.get(cache)!.set(keyOf(url), response);
}

function request(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

function navigationRequest(url: string) {
  const value = request(url);
  Object.defineProperty(value, "mode", { value: "navigate" });
  return value;
}

// Drives the handler and reports whether it took the request over.
async function handle(
  req: Request,
  { advance = 0 }: { advance?: number } = {},
): Promise<{ tookOver: boolean; response: Response | null; error?: unknown }> {
  let responded: Promise<Response> | Response | undefined;

  const event: FakeFetchEvent = {
    request: req,
    respondWith: (value) => {
      responded = value;
    },
    waitUntil: (promise) => {
      pending.push(promise);
    },
  };
  (listeners.get("fetch") as unknown as (event: FakeFetchEvent) => void)(event);

  if (responded === undefined) return { tookOver: false, response: null };
  if (advance) await vi.advanceTimersByTimeAsync(advance);

  try {
    return { tookOver: true, response: await responded };
  } catch (error) {
    return { tookOver: true, response: null, error };
  }
}

async function settle() {
  await Promise.allSettled(pending);
  await Promise.allSettled(pending);
}

beforeEach(() => {
  putCalls = [];
  addCalls = [];
  openedCaches = 0;
  fetchCalls = [];
  networkResponse = () => new Response("body", { status: 200 });
  networkError = null;
  networkHang = false;
  cachePutError = null;
  stores = new Map();
  pending = [];
  loadServiceWorker();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("service worker cache boundaries", () => {
  it("precaches only the public offline page", async () => {
    let installation: Promise<unknown> | null = null;

    (listeners.get("install") as unknown as (event: { waitUntil: (p: Promise<unknown>) => void }) => void)({
      waitUntil: (promise) => {
        installation = promise;
      },
    });

    await installation;
    expect(addCalls).toEqual(["/offline.html"]);
  });

  it("leaves a ranged request to the browser entirely", async () => {
    const result = await handle(
      request("https://app.test/audio/zhuyin/a.mp3", {
        range: "bytes=0-",
      }),
    );

    expect(result.tookOver).toBe(false);
    expect(openedCaches).toBe(0);
  });

  it("never asks the cache to store a partial static response", async () => {
    networkResponse = () => new Response("partial", { status: 206 });

    const result = await handle(
      request("https://app.test/_next/static/chunks/app.js"),
    );

    // Not a ranged request, so it is answered — but a 206 is not storable,
    // and this is the put() that used to throw into the console.
    expect(result.response?.status).toBe(206);
    expect(putCalls).toEqual([]);
  });

  it("caches an ordinary immutable Next asset", async () => {
    const result = await handle(
      request("https://app.test/_next/static/chunks/app.js"),
    );

    expect(result.tookOver).toBe(true);
    expect(result.response?.status).toBe(200);

    await vi.waitFor(() => expect(putCalls).toHaveLength(1));
    expect(putCalls[0].status).toBe(200);
  });

  it("serves an immutable asset from cache without a network request", async () => {
    seed(STATIC_CACHE, "/_next/static/chunks/app.js", new Response("cached", { status: 200 }));

    const result = await handle(
      request("https://app.test/_next/static/chunks/app.js"),
    );

    expect(await result.response?.text()).toBe("cached");
    expect(fetchCalls).toHaveLength(0);
  });

  it("does not let a refused cache write become an uncaught rejection", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (event: PromiseRejectionEvent) => {
      unhandled.push(event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", onUnhandled);

    // A 200 that the cache refuses anyway — a quota error, say.
    cachePutError = new Error("quota exceeded");
    await handle(request("https://app.test/_next/static/chunks/app.js"));
    await handle(navigationRequest("https://app.test/home"));
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 20));

    window.removeEventListener("unhandledrejection", onUnhandled);
    expect(unhandled).toEqual([]);
  });

  it("stays out of the way of API routes and other origins", async () => {
    const api = await handle(request("https://app.test/api/daily-news"));
    const other = await handle(request("https://elsewhere.test/thing.js"));
    const apiPage = await handle(navigationRequest("https://app.test/api/version"));

    expect(api.tookOver).toBe(false);
    expect(other.tookOver).toBe(false);
    expect(apiPage.tookOver).toBe(false);
  });
});

describe("opening without a network", () => {
  it("keeps a signed-in page under its path, without its query", async () => {
    networkResponse = () => page("<html>home</html>");

    const result = await handle(navigationRequest("https://app.test/home?from=widget"));
    await settle();

    expect(await result.response?.text()).toBe("<html>home</html>");
    expect(putCalls).toEqual([{ cache: PAGE_CACHE, url: "https://app.test/home", status: 200 }]);
  });

  it("opens the kept page when the network fails", async () => {
    seed(PAGE_CACHE, "/vocabulary", page("<html>kept words</html>"));
    networkError = new TypeError("Failed to fetch");

    const result = await handle(navigationRequest("https://app.test/vocabulary"));

    expect(await result.response?.text()).toBe("<html>kept words</html>");
  });

  it("opens the kept page after five seconds without an answer", async () => {
    vi.useFakeTimers();
    seed(PAGE_CACHE, "/notes", page("<html>kept notes</html>"));
    networkHang = true;

    const result = await handle(navigationRequest("https://app.test/notes"), { advance: 5_000 });

    expect(await result.response?.text()).toBe("<html>kept notes</html>");
  });

  it("then opens kept pages at once while the signal stays weak", async () => {
    vi.useFakeTimers();
    seed(PAGE_CACHE, "/notes", page("<html>kept notes</html>"));
    seed(PAGE_CACHE, "/review", page("<html>kept review</html>"));
    networkHang = true;

    await handle(navigationRequest("https://app.test/notes"), { advance: 5_000 });
    const next = await handle(navigationRequest("https://app.test/review"), { advance: 1 });

    expect(await next.response?.text()).toBe("<html>kept review</html>");
  });

  it("waits for the network after all when nothing is kept for the page", async () => {
    vi.useFakeTimers();
    let answer!: (response: Response) => void;
    const late = new Promise<Response>((resolve) => {
      answer = resolve;
    });
    loadServiceWorkerWithFetch(() => late);

    let responded: Promise<Response> | Response | undefined;
    (listeners.get("fetch") as unknown as (event: FakeFetchEvent) => void)({
      request: navigationRequest("https://app.test/friends"),
      respondWith: (value) => {
        responded = value;
      },
      waitUntil: (promise) => {
        pending.push(promise);
      },
    });
    // Five seconds pass with nothing kept; the answer comes at seven.
    await vi.advanceTimersByTimeAsync(7_000);
    answer(page("<html>late</html>"));

    expect(await (await responded!).text()).toBe("<html>late</html>");
  });

  it("falls back to the offline page when nothing is kept and there is no network", async () => {
    networkError = new TypeError("Failed to fetch");
    seed(STATIC_CACHE, "/offline.html", new Response("safe offline shell", { status: 200 }));

    const result = await handle(navigationRequest("https://app.test/home"));

    expect(result.tookOver).toBe(true);
    expect(await result.response?.text()).toBe("safe offline shell");
    expect(putCalls).toEqual([]);
  });

  it("shows the kept page rather than a server error", async () => {
    seed(PAGE_CACHE, "/home", page("<html>kept home</html>"));
    networkResponse = () => page("<html>broken</html>", { status: 503 });

    const result = await handle(navigationRequest("https://app.test/home"));

    expect(await result.response?.text()).toBe("<html>kept home</html>");
  });

  it("never keeps a redirect, an error screen or a page that is not HTML", async () => {
    for (const response of [
      () => {
        const redirect = page("<html>login</html>");
        Object.defineProperty(redirect, "redirected", { value: true });
        return redirect;
      },
      () => page('<html><main data-route-error="">try again</main></html>'),
      () => basic("{}", { status: 200, headers: { "content-type": "application/json" } }),
      () => new Response("<html>opaque</html>", { status: 200, headers: { "content-type": "text/html" } }),
    ]) {
      networkResponse = response;
      await handle(navigationRequest("https://app.test/home"));
    }
    await settle();

    expect(putCalls).toEqual([]);
  });

  it("never keeps the public pages", async () => {
    networkResponse = () => page("<html>landing</html>");

    await handle(navigationRequest("https://app.test/"));
    await handle(navigationRequest("https://app.test/login"));
    await settle();

    expect(putCalls).toEqual([]);
  });

  it("never stores an RSC payload, and leaves prefetches alone", async () => {
    networkResponse = () => basic("payload", { status: 200, headers: { "content-type": "text/x-component" } });

    const rsc = await handle(request("https://app.test/home?_rsc=private", { rsc: "1" }));
    const prefetch = await handle(
      request("https://app.test/home?_rsc=private", { rsc: "1", "next-router-prefetch": "1" }),
    );
    await settle();

    expect(await rsc.response?.text()).toBe("payload");
    expect(prefetch.tookOver).toBe(false);
    expect(putCalls).toEqual([]);
  });

  it("fails a slow tab change over to the kept page", async () => {
    vi.useFakeTimers();
    seed(PAGE_CACHE, "/vocabulary", page("<html>kept words</html>"));
    networkHang = true;

    const result = await handle(request("https://app.test/vocabulary?_rsc=x", { rsc: "1" }), { advance: 5_000 });

    // A network error is what makes Next fall back to a browser navigation.
    expect(result.response?.type).toBe("error");
  });

  it("names every signed-in route", () => {
    const protectedRoot = join(process.cwd(), "app/(protected)");
    const folders = readdirSync(protectedRoot)
      .filter((name) => statSync(join(protectedRoot, name)).isDirectory())
      .map((name) => `/${name}`)
      .sort();
    const roots = JSON.parse(
      SOURCE.match(/const APP_PAGE_ROOTS = (\[[\s\S]*?\]);/)![1].replace(/,\s*\]/, "]"),
    );

    expect(roots).toEqual(folders);
  });
});

describe("keeping pages ahead of time", () => {
  async function keep(pages: string[], build: string) {
    let work: Promise<unknown> = Promise.resolve();
    (listeners.get("message") as unknown as (event: unknown) => void)({
      data: { type: "keep-pages", build, pages },
      waitUntil: (promise: Promise<unknown>) => {
        work = promise;
      },
    });
    await work;
  }

  it("fetches each page without following a redirect, and the files it starts from", async () => {
    networkResponse = () =>
      page('<html><script src="/_next/static/chunks/a.js"></script>"\\/_next/static/chunks/b.js"</html>');

    await keep(["/vocabulary", "/login", "https://elsewhere.test/home"], "build-1");

    const pageFetches = fetchCalls.filter((call) => !call.url.includes("/_next/"));
    expect(pageFetches).toEqual([
      { url: "https://app.test/vocabulary", init: { credentials: "same-origin", redirect: "manual" } },
    ]);
    expect(stores.get(PAGE_CACHE)?.has("https://app.test/vocabulary")).toBe(true);
    expect(stores.get(STATIC_CACHE)?.has("https://app.test/_next/static/chunks/a.js")).toBe(true);
  });

  it("does not fetch a page again for the same build", async () => {
    networkResponse = () => page();
    await keep(["/home"], "build-1");
    const first = fetchCalls.length;

    await keep(["/home"], "build-1");
    expect(fetchCalls.length).toBe(first);

    await keep(["/home"], "build-2");
    expect(fetchCalls.length).toBeGreaterThan(first);
  });

  it("drops old build files no kept page needs once pages move to a new build", async () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toUTCString();
    seed(STATIC_CACHE, "/_next/static/chunks/old.js", new Response("old", { status: 200, headers: { date: old } }));
    seed(STATIC_CACHE, "/_next/static/chunks/recent.js", new Response("recent", { status: 200, headers: { date: new Date().toUTCString() } }));
    seed(STATIC_CACHE, "/_next/static/chunks/used.js", new Response("used", { status: 200, headers: { date: old } }));
    networkResponse = () => page('<script src="/_next/static/chunks/used.js"></script>');

    await keep(["/home"], "build-2");

    const kept = stores.get(STATIC_CACHE)!;
    expect(kept.has("https://app.test/_next/static/chunks/old.js")).toBe(false);
    expect(kept.has("https://app.test/_next/static/chunks/recent.js")).toBe(true);
    expect(kept.has("https://app.test/_next/static/chunks/used.js")).toBe(true);
  });
});

describe("the camera's runtime", () => {
  it("is answered from the device once kept", async () => {
    seed("exchange-notes-vision-runtime-1.0.1", "/mediapipe/wasm/vision_wasm_internal.wasm", new Response("wasm", { status: 200 }));

    const result = await handle(request("https://app.test/mediapipe/wasm/vision_wasm_internal.wasm"));

    expect(await result.response?.text()).toBe("wasm");
    expect(fetchCalls).toHaveLength(0);
  });

  it("is kept the first time it is fetched", async () => {
    await handle(request("https://app.test/mediapipe/wasm/vision_wasm_internal.js"));
    await vi.waitFor(() => expect(putCalls).toHaveLength(1));

    expect(putCalls[0].cache).toBe("exchange-notes-vision-runtime-1.0.1");
  });

  it("survives a release, and an older version's runtime does not", async () => {
    for (const name of [
      STATIC_CACHE,
      PAGE_CACHE,
      "exchange-notes-vision-efficientnet-lite0-int8-v1",
      "exchange-notes-vision-runtime-1.0.1",
      "exchange-notes-vision-runtime-0.10.0",
      "exchange-notes-shop-thumbs-v3",
      "exchange-notes-v4",
    ]) {
      seed(name, "/x", new Response("x"));
    }

    let activation: Promise<unknown> = Promise.resolve();
    (listeners.get("activate") as unknown as (event: { waitUntil: (p: Promise<unknown>) => void }) => void)({
      waitUntil: (promise) => {
        activation = promise;
      },
    });
    await activation;

    expect([...stores.keys()].sort()).toEqual(
      [
        STATIC_CACHE,
        PAGE_CACHE,
        "exchange-notes-vision-efficientnet-lite0-int8-v1",
        "exchange-notes-vision-runtime-1.0.1",
        "exchange-notes-shop-thumbs-v3",
      ].sort(),
    );
  });
});

/* A worker whose fetch is given, for a test that controls when it answers. */
function loadServiceWorkerWithFetch(answer: () => Promise<Response>) {
  listeners = new Map();
  const scope = {
    addEventListener: (type: string, handler: Handler) => {
      listeners.set(type, handler);
    },
    skipWaiting: () => {},
    clients: { claim: () => {}, matchAll: async () => [] },
    location: { origin: ORIGIN },
    registration: { showNotification: async () => {} },
    navigator: {},
  };
  const caches = {
    open: async (name: string) => cacheNamed(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async () => undefined,
  };
  new Function("self", "caches", "fetch", SOURCE)(scope, caches, () => answer());
}
