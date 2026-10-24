import { describe, expect, it } from "vitest";

import { chineseReadings, pinyinToZhuyin } from "@/lib/chinese/taiwanReadings";
import { LANGUAGE_CODES } from "@/lib/languages";
import { readTermReadings } from "@/lib/lexicon/termReadings";
import { findHeteronyms, heteronymsFor } from "@/lib/pronunciation/heteronyms";
import { parseTranscription } from "@/lib/pronunciation/phones";
import { getPhonetics } from "@/lib/pronunciation";

/* =========================================================
   One spelling, several readings — and Taiwan's readings (Chi, 2026-10-19)

   The app's Chinese readings came from pinyin-pro reading Traditional
   text with a Simplified word list, which lost the context it picks a
   reading by (銀行 read yín xíng), and gave mainland readings where
   Taiwan's standard differs (垃圾 lā jī). These pin the readings, the
   heteronym lists five languages share, how a word on screen is matched
   to its reading, and what is kept of a model's suggested readings.
   ========================================================= */

describe("Chinese readings, as Taiwan reads them", () => {
  it("reads every heteronym example the way its list says", () => {
    for (const heteronym of heteronymsFor("zh-TW")) {
      for (const reading of heteronym.readings) {
        expect(chineseReadings(reading.example).zhuyin, reading.example).toBe(
          reading.examplePhonetic,
        );
      }
    }
  });

  it("keeps the context Traditional text used to lose", () => {
    const expected: Record<string, string> = {
      銀行: "yín háng",
      時間: "shí jiān",
      睡覺: "shuì jiào",
      因為: "yīn wèi",
      會計: "kuài jì",
      音樂: "yīn yuè",
      長大: "zhǎng dà",
      還是: "hái shì",
      乾淨: "gān jìng",
      看著: "kàn zhe",
      著名: "zhù míng",
      跑得快: "pǎo de kuài",
      慢慢地: "màn màn de",
      覺得: "jué de",
      發現: "fā xiàn",
      麵包: "miàn bāo",
    };
    for (const [word, reading] of Object.entries(expected)) {
      expect(chineseReadings(word).pinyin, word).toBe(reading);
    }
  });

  it("gives Taiwan's standard where it differs from the mainland's", () => {
    const expected: Record<string, string> = {
      垃圾: "lè sè",
      星期: "xīng qí",
      學期: "xué qí",
      危險: "wéi xiǎn",
      微笑: "wéi xiào",
      品質: "pǐn zhí",
      突然: "tú rán",
      可惜: "kě xí",
      企業: "qì yè",
      頭髮: "tóu fǎ",
      利息: "lì xí",
      什麼: "shé me",
    };
    for (const [word, reading] of Object.entries(expected)) {
      expect(chineseReadings(word).pinyin, word).toBe(reading);
    }
  });

  it("leaves a neutral tone neutral, and what is not Chinese alone", () => {
    expect(chineseReadings("休息").pinyin).toBe("xiū xi");
    expect(chineseReadings("T恤").zhuyin).toBe("T ㄒㄩˋ");
  });

  it("is what every word card prints", () => {
    expect(getPhonetics("銀行", "zh-TW")).toEqual({ pinyin: "yín háng", zhuyin: "ㄧㄣˊ ㄏㄤˊ" });
  });

  it("turns a model's pinyin into zhuyin, and refuses what is not pinyin", () => {
    expect(pinyinToZhuyin("háng")).toBe("ㄏㄤˊ");
    expect(pinyinToZhuyin("yín háng")).toBe("ㄧㄣˊ ㄏㄤˊ");
    expect(pinyinToZhuyin("/ˈrɛkərd/")).toBe("");
  });
});

