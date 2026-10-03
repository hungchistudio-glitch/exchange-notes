/* =========================================================
   Spanish IPA from spelling

   Spanish spelling is close enough to its sound that a dictionary form can
   be transcribed by rule, and more reliably than a model did it: the model
   transcriptions in word_phonetics include /supeˈaɾ/ for "superar" and
   /maˈsahe/ for "masaje". Used only at build time, only for the app's own
   dictionary forms (scripts/builtin-ipa/generate.mjs), where a loanword the
   rules would get wrong ("whisky", "pizza") can be checked by eye.

   Broad phonemic, neutral Latin-American-and-Spain-compatible choices:
   seseo (c/z = s), yeísmo (ll = y = ʝ), x = ks, b/v = b, h silent. Stress
   by the written accent, else the penultimate syllable for words ending in
   a vowel, n or s, else the last; marked before its syllable on words of two
   or more syllables.
   ========================================================= */

const STRONG = new Set(["a", "e", "o", "á", "é", "í", "ó", "ú"]);
const VOWEL = new Set(["a", "e", "i", "o", "u", "á", "é", "í", "ó", "ú", "ü"]);
const ACCENTED = { "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u" };
const FRONT = new Set(["e", "i", "é", "í"]);
const ONSET_CLUSTERS = new Set(["pl", "pɾ", "bl", "bɾ", "fl", "fɾ", "kl", "kɾ", "ɡl", "ɡɾ", "tɾ", "dɾ"]);

/** Segments of one word: { s: symbol, t: "C" | "V" | "G", stress?: true } */
function segments(word) {
  const out = [];
  const w = word;
  for (let i = 0; i < w.length; i += 1) {
    const c = w[i];
    const next = w[i + 1] ?? "";
    const prev = out.at(-1);

    if (VOWEL.has(c)) {
      if (c === "ü") { out.push({ s: "w", t: "G" }); continue; }
      out.push({ s: ACCENTED[c] ?? c, t: "V", stress: c in ACCENTED, strong: STRONG.has(c) });
      continue;
    }

    switch (c) {
      case "c":
        if (next === "h") { out.push({ s: "tʃ", t: "C" }); i += 1; }
        else if (FRONT.has(next)) out.push({ s: "s", t: "C" });
        else out.push({ s: "k", t: "C" });
        break;
      case "q":
        out.push({ s: "k", t: "C" });
        if (next === "u") i += 1;
        break;
      case "g":
        if (FRONT.has(next)) out.push({ s: "x", t: "C" });
        else {
          out.push({ s: "ɡ", t: "C" });
          if (next === "u" && FRONT.has(w[i + 2] ?? "")) i += 1;
        }
        break;
      case "l":
        if (next === "l") { out.push({ s: "ʝ", t: "C" }); i += 1; }
        else out.push({ s: "l", t: "C" });
        break;
      case "r": {
        if (next === "r") { out.push({ s: "r", t: "C" }); i += 1; break; }
        const strong = i === 0 || ["l", "n", "s"].includes(w[i - 1]);
        out.push({ s: strong ? "r" : "ɾ", t: "C" });
        break;
      }
      case "y":
        // A vowel at the end of a word ("hoy", "muy") or standing alone.
        if (!next || !VOWEL.has(next)) {
          // After a strong vowel it closes the syllable ("hoy" /oj/); after
          // u it is the nucleus and the u glides ("muy" /mwi/).
          if (prev && prev.t === "V" && (prev.strong || prev.stress)) out.push({ s: "j", t: "G" });
          else out.push({ s: "i", t: "V", strong: false });
        } else out.push({ s: "ʝ", t: "C" });
        break;
      case "h": break;
      case "j": out.push({ s: "x", t: "C" }); break;
      case "z": out.push({ s: "s", t: "C" }); break;
      case "v": out.push({ s: "b", t: "C" }); break;
      case "ñ": out.push({ s: "ɲ", t: "C" }); break;
      case "x":
        out.push({ s: "k", t: "C" }, { s: "s", t: "C" });
        // "excelente": with seseo the c is the same /s/ the x ends in.
        if (next === "c" && FRONT.has(w[i + 2] ?? "")) i += 1;
        break;
      case "w": out.push({ s: "w", t: "G" }); break;
      default:
        if (/[a-z]/.test(c)) out.push({ s: c === "g" ? "ɡ" : c, t: "C" });
        else return null; // a character the rules do not cover
    }
  }

  // Glides: an unaccented i/u beside another vowel. Two weak vowels: the
  // first glides ("ciudad", "muy").
  for (let i = 0; i < out.length; i += 1) {
    const seg = out[i];
    if (seg.t !== "V" || seg.strong || seg.stress) continue;
    const before = out[i - 1];
    const after = out[i + 1];
    const besideVowel = (before && before.t === "V") || (after && after.t === "V");
    if (!besideVowel) continue;
    const weakPair = after && after.t === "V" && !after.strong && !after.stress;
    const nextToStrong = (before?.t === "V" && (before.strong || before.stress)) ||
      (after?.t === "V" && (after.strong || after.stress));
    if (nextToStrong || weakPair) {
      seg.t = "G";
      seg.s = seg.s === "i" ? "j" : "w";
    }
  }

  return out;
}

