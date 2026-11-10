import { createBrowserClient } from "@supabase/ssr";

import { SLOW_NETWORK_MS, reportSlowNetwork } from "@/hooks/useOnline";

/* =========================================================
   Five seconds to start answering

   The browser's Supabase client had no time limit at all. On a weak signal a
   read neither failed nor arrived: it simply waited, and so did every screen
   behind it. A spinner that never resolves, while the words it is waiting
   for are already on the phone, is what the app felt like on a train
   (Chi, 2026-11-10: "收訊不好時…整體使用不順暢").

   So a read gets five seconds (Chi chose five over three and eight) to start
   answering, and then fails the way a dropped connection fails: with a
   TypeError, which every screen with a device copy already falls back on.

   - **Only reads.** GET and HEAD. A write that is given up on may still have
     landed, and sending it again is how a word gets saved twice; uploads and
     saves wait as long as they need ("上傳照片、儲存這類會等更久").
   - **To the first byte, not the last.** The timer stops when the headers
     arrive. A large library on a slow line is still arriving, not stuck, and
     cutting it off would mean it never refreshes on exactly that line.
   - **The caller's own signal still works.** A query aborted by its screen
     aborts here too.
   ========================================================= */

export { SLOW_NETWORK_MS };

/** A read given up on for being slow. A TypeError, as a lost connection is. */
export class SlowNetworkError extends TypeError {
  constructor() {
    super("The network was too slow to answer.");
    this.name = "SlowNetworkError";
  }
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  const method =
    init?.method ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");
  return method.toUpperCase();
}

function signalOf(input: RequestInfo | URL, init?: RequestInit): AbortSignal | undefined {
  if (init?.signal) return init.signal;
  return typeof Request !== "undefined" && input instanceof Request ? input.signal : undefined;
}

export function withFirstByteTimeout(
  fetchImpl: typeof fetch = (...args) => fetch(...args),
  ms: number = SLOW_NETWORK_MS,
): typeof fetch {
  return async (input, init) => {
    const method = methodOf(input, init);
    if (method !== "GET" && method !== "HEAD") return fetchImpl(input, init);

    const controller = new AbortController();
    const outer = signalOf(input, init);
    if (outer?.aborted) controller.abort(outer.reason);
    /*
     * Kept after the headers arrive: the body is read through this
     * controller's signal, and the caller may still want to stop that.
     */
    outer?.addEventListener("abort", () => controller.abort(outer.reason), { once: true });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, ms);

    try {
      return await fetchImpl(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (timedOut) {
        reportSlowNetwork();
        throw new SlowNetworkError();
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}

/*
 * Here rather than in a module of its own: every tab imports this file, and
 * tests/routeImportWeight.test.ts holds the count of what they import.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables.");
  }

  /*
   * Reads give up after five seconds without an answer, so a weak signal
   * falls back to the device's copy instead of waiting on it. Writes are left
   * alone. See withFirstByteTimeout above.
   */
  return createBrowserClient(url, key, {
    global: { fetch: withFirstByteTimeout() },
  });
}
