import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import {
  getTextModelCandidates,
  readBoundedInteger,
} from "@/lib/ai/modelConfig";
import {
  consumeDailyQuota,
  refundDailyQuota,
} from "@/lib/ai/dailyQuota";
import { LANGUAGE_CODES, isLanguageCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";

import { generateJson } from "@/lib/ai/modelRequest";
import { tryModels } from "@/lib/ai/tryModels";
export const runtime = "nodejs";
/*
 * 45, like the word lookup: a recording can now be a minute of speech
 * rather than one word, and a minute takes the model longer to hear.
 */
export const maxDuration = 45;

/* Room inside maxDuration for auth, the upload and the quota refund. */
const ROUTE_BUDGET_MS = 36_000;

/*
 * What was said, and what language it was said in.
 *
 * The browser's own speech recognition has to be told the language before
 * it listens, and it will not tell you it guessed wrong — it returns
 * whatever the words it was expecting sound closest to. That is fine when
 * the reader is dictating the language they are studying, and useless when
 * they hold the phone up to someone speaking something else, which is the
 * case this exists for.
 *
 * A model hears the audio without being told what to expect, and it hears
 * the whole of it: a sentence with its pauses, its punctuation and its
 * language, where the browser stopped at the first breath. So every
 * recording comes here now, and the browser's own transcript is only the
 * caption shown while the reader speaks (hooks/useVoiceInput.ts).
 *
 * This route only writes down what was said. What it means is the lookup's
 * job (/api/classify-text), the same one a typed sentence gets.
 */

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: { type: "string" },
    language: { type: "string" },
    confident: { type: "boolean" },
  },
  required: ["text", "language", "confident"],
} as const;

/** Audio the browsers involved actually produce, and a ceiling. A minute of
 *  speech is well under a megabyte in every format below. */
const ACCEPTED_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
];

const MAX_BYTES = 4 * 1024 * 1024;
/* The same ceiling /api/classify-text accepts, since that is where it goes next. */
const MAX_TRANSCRIPT_LENGTH = 1_000;
const OPERATION = "voice_lookup" as const;
const MAX_REQUESTS_PER_DAY = readBoundedInteger(
  process.env.VOICE_LOOKUP_DAILY_USER_LIMIT,
  20,
  1,
  200,
);

export async function POST(request: Request) {
  const startedAt = Date.now();
  let chargedUserId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const audio = form.get("audio");

    if (!(audio instanceof Blob)) {
      return NextResponse.json({ error: "No audio" }, { status: 400 });
    }

    if (audio.size === 0 || audio.size > MAX_BYTES) {
      return NextResponse.json({ error: "Audio out of range" }, { status: 400 });
    }

    const mimeType = (audio.type || "audio/webm").split(";")[0];

    if (!ACCEPTED_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: "Unsupported audio" }, { status: 415 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    }

    if (
      !(await consumeDailyQuota(user.id, OPERATION, MAX_REQUESTS_PER_DAY))
    ) {
      return NextResponse.json(
        { error: "Daily voice lookup limit reached", code: "daily_limit" },
        { status: 429 },
      );
    }

    chargedUserId = user.id;

    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const base64 = Buffer.from(await audio.arrayBuffer()).toString("base64");

    /*
     * Healthy models only, three at most, inside the route's budget
     * — see lib/ai/tryModels.ts. A malformed answer counts as a failed
     * attempt and moves on, as it always did.
     */
    const { value: parsed } = await tryModels(
      getTextModelCandidates(),
      async (model, timeoutMs) => {
        const raw = await generateJson(client, {
          purpose: "voice-lookup",
          model,
          input: [
            {
              text: [
                "Listen to this recording and write down exactly what was said.",
                "",
                "It may be a single word, a short phrase, or one or more full sentences — someone looking a word up, or someone the reader is listening to in conversation.",
                "",
                "Rules:",
                `- Identify which language it is in. Answer with one of: ${LANGUAGE_CODES.join(", ")}. If more than one is spoken, answer with the one most of it is in.`,
                "- Write the text in that language's own spelling and script.",
                "- For zh-TW write Traditional characters, never Simplified, with full-width Chinese punctuation.",
                "- A lone word or a short name for something: just the word, no punctuation.",
                "- Anything said as a sentence: write it as a sentence, with the capitalisation and punctuation a careful transcriber would use, including the question mark on a question.",
                "- Write what was said, not a summary, a correction or a translation. Leave out fillers such as um and uh, and false starts the speaker corrected.",
                "- Set confident to false if you could not make out what was said: silence, noise, or a language not in the list. Do not guess. A clear recording with one unclear word is still confident; write your best reading of that word.",
              ].join("\n"),
            },
            { media: { data: base64, mimeType } },
          ],
          schema: RESULT_SCHEMA,
          timeoutMs,
          /* A recording, like a photograph, is slower than a word; its
             timeout says little about the model's text lookups. */
          shareTimeouts: false,
        });

        return JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim()) as {
          text?: string;
          language?: string;
          confident?: boolean;
        };
      },
      { deadline: startedAt + ROUTE_BUDGET_MS },
    );

    /* The lookup takes at most MAX_TRANSCRIPT_LENGTH; a minute of fast speech can run past it. */
    const text = (parsed.text?.trim() ?? "").slice(0, MAX_TRANSCRIPT_LENGTH).trim();

    // A clear "nothing heard" is still a completed model answer. Only
    // transport/model failures below receive a refund.
    chargedUserId = null;

    /*
     * An unconfident answer is no answer. A word invented from silence
     * or from a language the app does not teach would be looked up,
     * saved, and studied — and it would be nobody's word.
     */
    if (!text || parsed.confident === false || !isLanguageCode(parsed.language)) {
      return NextResponse.json({ heard: false });
    }

    return NextResponse.json({
      heard: true,
      text,
      language: parsed.language,
    });
  } catch (error) {
    if (chargedUserId) {
      await refundDailyQuota(chargedUserId, OPERATION);
    }

    console.error("Voice lookup failed:", error);

    // `failed` tells the client this was not "nothing was said", so it can
    // say the service is unavailable rather than that it did not hear.
    return NextResponse.json({ heard: false, failed: true });
  }
}