function syllabify(segs) {
  const nuclei = segs.map((s, i) => (s.t === "V" ? i : -1)).filter((i) => i >= 0);
  if (nuclei.length === 0) return null;
  const starts = [0];

  for (let n = 0; n < nuclei.length - 1; n += 1) {
    const a = nuclei[n];
    const b = nuclei[n + 1];
    let lo = a + 1;
    let hi = b; // segments a+1 .. b-1 lie between
    // A glide right after the nucleus, before a consonant, is its coda.
    while (lo < hi && segs[lo].t === "G" && (lo + 1 >= hi || segs[lo + 1].t !== "V") && segs[lo + 1]?.t !== "G") {
      if (lo + 1 < hi && segs[lo + 1].t === "C") { lo += 1; break; }
      break;
    }
    // A glide right before the next nucleus is its onset.
    let onsetStart = hi;
    while (onsetStart - 1 >= lo && segs[onsetStart - 1].t === "G") onsetStart -= 1;
    const consonants = [];
    for (let i = lo; i < onsetStart; i += 1) consonants.push(i);
    const cs = consonants.map((i) => segs[i].s);
    let split; // index into consonants where the next syllable starts
    if (cs.length === 0) split = 0;
    else if (cs.length === 1) split = 0;
    else if (cs.length === 2) split = ONSET_CLUSTERS.has(cs.join("")) ? 0 : 1;
    else if (cs.length === 3) split = ONSET_CLUSTERS.has(cs.slice(1).join("")) ? 1 : 2;
    else split = cs.length - 2 + (ONSET_CLUSTERS.has(cs.slice(-2).join("")) ? 0 : 1);
    starts.push(cs.length === 0 ? onsetStart : consonants[split]);
  }

  return starts.map((start, n) => segs.slice(start, starts[n + 1] ?? segs.length));
}

function stressedSyllable(word, syllables) {
  const marked = syllables.findIndex((syl) => syl.some((s) => s.stress));
  if (marked >= 0) return marked;
  if (syllables.length === 1) return 0;
  return /[aeiouns]$/.test(word) ? syllables.length - 2 : syllables.length - 1;
}

/*
 * Spelling that says "not pronounced by Spanish rules": a borrowed word
 * keeps its own ("hashtag", "sándwich", "risotto", "jazz"). Those are left
 * to the model rather than read aloud as if they were Spanish. Doubled
 * consonants other than rr, ll, cc and nn ("acción", "innovar") are foreign
 * in Spanish spelling; so are w, sh, th, ph, ck, tch, oo, ee, a final ng,
 * and an initial x.
 */
const FOREIGN = /w|th|ph|ck|tch|ee$|ng$|^x|([bdfgkmpstvz])\1/;
/* "sh" is foreign except across the prefix des-/dis- ("deshonesto"). */
const isForeign = (word) =>
  FOREIGN.test(word) || (/sh/.test(word) && !/^(des|dis)h/.test(word));

/* Loanwords that look Spanish but are not said by its rules. */
const EXCEPTIONS = {
  judo: "ˈʝudo",
  jet: "ʝet",
  pizza: "ˈpitsa",
  room: "rum",
};

export function spanishWordIpa(raw) {
  const word = raw.toLowerCase().normalize("NFC");
  if (!/^[a-záéíóúüñ]+$/.test(word)) return null;
  if (word in EXCEPTIONS) return EXCEPTIONS[word];
  if (isForeign(word)) return null;
  const segs = segments(word);
  if (!segs) return null;
  const syllables = syllabify(segs);
  if (!syllables) return null;
  const stress = stressedSyllable(word, syllables);
  return syllables
    .map((syl, n) => (syllables.length > 1 && n === stress ? "ˈ" : "") + syl.map((s) => s.s).join(""))
    .join("");
}

/** A headword or phrase; null when any word is outside the rules. */
export function spanishIpa(text) {
  const words = text
    .toLowerCase()
    .replace(/[¿?¡!.,;:«»"]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return null;
  const parts = words.map(spanishWordIpa);
  if (parts.some((part) => !part)) return null;
  return `/${parts.join(" ")}/`;
}
