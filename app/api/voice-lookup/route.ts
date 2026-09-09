import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { getTextModelCandidates } from "@/lib/ai/modelConfig";
import { LANGUAGE_CODES, isLanguageCode } from "@/lib/languages";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

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
 * A model hears the audio without being told what to expect. It is slower
 * and it costs a request, which is why the browser goes first and this is
 * only reached when the browser came back with nothing usable.
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

/** Audio the browsers involved actually produce, and a ceiling. */
const ACCEPTED_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
];

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
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

    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const base64 = Buffer.from(await audio.arrayBuffer()).toString("base64");

    let lastError: unknown = null;

    for (const model of getTextModelCandidates()) {
      try {
        const interaction = await client.interactions.create({
          model,
          input: [
            {
              type: "text",
              text: [
                "Listen to this audio and write down the single word or short phrase that was said.",
                "",
                "Rules:",
                `- Identify which language it is in. Answer with one of: ${LANGUAGE_CODES.join(", ")}.`,
                "- Write the text in that language's own spelling and script.",
                "- For zh-TW write Traditional characters, never Simplified.",
                "- Just the word or phrase — no punctuation, no sentence around it.",
                "- Set confident to false if the audio is unclear, silent, or in none of those languages. Do not guess.",
              ].join("\n"),
            },
            {
              type: "audio",
              mime_type: mimeType,
              data: base64,
            },
          ],
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: RESULT_SCHEMA,
          },
          store: false,
        });

        const raw =
          typeof interaction.output_text === "string"
            ? interaction.output_text
            : "";

        const parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim()) as {
          text?: string;
          language?: string;
          confident?: boolean;
        };

        const text = parsed.text?.trim() ?? "";

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
        lastError = error;
      }
    }

    console.error("Voice lookup failed:", lastError);

    return NextResponse.json({ heard: false });
  } catch (error) {
    console.error("Voice lookup failed:", error);

    return NextResponse.json({ heard: false });
  }
}
