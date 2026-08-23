import { zhuyinSounds } from "@/lib/pronunciation/zhuyinSounds";
import type {
  MinimalPairSet,
  PronunciationCategoryGroup,
  PronunciationLanguagePack,
  PronunciationLesson,
  PronunciationUnit,
} from "@/lib/pronunciation/lab/types";

/* =========================================================
   Traditional Chinese (Taiwan Mandarin, Zhuyin)

   The 37 zhuyin symbols are carried over whole — the recorded audio, the
   articulation features that drive Yumi's mouth, the guidance, the common
   traps. That content was written for this app and works; the migration is
   a change of container, not of material.

   What is new is everything the symbol grid could never hold: the tones,
   which are not symbols but shapes over time, and the rules for what
   happens when two of them meet.
   ========================================================= */

const GROUP_FOR_CATEGORY = {
  initial: "initials",
  medial: "medials",
  final: "finals",
} as const;

const categories: PronunciationCategoryGroup[] = [
  {
    id: "initials",
    label: { english: "Initials", "traditional-chinese": "聲母", spanish: "Iniciales" },
    description: {
      english: "The 21 consonants a syllable can begin with.",
      "traditional-chinese": "音節開頭的 21 個聲母。",
    },
  },
  {
    id: "medials",
    label: { english: "Medials", "traditional-chinese": "介音", spanish: "Mediales" },
    description: {
      english: "Three glides that sit between the initial and the final.",
      "traditional-chinese": "夾在聲母與韻母之間的三個介音。",
    },
  },
  {
    id: "finals",
    label: { english: "Finals", "traditional-chinese": "韻母", spanish: "Finales" },
    description: {
      english: "The vowels and vowel-plus-nasal endings.",
      "traditional-chinese": "母音，以及母音加鼻音的韻尾。",
    },
  },
  {
    id: "tones",
    label: { english: "Tones", "traditional-chinese": "聲調", spanish: "Tonos" },
    description: {
      english: "The same syllable, five different words.",
      "traditional-chinese": "同一個音節，五個不同的字。",
    },
  },
  {
    id: "tone-pairs",
    label: { english: "Tone pairs", "traditional-chinese": "聲調組合", spanish: "Pares de tonos" },
    module: "rhythm",
  },
  {
    id: "rhythm",
    label: { english: "Rhythm", "traditional-chinese": "節奏", spanish: "Ritmo" },
    module: "rhythm",
  },
];

/**
 * The zhuyin symbols, unchanged in substance.
 *
 * `soundText` becomes `speechText` and the romanization becomes the phonetic
 * annotation, which is what they already were — the old field names simply
 * said "Chinese" where the new ones say "this language".
 */
const symbolUnits: PronunciationUnit[] = zhuyinSounds.map((sound) => ({
  id: `zhuyin-${sound.id}`,
  language: "zh-TW" as const,
  category: "grapheme" as const,
  group: GROUP_FOR_CATEGORY[sound.category],
  symbol: sound.symbol,
  nativeRepresentation: sound.symbol,
  phoneticRepresentation: sound.romanization,
  speechText: sound.soundText,
  audio: sound.audio,
  tip: sound.tip,
  guidance: sound.guidance,
  features: sound.phonetics,
  examples: sound.examples.map((example) => ({
    text: example.word,
    phonetic: example.zhuyin,
    highlight: example.zhuyin.includes(sound.symbol) ? sound.symbol : undefined,
  })),
  commonMistake: sound.commonMistake
    ? {
        confusedWith: sound.commonMistake.confusedWith,
        explanation: sound.commonMistake.explanation,
      }
    : undefined,
  difficulty: sound.commonMistake ? 4 : 2,
}));

/**
 * The tones.
 *
 * Shown on a real vowel rather than as a bare diacritic: ㄚ with a mark on
 * it is a syllable a learner can actually say, where "ˋ" on its own is a
 * piece of notation. The pitch contour underneath is the Chao number that
 * describes the shape — 51 falls from high to low, 35 rises from mid to
 * high — which is what the tone actually is.
 */
