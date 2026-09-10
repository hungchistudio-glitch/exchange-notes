/* =========================================================
   Pinyin, fetched only when a reader actually asks for it

   pinyin-pro ships a ~295KB dictionary — on the home screen it was the
   single largest thing the browser downloaded, larger than React and
   Supabase put together. It got there through one static import chain:
   StandardHome -> UniversalSearchField -> useLexiconShare -> here.

   Nothing on that chain reads a romanisation while the screen is drawing.
   The only caller runs inside the share handler, after a tap. So the
   dictionary is imported at that point instead, and a reader who never
   shares a Chinese word never pays for it at all.

   The character test deliberately runs *before* the import: an English
   word needs no dictionary, so it must not trigger a download.
   ========================================================= */

let pinyinModule: Promise<typeof import("pinyin-pro")> | null = null;

/** Cached, so repeat shares resolve without another module resolution. */
function loadPinyinPro(): Promise<typeof import("pinyin-pro")> {
  pinyinModule ??= import("pinyin-pro");

  return pinyinModule;
}

/**
 * Convert a Traditional Chinese word into Hanyu Pinyin with tone marks.
 * Returns null if the input contains no Chinese characters (e.g. an
 * English vocabulary item), so callers can skip rendering pinyin for it.
 */
export async function toPinyin(word: string): Promise<string | null> {
  const hasChinese = /[\u4e00-\u9fff]/.test(word);
  if (!hasChinese) return null;

  const { pinyin } = await loadPinyinPro();

  return pinyin(word, { toneType: "symbol", type: "string" });
}
