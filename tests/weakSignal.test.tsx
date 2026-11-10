import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OfflineBanner from "@/components/foundation/OfflineBanner";
import useOnline, {
  WEAK_SIGNAL_HOLD_MS,
  reportNetworkFailure,
  reportNetworkSuccess,
  useNetworkQuality,
} from "@/hooks/useOnline";
import { SLOW_NETWORK_MS, SlowNetworkError, withFirstByteTimeout } from "@/lib/supabase/client";

/*
 * On a weak signal a read used to wait for as long as the network took,
 * and the screen with it (2026-11-10). It now gets five seconds to start
 * answering, then fails like a dropped connection, and the app says the
 * signal is weak rather than that it is offline.
 */

vi.mock("@/lib/offline/vocabulary", () => ({
  readOutbox: async () => [],
  subscribeToOutbox: () => () => {},
}));

function hanging(): typeof fetch {
  return vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
  ) as unknown as typeof fetch;
}

/*
 * Each test an hour after the last: the weak window is measured on the
 * clock, and a fresh fake clock starting at the real time would put the next
 * test back inside the previous one's.
 */
let clock = Date.now();
beforeEach(() => {
  clock += 3_600_000;
  vi.useFakeTimers({ now: clock });
});

afterEach(async () => {
  // Let any weak signal a test reported run out, so the next starts clean.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(WEAK_SIGNAL_HOLD_MS);
  });
  reportNetworkSuccess();
  vi.useRealTimers();
});

describe("a read on a weak signal", () => {
  it("gives up after five seconds without an answer, as a network error", async () => {
    const fetchWithLimit = withFirstByteTimeout(hanging());
    const reading = fetchWithLimit("https://db.test/rest/v1/vocabulary_items");
    const failed = expect(reading).rejects.toBeInstanceOf(SlowNetworkError);

    await vi.advanceTimersByTimeAsync(SLOW_NETWORK_MS);
    await failed;
    await expect(reading).rejects.toBeInstanceOf(TypeError);
  });

  it("is not cut off once it has started answering", async () => {
    const slowStart = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, SLOW_NETWORK_MS - 1_000));
      return new Response("words");
    }) as unknown as typeof fetch;

    const reading = withFirstByteTimeout(slowStart)("https://db.test/rest/v1/vocabulary_items");
    await vi.advanceTimersByTimeAsync(SLOW_NETWORK_MS - 1_000);
    const response = await reading;
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await response.text()).toBe("words");
  });

  it("never gives up on a write", async () => {
    const network = hanging();
    let settled = false;
    void withFirstByteTimeout(network)("https://db.test/rest/v1/vocabulary_items", { method: "POST" }).then(
      () => (settled = true),
      () => (settled = true),
    );

    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe(false);
  });

  it("still stops when its screen stops it", async () => {
    const controller = new AbortController();
    const reading = withFirstByteTimeout(hanging())("https://db.test/x", { signal: controller.signal });
    const stopped = expect(reading).rejects.toHaveProperty("name", "AbortError");

    controller.abort();
    await stopped;
  });
});

describe("what the app says about it", () => {
  it("says weak, not offline, and stays online for what still works", async () => {
    const quality = renderHook(useNetworkQuality);
    const online = renderHook(useOnline);

    const reading = withFirstByteTimeout(hanging())("https://db.test/x");
    reading.catch(() => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SLOW_NETWORK_MS);
    });
    // The screen that fell back reports a network failure; it is weak still.
    act(() => reportNetworkFailure());

    expect(quality.result.current).toBe("weak");
    expect(online.result.current).toBe(true);
  });

  it("stops saying so a while after the last slow answer", async () => {
    const quality = renderHook(useNetworkQuality);
    withFirstByteTimeout(hanging())("https://db.test/x").catch(() => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SLOW_NETWORK_MS);
    });
    expect(quality.result.current).toBe("weak");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(WEAK_SIGNAL_HOLD_MS);
    });
    expect(quality.result.current).toBe("good");
  });

  it("shows the weak-signal notice in the reader's language", async () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole("status")).toBeNull();

    withFirstByteTimeout(hanging())("https://db.test/x").catch(() => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SLOW_NETWORK_MS);
    });

    expect(screen.getByRole("status").textContent).toContain("Weak signal");
  });
});
