import { GoogleGenAI } from "@google/genai";

import {
  MIN_MODEL_DEADLINE_MS,
  cooldownMsFor,
  generateJson,
  getErrorStatus,
  isTimeoutError,
  shouldCoolDown,
} from "@/lib/ai/modelRequest";
import {
  allModelsAway,
  dailyQuotaResetAt,
  healthyModels,
  type ModelOutage,
} from "@/lib/ai/modelHealth";

import {
  getMenuModelCandidates,
  readBoundedInteger,
} from "@/lib/ai/modelConfig";
import { toTraditional } from "@/lib/chinese/toTraditional";
import { buildMenuScanPrompt } from "@/lib/ai/prompts/menuScan";
import {
  compactByLanguage,
  tagNeedsTraditionalNormalization,
  type LanguageCode,
} from "@/lib/languages";
import {
  normaliseRegion,
  type MenuConfidence,
  type MenuDocument,
  type MenuItem,
  type MenuRegion,
  type MenuSection,
} from "@/lib/scanner/menuTypes";

/*
 * Reading a menu, understanding its layout and translating it are three
 * stages of one pipeline — and on a multimodal model they are one call. The
 * translation is only as good as the layout that produced it: a dish name
 * separated from its price, or a section heading read as an item, is a
 * mistranslation that no second request could repair without the picture.
 *
 * So the stages stay separately *reported* (see MenuScanProgress) and
 * separately failable, but they are computed together. Sending the photo
 * twice would cost twice and read it worse.
 */


export const MENU_REQUEST_TIMEOUT_MS = readBoundedInteger(
  process.env.MENU_SCAN_TIMEOUT_MS,
  45_000,
  10_000,
  90_000,
);

const REGION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    x: { type: "number", minimum: 0, maximum: 1 },
    y: { type: "number", minimum: 0, maximum: 1 },
    width: { type: "number", minimum: 0, maximum: 1 },
    height: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["x", "y", "width", "height"],
};

const CONFIDENCE_SCHEMA = {
  type: "string",
  enum: ["high", "medium", "low"],
};

/*
 * No maxItems anywhere in here.
 *
 * The API rejects the whole request — 400, "invalid argument" — for a
 * maxItems on an array of objects, while accepting every other constraint in
 * this schema. The caps live in the parser instead, where they are ours to
 * enforce rather than ours to ask for.
 */
const MENU_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    isMenu: { type: "boolean" },
    sourceLanguage: { type: "string", maxLength: 32 },
    detectedCuisine: { type: "string", maxLength: 60 },
    overallConfidence: CONFIDENCE_SCHEMA,
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          sourceTitle: { type: "string", maxLength: 80 },
          englishTitle: { type: "string", maxLength: 100 },
          chineseTitle: { type: "string", maxLength: 100 },
          region: REGION_SCHEMA,
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                sourceName: { type: "string", maxLength: 120 },
                englishName: { type: "string", maxLength: 140 },
                chineseName: { type: "string", maxLength: 140 },
                sourceDescription: { type: "string", maxLength: 300 },
                englishDescription: { type: "string", maxLength: 340 },
                chineseDescription: { type: "string", maxLength: 340 },
                price: { type: "string", maxLength: 24 },
                currency: { type: "string", maxLength: 8 },
                ipa: { type: "string", maxLength: 120 },
                region: REGION_SCHEMA,
                ocrConfidence: CONFIDENCE_SCHEMA,
                translationConfidence: CONFIDENCE_SCHEMA,
              },
              required: [
                "sourceName",
                "englishName",
                "chineseName",
                "sourceDescription",
                "englishDescription",
                "chineseDescription",
                "price",
                "currency",
                "ipa",
                "region",
                "ocrConfidence",
                "translationConfidence",
              ],
            },
          },
        },
        required: [
          "sourceTitle",
          "englishTitle",
          "chineseTitle",
          "region",
          "items",
        ],
      },
    },
  },
  required: [
    "isMenu",
    "sourceLanguage",
    "detectedCuisine",
    "overallConfidence",
    "sections",
  ],
};

// What the schema can no longer ask for. A menu with more sections than this
// is a menu photographed from too far away to read anyway.
const MAX_SECTIONS = 14;
const MAX_ITEMS_PER_SECTION = 40;

/*
 * Put away here, for menus only: a menu's timeout is not shared with the
 * other features (shareTimeouts: false below). Quota refusals are shared
 * app-wide by generateJson, and read back through healthyModels.
 */
const modelCooldowns = new Map<string, number>();

/*
 * Two models at most, inside the route's sixty seconds (2026-09-28).
 *
 * A menu attempt may take forty-five seconds, so the old walk over every
 * candidate could not finish inside maxDuration anyway: the function was
 * killed mid-list and the reader got a generic failure instead of "busy,
 * try again". Two covers a refusal followed by a real attempt.
 */
const MENU_MAX_ATTEMPTS = 2;
const MENU_TOTAL_BUDGET_MS = 52_000;

/**
 * Google's models could not read the menu. `outage`, when known, is when
 * they are likely back and whether it is the day's free allowance — said to
 * the reader in so many words, as the camera does (Chi, 2026-09-28).
 */
