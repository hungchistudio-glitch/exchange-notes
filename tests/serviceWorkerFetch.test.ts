import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* The worker caches build assets, never authenticated HTML or RSC payloads. */

type FetchHandler = (event: FakeFetchEvent) => void;
type InstallHandler = (event: {
  waitUntil: (promise: Promise<unknown>) => void;
}) => void;

type FakeFetchEvent = {
  request: Request;
  respondWith: (response: Promise<Response> | Response) => void;
};

const SOURCE = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

let fetchHandler: FetchHandler;
let installHandler: InstallHandler;
let putCalls: Array<{ url: string; status: number }>;
let addCalls: string[];
let openedCaches: number;
let fetchCalls: number;
let networkResponse: Response;
let networkError: Error | null;
let offlineResponse: Response | null;
let cachedStaticResponse: Response | null;
let cachePutError: Error | null;

function loadServiceWorker() {
  const listeners = new Map<string, FetchHandler>();

  const cache = {
    put: vi.fn(async (request: Request, response: Response) => {
      putCalls.push({ url: request.url, status: response.status });

      if (cachePutError) throw cachePutError;

      // What the real Cache API does with anything that is not a plain 200.
      if (response.status !== 200) {
        throw new TypeError(
          "Failed to execute 'put' on 'Cache': Partial response (status code 206) is unsupported",
        );
      }
    }),
    add: vi.fn(async (url: string) => {
      addCalls.push(url);
    }),
    match: vi.fn(async () => undefined),
  };

  const scope = {
    addEventListener: (type: string, handler: FetchHandler) => {
      listeners.set(type, handler);
    },
    skipWaiting: () => {},
    clients: { claim: () => {}, matchAll: async () => [] },
    location: { origin: "https://app.test" },
    registration: { showNotification: async () => {} },
    navigator: {},
  };

  const caches = {
    open: vi.fn(async () => {
      openedCaches += 1;
      return cache;
    }),
    keys: vi.fn(async () => []),
    delete: vi.fn(async () => true),
    match: vi.fn(async (value: Request | string) => {
      const path =
        typeof value === "string" ? value : new URL(value.url).pathname;
      if (path === "/offline.html") return offlineResponse ?? undefined;
      if (path.startsWith("/_next/static/")) {
        return cachedStaticResponse ?? undefined;
      }
      return undefined;
    }),
  };

  const fakeFetch = vi.fn(async () => {
    fetchCalls += 1;
    if (networkError) throw networkError;
    return networkResponse;
  });

  new Function("self", "caches", "fetch", SOURCE)(scope, caches, fakeFetch);

  fetchHandler = listeners.get("fetch")!;
  installHandler = listeners.get("install") as unknown as InstallHandler;
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
): Promise<{ tookOver: boolean; response: Response | null }> {
  let responded: Promise<Response> | Response | undefined;

  fetchHandler({
    request: req,
    respondWith: (value) => {
      responded = value;
    },
  });

  if (responded === undefined) return { tookOver: false, response: null };

  return { tookOver: true, response: await responded };
}

beforeEach(() => {
  putCalls = [];
  addCalls = [];
  openedCaches = 0;
  fetchCalls = 0;
  networkResponse = new Response("body", { status: 200 });
  networkError = null;
  offlineResponse = null;
  cachedStaticResponse = null;
  cachePutError = null;
  loadServiceWorker();
});

describe("service worker cache boundaries", () => {
  it("precaches only the public offline page", async () => {
    let installation: Promise<unknown> | null = null;

    installHandler({
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
    networkResponse = new Response("partial", { status: 206 });

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
    cachedStaticResponse = new Response("cached", { status: 200 });

    const result = await handle(
      request("https://app.test/_next/static/chunks/app.js"),
    );

    expect(await result.response?.text()).toBe("cached");
    expect(fetchCalls).toBe(0);
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
    await new Promise((resolve) => setTimeout(resolve, 20));

    window.removeEventListener("unhandledrejection", onUnhandled);
    expect(unhandled).toEqual([]);
  });

  it("stays out of the way of API routes and other origins", async () => {
    const api = await handle(request("https://app.test/api/daily-news"));
    const other = await handle(request("https://elsewhere.test/thing.js"));

    expect(api.tookOver).toBe(false);
    expect(other.tookOver).toBe(false);
  });

  it("never caches or takes over protected pages and RSC payloads", async () => {
    const page = await handle(request("https://app.test/home"));
    const rsc = await handle(
      request("https://app.test/home?_rsc=private", { rsc: "1" }),
    );

    expect(page.tookOver).toBe(false);
    expect(rsc.tookOver).toBe(false);
    expect(putCalls).toEqual([]);
    expect(openedCaches).toBe(0);
  });

  it("uses only the static offline page when a navigation fails", async () => {
    networkError = new Error("offline");
    offlineResponse = new Response("safe offline shell", { status: 200 });

    const result = await handle(navigationRequest("https://app.test/home"));

    expect(result.tookOver).toBe(true);
    expect(await result.response?.text()).toBe("safe offline shell");
    expect(putCalls).toEqual([]);
  });
});
