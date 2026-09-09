import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The service worker and the audio it kept choking on

   Every request for a pronunciation clip produced this in the console of
   anyone signed in:

     Uncaught (in promise) TypeError: Failed to execute 'put' on 'Cache':
     Partial response (status code 206) is unsupported

   A media element asks for audio with a Range header and gets a 206 back.
   `response.ok` is true across the whole 2xx range, so the 206 reached
   cache.put(), which refuses partial responses — and the rejection was
   neither caught nor awaited, so it surfaced as an uncaught error once per
   request.

   Two things are wrong with answering a ranged media request here at all,
   and only one of them is the console noise. The other is that respondWith
   makes this worker responsible for range semantics it does not implement:
   the offline fallback can hand a cached 200 to a request that asked for a
   byte range, which a media element is entitled to reject.
   ========================================================= */

type FetchHandler = (event: FakeFetchEvent) => void;

type FakeFetchEvent = {
  request: Request;
  respondWith: (response: Promise<Response> | Response) => void;
};

const SOURCE = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");

let fetchHandler: FetchHandler;
let putCalls: Array<{ url: string; status: number }>;
let openedCaches: number;
let networkResponse: Response;

function loadServiceWorker() {
  const listeners = new Map<string, FetchHandler>();

  const cache = {
    put: vi.fn(async (request: Request, response: Response) => {
      putCalls.push({ url: request.url, status: response.status });

      // What the real Cache API does with anything that is not a plain 200.
      if (response.status !== 200) {
        throw new TypeError(
          "Failed to execute 'put' on 'Cache': Partial response (status code 206) is unsupported",
        );
      }
    }),
    add: vi.fn(async () => {}),
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
    match: vi.fn(async () => undefined),
  };

  const fakeFetch = vi.fn(async () => networkResponse);

  new Function("self", "caches", "fetch", SOURCE)(scope, caches, fakeFetch);

  fetchHandler = listeners.get("fetch")!;
}

function request(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
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
  openedCaches = 0;
  networkResponse = new Response("body", { status: 200 });
  loadServiceWorker();
});

describe("what the worker does with a media request", () => {
  it("leaves a ranged request to the browser entirely", async () => {
    const result = await handle(
      request("https://app.test/audio/zhuyin/a.mp3", {
        range: "bytes=0-",
      }),
    );

    expect(result.tookOver).toBe(false);
    expect(openedCaches).toBe(0);
  });

  it("never asks the cache to store a partial response", async () => {
    networkResponse = new Response("partial", { status: 206 });

    const result = await handle(
      request("https://app.test/audio/zhuyin/a.mp3"),
    );

    // Not a ranged request, so it is answered — but a 206 is not storable,
    // and this is the put() that used to throw into the console.
    expect(result.response?.status).toBe(206);
    expect(putCalls).toEqual([]);
  });

  it("still caches an ordinary 200", async () => {
    const result = await handle(request("https://app.test/home"));

    expect(result.tookOver).toBe(true);
    expect(result.response?.status).toBe(200);

    await vi.waitFor(() => expect(putCalls).toHaveLength(1));
    expect(putCalls[0].status).toBe(200);
  });

  it("does not let a refused cache write become an uncaught rejection", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (event: PromiseRejectionEvent) => {
      unhandled.push(event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", onUnhandled);

    // A 200 that the cache refuses anyway — a quota error, say.
    networkResponse = new Response("body", { status: 200 });
    await handle(request("https://app.test/home"));
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
});
