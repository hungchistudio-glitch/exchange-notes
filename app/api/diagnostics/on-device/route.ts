import { NextResponse } from "next/server";

import { recordAiFailure } from "@/lib/ai/callLog";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/* =========================================================
   What the phone's own recogniser did

   Chi, 2026-09-28, on an iPhone home-screen app: a photo during a Google
   outage showed nothing at all — not even the phone's first answer. The
   recogniser runs entirely in the browser, so nothing about it reached the
   server, and there was no way to tell "it never loaded on this phone" from
   "it loaded and was not sure enough" from "it saw something it has no word
   for".

   So the phone reports each photograph's outcome here, and a load failure
   once per page. Written to ai_call_log (reason "on_device"), never with the
   photo, the reader's id or their text — only the outcome, how long it took,
   the best everyday word it had with its score, the error if any, and the
   browser's own name for itself.
   ========================================================= */

const OUTCOMES = new Set([
  "answered",
  "no_word",
  "unavailable",
  "not_ready",
  "failed",
]);

type Report = {
  outcome?: unknown;
  ms?: unknown;
  word?: unknown;
  score?: unknown;
  raw?: unknown;
  error?: unknown;
};

function text(value: unknown, limit: number) {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return new NextResponse(null, { status: 401 });

    const report = (await request.json()) as Report;
    const outcome = text(report.outcome, 20);
    if (!OUTCOMES.has(outcome)) return new NextResponse(null, { status: 400 });

    const ms = typeof report.ms === "number" && Number.isFinite(report.ms) ? report.ms : 0;
    const score =
      typeof report.score === "number" && Number.isFinite(report.score)
        ? report.score.toFixed(2)
        : "";
    const word = text(report.word, 40);
    const raw = text(report.raw, 60);
    const error = text(report.error, 160);
    const agent = (request.headers.get("user-agent") ?? "").slice(0, 160);

    recordAiFailure({
      purpose: "on-device-camera",
      model: "efficientnet-lite0",
      reason: "on_device",
      status: null,
      ms,
      detail: [
        outcome,
        word ? `word=${word}` : "",
        score ? `score=${score}` : "",
        raw ? `top=${raw}` : "",
        error ? `error=${error}` : "",
        agent ? `ua=${agent}` : "",
      ]
        .filter(Boolean)
        .join("; "),
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
