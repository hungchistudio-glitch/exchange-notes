import { GoogleGenAI } from "@google/genai";

import {
  getMenuModelCandidates,
  readBoundedInteger,
} from "@/lib/ai/modelConfig";
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

const MODEL_COOLDOWN_MS = 65 * 1000;

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
          title: { type: "string", maxLength: 80 },
          translatedTitle: { type: "string", maxLength: 100 },
          region: REGION_SCHEMA,
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                sourceName: { type: "string", maxLength: 120 },
                translatedName: { type: "string", maxLength: 140 },
                sourceDescription: { type: "string", maxLength: 300 },
                translatedDescription: { type: "string", maxLength: 340 },
                price: { type: "string", maxLength: 24 },
                currency: { type: "string", maxLength: 8 },
                region: REGION_SCHEMA,
                ocrConfidence: CONFIDENCE_SCHEMA,
                translationConfidence: CONFIDENCE_SCHEMA,
              },
              required: [
                "sourceName",
                "translatedName",
                "sourceDescription",
                "translatedDescription",
                "price",
                "currency",
                "region",
                "ocrConfidence",
                "translationConfidence",
              ],
            },
          },
        },
        required: ["title", "translatedTitle", "region", "items"],
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

const modelCooldowns = new Map<string, number>();

export class MenuScanUnavailableError extends Error {
  constructor() {
    super("All menu-scanning models are temporarily unavailable.");
    this.name = "MenuScanUnavailableError";
  }
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

function buildPrompt(targetLanguageName: string) {
  return `
You are reading a photograph of a restaurant menu for a traveller who does not
speak the language it is printed in. Return the whole menu as structured data,
translated into ${targetLanguageName}.

Layout rules:
- Group items under the section headings the menu itself uses. If the menu has
  no headings, return one section with an empty title.
- Keep every price with the item it belongs to, exactly as printed, including
  the currency symbol or word. Never convert, round, or invent a price. If an
  item has no visible price, return an empty string.
- Report every region as normalised coordinates between 0 and 1, where x and y
  are the top-left corner, relative to the whole image. An item's region must
  cover its name and its price as printed.
- Read the menu in the order a person would: top to bottom within a column,
  then column by column.

Translation rules:
- Translate the dish name into ${targetLanguageName} when a real equivalent
  exists.
- When a dish is culturally specific and a literal translation would mislead
  (Okonomiyaki, Bibimbap, Cacio e Pepe), keep the original or transliterated
  name as translatedName and put a short plain explanation in
  translatedDescription instead. A recognisable name plus an explanation beats
  a literal translation that means nothing.
- translatedDescription must stay one short sentence. If the menu prints no
  description, write a concise one naming the main ingredients you can infer
  from the dish name, or return an empty string if you cannot.
- Never state or imply that a dish is safe for an allergy or a diet.

Confidence rules:
- Use low ocrConfidence for text that is blurred, cut off, glared over,
  handwritten or partly hidden.
- Use low translationConfidence when the dish name is ambiguous or you are
  guessing at what it contains.
- Do not raise confidence to look helpful. A marked uncertainty is useful; a
  confident mistake is not.

If the photograph is not a menu, price list, or food board, return isMenu
false with an empty sections array.
`.trim();
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
  targetLanguage: string,
): { document: MenuDocument | null; isMenu: boolean } {
  if (!value || typeof value !== "object") {
    return { document: null, isMenu: false };
  }

  const candidate = value as Record<string, unknown>;
  const isMenu = candidate.isMenu !== false;

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
            sourceName: readString(item.sourceName, 120),
            translatedName: readString(item.translatedName, 140),
            sourceDescription: readString(item.sourceDescription, 300),
            translatedDescription: readString(item.translatedDescription, 340),
            price: readString(item.price, 24),
            currency: readString(item.currency, 8),
            region: readRegion(item.region),
            ocrConfidence: readConfidence(item.ocrConfidence),
            translationConfidence: readConfidence(item.translationConfidence),
          };
        })
        // A row with neither an original nor a translated name is a row the
        // model invented out of a smudge.
        .filter((item) => item.sourceName || item.translatedName);

      return {
        id: `s${sectionIndex}`,
        title: readString(section.title, 80),
        translatedTitle: readString(section.translatedTitle, 100),
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
      sourceLanguage: readString(candidate.sourceLanguage, 32) || "unknown",
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
  targetLanguage: string,
  targetLanguageName: string,
) {
  const interaction = await client.interactions.create(
    {
      model,
      input: [
        { type: "text", text: buildPrompt(targetLanguageName) },
        {
          type: "image",
          data: imageBase64,
          mime_type: mediaType,
          // Menus are small type photographed from a metre away. This is the
          // one setting that decides whether the prices come back right.
          resolution: "high",
        },
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: MENU_RESULT_SCHEMA,
      },
      generation_config: {
        thinking_level: "low",
      },
      store: false,
    },
    {
      maxRetries: 0,
      timeout: MENU_REQUEST_TIMEOUT_MS,
    },
  );

  const outputText =
    typeof interaction.output_text === "string" ? interaction.output_text : "";

  if (!outputText.trim()) {
    throw new Error("Gemini returned an empty menu response.");
  }

  return readMenuDocument(
    JSON.parse(stripJsonCodeFence(outputText)) as unknown,
    targetLanguage,
  );
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as { status?: unknown; statusCode?: unknown };
  const status = candidate.status ?? candidate.statusCode;
  return typeof status === "number" ? status : null;
}

function isRateLimitError(error: unknown) {
  if (getErrorStatus(error) === 429) return true;

  return (
    error instanceof Error &&
    /quota|rate.?limit|too many requests/i.test(error.message)
  );
}

function isTimeoutError(error: unknown) {
  return (
    error instanceof Error &&
    /timeout|timed out|aborted|deadline/i.test(error.message)
  );
}

export async function scanMenu(
  imageBase64: string,
  mediaType: string,
  targetLanguage: string,
  targetLanguageName: string,
): Promise<{ document: MenuDocument | null; isMenu: boolean }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new MenuScanUnavailableError();

  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: MENU_REQUEST_TIMEOUT_MS,
      retryOptions: { attempts: 1 },
    },
  });

  let lastTimedOut = false;

  for (const model of getMenuModelCandidates()) {
    const cooldownUntil = modelCooldowns.get(model) ?? 0;
    if (cooldownUntil > Date.now()) continue;

    try {
      return await scanWithModel(
        client,
        model,
        imageBase64,
        mediaType,
        targetLanguage,
        targetLanguageName,
      );
    } catch (error) {
      if (isRateLimitError(error)) {
        modelCooldowns.set(model, Date.now() + MODEL_COOLDOWN_MS);
      }

      lastTimedOut = isTimeoutError(error);

      console.warn("Menu scan model failed; trying the next candidate.", {
        model,
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  // A timeout is worth telling apart from an outage: one is worth retrying
  // with a tighter crop, the other is worth waiting out.
  if (lastTimedOut) throw new MenuScanTimeoutError();

  throw new MenuScanUnavailableError();
}
