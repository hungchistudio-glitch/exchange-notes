/* =========================================================
   Korean, as it is said: Revised Romanization and IPA (Chi, 2026-11-16)

   Hangul is written by the syllable and said across them: 한국어 is
   [한구거], 감사합니다 [감사함니다], 같이 [가치]. A reading that spelled each
   block on its own would teach the wrong word, so both readings here are
   made from the word as it is pronounced, after the standard sound changes:

     liaison         a final moves onto a following silent ㅇ (음악 → 으막)
     aspiration      ㅎ next to ㄱ ㄷ ㅂ ㅈ makes ㅋ ㅌ ㅍ ㅊ (좋다 → 조타)
     palatalization  ㄷ ㅌ before 이 become ㅈ ㅊ (같이 → 가치)
     nasalization    a stop before ㄴ ㅁ becomes a nasal (합니다 → 함니다)
     liquids         ㄴ next to ㄹ becomes ㄹ (신라 → 실라); ㄹ after ㅁ ㅇ
                     becomes ㄴ (정류장 → 정뉴장)
     finals          a final is one of seven sounds (옷 → 옫, 부엌 → 부억)

   Revised Romanization, the system on every road sign in Korea, writes the
   result of all of these but not tensing (학교 is "hakgyo"), so neither
   does `romanizeKorean`. IPA writes tensing too (/hak̚.k͈jo/), because
   that is the point of a phonetic transcription.

   Rule-based, so it costs nothing and needs no network — and it is right
   for the regular cases, which is nearly all of them. Words whose
   pronunciation the spelling does not predict (some tensing, ㄴ insertion
   in 꽃잎 [꼰닙]) come out as their spelling suggests; a lookup's own IPA,
   when it has one, is preferred over this.
   ========================================================= */

const BASE = 0xac00;
const INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const VOWELS = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
const FINALS = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

type Syllable = { initial: string; vowel: string; final: string };

/** A complex final split into what stays and what can move on. */
const SPLIT: Record<string, [string, string]> = {
  ㄳ: ["ㄱ", "ㅅ"], ㄵ: ["ㄴ", "ㅈ"], ㄶ: ["ㄴ", "ㅎ"], ㄺ: ["ㄹ", "ㄱ"], ㄻ: ["ㄹ", "ㅁ"],
  ㄼ: ["ㄹ", "ㅂ"], ㄽ: ["ㄹ", "ㅅ"], ㄾ: ["ㄹ", "ㅌ"], ㄿ: ["ㄹ", "ㅍ"], ㅀ: ["ㄹ", "ㅎ"], ㅄ: ["ㅂ", "ㅅ"],
};

/** What a final sounds like before a consonant or at the end of a word. */
const NEUTRAL: Record<string, string> = {
  ㄱ: "ㄱ", ㄲ: "ㄱ", ㅋ: "ㄱ", ㄳ: "ㄱ", ㄺ: "ㄱ",
  ㄴ: "ㄴ", ㄵ: "ㄴ", ㄶ: "ㄴ",
  ㄷ: "ㄷ", ㅅ: "ㄷ", ㅆ: "ㄷ", ㅈ: "ㄷ", ㅊ: "ㄷ", ㅌ: "ㄷ", ㅎ: "ㄷ",
  ㄹ: "ㄹ", ㄼ: "ㄹ", ㄽ: "ㄹ", ㄾ: "ㄹ", ㅀ: "ㄹ",
  ㅁ: "ㅁ", ㄻ: "ㅁ",
  ㅂ: "ㅂ", ㅍ: "ㅂ", ㅄ: "ㅂ", ㄿ: "ㅂ",
  ㅇ: "ㅇ",
};

const ASPIRATE: Record<string, string> = { ㄱ: "ㅋ", ㄷ: "ㅌ", ㅂ: "ㅍ", ㅈ: "ㅊ", ㅅ: "ㅆ" };
const NASAL: Record<string, string> = { ㄱ: "ㅇ", ㄷ: "ㄴ", ㅂ: "ㅁ" };
const TENSE: Record<string, string> = { ㄱ: "ㄲ", ㄷ: "ㄸ", ㅂ: "ㅃ", ㅅ: "ㅆ", ㅈ: "ㅉ" };

function decompose(char: string): Syllable | null {
  const code = char.charCodeAt(0) - BASE;
  if (code < 0 || code > 11171) return null;
  return {
    initial: INITIALS[Math.floor(code / 588)],
    vowel: VOWELS[Math.floor((code % 588) / 28)],
    final: FINALS[code % 28],
  };
}

/** One word's syllables, after the sound changes. `tense` marks tensing. */
type Said = Syllable & { tense: boolean };

