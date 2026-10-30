import { describe, expect, it, vi } from "vitest";

import { askTwice, withSignal } from "@/lib/supabase/retry";

/* =========================================================
   The protected layout's second asking reaches the database

   Next memoizes a GET with the same URL and options for the length of a
   render, so a retry built the same way as the first read was answered
   from memory with the same refusal (2026-10-28). The retry carries an
   AbortSignal of its own, which opts it out.
   ========================================================= */

describe("askTwice", () => {
  it("asks once when the first answer is good, with no signal", async () => {
    const read = vi.fn<(signal?: AbortSignal) => Promise<{ data: number; error: null }>>(async () => ({ data: 1, error: null }));
    await expect(askTwice(read)).resolves.toEqual({ data: 1, error: null });
    expect(read).toHaveBeenCalledTimes(1);
    expect(read.mock.calls[0][0]).toBeUndefined();
  });

  it("asks again after a refusal, with a signal so the fetch is not memoized", async () => {
    const read = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST303" } })
      .mockResolvedValueOnce({ data: 2, error: null });
    await expect(askTwice(read)).resolves.toEqual({ data: 2, error: null });
    expect(read).toHaveBeenCalledTimes(2);
    expect(read.mock.calls[1][0]).toBeInstanceOf(AbortSignal);
  });
});

describe("withSignal", () => {
  it("sets the signal on the query only when there is one", () => {
    const query = { abortSignal: vi.fn(function (this: unknown) { return this; }) };
    withSignal(query as never);
    expect(query.abortSignal).not.toHaveBeenCalled();
    const signal = new AbortController().signal;
    withSignal(query as never, signal);
    expect(query.abortSignal).toHaveBeenCalledWith(signal);
  });
});
