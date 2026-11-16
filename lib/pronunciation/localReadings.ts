import { isAllKana, kanaToRomaji, toHiragana } from "@/lib/japanese/kana";
import { koreanIpa, romanizeKorean } from "@/lib/korean/romanize";

/* =========================================================
   The readings that cost nothing to work out (2026-11-16)

   Korean by rule, and Japanese kana into romaji. Kept apart from
   lib/pronunciation/index.ts on purpose: that one carries pinyin-pro, a
   megabyte of dictionary, and these are needed in client code that must not
   pull it in (hooks/usePhonetics.ts answers Korean on the spot from here).
   ========================================================= */

export type LocalReadings = {
  kana?: string;
  romaji?: string;
  rr?: string;
  ipa?: string;
};

/** Korean: Revised Romanization and IPA, after the sound changes. */
export function koreanReadings(text: string): LocalReadings {
  const rr = romanizeKorean(text).trim();
  const ipa = koreanIpa(text);
  const out: LocalReadings = {};
  if (rr && rr !== text.trim()) out.rr = rr;
  if (ipa) out.ipa = ipa;
  return out;
}

/** A Japanese reading in kana, with the romaji line made from it. */
export function japaneseReadings(kana: string | null | undefined): LocalReadings {
  const reading = toHiragana((kana ?? "").trim());
  if (!reading || !isAllKana(reading)) return {};
  return { kana: reading, romaji: kanaToRomaji(reading) };
}