describe("the lists", () => {
  it("has words for every language the app teaches", () => {
    for (const language of LANGUAGE_CODES) {
      expect(heteronymsFor(language).length, language).toBeGreaterThanOrEqual(10);
    }
  });

  it("gives every word at least two readings, each different and complete", () => {
    for (const language of LANGUAGE_CODES) {
      const seen = new Set<string>();
      for (const heteronym of heteronymsFor(language)) {
        expect(seen.has(heteronym.word), `${language} ${heteronym.word} listed twice`).toBe(false);
        seen.add(heteronym.word);
        expect(heteronym.readings.length).toBeGreaterThanOrEqual(2);
        const phonetics = heteronym.readings.map((reading) => reading.phonetic);
        expect(new Set(phonetics).size, heteronym.word).toBe(phonetics.length);
        for (const reading of heteronym.readings) {
          expect(Object.keys(reading.meaning).sort(), `${heteronym.word} meaning`).toEqual(
            ["english", "french", "italian", "spanish", "traditional-chinese"],
          );
          expect(reading.example.trim()).not.toBe("");
        }
      }
    }
  });

  it("transcribes every example so Yumi can show it", () => {
    for (const language of LANGUAGE_CODES) {
      for (const heteronym of heteronymsFor(language)) {
        for (const reading of heteronym.readings) {
          expect(
            parseTranscription(reading.examplePhonetic, language),
            `${language} ${reading.example}`,
          ).not.toBeNull();
        }
      }
    }
  });

  it("spells out the Spanish and Italian readings, since the accent is the difference", () => {
    for (const language of ["es", "it"] as const) {
      for (const heteronym of heteronymsFor(language)) {
        for (const reading of heteronym.readings) {
          expect(reading.spelling, `${language} ${heteronym.word}`).toBeTruthy();
        }
      }
    }
  });
});

describe("finding them in a word, and which reading it is", () => {
  it("finds a Chinese heteronym inside a word and tells which reading it uses", () => {
    const [match] = findHeteronyms("銀行", "zh-TW", { zhuyin: chineseReadings("銀行").zhuyin });
    expect(match.character).toBe("行");
    expect(match.heteronym.readings[match.used!].phonetic).toBe("ㄏㄤˊ");
  });

  it("does not guess for a character on its own", () => {
    const [match] = findHeteronyms("行", "zh-TW", { zhuyin: "ㄒㄧㄥˊ" });
    expect(match.used).toBeNull();
  });

  it("tells English readings apart by transcription, then by part of speech", () => {
    const byIpa = findHeteronyms("record", "en", { ipa: "/rɪˈkɔrd/" })[0];
    expect(byIpa.heteronym.readings[byIpa.used!].partOfSpeech).toBe("verb");
    const byPart = findHeteronyms("Record", "en", { partOfSpeech: "noun" })[0];
    expect(byPart.heteronym.readings[byPart.used!].phonetic).toBe("/ˈrɛkərd/");
    expect(findHeteronyms("lead", "en", { partOfSpeech: "noun" })[0].used).toBeNull();
  });

  it("finds a Spanish word by its letters, and its reading by its accent", () => {
    const match = findHeteronyms("publicó", "es")[0];
    expect(match.heteronym.word).toBe("publico");
    expect(match.heteronym.readings[match.used!].spelling).toBe("publicó");
    expect(findHeteronyms("público", "es")[0].used).toBe(0);
  });

  it("finds nothing for a word with one reading", () => {
    expect(findHeteronyms("apple", "en")).toEqual([]);
    expect(findHeteronyms("蘋果", "zh-TW")).toEqual([]);
  });
});

describe("a model's suggested readings", () => {
  it("keeps two or more different, complete readings", () => {
    const readings = readTermReadings(
      [
        { pronunciation: "/ˈrɛkərd/", meaning: "a disc", example: "a record" },
        { pronunciation: "/rɪˈkɔrd/", meaning: "to capture", example: "to record" },
        { pronunciation: "/rɪˈkɔrd/", meaning: "duplicate", example: "record it" },
        { pronunciation: "", meaning: "empty", example: "x" },
      ],
      "en",
    );
    expect(readings.map((reading) => reading.pronunciation)).toEqual(["/ˈrɛkərd/", "/rɪˈkɔrd/"]);
  });

  it("drops a single reading, and gives Chinese ones zhuyin", () => {
    expect(readTermReadings([{ pronunciation: "/kæt/", meaning: "cat", example: "a cat" }], "en")).toEqual([]);
    const chinese = readTermReadings(
      [
        { pronunciation: "xíng", meaning: "to walk", example: "行走" },
        { pronunciation: "háng", meaning: "a firm", example: "銀行" },
      ],
      "zh-TW",
    );
    expect(chinese.map((reading) => reading.zhuyin)).toEqual(["ㄒㄧㄥˊ", "ㄏㄤˊ"]);
  });

  it("is nothing when the model sent nothing usable", () => {
    expect(readTermReadings(undefined, "en")).toEqual([]);
    expect(readTermReadings("record", "en")).toEqual([]);
  });
});
