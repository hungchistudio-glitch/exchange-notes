/* =========================================================
   CJK faces for text drawn outside CSS (2026-11-16)

   A canvas or a server-drawn image has no [lang] to read, so it cannot use
   app/globals.css's `--cjk-sans`/`--cjk-serif`. It picks by the text instead:
   Hangul gets a Korean face (Traditional Chinese faces have no Hangul at
   all), kana a Japanese one (so the kanji beside it take Japanese forms),
   and anything else the Traditional Chinese faces the app was drawn in.
   Han characters alone cannot say which language they are; they stay
   Traditional Chinese unless the caller knows better.
   ========================================================= */

export type CjkScript = "ko" | "ja" | "zh";

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
const KANA = /[぀-ヿㇰ-ㇿ]/;

/** Which CJK faces a piece of text needs. */
export function cjkScriptOf(text: string, hint?: string): CjkScript {
  if (HANGUL.test(text) || hint === "ko") return "ko";
  if (KANA.test(text) || hint === "ja") return "ja";
  return "zh";
}

const SANS: Record<CjkScript, string> = {
  ko: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR"',
  ja: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, "Noto Sans JP"',
  zh: '"PingFang TC", "Microsoft JhengHei", "Noto Sans TC"',
};

const SERIF: Record<CjkScript, string> = {
  ko: 'AppleMyungjo, "Nanum Myeongjo", "Noto Serif KR"',
  ja: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP"',
  zh: '"Noto Serif TC", "Songti TC"',
};

/** A sans stack fragment for this text, script's own faces first. */
export function cjkSansFor(text: string, hint?: string): string {
  const script = cjkScriptOf(text, hint);
  return [SANS[script], ...(["zh", "ja", "ko"] as const).filter((s) => s !== script).map((s) => SANS[s])].join(", ");
}

/** A serif stack fragment for this text, script's own faces first. */
export function cjkSerifFor(text: string, hint?: string): string {
  const script = cjkScriptOf(text, hint);
  return [SERIF[script], ...(["zh", "ja", "ko"] as const).filter((s) => s !== script).map((s) => SERIF[s])].join(", ");
}
