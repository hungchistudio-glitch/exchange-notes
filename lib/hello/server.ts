import "server-only";

import { randomBytes } from "node:crypto";

import { GoogleGenAI } from "@google/genai";

import { getTextModelCandidates } from "@/lib/ai/modelConfig";
import { generateJson } from "@/lib/ai/modelRequest";
import {
  HELLO_PARTS_OF_SPEECH,
  HELLO_SENSE_SCHEMA,
  buildHelloSensePrompt,
  type HelloSenseKnown,
} from "@/lib/ai/prompts/helloSense";
import { tryModels } from "@/lib/ai/tryModels";
import { tidyChineseDeep } from "@/lib/chinese/tidyChinese";
import { LANGUAGE_CODES, isLanguageCode, type LanguageCode } from "@/lib/languages";
import { getPhonetics } from "@/lib/pronunciation";
import { transcribe } from "@/lib/pronunciation/ipaSource";
import { cleanOutfit, sameOutfit, type YumiOutfit } from "@/lib/shop/catalog";

import { isValidPair } from "./pairs";
import { cleanHelloText, cleanSenderName, HELLO_TEXT_MAX } from "./text";
import type { HelloLookup, HelloSense, HelloSide, HelloSnapshot } from "./types";
import { isHelloId } from "./url";

/* =========================================================
   Yumi's hello, on the server

   What the routes under app/api/hello share: making an id, cleaning what
   a client sends before any of it is stored, reading the database's public
   snapshot back into the shape the page draws, and putting a sense into
   the five languages.

   Cleaning is strict because whatever is stored here is shown to anyone
   with the link under the sharer's name: a side is a word or a short
   gloss, never a link, an address, a phone number or a way to be
   contacted somewhere else (lib/hello/text.ts).
   ========================================================= */

export const HELLO_POSTER_BUCKET = "yumi-hellos";

/** Twelve characters of base64url: 72 random bits. */
export function newHelloId(): string {
  return randomBytes(9).toString("base64url");
}

const MAX_PHONETIC = 120;

export function cleanText(value: unknown, max = HELLO_TEXT_MAX): string | null {
  return cleanHelloText(value, max);
}

function cleanPhonetic(value: unknown): HelloSide["phonetic"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const phonetic: NonNullable<HelloSide["phonetic"]> = {};
  for (const key of ["ipa", "zhuyin", "pinyin"] as const) {
    const text = cleanText(source[key], MAX_PHONETIC);
    if (text) phonetic[key] = text;
  }
  return Object.keys(phonetic).length ? phonetic : undefined;
}

export function cleanPartOfSpeech(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const key = value.trim().toLowerCase();
  return (HELLO_PARTS_OF_SPEECH as readonly string[]).includes(key) ? key : undefined;
}

export function cleanSide(value: unknown): HelloSide | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const text = cleanText(source.text);
  if (!text) return null;
  const side: HelloSide = { text };
  const partOfSpeech = cleanPartOfSpeech(source.partOfSpeech);
  if (partOfSpeech) side.partOfSpeech = partOfSpeech;
  const phonetic = cleanPhonetic(source.phonetic);
  if (phonetic) side.phonetic = phonetic;
  return side;
}

export function cleanSense(value: unknown): HelloSense {
  const sense: HelloSense = {};
  if (!value || typeof value !== "object") return sense;
  for (const language of LANGUAGE_CODES) {
    const side = cleanSide((value as Record<string, unknown>)[language]);
    if (side) sense[language] = side;
  }
  return sense;
}