const toneUnits: PronunciationUnit[] = [
  {
    id: "tone-1",
    language: "zh-TW",
    category: "tone",
    group: "tones",
    symbol: "ā",
    nativeRepresentation: "ㄚ",
    phoneticRepresentation: "55",
    displayLabel: { english: "First tone", "traditional-chinese": "第一聲（陰平）", spanish: "Primer tono" },
    speechText: "媽",
    tip: {
      english: "High and level. Start near the top of your comfortable range and do not move — the hardest part is holding it flat, because speech naturally drifts down.",
      "traditional-chinese": "又高又平。從你舒服音域的高處開始，然後不要動——最難的是維持平穩，因為說話自然會往下掉。",
    },
    guidance: [
      { label: { english: "Pitch", "traditional-chinese": "音高" }, text: { english: "High, held level", "traditional-chinese": "高、維持平穩" } },
    ],
    examples: [
      { text: "媽", phonetic: "ㄇㄚ", meaning: { english: "mother", "traditional-chinese": "母親" } },
      { text: "天空", phonetic: "ㄊㄧㄢ ㄎㄨㄥ", meaning: { english: "sky", "traditional-chinese": "天空" } },
      { text: "工作", phonetic: "ㄍㄨㄥ ㄗㄨㄛˋ", meaning: { english: "work", "traditional-chinese": "工作" } },
    ],
    difficulty: 2,
  },
  {
    id: "tone-2",
    language: "zh-TW",
    category: "tone",
    group: "tones",
    symbol: "á",
    nativeRepresentation: "ㄚˊ",
    phoneticRepresentation: "35",
    displayLabel: { english: "Second tone", "traditional-chinese": "第二聲（陽平）", spanish: "Segundo tono" },
    speechText: "麻",
    tip: {
      english: "Rising, from the middle of your range upward. It is the pitch of an English \"huh?\" — a real question, not a polite one.",
      "traditional-chinese": "從中間往上揚。像英語裡真心疑惑的「huh?」的音高，不是客套的那種。",
    },
    guidance: [
      { label: { english: "Pitch", "traditional-chinese": "音高" }, text: { english: "Mid, rising to high", "traditional-chinese": "中起，往高處揚" } },
    ],
    examples: [
      { text: "麻", phonetic: "ㄇㄚˊ", meaning: { english: "hemp", "traditional-chinese": "麻" } },
      { text: "來", phonetic: "ㄌㄞˊ", meaning: { english: "come", "traditional-chinese": "來" } },
      { text: "學習", phonetic: "ㄒㄩㄝˊ ㄒㄧˊ", meaning: { english: "to study", "traditional-chinese": "學習" } },
    ],
    difficulty: 3,
  },
  {
    id: "tone-3",
    language: "zh-TW",
    category: "tone",
    group: "tones",
    symbol: "ǎ",
    nativeRepresentation: "ㄚˇ",
    phoneticRepresentation: "214",
    displayLabel: { english: "Third tone", "traditional-chinese": "第三聲（上聲）", spanish: "Tercer tono" },
    speechText: "馬",
    tip: {
      english: "Dips low and stays there. In ordinary speech it usually does not rise again at all — the full dip-and-rise only happens on a word said alone or at the end of a sentence.",
      "traditional-chinese": "先降到低處並停在那裡。日常說話時多半不會再揚起來——完整的先降後升只出現在單念或句尾。",
    },
    guidance: [
      { label: { english: "Pitch", "traditional-chinese": "音高" }, text: { english: "Dips low and settles", "traditional-chinese": "降到低處並停住" } },
      { label: { english: "In a sentence", "traditional-chinese": "在句子裡" }, text: { english: "Usually no rise at all", "traditional-chinese": "通常完全不會揚起來" } },
    ],
    examples: [
      { text: "馬", phonetic: "ㄇㄚˇ", meaning: { english: "horse", "traditional-chinese": "馬" } },
      { text: "水", phonetic: "ㄕㄨㄟˇ", meaning: { english: "water", "traditional-chinese": "水" } },
      { text: "可以", phonetic: "ㄎㄜˇ ㄧˇ", meaning: { english: "can, may", "traditional-chinese": "可以" } },
    ],
    difficulty: 4,
  },
  {
    id: "tone-4",
    language: "zh-TW",
    category: "tone",
    group: "tones",
    symbol: "à",
    nativeRepresentation: "ㄚˋ",
    phoneticRepresentation: "51",
    displayLabel: { english: "Fourth tone", "traditional-chinese": "第四聲（去聲）", spanish: "Cuarto tono" },
    speechText: "罵",
    tip: {
      english: "Falls sharply from the top to the bottom, and it is short. The energy of a decisive \"No.\"",
      "traditional-chinese": "從最高處急速下降到底，而且很短。像斬釘截鐵說「不行」的那股力道。",
    },
    guidance: [
      { label: { english: "Pitch", "traditional-chinese": "音高" }, text: { english: "High, falling sharply", "traditional-chinese": "從高處急降" } },
    ],
    examples: [
      { text: "罵", phonetic: "ㄇㄚˋ", meaning: { english: "to scold", "traditional-chinese": "罵" } },
      { text: "謝謝", phonetic: "ㄒㄧㄝˋ ㄒㄧㄝ˙", meaning: { english: "thank you", "traditional-chinese": "謝謝" } },
      { text: "看見", phonetic: "ㄎㄢˋ ㄐㄧㄢˋ", meaning: { english: "to see", "traditional-chinese": "看見" } },
    ],
    difficulty: 2,
  },
  {
    id: "tone-neutral",
    language: "zh-TW",
    category: "tone",
    group: "tones",
    symbol: "a",
    nativeRepresentation: "ㄚ˙",
    phoneticRepresentation: "·",
    displayLabel: { english: "Neutral tone", "traditional-chinese": "輕聲", spanish: "Tono neutro" },
    speechText: "嗎",
    tip: {
      english: "Not a fifth tone — an absence of one. Short, light, and its pitch is decided entirely by the syllable before it. Giving it a tone of its own is what makes Mandarin sound stiff.",
      "traditional-chinese": "它不是第五個聲調，而是沒有聲調。又短又輕，音高完全由前一個字決定。硬給它一個調，正是中文聽起來僵硬的原因。",
    },
    guidance: [
      { label: { english: "Length", "traditional-chinese": "長度" }, text: { english: "Very short", "traditional-chinese": "非常短" } },
      { label: { english: "Pitch", "traditional-chinese": "音高" }, text: { english: "Borrowed from the syllable before", "traditional-chinese": "跟著前一個字走" } },
    ],
    examples: [
      { text: "嗎", phonetic: "ㄇㄚ˙", meaning: { english: "question particle", "traditional-chinese": "疑問助詞" } },
      { text: "爸爸", phonetic: "ㄅㄚˋ ㄅㄚ˙", meaning: { english: "dad", "traditional-chinese": "爸爸" } },
      { text: "東西", phonetic: "ㄉㄨㄥ ㄒㄧ˙", meaning: { english: "thing", "traditional-chinese": "東西" } },
    ],
    difficulty: 4,
  },
];