function pronounce(word: string): Said[] | null {
  const syllables: Said[] = [];
  for (const char of word) {
    const syllable = decompose(char);
    if (!syllable) return null;
    syllables.push({ ...syllable, tense: false });
  }

  for (let index = 0; index < syllables.length - 1; index += 1) {
    const here = syllables[index];
    const next = syllables[index + 1];
    if (!here.final) continue;

    /* Palatalization: ㄷ ㅌ (and ㄾ's ㅌ) before 이. */
    if (next.initial === "ㅇ" && next.vowel === "ㅣ" && (here.final === "ㄷ" || here.final === "ㅌ" || here.final === "ㄾ")) {
      next.initial = here.final === "ㄷ" ? "ㅈ" : "ㅊ";
      here.final = here.final === "ㄾ" ? "ㄹ" : "";
      continue;
    }

    /* ㅎ final: aspirates what follows, and is silent before a vowel. */
    const [keep, move] = SPLIT[here.final] ?? [here.final, ""];
    const hFinal = here.final === "ㅎ" || move === "ㅎ";
    if (hFinal) {
      if (ASPIRATE[next.initial] && next.initial !== "ㅅ") {
        next.initial = ASPIRATE[next.initial];
        here.final = here.final === "ㅎ" ? "" : keep;
        continue;
      }
      if (next.initial === "ㅅ") {
        next.initial = "ㅆ";
        here.final = here.final === "ㅎ" ? "" : keep;
        continue;
      }
      if (next.initial === "ㅇ") {
        here.final = here.final === "ㅎ" ? "" : keep;
        if (here.final && here.final !== "ㅇ") {
          next.initial = here.final;
          here.final = "";
        }
        continue;
      }
      if (next.initial === "ㄴ") {
        here.final = here.final === "ㅎ" ? "ㄴ" : keep;
      }
    }

    /* A stop next to ㅎ: the two make one aspirated sound. */
    if (next.initial === "ㅎ") {
      const stop = NEUTRAL[keep];
      if (stop === "ㄱ" || stop === "ㄷ" || stop === "ㅂ" || here.final === "ㅈ") {
        next.initial = here.final === "ㅈ" ? "ㅊ" : ASPIRATE[stop];
        here.final = move && SPLIT[here.final] ? keep : "";
        if (here.final === stop) here.final = "";
        continue;
      }
    }

    /* Liaison: a final moves onto a silent ㅇ (ㅇ itself stays). */
    if (next.initial === "ㅇ") {
      if (here.final === "ㅇ") continue;
      if (SPLIT[here.final]) {
        here.final = keep;
        next.initial = move;
        if (move === "ㅅ") next.tense = true;
      } else {
        next.initial = here.final === "ㅆ" ? "ㅆ" : here.final;
        here.final = "";
      }
      continue;
    }

    /* From here the final is said as one of the seven sounds. */
    let final = NEUTRAL[here.final] ?? here.final;

    /* ㄹ after ㅁ ㅇ, and after a stop (which then turns nasal), is ㄴ. */
    if (next.initial === "ㄹ" && final !== "ㄹ" && final !== "ㄴ") {
      next.initial = "ㄴ";
    }
    /* ㄴ and ㄹ side by side are both ㄹ. */
    if ((final === "ㄴ" && next.initial === "ㄹ") || (final === "ㄹ" && next.initial === "ㄴ")) {
      final = "ㄹ";
      next.initial = "ㄹ";
    }
    /* A stop before a nasal is a nasal. */
    if (NASAL[final] && (next.initial === "ㄴ" || next.initial === "ㅁ")) {
      final = NASAL[final];
    }
    /* Tensing after a stop: written nowhere, said always. */
    if ((final === "ㄱ" || final === "ㄷ" || final === "ㅂ") && TENSE[next.initial]) {
      next.tense = true;
    }

    here.final = final;
  }

  const last = syllables[syllables.length - 1];
  if (last?.final) last.final = NEUTRAL[last.final] ?? last.final;

  return syllables;
}

const RR_INITIAL: Record<string, string> = {
  ㄱ: "g", ㄲ: "kk", ㄴ: "n", ㄷ: "d", ㄸ: "tt", ㄹ: "r", ㅁ: "m", ㅂ: "b", ㅃ: "pp", ㅅ: "s",
  ㅆ: "ss", ㅇ: "", ㅈ: "j", ㅉ: "jj", ㅊ: "ch", ㅋ: "k", ㅌ: "t", ㅍ: "p", ㅎ: "h",
};
const RR_VOWEL: Record<string, string> = {
  ㅏ: "a", ㅐ: "ae", ㅑ: "ya", ㅒ: "yae", ㅓ: "eo", ㅔ: "e", ㅕ: "yeo", ㅖ: "ye", ㅗ: "o", ㅘ: "wa",
  ㅙ: "wae", ㅚ: "oe", ㅛ: "yo", ㅜ: "u", ㅝ: "wo", ㅞ: "we", ㅟ: "wi", ㅠ: "yu", ㅡ: "eu", ㅢ: "ui", ㅣ: "i",
};
const RR_FINAL: Record<string, string> = { ㄱ: "k", ㄴ: "n", ㄷ: "t", ㄹ: "l", ㅁ: "m", ㅂ: "p", ㅇ: "ng" };