export function posterPublicUrl(path: unknown): string | null {
  if (typeof path !== "string" || !/^[A-Za-z0-9_-]{12}\/[A-Za-z0-9_-]{8,40}\.png$/.test(path)) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/${HELLO_POSTER_BUCKET}/${path}` : null;
}

/**
 * What get_yumi_hello returned, as the page draws it — re-checked rather
 * than trusted, the way cached lookups are (lib/lexicon/types.ts).
 *
 * An outfit piece the shop no longer knows is dropped by cleanOutfit, and
 * the hello says so (`complete`), so the page shows the picture taken when
 * it was made instead of a Yumi dressed differently from the one sent.
 */
export function lookupFromRpc(value: unknown): HelloLookup {
  if (!value || typeof value !== "object") return { status: "missing" };
  const row = value as Record<string, unknown>;
  if (row.status === "revoked") return { status: "revoked" };
  if (row.status !== "active" || !row.hello || typeof row.hello !== "object") return { status: "missing" };

  const hello = row.hello as Record<string, unknown>;
  const sender = (hello.sender ?? {}) as Record<string, unknown>;
  const yumi = (hello.yumi ?? {}) as Record<string, unknown>;
  const pair = Array.isArray(hello.pair) ? hello.pair : [];
  const exchangeId = typeof sender.exchangeId === "string" ? sender.exchangeId : "";

  if (!isHelloId(hello.id) || !exchangeId || !isValidPair(pair) || !isLanguageCode(hello.source)) {
    return { status: "missing" };
  }

  const savedOutfit = (yumi.outfit && typeof yumi.outfit === "object" ? yumi.outfit : {}) as YumiOutfit;
  const outfit = cleanOutfit(savedOutfit);
  const complete = sameOutfit(outfit, savedOutfit as YumiOutfit) && Object.keys(savedOutfit).length === Object.keys(outfit).length;

  const snapshot: HelloSnapshot = {
    id: hello.id,
    version: 1,
    createdAt: typeof hello.createdAt === "string" ? hello.createdAt : new Date(0).toISOString(),
    sender: {
      name: cleanSenderName(sender.name),
      exchangeId,
    },
    yumi: {
      outfit,
      mode: yumi.mode === "yumi-cosmic" ? "yumi-cosmic" : "standard",
      posterUrl: posterPublicUrl(yumi.posterPath),
      complete,
    },
    pair,
    source: hello.source,
    sense: cleanSense(hello.sense),
  };

  return { status: "active", hello: snapshot };
}

/* ── Putting a sense into the five languages ──────────────────────────── */

type Budget = { consume: () => Promise<boolean>; refund: () => Promise<void> };

async function phoneticFor(text: string, language: LanguageCode, budget?: Budget): Promise<HelloSide["phonetic"]> {
  if (language === "zh-TW") {
    const { zhuyin, pinyin } = getPhonetics(text, "zh-TW");
    return zhuyin || pinyin ? { ...(zhuyin ? { zhuyin } : {}), ...(pinyin ? { pinyin } : {}) } : undefined;
  }
  try {
    const { found } = await transcribe([text], language, budget);
    const ipa = [...found.values()][0];
    return ipa ? { ipa } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The missing sides of a sense, from the known ones: one model call for
 * all of them, then each side's phonetics. A side the model leaves out, or
 * answers with something that does not clean, is simply missing — shown
 * as missing, never as the source word in its place.
 */
export async function completeSense(
  known: readonly HelloSenseKnown[],
  targets: readonly LanguageCode[],
  options: { ipaBudget?: Budget } = {},
): Promise<{ sides: HelloSense; modelFailed: boolean }> {
  const sides: HelloSense = {};
  let modelFailed = false;
  const apiKey = process.env.GEMINI_API_KEY;

  if (targets.length && apiKey) {
    try {
      const client = new GoogleGenAI({ apiKey });
      const { value } = await tryModels(getTextModelCandidates(), (model, timeoutMs) =>
        generateJson(client, {
          purpose: "hello-sense",
          model,
          input: buildHelloSensePrompt(known, targets),
          schema: HELLO_SENSE_SCHEMA,
          timeoutMs,
        }),
      );
      const parsed = tidyChineseDeep(JSON.parse(value.replace(/^```json\s*|```$/g, "").trim())) as {
        sides?: Array<{ language?: string; text?: string; partOfSpeech?: string }>;
      };
      for (const answer of parsed.sides ?? []) {
        const language = answer?.language;
        if (!isLanguageCode(language) || !targets.includes(language) || sides[language]) continue;
        const side = cleanSide(answer);
        if (side) sides[language] = side;
      }
    } catch {
      modelFailed = true;
    }
  } else if (targets.length) {
    modelFailed = true;
  }

  await Promise.all(
    (Object.keys(sides) as LanguageCode[]).map(async (language) => {
      const side = sides[language];
      if (!side) return;
      const phonetic = await phoneticFor(side.text, language, options.ipaBudget);
      if (phonetic) side.phonetic = phonetic;
    }),
  );

  return { sides, modelFailed };
}

/** Phonetics for the sides the sharer already had, made the same way. */
export async function withPhonetics(sense: HelloSense, budget?: Budget): Promise<HelloSense> {
  const next: HelloSense = { ...sense };
  await Promise.all(
    (Object.keys(next) as LanguageCode[]).map(async (language) => {
      const side = next[language];
      if (!side || side.phonetic) return;
      const phonetic = await phoneticFor(side.text, language, budget);
      if (phonetic) next[language] = { ...side, phonetic };
    }),
  );
  return next;
}