const minimalPairs: MinimalPairSet[] = [
  {
    id: "ma-tones",
    language: "zh-TW",
    targets: ["tone-1", "tone-2", "tone-3", "tone-4"],
    label: { english: "mā / má / mǎ / mà", "traditional-chinese": "媽 / 麻 / 馬 / 罵" },
    hint: {
      english: "One syllable, four words. Only the shape of the pitch tells them apart.",
      "traditional-chinese": "同一個音節，四個字。分辨它們的只有音高的形狀。",
    },
    examples: [
      [
        { unitId: "tone-1", text: "媽", phonetic: "ㄇㄚ", meaning: { english: "mother", "traditional-chinese": "母親" } },
        { unitId: "tone-2", text: "麻", phonetic: "ㄇㄚˊ", meaning: { english: "hemp", "traditional-chinese": "麻" } },
        { unitId: "tone-3", text: "馬", phonetic: "ㄇㄚˇ", meaning: { english: "horse", "traditional-chinese": "馬" } },
        { unitId: "tone-4", text: "罵", phonetic: "ㄇㄚˋ", meaning: { english: "to scold", "traditional-chinese": "罵" } },
      ],
      [
        { unitId: "tone-1", text: "湯", phonetic: "ㄊㄤ", meaning: { english: "soup", "traditional-chinese": "湯" } },
        { unitId: "tone-2", text: "糖", phonetic: "ㄊㄤˊ", meaning: { english: "sugar", "traditional-chinese": "糖" } },
        { unitId: "tone-3", text: "躺", phonetic: "ㄊㄤˇ", meaning: { english: "to lie down", "traditional-chinese": "躺" } },
        { unitId: "tone-4", text: "燙", phonetic: "ㄊㄤˋ", meaning: { english: "scalding", "traditional-chinese": "燙" } },
      ],
    ],
  },
  {
    id: "zh-z-series",
    language: "zh-TW",
    targets: ["zhuyin-zh", "zhuyin-z"],
    label: { english: "ㄓ / ㄗ", "traditional-chinese": "ㄓ / ㄗ" },
    hint: {
      english: "Tongue curled back, or flat against the teeth.",
      "traditional-chinese": "舌頭捲起，還是平貼齒後。",
    },
    examples: [
      [
        { unitId: "zhuyin-zh", text: "知道", phonetic: "ㄓ ㄉㄠˋ", meaning: { english: "to know", "traditional-chinese": "知道" } },
        { unitId: "zhuyin-z", text: "自己", phonetic: "ㄗˋ ㄐㄧˇ", meaning: { english: "oneself", "traditional-chinese": "自己" } },
      ],
      [
        { unitId: "zhuyin-zh", text: "紙", phonetic: "ㄓˇ", meaning: { english: "paper", "traditional-chinese": "紙" } },
        { unitId: "zhuyin-z", text: "字", phonetic: "ㄗˋ", meaning: { english: "character", "traditional-chinese": "字" } },
      ],
    ],
  },
  {
    id: "sh-s-series",
    language: "zh-TW",
    targets: ["zhuyin-sh", "zhuyin-s"],
    label: { english: "ㄕ / ㄙ", "traditional-chinese": "ㄕ / ㄙ" },
    examples: [
      [
        { unitId: "zhuyin-sh", text: "十", phonetic: "ㄕˊ", meaning: { english: "ten", "traditional-chinese": "十" } },
        { unitId: "zhuyin-s", text: "四", phonetic: "ㄙˋ", meaning: { english: "four", "traditional-chinese": "四" } },
      ],
      [
        { unitId: "zhuyin-sh", text: "山", phonetic: "ㄕㄢ", meaning: { english: "mountain", "traditional-chinese": "山" } },
        { unitId: "zhuyin-s", text: "三", phonetic: "ㄙㄢ", meaning: { english: "three", "traditional-chinese": "三" } },
      ],
    ],
  },
  {
    id: "an-ang",
    language: "zh-TW",
    targets: ["zhuyin-an", "zhuyin-ang"],
    label: { english: "ㄢ / ㄤ", "traditional-chinese": "ㄢ / ㄤ" },
    hint: {
      english: "Tongue tip forward, or the back of the tongue sealing.",
      "traditional-chinese": "舌尖往前，還是舌根封住。",
    },
    examples: [
      [
        { unitId: "zhuyin-an", text: "慢", phonetic: "ㄇㄢˋ", meaning: { english: "slow", "traditional-chinese": "慢" } },
        { unitId: "zhuyin-ang", text: "忙", phonetic: "ㄇㄤˊ", meaning: { english: "busy", "traditional-chinese": "忙" } },
      ],
      [
        { unitId: "zhuyin-an", text: "山", phonetic: "ㄕㄢ", meaning: { english: "mountain", "traditional-chinese": "山" } },
        { unitId: "zhuyin-ang", text: "上", phonetic: "ㄕㄤˋ", meaning: { english: "above", "traditional-chinese": "上" } },
      ],
    ],
  },
  {
    id: "f-hu",
    language: "zh-TW",
    targets: ["zhuyin-f"],
    label: { english: "ㄈ / ㄏㄨ", "traditional-chinese": "ㄈ / ㄏㄨ" },
    hint: {
      english: "Teeth on the lip, or lips rounded with no contact at all.",
      "traditional-chinese": "牙齒咬下唇，還是嘴唇噘圓、完全沒碰到。",
    },
    examples: [
      [
        { unitId: "zhuyin-f", text: "飛機", phonetic: "ㄈㄟ ㄐㄧ", meaning: { english: "aeroplane", "traditional-chinese": "飛機" } },
        { unitId: "zhuyin-f", text: "灰機", phonetic: "ㄏㄨㄟ ㄐㄧ", meaning: { english: "the common mispronunciation", "traditional-chinese": "常見的錯誤唸法" } },
      ],
    ],
  },
];

