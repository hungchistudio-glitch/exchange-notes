import { toTraditional } from "@/lib/chinese/toTraditional";

/**
 * Chinese as this app writes it: Traditional characters, no spaces between
 * them, and Chinese punctuation after Chinese.
 *
 * Every Han character in this app is Chinese (it teaches no Japanese), and
 * every Chinese character it shows is Traditional (Chi, 2026-10-11: "只能有
 * 繁體中文"). Prompts ask for that, and a prompt is a request: a spoken
 * question came back from the transcriber as 跳 字 停 的 时 候 应 该 怎 么 办 ?,
 * Simplified, one character at a time, with an ASCII question mark.
 *
 * The punctuation step also undoes normalizeQuery's own NFKC, which folds
 * ，？！ into ,?! — right for a full-width Latin letter typed by accident,
 * wrong for the comma in a Chinese sentence.
 *
 * Text with no Han characters is returned untouched.
 */

const HAN = /\p{Script=Han}/u;

const FULL_WIDTH: Record<string, string> = {
  ",": "，",
  ".": "。",
  "!": "！",
  "?": "？",
  ";": "；",
  ":": "：",
  "...": "……",
};

export function tidyChinese(text: string): string {
  if (!HAN.test(text)) return text;

  return toTraditional(text)
    .replace(/(\p{Script=Han})\s+(?=\p{Script=Han})/gu, "$1")
    .replace(
      /(\p{Script=Han})\s*(\.{3}|[,.!?;:])[ \t]*/gu,
      (_, han: string, mark: string) => `${han}${FULL_WIDTH[mark]}`,
    )
    .replace(/([，。！？；：、…])\s+(?=\p{Script=Han})/gu, "$1");
}

/**
 * The same, for every string inside a model's answer.
 *
 * Applied to the answer as a whole rather than field by field, so a field
 * added to the schema next month is covered without anyone remembering to.
 * Safe on the non-Chinese fields: they hold no Han characters to change.
 */
export function tidyChineseDeep<T>(value: T): T {
  if (typeof value === "string") return tidyChinese(value) as T;
  if (Array.isArray(value)) return value.map(tidyChineseDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, tidyChineseDeep(item)]),
    ) as T;
  }
  return value;
}
