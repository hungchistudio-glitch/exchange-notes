/* =========================================================
   Asking a second model before the first has given up

   The candidate list used to be strictly one after another: ask the first,
   wait for it to answer or fail, then ask the next. That is cheap when a
   model fails fast — a quota refusal comes back in 150ms — and ruinous when
   it hangs: gemini-3.6-flash spent 13.5 seconds on a French lookup on
   2026-09-27 before the next model was asked, and that one answered in 1.

   So if the model in front has not answered within `hedgeAfterMs`, the next
   one is asked too, and whichever answers first is the answer. The slower
   one is aborted. At most two are ever in flight.

   The cost is quota: a hedge that fires on a model that was merely slow
   spends a request on the second one. On a free tier of twenty a day per
   model that is real, which is why the delay is several seconds rather
   than one — most answers arrive well inside it.
   ========================================================= */

export type HedgeOptions = {
  /** Ask the next candidate if nothing has answered by now. */
  hedgeAfterMs: number;
  /** When the whole thing must be over, as epoch milliseconds. */
  deadline: number;
  /** No attempt is started with less time than this left. */
  minAttemptMs: number;
  /** No attempt may take longer than this. */
  maxAttemptMs: number;
};

export type Attempt<T> = (
  model: string,
  timeoutMs: number,
  signal: AbortSignal,
) => Promise<T>;

export type AttemptFailure = (
  model: string,
  error: unknown,
  ms: number,
  timeoutMs: number,
) => void;

/**
 * The first candidate to answer, and which one it was — or null if every
 * candidate failed or the deadline left no room to ask.
 *
 * `onFailure` hears about every attempt that failed on its own. An attempt
 * aborted because another one answered first did not fail, and is not
 * reported.
 */
export function firstAnswer<T>(
  models: readonly string[],
  attempt: Attempt<T>,
  options: HedgeOptions,
  onFailure?: AttemptFailure,
): Promise<{ value: T; model: string } | null> {
  return new Promise((resolve) => {
    let next = 0;
    let running = 0;
    let settled = false;
    let hedgeTimer: ReturnType<typeof setTimeout> | null = null;
    const controllers: AbortController[] = [];

    const finish = (result: { value: T; model: string } | null) => {
      if (settled) return;
      settled = true;
      if (hedgeTimer) clearTimeout(hedgeTimer);
      for (const controller of controllers) controller.abort();
      resolve(result);
    };

    const launch = () => {
      if (settled) return;

      if (hedgeTimer) {
        clearTimeout(hedgeTimer);
        hedgeTimer = null;
      }

      const remaining = options.deadline - Date.now();

      if (next >= models.length || remaining < options.minAttemptMs) {
        if (running === 0) finish(null);
        return;
      }

      const model = models[next];
      next += 1;
      running += 1;

      const controller = new AbortController();
      controllers.push(controller);

      const timeoutMs = Math.min(options.maxAttemptMs, remaining);
      const startedAt = Date.now();

      attempt(model, timeoutMs, controller.signal).then(
        (value) => finish({ value, model }),
        (error: unknown) => {
          running -= 1;
          if (settled || controller.signal.aborted) return;
          onFailure?.(model, error, Date.now() - startedAt, timeoutMs);
          launch();
        },
      );

      if (next < models.length && running < 2) {
        hedgeTimer = setTimeout(launch, options.hedgeAfterMs);
      }
    };

    launch();
  });
}