function romanizeWord(word: string): string {
  const said = pronounce(word);
  if (!said) return word;
  let out = "";
  said.forEach((syllable, index) => {
    const previous = said[index - 1];
    /* ㄹㄹ is "ll"; any other ㄹ starting a syllable is "r". */
    const initial =
      syllable.initial === "ㄹ" && previous?.final === "ㄹ" ? "l" : RR_INITIAL[syllable.initial];
    out += initial + RR_VOWEL[syllable.vowel] + (syllable.final ? RR_FINAL[syllable.final] ?? "" : "");
  });
  return out;
}

/** Korean text in Revised Romanization, word by word; anything else as it is. */
export function romanizeKorean(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[가-힣]+/g, (word) => romanizeWord(word));
}

const IPA_VOWEL: Record<string, string> = {
  ㅏ: "a", ㅐ: "e", ㅑ: "ja", ㅒ: "je", ㅓ: "ʌ", ㅔ: "e", ㅕ: "jʌ", ㅖ: "je", ㅗ: "o", ㅘ: "wa",
  ㅙ: "we", ㅚ: "we", ㅛ: "jo", ㅜ: "u", ㅝ: "wʌ", ㅞ: "we", ㅟ: "wi", ㅠ: "ju", ㅡ: "ɯ", ㅢ: "ɰi", ㅣ: "i",
};
const IPA_FINAL: Record<string, string> = { ㄱ: "k̚", ㄴ: "n", ㄷ: "t̚", ㄹ: "l", ㅁ: "m", ㅂ: "p̚", ㅇ: "ŋ" };

/** Whether a vowel starts with the i-glide or is i: where ㅅ is said ɕ. */
const PALATAL_VOWEL = new Set(["ㅣ", "ㅑ", "ㅒ", "ㅕ", "ㅖ", "ㅛ", "ㅠ", "ㅟ"]);

function ipaInitial(syllable: Said, voicedBefore: boolean, previousFinal: string): string {
  const palatal = PALATAL_VOWEL.has(syllable.vowel);
  let initial = syllable.initial;
  if (syllable.tense && TENSE[initial]) initial = TENSE[initial];

  switch (initial) {
    case "ㄱ": return voicedBefore ? "ɡ" : "k";
    case "ㄷ": return voicedBefore ? "d" : "t";
    case "ㅂ": return voicedBefore ? "b" : "p";
    case "ㅈ": return voicedBefore ? "dʑ" : "tɕ";
    case "ㄲ": return "k͈";
    case "ㄸ": return "t͈";
    case "ㅃ": return "p͈";
    case "ㅉ": return "t͈ɕ";
    case "ㅋ": return "kʰ";
    case "ㅌ": return "tʰ";
    case "ㅍ": return "pʰ";
    case "ㅊ": return "tɕʰ";
    case "ㅅ": return palatal ? "ɕ" : "s";
    case "ㅆ": return palatal ? "ɕ͈" : "s͈";
    case "ㅎ": return "h";
    case "ㄴ": return "n";
    case "ㅁ": return "m";
    case "ㄹ": return previousFinal === "ㄹ" ? "l" : "ɾ";
    default: return "";
  }
}

function ipaWord(word: string): string | null {
  const said = pronounce(word);
  if (!said) return null;
  return said
    .map((syllable, index) => {
      const previous = said[index - 1];
      /* A lenis stop is voiced between voiced sounds: after a vowel, or
         after a nasal or ㄹ — never at the start of the word. */
      const voicedBefore =
        index > 0 && (!previous.final || ["ㄴ", "ㅁ", "ㅇ", "ㄹ"].includes(previous.final));
      return (
        ipaInitial(syllable, voicedBefore, previous?.final ?? "") +
        IPA_VOWEL[syllable.vowel] +
        (syllable.final ? IPA_FINAL[syllable.final] ?? "" : "")
      );
    })
    .join(".");
}

/** Korean text in IPA, slashes and all; null when there is no Hangul in it. */
export function koreanIpa(text: string): string | null {
  const words = text.normalize("NFC").match(/[가-힣]+/g);
  if (!words) return null;
  const parts = words.map(ipaWord).filter((part): part is string => Boolean(part));
  return parts.length ? `/${parts.join(" ")}/` : null;
}
