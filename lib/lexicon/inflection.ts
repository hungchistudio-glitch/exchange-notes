import type { LanguageCode } from "@/lib/languages";

/* =========================================================
   The dictionary form of a typed word, guessed

   The dictionaries on the server hold one form of each word — "shoe",
   "nave", "fuerza" — and readers type the one in front of them: "shoes",
   "navi", "fuerzas" (all three among real lookups that came back empty,
   2026-10-01). These are the forms a plural or a third-person "-s" most
   likely came from, most likely first. A guess only ever counts when the
   dictionary has it, so a wrong one costs nothing.

   Plurals and the commonest endings only. Anything cleverer — verb tenses,
   irregulars ("children", "yeux") — is what the model is for.

   Japanese and Korean are the exception (2026-11-16): a reader copies
   食べました or 먹었어요 out of a sentence far more often than a plural,
   and both languages build those forms regularly enough to undo. They get
   functions below rather than single endings, because the answer depends
   on the verb's class (Japanese) or on the vowel a Korean ending merged
   into. They over-guess on purpose: a guess counts only if the dictionary
   has it.
   ========================================================= */

type Rule = readonly [ending: RegExp, replacement: string];

const RULES: Record<LanguageCode, readonly Rule[]> = {
  en: [
    [/ies$/, "y"], // berries → berry, cities → city
    [/ves$/, "f"], // leaves → leaf, shelves → shelf
    [/ves$/, "fe"], // knives → knife, wives → wife
    [/(s|x|z|ch|sh|o)es$/, "$1"], // boxes → box, dishes → dish, tomatoes → tomato
    [/s$/, ""], // shoes → shoe, eats → eat
  ],
  es: [
    [/ces$/, "z"], // luces → luz, lápices → lápiz
    [/([aeiouáéíóú])s$/, "$1"], // casas → casa, cafés → café
    [/es$/, ""], // ciudades → ciudad, flores → flor
  ],
  fr: [
    [/aux$/, "al"], // journaux → journal, animaux → animal
    [/eaux$/, "eau"], // gâteaux → gâteau
    [/x$/, ""], // jeux → jeu, cheveux → cheveu
    [/s$/, ""], // pommes → pomme, chats → chat
  ],
  it: [
    [/chi$/, "co"], // cuochi → cuoco, tedeschi → tedesco
    [/ghi$/, "go"], // laghi → lago
    [/che$/, "ca"], // amiche → amica
    [/ghe$/, "ga"], // righe → riga
    [/i$/, "o"], // libri → libro, gatti → gatto
    [/i$/, "e"], // navi → nave, fiori → fiore
    [/e$/, "a"], // case → casa, sedie → sedia
  ],
  "zh-TW": [],
  // Japanese and Korean: see japaneseCandidates and koreanCandidates.
  ja: [],
  ko: [],
};

/** Possible dictionary forms of `text`, most likely first; never `text` itself. */
export function lemmaCandidates(text: string, language: LanguageCode): string[] {
  const word = text.trim();
  if (language === "ja" || language === "ko") return cjkCandidates(word, language);

  // Too short to be a plural worth guessing at ("is", "as", "tu").
  if (word.length < 4 || /\s/.test(word)) return [];

  const seen = new Set<string>();
  for (const [ending, replacement] of RULES[language]) {
    if (!ending.test(word)) continue;
    const candidate = word.replace(ending, replacement);
    if (candidate !== word && candidate.length >= 2) seen.add(candidate);
  }

  return [...seen];
}

/* =========================================================
   Japanese and Korean
   ========================================================= */

/* A one-character word is real in both (本, 책), but only as a kanji or a
   Hangul syllable: a lone kana left by a wrong guess is never a word. */
const ONE_CHARACTER_WORD = /^[\p{Script=Han}가-힣]$/u;

function cjkCandidates(word: string, language: "ja" | "ko"): string[] {
  if (word.length < 2 || /\s/.test(word)) return [];

  const guess = language === "ja" ? japaneseCandidates : koreanCandidates;
  const seen = new Set<string>();
  const keep = (candidate: string) => {
    if (candidate === word || seen.has(candidate)) return;
    if (candidate.length < 2 && !ONE_CHARACTER_WORD.test(candidate)) return;
    seen.add(candidate);
  };

  // Two steps deep: 高かったです → 高かった → 高い, 학생들이 → 학생들 → 학생.
  const first = guess(word);
  first.forEach(keep);
  for (const step of first) {
    if (step.length >= 2) guess(step).forEach(keep);
  }

  return [...seen];
}

/* ---------- Japanese ---------- */

const GODAN_I_TO_U: Record<string, string> = {
  き: "く", ぎ: "ぐ", し: "す", ち: "つ", に: "ぬ", び: "ぶ", み: "む", り: "る", い: "う",
};
const GODAN_A_TO_U: Record<string, string> = {
  か: "く", が: "ぐ", さ: "す", た: "つ", な: "ぬ", ば: "ぶ", ま: "む", ら: "る", わ: "う",
};

