import { convert, customPinyin, pinyin } from "pinyin-pro";
import traditional from "@pinyin-pro/data/traditional";
import { p2z } from "pinyin-to-zhuyin";

/* =========================================================
   Chinese readings, as Taiwan reads them

   The app writes Traditional Chinese and teaches Taiwan's Mandarin, and the
   readings it printed were neither (Chi, 2026-10-19: "全面改用台灣標準").
   Two separate faults:

   1. pinyin-pro chooses a character's reading from the words around it,
      but its word list is Simplified. Given Traditional text it fell back
      to each character's commonest reading: 銀行 came out yín xíng, 時間
      shí jiàn, 睡覺 shuì jué, 因為 yīn wéi, 會計 huì jì. Its own Traditional
      mode fixed some and not others, so instead the text is simplified
      here, character for character — the length never changes, so each
      syllable still belongs to its character — and read as Simplified,
      where its word list is strongest.

   2. Where Taiwan's standard (教育部國語辭典) differs from the mainland's,
      it gave the mainland's: 垃圾 lā jī, 星期 xīng qī, 危險 wēi xiǎn. Those
      are corrected by character where Taiwan reads the character one way
      in every word, and by word where the difference is the word's.

   What pinyin-pro still misreads after that is corrected by word, and two
   patterns by rule (地 after a doubled adjective, 得 after a verb). Every
   example in the heteronym lists is checked against this
   (tests/pronunciation/heteronyms.test.ts).

   Everything that prints a reading comes through here
   (lib/pronunciation/index.ts), so a word card, a search result and the
   Pronunciation Lab all say the same thing.
   ========================================================= */

/**
 * Traditional to Simplified, one character to one. pinyin-pro's table
 * (@pinyin-pro/data/traditional, 24 KB of that package), plus the four it
 * leaves out because each is also a Simplified character with its own
 * reading — mapped to the form whose readings Traditional text means far
 * more often, with the exceptions corrected below.
 */
const SIMPLIFIED: Record<string, string> = {
  ...(traditional as Record<string, string>),
  乾: "干",
  著: "着",
  瞭: "了",
  藉: "借",
};

/**
 * Characters Taiwan reads one way in every word, where the mainland reads
 * them another. Applied after pinyin-pro, character by character, because a
 * single-character entry would lose to every word in its dictionary
 * (星期 would stay qī while 學期 became qí).
 */
const TAIWAN_CHARACTERS: Record<string, string> = {
  期: "qi2",
  危: "wei2",
  微: "wei2",
  企: "qi4",
  擊: "ji2",
  寂: "ji2",
  跡: "ji1",
  蹟: "ji1",
  質: "zhi2",
  突: "tu2",
  夕: "xi4",
  惜: "xi2",
  攜: "xi1",
  崖: "yai2",
  蝸: "gua1",
  綜: "zong4",
  帆: "fan2",
  酵: "xiao4",
  液: "yi4",
  髮: "fa3",
  息: "xi2",
};

/**
 * Words whose reading is the word's: Taiwan's standard for the word, or a
 * reading pinyin-pro still gets wrong. Written in Traditional; pinyin with
 * tone marks, one syllable per character.
 */
const TAIWAN_WORDS: Record<string, string> = {
  // Taiwan's standard, where it is the word's and not the character's.
  垃圾: "lè sè",
  什麼: "shé me",
  從容: "cōng róng",
  休息: "xiū xi",
  消息: "xiāo xi",
  頭髮: "tóu fǎ",
  // The less common readings of the four characters simplified above.
  乾坤: "qián kūn",
  著名: "zhù míng",
  著作: "zhù zuò",
  名著: "míng zhù",
  顯著: "xiǎn zhù",
  原著: "yuán zhù",
  瞭望: "liào wàng",
  狼藉: "láng jí",
  // Readings pinyin-pro misses.
  品行: "pǐn xìng",
  德行: "dé xìng",
  還錢: "huán qián",
  還書: "huán shū",
  歸還: "guī huán",
  得要: "děi yào",
  有空: "yǒu kòng",
  沒空: "méi kòng",
  教書: "jiāo shū",
  教他: "jiāo tā",
  教你: "jiāo nǐ",
  教我: "jiāo wǒ",
  朝陽: "zhāo yáng",
  數錢: "shǔ qián",
  盛飯: "chéng fàn",
  長得: "zhǎng de",
  值得: "zhí de",
  差別: "chā bié",
  差不多: "chā bù duō",
};

