import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import {
  getTextModelCandidates,
  getVisionModelCandidates,
} from "@/lib/ai/modelConfig";
import { generateJson, getErrorStatus } from "@/lib/ai/modelRequest";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

/* =========================================================
   What Gemini actually says, from where the app stands

   ── Why this exists ────────────────────────────────────────────────────

   Between 18 and 23 September every model call in this app stopped coming
   back. Not refused, not rate-limited: no reply, across four model names, on
   every route that reaches Gemini. Diagnosing it from the outside took
   reading production logs and inferring the cause from two TimeoutErrors and
   a 503 — and every fix attempted since has been a guess tested by shipping
   it and asking somebody to try the camera again.

   This is the ten-second version of that loop. It asks each configured model
   for the smallest possible answer and reports exactly what came back: the
   status, the time it took, and the first line of the error. A run of this
   distinguishes the three things that look identical from the app — a key
   without quota, a model that is gone, and an endpoint that is not
   answering — and it does it without anyone having to photograph a coffee
   cup.

   ── What it will not do ────────────────────────────────────────────────

   It never returns the key, or any part of it beyond whether one is set and
   how long it is. It is signed-in only. And it sends the shortest prompt
   that can still prove a round trip, so running it costs a few tokens.
   ========================================================= */

/** Small enough to be free in practice, real enough to prove a round trip. */
const PROBE_SCHEMA = {
  type: "object",
  properties: { ok: { type: "boolean" } },
  required: ["ok"],
} as const;

const PROBE_TIMEOUT_MS = 12_000;

type Attempt = {
  model: string;
  ok: boolean;
  ms: number;
  status: number | null;
  /** "timeout" when nothing came back at all — the failure this exists for. */
  kind: "answered" | "timeout" | "refused";
  detail: string | null;
};

async function probe(client: GoogleGenAI, model: string): Promise<Attempt> {
  const startedAt = Date.now();

  try {
    const text = await generateJson(client, {
      model,
      input: 'Reply with {"ok":true} and nothing else.',
      schema: PROBE_SCHEMA,
      timeoutMs: PROBE_TIMEOUT_MS,
    });

    return {
      model,
      ok: true,
      ms: Date.now() - startedAt,
      status: 200,
      kind: "answered",
      detail: text.slice(0, 400),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : "";
    const timedOut =
      name === "TimeoutError" ||
      name === "AbortError" ||
      /timed out|aborted due to timeout/i.test(message);

    return {
      model,
      ok: false,
      ms: Date.now() - startedAt,
      status: getErrorStatus(error),
      kind: timedOut ? "timeout" : "refused",
      detail: message.slice(0, 600),
    };
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please sign in before running diagnostics." },
      { status: 401 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  /*
   * The shape of the key, never the key. A missing one and a truncated one
   * fail in different ways and neither is visible from the app.
   */
  const key = {
    present: Boolean(apiKey),
    length: apiKey?.length ?? 0,
  };

  if (!apiKey) {
    return NextResponse.json(
      { key, error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const client = new GoogleGenAI({ apiKey });

  /*
   * Text and vision share a candidate list unless the environment splits
   * them, so the set is deduplicated — this is a diagnosis, not a benchmark,
   * and asking the same model twice only spends more of the quota that may
   * be the problem.
   */
  const models = [
    ...new Set([...getTextModelCandidates(), ...getVisionModelCandidates()]),
  ];

  // In sequence rather than at once: a key that is out of quota answers
  // differently under three simultaneous requests than under one.
  const attempts: Attempt[] = [];
  for (const model of models) attempts.push(await probe(client, model));

  const answered = attempts.filter((attempt) => attempt.ok);
  const timedOut = attempts.filter((attempt) => attempt.kind === "timeout");

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    key,
    endpoint: "models.generateContent",
    models,
    attempts,
    verdict: answered.length
      ? `${answered.length} of ${attempts.length} models answered.`
      : timedOut.length === attempts.length
        ? "No model answered at all — every request timed out. That is the key or the endpoint, not the model."
        : "Every model refused. Read the detail on each attempt.",
  });
}