/** The dictionary forms a masu-stem (食べ, 書き, 勉強し) can come from. */
function fromMasuStem(stem: string): string[] {
  if (!stem) return [];
  const last = stem.slice(-1);
  const head = stem.slice(0, -1);
  const out = [`${stem}る`]; // ichidan: 食べ → 食べる, 見 → 見る, 来 → 来る
  if (GODAN_I_TO_U[last]) out.push(head + GODAN_I_TO_U[last]); // 書き → 書く
  if (last === "し" && head) out.push(`${head}する`, head); // 勉強し → 勉強する, 勉強
  return out;
}

/** The dictionary forms a te- or ta-form (書いて, 飲んだ, 食べた) can come from. */
function fromTeForm(base: string, voiced: boolean): string[] {
  if (!base) return [];
  const last = base.slice(-1);
  const head = base.slice(0, -1);
  if (voiced) {
    if (last === "い") return [`${head}ぐ`]; // 泳いで → 泳ぐ
    if (last === "ん") return [`${head}む`, `${head}ぶ`, `${head}ぬ`]; // 飲んで → 飲む
    return [];
  }
  const out: string[] = [];
  if (last === "い") out.push(`${head}く`); // 書いて → 書く
  if (last === "っ") out.push(`${head}う`, `${head}つ`, `${head}る`, `${head}く`); // 買って, 待って, 帰って, 行って
  if (last === "し" && head) out.push(`${head}す`, `${head}する`, head); // 話して → 話す, 勉強して → 勉強する
  out.push(`${base}る`); // ichidan: 食べて → 食べる
  return out;
}

/** The dictionary forms a negative stem (書か, 食べ, し) can come from. */
function fromNegativeStem(stem: string): string[] {
  if (!stem) return [];
  const last = stem.slice(-1);
  const head = stem.slice(0, -1);
  const out = [`${stem}る`]; // 食べない → 食べる
  if (GODAN_A_TO_U[last]) out.push(head + GODAN_A_TO_U[last]); // 書かない → 書く
  if (last === "し" && head) out.push(`${head}する`, head); // 勉強しない → 勉強する
  return out;
}

type Undo = readonly [ending: RegExp, undo: (before: string) => string[]];

const JAPANESE: readonly Undo[] = [
  // The copula and polite です, then a particle left on a noun (本を → 本).
  [/(?:ではありません|じゃありません|ではない|じゃない|でした|だった|です|だ)$/, (b) => [b]],
  [/(?:から|まで|より|を|が|は|に|で|と|も|の|へ)$/, (b) => [b]],
  // Polite verbs: 食べました, 書きません, 行きましょう; and -たい, -ながら.
  [/(?:ませんでした|ました|ません|ましょう|ます|たかった|たい|ながら)$/, fromMasuStem],
  // The progressive: 書いています → 書いて.
  [/(?:ています|ていました|ている|ていた|てる)$/, (b) => [`${b}て`]],
  [/(?:でいます|でいました|でいる|でいた|でる)$/, (b) => [`${b}で`]],
  // te- and ta-forms, and what is built on them.
  [/(?:ては|ても|たら|たり|て|た)$/, (b) => fromTeForm(b, false)],
  [/(?:では|でも|だら|だり|で|だ)$/, (b) => fromTeForm(b, true)],
  // Negatives: 書かない, 食べなかった.
  [/(?:なかった|なくて|なければ|ない)$/, fromNegativeStem],
  // i-adjectives: 高かった, 高くない, 高くて, 高ければ, 高く.
  [/(?:くなかった|くない|かった|くて|ければ|く)$/, (b) => (b ? [`${b}い`] : [])],
  // The two irregular verbs, wherever their stems are written in kana.
  [/^(?:し|さ)(?:ます|ました|ません|ない|なかった|て|た)$/, () => ["する"]],
  [/^(?:き|こ)(?:ます|ました|ません|ない|なかった|て|た)$/, () => ["くる"]],
];

function japaneseCandidates(word: string): string[] {
  return undoAll(word, JAPANESE);
}

/* ---------- Korean ---------- */

const SYLLABLE_BASE = 0xac00;
const FINAL_COUNT = 28;
const MEDIAL_COUNT = 21;

type Jamo = { initial: number; medial: number; final: number };

function split(syllable: string): Jamo | null {
  const code = syllable.charCodeAt(0) - SYLLABLE_BASE;
  if (syllable.length !== 1 || code < 0 || code > 11171) return null;
  return {
    initial: Math.floor(code / (MEDIAL_COUNT * FINAL_COUNT)),
    medial: Math.floor(code / FINAL_COUNT) % MEDIAL_COUNT,
    final: code % FINAL_COUNT,
  };
}

function join({ initial, medial, final }: Jamo): string {
  return String.fromCharCode(SYLLABLE_BASE + (initial * MEDIAL_COUNT + medial) * FINAL_COUNT + final);
}

// Indices into the Unicode Hangul tables.
const INITIAL_SILENT = 11; // ㅇ
const INITIAL_H = 18; // ㅎ
const FINAL_B = 17; // ㅂ
const FINAL_SS = 20; // ㅆ
const M = { a: 0, ae: 1, eo: 4, e: 5, yeo: 6, o: 8, wa: 9, wae: 10, oe: 11, u: 13, wo: 14, eu: 18, i: 20 };

