/* =========================================================
   English IPA from the CMU Pronouncing Dictionary

   General American, from CMUdict (ISC-licensed npm package
   cmu-pronouncing-dictionary, installed only to run the generator:
   `npm i --no-save cmu-pronouncing-dictionary`). ARPAbet is mapped to IPA
   and the stress mark placed before its syllable, found by the maximal-onset
   principle over English onsets. Phrases are transcribed word by word; a
   word CMUdict does not have leaves the whole phrase to the model.
   ========================================================= */

/*
 * Where CMUdict's first pronunciation is the wrong one for the sense the
 * built-in dictionary means. The dictionary keeps the first entry for a
 * spelling, with its part of speech, so this follows that entry: "read" and
 * "live" are verbs there (/rid/, /lɪv/), "wind" is weather, "subject" and
 * "import" are nouns (stress first), "perfect" is the adjective. A number is
 * CMUdict's own alternative, word(n); a string is ARPAbet written here, for
 * the few where none of its entries is the ordinary American form.
 */
export const SENSES = {
  live: 2, read: 2, use: 2, close: 2, wind: 2, wound: 2,
  subject: 2, accent: 2, suspect: 2, import: 2, impact: 2, survey: 2,
  discount: 2, refund: 2, update: 2, essay: 2, decade: 2, dictator: 2,
  combine: 2, protest: 2, coordinate: 2, estimate: 2, perfect: 2,
  buffet: 2, croissant: 2, advertisement: 2, abdomen: 2, concrete: 2,
  tissue: 2, lasagna: 2, theory: 2, khaki: 2, sometimes: 2, ramadan: 2,
  thirty: "TH ER1 T IY0",
  nobody: "N OW1 B AA2 D IY0",
  probably: "P R AA1 B AH0 B L IY0",
  korean: "K AH0 R IY1 AH0 N",
  islam: "IH0 S L AA1 M",
  espresso: "EH0 S P R EH1 S OW0",
};

/** CMUdict with SENSES applied, keyed the way englishIpa looks words up. */
export function withSenses(dictionary) {
  const chosen = { ...dictionary };
  for (const [word, sense] of Object.entries(SENSES)) {
    const arpabet = typeof sense === "number" ? dictionary[`${word}(${sense})`] : sense;
    if (!arpabet) throw new Error(`No pronunciation ${sense} for "${word}" in CMUdict`);
    chosen[word] = arpabet;
  }
  return chosen;
}

const VOWELS = {
  AA: "ɑ", AE: "æ", AH: "ʌ", AO: "ɔ", AW: "aʊ", AY: "aɪ", EH: "ɛ", ER: "ɜr",
  EY: "eɪ", IH: "ɪ", IY: "i", OW: "oʊ", OY: "ɔɪ", UH: "ʊ", UW: "u",
};
const CONSONANTS = {
  B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h", JH: "dʒ",
  K: "k", L: "l", M: "m", N: "n", NG: "ŋ", P: "p", R: "r", S: "s", SH: "ʃ",
  T: "t", TH: "θ", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ",
};
/* Onsets English allows, in IPA, for placing a syllable boundary. */
const ONSETS = new Set([
  "pl", "pr", "bl", "br", "tr", "dr", "kl", "kr", "ɡl", "ɡr", "fl", "fr",
  "θr", "ʃr", "sl", "sm", "sn", "sp", "st", "sk", "sw", "tw", "dw", "kw",
  "ɡw", "θw", "pj", "bj", "tj", "dj", "kj", "ɡj", "fj", "vj", "mj", "nj",
  "hj", "lj", "sj", "θj", "zj", "spl", "spr", "str", "skr", "skw", "skl",
  "spj", "stj", "skj", "smj", "sf",
]);

function vowel(code, stress) {
  if (code === "AH" && stress === "0") return "ə";
  if (code === "ER" && stress === "0") return "ər";
  return VOWELS[code];
}

/** One word's ARPAbet ("K AH0 N F IH0 D AH0 N T") as IPA. */
export function arpabetToIpa(arpabet) {
  const phones = arpabet.trim().split(/\s+/).map((phone) => {
    const match = phone.match(/^([A-Z]+)([012])?$/);
    if (!match) return null;
    const [, code, stress] = match;
    if (code in VOWELS) return { ipa: vowel(code, stress), vowel: true, stress: stress ?? "0" };
    if (code in CONSONANTS) return { ipa: CONSONANTS[code], vowel: false };
    return null;
  });
  if (phones.some((phone) => !phone)) return null;

  // CMUdict gives some words two primary stresses ("TV": T IY1 V IY1); a
  // word has one, the last, and the earlier ones are secondary.
  const primaries = phones.filter((p) => p.vowel && p.stress === "1");
  for (const phone of primaries.slice(0, -1)) phone.stress = "2";

  const nuclei = phones.map((p, i) => (p.vowel ? i : -1)).filter((i) => i >= 0);
  if (nuclei.length === 0) return null;

  // Where each syllable starts: after each nucleus, the longest legal onset
  // before the next one goes with the next.
  const starts = [0];
  for (let n = 0; n < nuclei.length - 1; n += 1) {
    const between = phones.slice(nuclei[n] + 1, nuclei[n + 1]).map((p) => p.ipa);
    let take = 0;
    for (let k = Math.min(3, between.length); k >= 1; k -= 1) {
      const onset = between.slice(between.length - k).join("");
      if (k === 1 ? between.at(-1) !== "ŋ" : ONSETS.has(onset)) { take = k; break; }
    }
    starts.push(nuclei[n + 1] - take);
  }

  const syllables = starts.map((start, n) => phones.slice(start, starts[n + 1] ?? phones.length));
  return syllables
    .map((syllable) => {
      const nucleus = syllable.find((p) => p.vowel);
      const mark = syllables.length > 1 ? (nucleus.stress === "1" ? "ˈ" : nucleus.stress === "2" ? "ˌ" : "") : "";
      return mark + syllable.map((p) => p.ipa).join("");
    })
    .join("");
}

/** A headword or phrase, or null when any word is not in the dictionary. */
export function englishIpa(text, dictionary) {
  const words = text
    .toLowerCase()
    .replace(/[?!.,;:"“”]/g, " ")
    .replace(/’/g, "'")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return null;
  // A hyphenated word as itself if the dictionary has it ("to-do"), else
  // part by part ("second-hand").
  const one = (word) => (dictionary[word] ? arpabetToIpa(dictionary[word]) : null);
  const parts = words.map((word) => {
    const whole = one(word);
    if (whole || !word.includes("-")) return whole;
    const pieces = word.split("-").filter(Boolean).map(one);
    return pieces.every(Boolean) ? pieces.join(" ") : null;
  });
  if (parts.some((part) => !part)) return null;
  return `/${parts.join(" ")}/`;
}