export class MenuScanUnavailableError extends Error {
  constructor(readonly outage: ModelOutage | null = null) {
    super("All menu-scanning models are temporarily unavailable.");
    this.name = "MenuScanUnavailableError";
  }
}

/** How long to say "Google is down" after a scan failed on capacity alone. */
const MENU_OUTAGE_MS = 60_000;

/** Every menu model away right now: say so before spending anything. */
export function menuOutage(): Promise<ModelOutage | null> {
  return allModelsAway(getMenuModelCandidates());
}

/* "Busy", as opposed to "no": Google's capacity rather than a refusal. */
function isCapacityFailure(error: unknown) {
  if (isTimeoutError(error)) return true;
  const status = getErrorStatus(error);
  return status === 503 || status === 500 || status === 502;
}

export class MenuScanTimeoutError extends Error {
  constructor() {
    super("The menu took too long to read.");
    this.name = "MenuScanTimeoutError";
  }
}

function stripJsonCodeFence(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function readConfidence(value: unknown): MenuConfidence {
  return value === "high" || value === "medium" || value === "low"
    ? value
    : "low";
}

function readString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function readRegion(value: unknown): MenuRegion {
  if (!value || typeof value !== "object") {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const candidate = value as Record<string, unknown>;
  const read = (key: string) =>
    typeof candidate[key] === "number" && Number.isFinite(candidate[key])
      ? (candidate[key] as number)
      : 0;

  return normaliseRegion({
    x: read("x"),
    y: read("y"),
    width: read("width"),
    height: read("height"),
  });
}

/**
 * Turns whatever the model returned into a MenuDocument, or null.
 *
 * Written defensively on purpose: a schema is a request, not a guarantee, and
 * every field here has a defined answer for "missing". The one thing that
 * makes a result worthless is having no items at all, and that is the only
 * case that returns null.
 */
function readMenuDocument(
  value: unknown,
  targetLanguage: LanguageCode,
  [firstCode, secondCode]: readonly [LanguageCode, LanguageCode],
): { document: MenuDocument | null; isMenu: boolean } {
  if (!value || typeof value !== "object") {
    return { document: null, isMenu: false };
  }

  const candidate = value as Record<string, unknown>;
  const isMenu = candidate.isMenu !== false;
  const sourceLanguage = readString(candidate.sourceLanguage, 32) || "unknown";

  /*
   * The prompt asks for Traditional everywhere; this makes it true.
   *
   * Applied per side and only to Chinese, because the converter works on
   * characters: a Japanese menu shares glyphs with Simplified Chinese (学,
   * 会, 焼) and rewriting those would turn correct Japanese into nonsense.
   * So the printed side is converted only when the list is Chinese, and the
   * translated side only when we asked for Chinese back.
   */
  const traditionalSource = tagNeedsTraditionalNormalization(sourceLanguage)
    ? toTraditional
    : (text: string) => text;

  // The Chinese side is always Chinese now, so it is always converted.
  const traditionalChinese = toTraditional;

  const rawSections = (
    Array.isArray(candidate.sections) ? candidate.sections : []
  ).slice(0, MAX_SECTIONS);

  const sections: MenuSection[] = rawSections.map(
    (rawSection, sectionIndex) => {
      const section = (rawSection ?? {}) as Record<string, unknown>;
      const rawItems = (
        Array.isArray(section.items) ? section.items : []
      ).slice(0, MAX_ITEMS_PER_SECTION);

      const items: MenuItem[] = rawItems
        .map((rawItem, itemIndex): MenuItem => {
          const item = (rawItem ?? {}) as Record<string, unknown>;

          return {
            id: `s${sectionIndex}-i${itemIndex}`,
            sourceName: traditionalSource(readString(item.sourceName, 120)),
            /*
             * The model still answers in fields named for two languages,
             * because that is its schema. Which languages those fields
             * actually hold is decided by the pair the prompt was built with
             * — see buildMenuScanPrompt — so the mapping happens here, once,
             * rather than the names being believed downstream.
             */
            names: compactByLanguage({
              [firstCode]: readString(item.englishName, 140),
              [secondCode]: traditionalChinese(
                readString(item.chineseName, 140),
              ),
            }),
            sourceDescription: traditionalSource(
              readString(item.sourceDescription, 300),
            ),
            descriptions: compactByLanguage({
              [firstCode]: readString(item.englishDescription, 340),
              [secondCode]: traditionalChinese(
                readString(item.chineseDescription, 340),
              ),
            }),
            price: readString(item.price, 24),
            currency: readString(item.currency, 8),
            // The transcription belongs to the side it was written for.
            ipa: compactByLanguage({
              [firstCode]: readString(item.ipa, 120),
            }),
            region: readRegion(item.region),
            ocrConfidence: readConfidence(item.ocrConfidence),
            translationConfidence: readConfidence(item.translationConfidence),
          };
        })
        // A row with neither an original nor a translated name is a row the
        // model invented out of a smudge.
        // A row with no name in any of the three is a row the model
        // invented out of a smudge.
        .filter(
          (item) =>
            item.sourceName || Object.keys(item.names).length > 0,
        );

      return {
        id: `s${sectionIndex}`,
        sourceTitle: traditionalSource(readString(section.sourceTitle, 80)),
        titles: compactByLanguage({
          [firstCode]: readString(section.englishTitle, 100),
          [secondCode]: traditionalChinese(
            readString(section.chineseTitle, 100),
          ),
        }),
        region: readRegion(section.region),
        items,
      };
    },
  ).filter((section) => section.items.length > 0);

  if (sections.length === 0) {
    return { document: null, isMenu };
  }

  return {
    isMenu,
    document: {
      sourceLanguage,
      targetLanguage,
      detectedCuisine: readString(candidate.detectedCuisine, 60),
      overallConfidence: readConfidence(candidate.overallConfidence),
      sections,
    },
  };
}

async function scanWithModel(
  client: GoogleGenAI,
  model: string,
  imageBase64: string,
  mediaType: string,
  targetLanguage: LanguageCode,
  languagePair: readonly [LanguageCode, LanguageCode],
  timeoutMs: number = MENU_REQUEST_TIMEOUT_MS,
) {
  const outputText = await generateJson(client, {
    purpose: "menu-scan",
    model,
    input: [
      { text: buildMenuScanPrompt(languagePair) },
      /*
       * Menus are small type photographed from a metre away, and they used
       * to ask for `resolution: "high"` to be sampled at the detail they
       * carry. The standard endpoint has no such option: what the model sees
       * is the image it is given, so the detail is decided upstream by
       * MENU_EDGE on the client rather than by a flag here.
       */
      { media: { data: imageBase64, mimeType: mediaType } },
    ],
    schema: MENU_RESULT_SCHEMA,
    timeoutMs,
    /* A photograph's timeout stays with the camera; see generateJson. */
    shareTimeouts: false,
  });

  if (!outputText.trim()) {
    throw new Error("Gemini returned an empty menu response.");
  }

  return readMenuDocument(
    JSON.parse(stripJsonCodeFence(outputText)) as unknown,
    targetLanguage,
    languagePair,
  );
}

export async function scanMenu(
  imageBase64: string,
  mediaType: string,
  targetLanguage: LanguageCode,
  languagePair: readonly [LanguageCode, LanguageCode],
): Promise<{ document: MenuDocument | null; isMenu: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MenuScanUnavailableError();

  /*
   * No httpOptions on the client — the same as every other route (see
   * identifyObject). With `retryOptions` set, the SDK sends each request
   * through its own retry wrapper, which turns a 503 into a plain
   * Error("Retryable HTTP Error: Service Unavailable") with no status: on
   * 2026-09-30 two menu scans met Google's "high demand", and this app could
   * not tell it was busy — nothing marked, nothing said. What bounds an
   * attempt is generateJson, per call.
   */
  const client = new GoogleGenAI({ apiKey });

  let lastTimedOut = false;
  let asked = 0;
  let allCapacity = true;

  const deadline = Date.now() + MENU_TOTAL_BUDGET_MS;
  const shared = await healthyModels(getMenuModelCandidates());
  const local = shared.filter(
    (model) => (modelCooldowns.get(model) ?? 0) <= Date.now(),
  );
  const models = (local.length > 0 ? local : shared).slice(
    0,
    MENU_MAX_ATTEMPTS,
  );

  for (const model of models) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_MODEL_DEADLINE_MS) break;

    try {
      return await scanWithModel(
        client,
        model,
        imageBase64,
        mediaType,
        targetLanguage,
        languagePair,
        Math.min(MENU_REQUEST_TIMEOUT_MS, remaining),
      );
    } catch (error) {
      asked += 1;
      if (!isCapacityFailure(error)) allCapacity = false;

      // A timeout is a reason to stop asking too — see identifyObject.
      if (shouldCoolDown(error)) {
        modelCooldowns.set(model, Date.now() + cooldownMsFor(error));
      }

      lastTimedOut = isTimeoutError(error);

      console.warn("Menu scan model failed; trying the next candidate.", {
        model,
        name: error instanceof Error ? error.name : "UnknownError",
        // The API's own words. A name alone cannot tell a rejected request
        // from an exhausted one, and both arrive as an Error.
        detail:
          error instanceof Error ? error.message.slice(0, 300) : String(error),
      });
    }
  }

  /*
   * Every model asked said "high demand": Google is down for menus right
   * now, and the reader is told so, with when to try again.
   */
  if (asked > 0 && allCapacity && !lastTimedOut) {
    throw new MenuScanUnavailableError({
      until: Date.now() + MENU_OUTAGE_MS,
      quotaOnly: false,
    });
  }

  // A timeout is worth telling apart from an outage: one is worth retrying
  // with a tighter crop, the other is worth waiting out.
  if (lastTimedOut) throw new MenuScanTimeoutError();

  const resetAt = await dailyQuotaResetAt(getMenuModelCandidates());
  throw new MenuScanUnavailableError(
    resetAt ? { until: resetAt, quotaOnly: true } : null,
  );
}