/*
 * The medial a stem's last vowel had before -아/-어 merged into it, every
 * possibility: 와 was 오 (와요 → 오다), 줘 was 주, 셔 was 시, 돼 was 되,
 * 써 was 쓰 and 바빠 was 바쁘 (ㅡ drops), and 가, 서, 보내 never changed.
 */
const UNMERGED: Partial<Record<number, readonly number[]>> = {
  [M.wa]: [M.o],
  [M.wo]: [M.u],
  [M.yeo]: [M.i, M.yeo],
  [M.wae]: [M.oe],
  [M.eo]: [M.eo, M.eu],
  [M.a]: [M.a, M.eu],
  [M.ae]: [M.ae],
  [M.e]: [M.e],
  [M.oe]: [M.oe],
};

/** Stems an infinitive (먹어, 가, 해, 마셔) can come from. */
function stemsOfInfinitive(infinitive: string): string[] {
  const last = split(infinitive.slice(-1));
  const head = infinitive.slice(0, -1);
  if (!last || last.final !== 0) return [];

  // A separate 어/아/여: 먹어 → 먹, 좋아 → 좋, 하여 → 하.
  if (last.initial === INITIAL_SILENT && (last.medial === M.eo || last.medial === M.a)) {
    return head ? [head] : [];
  }
  if (last.initial === INITIAL_SILENT && last.medial === M.yeo && head.endsWith("하")) return [head];

  // 해 is 하 + 여: 공부해 → 공부하.
  if (last.initial === INITIAL_H && last.medial === M.ae) return [`${head}하`];

  return (UNMERGED[last.medial] ?? []).map((medial) => head + join({ ...last, medial }));
}

/** Stems a stem-with-tense (먹었, 갔, 했) or a plain stem can come from. */
function stemsOf(stem: string): string[] {
  const last = split(stem.slice(-1));
  if (!last) return [];
  if (last.final === FINAL_SS) {
    // The past: drop the ㅆ and what is left is the infinitive (먹었 → 먹어).
    return stemsOfInfinitive(stem.slice(0, -1) + join({ ...last, final: 0 }));
  }
  return [stem];
}

/** The infinitive of a polite or past form, before -요 (먹었어 → 먹, 마셔 → 마시). */
function stemsBeforeYo(before: string): string[] {
  // 먹었어, 갔어, 했어: the -어 after a past ㅆ is not the stem's.
  if (before.endsWith("어") && split(before.slice(-2, -1))?.final === FINAL_SS) {
    return stemsOf(before.slice(0, -1));
  }
  return stemsOfInfinitive(before);
}

/** Endings after a noun: the copula, or a particle (책을 → 책, 학생들이 → 학생들). */
const KOREAN_NOUN: readonly Undo[] = [
  [/(?:입니다|입니까|이에요|예요|이었어요|였어요|이다|이야)$/, (b) => [b]],
  [/(?:에서|에게|한테|부터|까지|으로|처럼|보다|로|을|를|이|가|은|는|에|와|과|도|의|만|들)$/, (b) => [b]],
];

/** Endings after a verb or adjective stem; each stem found is given -다. */
const KOREAN_VERB: readonly Undo[] = [
  // The formal style: 먹습니다, 먹었습니다; 갑니다, 공부합니다 (ㅂ on the stem).
  [/(?:습니다|습니까)$/, stemsOf],
  [
    /(?:니다|니까)$/,
    (b) => {
      const last = split(b.slice(-1));
      return last?.final === FINAL_B ? [b.slice(0, -1) + join({ ...last, final: 0 })] : [];
    },
  ],
  // Honorific -(으)세요 and -(으)셨어요: 가세요 → 가, 읽으세요 → 읽.
  [/(?:으세요|으셨어요|세요|셨어요)$/, (b) => (b ? [b] : [])],
  // The polite style: 먹어요, 먹었어요, 마셔요, 해요, 와요.
  [/요$/, stemsBeforeYo],
  // The plain past: 먹었다, 갔다.
  [/다$/, (b) => (split(b.slice(-1))?.final === FINAL_SS ? stemsOf(b) : [])],
  // Connectives on a bare stem: 먹고, 먹는, 먹지만, 먹으면, 가면.
  [/(?:지만|으면|으니까|고|는|지|면)$/, (b) => (b ? stemsOf(b) : [])],
  // -아서/-어서: 먹어서 → 먹, 가서 → 가, 해서 → 하.
  [/(?:어서|아서|서)$/, (b) => [...stemsOfInfinitive(b), ...(b ? stemsOf(b) : [])]],
];

function undoAll(word: string, rules: readonly Undo[]): string[] {
  const out: string[] = [];
  for (const [ending, undo] of rules) {
    const match = ending.exec(word);
    if (match) out.push(...undo(word.slice(0, match.index)));
  }
  return out;
}

function koreanCandidates(word: string): string[] {
  return [
    ...undoAll(word, KOREAN_NOUN),
    ...undoAll(word, KOREAN_VERB).map((stem) => `${stem}다`),
  ];
}