const lessons: PronunciationLesson[] = [
  {
    id: "tone-pairs",
    language: "zh-TW",
    kind: "tone",
    difficulty: 3,
    title: { english: "Tone pairs", "traditional-chinese": "聲調組合", spanish: "Pares de tonos" },
    rule: {
      english: "Tones are learned in pairs, not one at a time. A two-syllable word is the smallest unit where a tone has somewhere to go.",
      "traditional-chinese": "聲調要成對地練，不能一個一個練。雙音節詞是聲調真正有地方可去的最小單位。",
    },
    phrases: [
      {
        id: "pair-1-1",
        text: "今天",
        meaning: { english: "today", "traditional-chinese": "今天" },
        beats: [
          { text: "ㄐㄧㄣ", stress: 0.5, tone: 1 },
          { text: "ㄊㄧㄢ", stress: 0.5, tone: 1 },
        ],
      },
      {
        id: "pair-2-4",
        text: "學校",
        meaning: { english: "school", "traditional-chinese": "學校" },
        beats: [
          { text: "ㄒㄩㄝ", stress: 0.5, tone: 2 },
          { text: "ㄒㄧㄠ", stress: 1, tone: 4 },
        ],
      },
      {
        id: "pair-3-1",
        text: "老師",
        meaning: { english: "teacher", "traditional-chinese": "老師" },
        beats: [
          { text: "ㄌㄠ", stress: 0.5, tone: 3 },
          { text: "ㄕ", stress: 0.5, tone: 1 },
        ],
      },
      {
        id: "pair-4-4",
        text: "再見",
        meaning: { english: "goodbye", "traditional-chinese": "再見" },
        beats: [
          { text: "ㄗㄞ", stress: 1, tone: 4 },
          { text: "ㄐㄧㄢ", stress: 1, tone: 4 },
        ],
      },
      {
        id: "pair-4-neutral",
        text: "謝謝",
        meaning: { english: "thank you", "traditional-chinese": "謝謝" },
        beats: [
          { text: "ㄒㄧㄝ", stress: 1, tone: 4 },
          { text: "ㄒㄧㄝ", stress: 0, tone: 5 },
        ],
      },
    ],
  },
  {
    id: "tone-sandhi",
    language: "zh-TW",
    kind: "tone",
    difficulty: 5,
    title: { english: "Tone sandhi", "traditional-chinese": "變調", spanish: "Cambio tonal" },
    rule: {
      english: "Two third tones in a row cannot both be said as third tones. The first one becomes a second tone — every native speaker does this, and none of them were taught it.",
      "traditional-chinese": "兩個三聲連在一起時不能都唸三聲，第一個會變成二聲。每個母語者都這樣唸，而且沒有人教過他們。",
    },
    phrases: [
      {
        id: "ni-hao",
        text: "你好",
        meaning: { english: "hello — said as ní hǎo", "traditional-chinese": "你好——實際唸成 ㄋㄧˊ ㄏㄠˇ" },
        beats: [
          { text: "ㄋㄧ", stress: 0.5, tone: 2 },
          { text: "ㄏㄠ", stress: 1, tone: 3 },
        ],
      },
      {
        id: "hen-hao",
        text: "很好",
        meaning: { english: "very good — said as hén hǎo", "traditional-chinese": "很好——實際唸成 ㄏㄣˊ ㄏㄠˇ" },
        beats: [
          { text: "ㄏㄣ", stress: 0.5, tone: 2 },
          { text: "ㄏㄠ", stress: 1, tone: 3 },
        ],
      },
      {
        id: "shui-guo",
        text: "水果",
        meaning: { english: "fruit — said as shuí guǒ", "traditional-chinese": "水果——實際唸成 ㄕㄨㄟˊ ㄍㄨㄛˇ" },
        beats: [
          { text: "ㄕㄨㄟ", stress: 0.5, tone: 2 },
          { text: "ㄍㄨㄛ", stress: 1, tone: 3 },
        ],
      },
    ],
  },
  {
    id: "word-rhythm",
    language: "zh-TW",
    kind: "rhythm",
    difficulty: 3,
    title: { english: "Word rhythm", "traditional-chinese": "詞的節奏", spanish: "Ritmo de la palabra" },
    rule: {
      english: "Mandarin gives every syllable roughly the same length. Stretching one the way English stretches a stressed syllable is what makes a sentence sound foreign even when every tone is right.",
      "traditional-chinese": "中文每個音節長度大致相同。像英語那樣把重音節拉長，就算每個聲調都對，句子聽起來還是會有外國腔。",
    },
    phrases: [
      {
        id: "wo-shi-xuesheng",
        text: "我是學生",
        meaning: { english: "I am a student", "traditional-chinese": "我是學生" },
        beats: [
          { text: "ㄨㄛ", stress: 0.5, tone: 3 },
          { text: "ㄕ", stress: 0.5, tone: 4 },
          { text: "ㄒㄩㄝ", stress: 0.5, tone: 2 },
          { text: "ㄕㄥ", stress: 0.5, tone: 1 },
        ],
      },
      {
        id: "ni-chi-fan-le-ma",
        text: "你吃飯了嗎",
        meaning: { english: "Have you eaten?", "traditional-chinese": "你吃飯了嗎" },
        beats: [
          { text: "ㄋㄧ", stress: 0.5, tone: 3 },
          { text: "ㄔ", stress: 0.5, tone: 1 },
          { text: "ㄈㄢ", stress: 0.5, tone: 4 },
          { text: "ㄌㄜ", stress: 0, tone: 5 },
          { text: "ㄇㄚ", stress: 0, tone: 5 },
        ],
      },
    ],
  },
  {
    id: "sentence-rhythm",
    language: "zh-TW",
    kind: "intonation",
    difficulty: 4,
    title: { english: "Sentence melody", "traditional-chinese": "句子語調", spanish: "Melodía de la frase" },
    rule: {
      english: "Sentence intonation rides on top of the tones without replacing them. A question does not raise the last tone — it raises the whole line the tones are drawn on.",
      "traditional-chinese": "句子的語調疊在聲調之上，不會取代聲調。問句不是把最後一個字揚起來，而是把整條聲調所在的基線抬高。",
    },
    phrases: [
      {
        id: "hen-hao-chi",
        text: "很好吃",
        meaning: { english: "It's delicious", "traditional-chinese": "很好吃" },
        beats: [
          { text: "ㄏㄣ", stress: 0.5, tone: 2 },
          { text: "ㄏㄠ", stress: 1, tone: 3 },
          { text: "ㄔ", stress: 0.5, tone: 1 },
        ],
      },
      {
        id: "hao-chi-ma",
        text: "好吃嗎",
        meaning: { english: "Is it good?", "traditional-chinese": "好吃嗎" },
        beats: [
          { text: "ㄏㄠ", stress: 1, tone: 3 },
          { text: "ㄔ", stress: 0.5, tone: 1 },
          { text: "ㄇㄚ", stress: 0, tone: 5 },
        ],
      },
    ],
  },
];

export const traditionalChinesePronunciationPack: PronunciationLanguagePack = {
  language: "zh-TW",
  displayName: "繁體中文",
  writingSystem: {
    type: "bopomofo",
    label: { english: "Zhuyin (Bopomofo)", "traditional-chinese": "注音符號", spanish: "Zhuyin (Bopomofo)" },
  },
  categories,
  units: [...symbolUnits, ...toneUnits],
  minimalPairs,
  lessons,
  scoreDimensions: ["sound", "tone", "pitch", "rhythm"],
  yumiCalibration: {
    instrument: "tone-contour",
    label: {
      english: "Pitch contour",
      "traditional-chinese": "音高曲線",
      spanish: "Contorno tonal",
    },
    // Mandarin initials sit close to a relaxed jaw and lip position and
    // differ mostly in where the tongue goes, so the rig's default emphasis
    // reads as almost no movement at all.
    mouthEmphasis: 1.9,
  },
  defaultDialect: "zh-TW",
  dialects: ["zh-TW"],
};
