// Highlights where the target sound actually sits inside an example word
// (brief section 7: "例詞也要驅動 Yumi 動畫... 高亮實際包含目標音的部分").
//
// Scope note: for Zhuyin this is exact and reliable — the example already
// carries its own zhuyin spelling as structured data, so finding the
// target symbol inside it is a plain string search, no ambiguity. For
// English, spelling-to-sound is irregular (the same /k/ sound can be "c",
// "k", or "ck") — matching by eye means a small per-sound grapheme hint
// list rather than a real grapheme-to-phoneme engine. That's tractable for
// consonants (a handful of common spellings each), but vowel spellings are
// far more varied and error-prone to guess this way, so vowel examples are
// deliberately left unhighlighted rather than risk highlighting the wrong
// letters.

export type HighlightSpan = { before: string; match: string; after: string } | null;

export function highlightZhuyinExample(zhuyin: string, symbol: string): HighlightSpan {
  const index = zhuyin.indexOf(symbol);
  if (index === -1) return null;

  return {
    before: zhuyin.slice(0, index),
    match: zhuyin.slice(index, index + symbol.length),
    after: zhuyin.slice(index + symbol.length),
  };
}

// Ordered by specificity — longer/more distinctive spellings are checked
// first so e.g. "tch" wins over a bare "ch" inside the same word.
const ENGLISH_CONSONANT_HINTS: Record<string, string[]> = {
  p: ["pp", "p"],
  b: ["bb", "b"],
  t: ["tt", "t"],
  d: ["dd", "d"],
  k: ["ck", "k", "c"],
  g: ["gg", "g"],
  f: ["ff", "f"],
  v: ["v"],
  "th-voiceless": ["th"],
  "th-voiced": ["th"],
  s: ["ss", "s", "c"],
  z: ["zz", "z", "s"],
  sh: ["sh", "ti"],
  zh: ["si", "ge", "g"],
  h: ["h"],
  ch: ["tch", "ch", "tu"],
  j: ["dge", "j", "g"],
  m: ["mm", "m"],
  n: ["nn", "n"],
  ng: ["ng"],
  l: ["ll", "l"],
  r: ["rr", "r"],
  w: ["w"],
  y: ["y"],
  // Added for the A-Z letter model's multi-sound letters — see
  // lib/pronunciation/englishSounds.ts (Q, X, and Y's long-I sound).
  "q-kw": ["qu", "q"],
  "x-ks": ["x"],
  "x-gz": ["x"],
  "y-ai": ["y"],
};

export function highlightEnglishExample(word: string, soundId: string): HighlightSpan {
  const hints = ENGLISH_CONSONANT_HINTS[soundId];
  if (!hints) return null;

  const lower = word.toLowerCase();

  for (const hint of hints) {
    const index = lower.indexOf(hint);
    if (index !== -1) {
      return {
        before: word.slice(0, index),
        match: word.slice(index, index + hint.length),
        after: word.slice(index + hint.length),
      };
    }
  }

  return null;
}