/** Verbs and adjectives after which 得 is the particle ˙ㄉㄜ, not ㄉㄜˊ. */
const DE_AFTER = new Set(Array.from("跑說做寫唱走吃睡過看聽學玩講想打笑哭跳飛洗穿住等冷熱快慢高累忙餓急怕"));

function simplify(text: string): string {
  return Array.from(text, (char) => SIMPLIFIED[char] ?? char).join("");
}

let ready = false;

function prepare() {
  if (ready) return;
  ready = true;
  const words: Record<string, string> = {};
  for (const [word, reading] of Object.entries(TAIWAN_WORDS)) {
    words[simplify(word)] = reading;
  }
  customPinyin(words);
}

const NUMBERED_SYLLABLE = /^[a-zü]+[0-5]$/i;

export type ChineseReadings = {
  /** Pinyin with tone marks, a space between syllables: "yín háng". */
  pinyin: string;
  /** Zhuyin, the same: "ㄧㄣˊ ㄏㄤˊ". */
  zhuyin: string;
};

/**
 * Pinyin with tone marks ("háng", "yín háng") as zhuyin ("ㄏㄤˊ"), for
 * readings that arrive as pinyin rather than as characters — what a model
 * says a heteronym's readings are. Empty when it is not pinyin.
 */
export function pinyinToZhuyin(text: string): string {
  const numbered = convert(text.trim().toLocaleLowerCase(), { format: "symbolToNum" })
    .split(/\s+/)
    .filter(Boolean);
  const zhuyin = numbered.map((syllable) => {
    /* A syllable with no tone number is a neutral tone. */
    const toned = /[0-5]$/.test(syllable) ? syllable.replace(/0$/, "5") : `${syllable}5`;
    return NUMBERED_SYLLABLE.test(toned) ? p2z(toned, { tonemarks: true }) : "";
  });
  return zhuyin.every(Boolean) ? zhuyin.join(" ") : "";
}

/**
 * The Taiwan reading of Chinese text, in pinyin and zhuyin. Characters that
 * are not Chinese are kept as they are in both.
 */
export function chineseReadings(text: string): ChineseReadings {
  prepare();
  const characters = Array.from(text);
  const syllables = pinyin(simplify(text), { toneType: "num", type: "array" });
  /* One syllable per character, which is what lets a character's own
     reading be put back; if that ever stops holding, leave them alone. */
  const aligned = syllables.length === characters.length;

  const numbered = syllables.map((syllable, index) => {
    if (aligned) {
      const char = characters[index];
      const own = TAIWAN_CHARACTERS[char];
      /* A neutral tone stays neutral: 休息 is xiū xi, not xiū xí. */
      if (own && !/[05]$/.test(syllable)) return own;
      /* 慢慢地, 好好地: after a doubled adjective 地 makes an adverb. */
      if (char === "地" && index >= 2 && characters[index - 1] === characters[index - 2]) {
        return "de5";
      }
      /* 跑得快, 說得好: after a verb, 得 introduces how it is done. */
      if (char === "得" && index >= 1 && DE_AFTER.has(characters[index - 1])) return "de5";
    }
    /* pinyin-pro writes the neutral tone as 0; zhuyin's converter reads 5. */
    return syllable.replace(/0$/, "5");
  });

  return {
    /* The neutral tone has no mark: "le", not "le5". */
    pinyin: convert(numbered.map((syllable) => syllable.replace(/5$/, "")).join(" "), {
      format: "numToSymbol",
    }),
    zhuyin: numbered
      .map((syllable) =>
        NUMBERED_SYLLABLE.test(syllable) ? p2z(syllable, { tonemarks: true }) : syllable,
      )
      .join(" "),
  };
}
