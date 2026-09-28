import { CORE_MAX_ATTEMPTS } from "@/lib/ai/hedge";
import { backgroundAllowed, healthyModels } from "@/lib/ai/modelHealth";
import { TEXT_REQUEST_TIMEOUT_MS } from "@/lib/ai/modelRequest";

/* =========================================================
   One model after another — under the same rules as everything else

   ── Why this exists ────────────────────────────────────────────────────

   Chi's audit (2026-09-28): "is the whole system too messy — too many
   sources?" It was. Six routes each walked the full candidate list on
   their own terms: every model, one after another, none of them reading
   which models the rest of the app already knew to be busy or out for the
   day. During a Google-wide 503 that was seven refusals per voice lookup,
   and a note interpretation that ran out its thirty seconds before the
   reader saw an error. Three more kept a private Map of cooldowns that no
   other instance could see.

   Now every caller that does not hedge asks through here, and gets the
   same three rules the camera and the word lookup already follow:

   1. Only models the shared health table says are up (lib/ai/modelHealth).
   2. At most CORE_MAX_ATTEMPTS of them — a fourth model does not outrun a
      Google-wide 503, and the reader is better served by the fallback.
   3. Background work (nobody is waiting on it) runs only while the quota
      is comfortable, and then asks one model once — Chi's rule for IPA,
      2026-09-28, applied to everything of that kind.

   What it throws, when nothing answered, is the last model's own error —
   or ModelsUnavailableError when no model was asked at all, so a caller
   can tell "the model said no" from "we did not ask".
   ========================================================= */

export class ModelsUnavailableError extends Error {
  constructor(
    /** "deferred": background work, held back to keep the quota for readers. */
    readonly reason: "none_healthy" | "deferred",
  ) {
    super(
      reason === "deferred"
        ? "Background model work is deferred while the quota is scarce."
        : "Every model is unavailable right now.",
    );
    this.name = "ModelsUnavailableError";
  }
}

export type TryModelsOptions = {
  /** How many models may be asked in all. */
  maxAttempts?: number;
  /** Work nobody is waiting on: gated on spare quota, one model, once. */
  background?: boolean;
  /** What one attempt may take. */
  timeoutMs?: number;
  /**
   * When everything must be over, as epoch milliseconds — normally a little
   * inside the route's maxDuration. No attempt starts with less than
   * `minAttemptMs` left, and none is given more than what remains.
   */
  deadline?: number;
  minAttemptMs?: number;
};

const DEFAULT_MIN_ATTEMPT_MS = 3_000;

export async function tryModels<T>(
  candidates: readonly string[],
  attempt: (model: string, timeoutMs: number) => Promise<T>,
  {
    maxAttempts = CORE_MAX_ATTEMPTS,
    background = false,
    timeoutMs = TEXT_REQUEST_TIMEOUT_MS,
    deadline,
    minAttemptMs = DEFAULT_MIN_ATTEMPT_MS,
  }: TryModelsOptions = {},
): Promise<{ value: T; model: string }> {
  const unique = [...new Set(candidates.map((model) => model.trim()))].filter(
    Boolean,
  );

  if (background && !(await backgroundAllowed(unique))) {
    throw new ModelsUnavailableError("deferred");
  }

  const models = (await healthyModels(unique)).slice(
    0,
    background ? 1 : Math.max(1, maxAttempts),
  );

  let lastError: unknown = null;
  let asked = false;

  for (const model of models) {
    const remaining =
      deadline === undefined ? timeoutMs : deadline - Date.now();
    if (remaining < minAttemptMs) break;

    asked = true;

    try {
      const value = await attempt(model, Math.min(timeoutMs, remaining));
      return { value, model };
    } catch (error) {
      lastError = error;
    }
  }

  if (!asked) throw new ModelsUnavailableError("none_healthy");
  throw lastError;
}
