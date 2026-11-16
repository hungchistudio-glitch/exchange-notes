import type { HelloSnapshot } from "./types";

/* =========================================================
   Sample hellos, for building and reviewing the screens

   Fixtures, and labelled as such wherever they are shown: the sender is
   "Fixture", never a real reader's name or picture, and nothing here is
   read from or written to the database. They exist for the review screen
   (app/hello-review) and the tests.

   One of each case worth looking at: a complete hello in Standard, a
   Cosmic one with a language that has not been made yet, which is how the
   missing state looks, and a long name with a long phrase, which is how
   the picture's words shrink to fit.
   ========================================================= */

export const FIXTURE_LIBRARY: HelloSnapshot = {
  id: "fixtureLib01",
  version: 1,
  createdAt: "2026-10-19T09:00:00.000Z",
  sender: { name: "Fixture", exchangeId: "fixture_reader" },
  yumi: {
    outfit: { material: "jade", head: "tea-bucket-hat", mouth: "bubble-tea", earrings: "tea-pearl-earrings" },
    mode: "standard",
    posterUrl: null,
    complete: true,
  },
  pair: ["en", "zh-TW"],
  source: "en",
  sense: {
    en: { text: "library", partOfSpeech: "noun", phonetic: { ipa: "/ˈlaɪˌbrɛri/" } },
    "zh-TW": {
      text: "圖書館",
      partOfSpeech: "noun",
      phonetic: { zhuyin: "ㄊㄨˊ ㄕㄨ ㄍㄨㄢˇ", pinyin: "tú shū guǎn" },
    },
    es: { text: "biblioteca", partOfSpeech: "noun", phonetic: { ipa: "/bi.βli.oˈte.ka/" } },
    fr: { text: "bibliothèque", partOfSpeech: "noun", phonetic: { ipa: "/bi.bli.jɔ.tɛk/" } },
    it: { text: "biblioteca", partOfSpeech: "noun", phonetic: { ipa: "/bi.bljoˈtɛ.ka/" } },
    ja: { text: "図書館", partOfSpeech: "noun", phonetic: { kana: "としょかん", romaji: "toshokan" } },
    ko: { text: "도서관", partOfSpeech: "noun", phonetic: { rr: "doseogwan", ipa: "/to.sʌ.ɡwan/" } },
  },
};

export const FIXTURE_STAR_COSMIC: HelloSnapshot = {
  id: "fixtureStar1",
  version: 1,
  createdAt: "2026-10-19T09:05:00.000Z",
  sender: { name: null, exchangeId: "fixture_cosmic" },
  yumi: {
    outfit: { material: "s33-basalt-tea", iris: "s33-tea-radial", charm: "sky-lantern" },
    mode: "yumi-cosmic",
    posterUrl: null,
    complete: true,
  },
  pair: ["es", "fr"],
  source: "es",
  sense: {
    es: { text: "estrella", partOfSpeech: "noun", phonetic: { ipa: "/esˈtɾe.ʎa/" } },
    fr: { text: "étoile", partOfSpeech: "noun", phonetic: { ipa: "/e.twal/" } },
    en: { text: "star", partOfSpeech: "noun", phonetic: { ipa: "/stɑr/" } },
    "zh-TW": { text: "星星", partOfSpeech: "noun", phonetic: { zhuyin: "ㄒㄧㄥ ㄒㄧㄥ˙", pinyin: "xīng xing" } },
    ja: { text: "星", partOfSpeech: "noun", phonetic: { kana: "ほし", romaji: "hoshi" } },
    ko: { text: "별", partOfSpeech: "noun", phonetic: { rr: "byeol", ipa: "/pjʌl/" } },
    /* Italian deliberately absent: the missing state. */
  },
};

export const FIXTURE_LONG_PHRASE: HelloSnapshot = {
  id: "fixtureLong1",
  version: 1,
  createdAt: "2026-10-19T09:10:00.000Z",
  sender: { name: "Fixture With A Rather Long Display Name", exchangeId: "fixture_long" },
  yumi: { outfit: {}, mode: "standard", posterUrl: null, complete: true },
  pair: ["fr", "it"],
  source: "fr",
  sense: {
    fr: { text: "faites comme chez vous", partOfSpeech: "phrase", phonetic: { ipa: "/fɛt kɔm ʃe vu/" } },
    it: { text: "fai come se fossi a casa tua", partOfSpeech: "phrase", phonetic: { ipa: "/fai ˈkoː.me se ˈfos.si a ˈkaː.sa ˈtu.a/" } },
    en: { text: "make yourself at home", partOfSpeech: "phrase", phonetic: { ipa: "/meɪk jɔrˈsɛlf æt hoʊm/" } },
    es: { text: "estás en tu casa", partOfSpeech: "phrase", phonetic: { ipa: "/esˈtas en tu ˈka.sa/" } },
    "zh-TW": { text: "把這裡當自己家", partOfSpeech: "phrase", phonetic: { zhuyin: "ㄅㄚˇ ㄓㄜˋ ㄌㄧˇ ㄉㄤ ㄗˋ ㄐㄧˇ ㄐㄧㄚ", pinyin: "bǎ zhè lǐ dāng zì jǐ jiā" } },
    ja: { text: "くつろいでください", partOfSpeech: "phrase", phonetic: { kana: "くつろいでください", romaji: "kutsuroidekudasai" } },
    ko: { text: "편하게 계세요", partOfSpeech: "phrase", phonetic: { rr: "pyeonhage gyeseyo", ipa: "/pʰjʌn.ha.ɡe kje.se.jo/" } },
  },
};

export const HELLO_FIXTURES: readonly HelloSnapshot[] = [FIXTURE_LIBRARY, FIXTURE_STAR_COSMIC, FIXTURE_LONG_PHRASE];
