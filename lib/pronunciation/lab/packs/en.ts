import { englishLetters } from "@/lib/pronunciation/englishSounds";
import type {
  MinimalPairSet,
  PronunciationCategoryGroup,
  PronunciationLanguagePack,
  PronunciationLesson,
  PronunciationUnit,
} from "@/lib/pronunciation/lab/types";

import { consonant, vowel } from "./features";

/* =========================================================
   English

   Two layers, deliberately. The `letters` group is the A-Z phonics content
   this app already shipped and that people have been using — one card per
   letter, the letter's own name, and whichever sounds it makes in words —
   carried over rather than rewritten. The phoneme groups underneath it are
   new, and they teach the sounds the letters do not name: the two TH's, the
   R/L contrast, the schwa, the diphthongs.

   Those are different questions ("what does this letter do" vs "how is this
   sound made"), which is why both exist and why neither is a duplicate of
   the other.
   ========================================================= */

const categories: PronunciationCategoryGroup[] = [
  {
    id: "letters",
    label: { english: "Letters A–Z", "traditional-chinese": "字母 A–Z", spanish: "Letras A–Z" },
    description: {
      english: "Each letter's own name, and the sounds it makes in words.",
      "traditional-chinese": "每個字母的名稱，以及它在單字裡發出的音。",
    },
    // Nearly every English word contains most of the alphabet, so matching a
    // saved word against these would tell the learner nothing. The phoneme
    // groups below are what a word actually drills.
    matchesWords: false,
  },
  {
    id: "vowels",
    label: { english: "Vowels", "traditional-chinese": "母音", spanish: "Vocales" },
    description: {
      english: "Eleven single vowel sounds, including the schwa.",
      "traditional-chinese": "十一個單母音，包含輕音 schwa。",
    },
  },
  {
    id: "diphthongs",
    label: { english: "Diphthongs", "traditional-chinese": "雙母音", spanish: "Diptongos" },
    description: {
      english: "Vowels that glide from one shape into another.",
      "traditional-chinese": "從一個嘴形滑向另一個嘴形的母音。",
    },
  },
  {
    id: "th",
    label: { english: "TH sounds", "traditional-chinese": "TH 音", spanish: "Sonidos TH" },
    description: {
      english: "The two sounds that share one spelling.",
      "traditional-chinese": "同一個拼寫底下的兩個音。",
    },
  },
  {
    id: "r-l",
    label: { english: "R and L", "traditional-chinese": "R 與 L", spanish: "R y L" },
    description: {
      english: "The contrast most learners are told they cannot hear.",
      "traditional-chinese": "最常被說「聽不出來」的一組對比。",
    },
  },
  {
    id: "consonants",
    label: { english: "Tricky consonants", "traditional-chinese": "困難子音", spanish: "Consonantes difíciles" },
    description: {
      english: "The consonants that do not exist in most other languages.",
      "traditional-chinese": "多數語言裡沒有的子音。",
    },
  },
  {
    id: "stress",
    label: { english: "Stress", "traditional-chinese": "重音", spanish: "Acentuación" },
    module: "rhythm",
  },
  {
    id: "connected",
    label: { english: "Connected speech", "traditional-chinese": "連音", spanish: "Habla encadenada" },
    module: "rhythm",
  },
];

/**
 * The 26 letters, lifted from the existing phonics data.
 *
 * The letter card keeps teaching the letter's own name — which is what its
 * speaker has always said and what learners expect from a phonics screen —
 * while the articulation Yumi holds comes from `primarySoundId`, the sound
 * actually embedded in that name. Examples are pooled across the letter's
 * sounds so a two-sound letter like C shows both "cat" and "city".
 */
const letterUnits: PronunciationUnit[] = englishLetters.map((letter) => {
  const primary =
    letter.commonSounds.find((sound) => sound.id === letter.primarySoundId) ??
    letter.commonSounds[0];

  return {
    id: `letter-${letter.id}`,
    language: "en" as const,
    category: "grapheme" as const,
    group: "letters",
    symbol: letter.letter,
    phoneticRepresentation: letter.letterName.kk,
    // Lowercase: several TTS voices announce a bare uppercase character's
    // case for disambiguation, reading "A" back as "capital A".
    speechText: letter.letter.toLowerCase(),
    tip: primary.tip,
    guidance: primary.guidance,
    features: primary.phonetics,
    examples: letter.commonSounds.flatMap((sound) =>
      sound.examples.slice(0, 2).map((example) => ({
        text: example,
        phonetic: sound.ipa,
      })),
    ),
    difficulty: letter.commonSounds.length > 1 ? 2 : 1,
    tags: letter.commonSounds.map((sound) => sound.ipa),
  };
});

const vowelUnits: PronunciationUnit[] = [
  {
    id: "iː",
    language: "en",
    category: "phoneme",
    group: "vowels",
    symbol: "iː",
    phoneticRepresentation: "/iː/",
    speechText: "see",
    displayLabel: { english: "Long E", "traditional-chinese": "長音 E" },
    tip: {
      english: "Tongue high and far forward, lips spread as if smiling. Hold it — the length is part of the sound.",
      "traditional-chinese": "舌頭抬高、往前，嘴角向兩側拉開像微笑。要拉長，長度本身就是這個音的一部分。",
    },
    guidance: [
      { label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Spread wide", "traditional-chinese": "向兩側拉開" } },
      { label: { english: "Tongue", "traditional-chinese": "舌位" }, text: { english: "High and forward", "traditional-chinese": "高且靠前" } },
    ],
    articulation: {
      tongue: { english: "High, pushed toward the front teeth", "traditional-chinese": "高、往前齒方向推" },
      lips: { english: "Spread, corners pulled back", "traditional-chinese": "拉開，嘴角向後" },
    },
    features: vowel({ height: 0.95, frontness: 0.95 }),
    examples: [
      { text: "see", phonetic: "/siː/", highlight: "ee" },
      { text: "sheep", phonetic: "/ʃiːp/", highlight: "ee" },
      { text: "machine", phonetic: "/məˈʃiːn/", highlight: "i" },
    ],
    difficulty: 1,
  },
  {
    id: "ɪ",
    language: "en",
    category: "phoneme",
    group: "vowels",
    symbol: "ɪ",
    phoneticRepresentation: "/ɪ/",
    speechText: "ship",
    displayLabel: { english: "Short I", "traditional-chinese": "短音 I" },
    tip: {
      english: "Shorter and more relaxed than /iː/, and the tongue sits a little lower. Do not smile — that turns it back into /iː/.",
      "traditional-chinese": "比 /iː/ 更短更放鬆，舌位略低。不要笑，一笑就變回 /iː/。",
    },
    guidance: [
      { label: { english: "Length", "traditional-chinese": "長度" }, text: { english: "Short and clipped", "traditional-chinese": "短促" } },
      { label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Relaxed, not spread", "traditional-chinese": "放鬆，不要拉開" } },
    ],
    features: vowel({ height: 0.75, frontness: 0.8 }),
    examples: [
      { text: "ship", phonetic: "/ʃɪp/", highlight: "i" },
      { text: "big", phonetic: "/bɪɡ/", highlight: "i" },
      { text: "minute", phonetic: "/ˈmɪnɪt/", highlight: "i" },
    ],
    commonMistake: {
      confusedWith: "iː",
      explanation: {
        english: "Languages with only one /i/ hear both English vowels as the same one. The difference is not only length — /ɪ/ has a lower, more relaxed tongue.",
        "traditional-chinese": "只有一個 /i/ 的語言會把兩個英語母音聽成同一個。差別不只是長短——/ɪ/ 的舌位更低、更放鬆。",
      },
    },
    difficulty: 3,
  },
  {
    id: "e",
    language: "en",
    category: "phoneme",
    group: "vowels",
    symbol: "e",
    phoneticRepresentation: "/e/",
    speechText: "bed",
    displayLabel: { english: "Short E", "traditional-chinese": "短音 E" },
    tip: {
      english: "Jaw a little more open than /ɪ/, tongue forward and mid-height.",
      "traditional-chinese": "下巴比 /ɪ/ 再開一點，舌頭靠前、高度居中。",
    },
    features: vowel({ height: 0.55, frontness: 0.85 }),
    examples: [
      { text: "bed", phonetic: "/bed/", highlight: "e" },
      { text: "head", phonetic: "/hed/", highlight: "ea" },
      { text: "many", phonetic: "/ˈmeni/", highlight: "a" },
    ],
    difficulty: 1,
  },
  {
    id: "æ",
    language: "en",
    category: "phoneme",
    group: "vowels",
    symbol: "æ",
    phoneticRepresentation: "/æ/",
    speechText: "cat",
    displayLabel: { english: "Short A", "traditional-chinese": "短音 A" },
    tip: {
      english: "Open your jaw wide and keep the tongue forward at the same time. Most learners do one or the other, which lands on /e/ or /ɑː/.",
      "traditional-chinese": "下巴大大張開，同時舌頭保持在前面。多數人只做到其中一件，結果變成 /e/ 或 /ɑː/。",
    },
    guidance: [
      { label: { english: "Jaw", "traditional-chinese": "下巴" }, text: { english: "Wide open", "traditional-chinese": "張到最大" } },
      { label: { english: "Tongue", "traditional-chinese": "舌位" }, text: { english: "Low but still forward", "traditional-chinese": "低但仍在前面" } },
    ],
    features: vowel({ height: 0.25, frontness: 0.78, jaw: 0.9 }),
    examples: [
      { text: "cat", phonetic: "/kæt/", highlight: "a" },
      { text: "bad", phonetic: "/bæd/", highlight: "a" },
      { text: "apple", phonetic: "/ˈæpəl/", highlight: "a" },
    ],
    difficulty: 3,
  },
  {
    id: "ʌ",
    language: "en",
    category: "phoneme",
    group: "vowels",
    symbol: "ʌ",
    phoneticRepresentation: "/ʌ/",
    speechText: "cup",
    displayLabel: { english: "Short U", "traditional-chinese": "短音 U" },
    tip: {
      english: "A short, central, completely relaxed vowel. Nothing is spread, nothing is rounded — the mouth is simply open.",
      "traditional-chinese": "短、居中、完全放鬆的母音。不拉開也不收圓，嘴巴就是自然打開。",
    },
    features: vowel({ height: 0.4, frontness: 0.4, jaw: 0.55 }),
    examples: [
      { text: "cup", phonetic: "/kʌp/", highlight: "u" },
      { text: "love", phonetic: "/lʌv/", highlight: "o" },
      { text: "money", phonetic: "/ˈmʌni/", highlight: "o" },
    ],
    difficulty: 2,
  },
  {
    id: "ɑː",
    language: "en",
    category: "phoneme",
    group: "vowels",
    symbol: "ɑː",
    phoneticRepresentation: "/ɑː/",
    speechText: "car",
    displayLabel: { english: "Long A (open)", "traditional-chinese": "長音 A（開）" },
    tip: {
      english: "Jaw wide, tongue pulled back and low. This is the vowel a doctor asks for.",
      "traditional-chinese": "下巴大開，舌頭往後往下。醫生叫你張嘴說「啊」的那個音。",
    },
    features: vowel({ height: 0.2, frontness: 0.15, jaw: 0.95 }),
    examples: [
      { text: "car", phonetic: "/kɑːr/", highlight: "ar" },
      { text: "father", phonetic: "/ˈfɑːðər/", highlight: "a" },
      { text: "calm", phonetic: "/kɑːm/", highlight: "al" },
    ],
    difficulty: 1,
  },
  {
    id: "ɔː",
    language: "en",
    category: "phoneme",
    group: "vowels",
    symbol: "ɔː",
    phoneticRepresentation: "/ɔː/",
    speechText: "law",
    tip: {
      english: "Round the lips and keep the tongue back and mid-low. Longer than it feels like it should be.",
      "traditional-chinese": "嘴唇收圓，舌頭往後、略低。要比你以為的更長。",
    },
    features: vowel({ height: 0.35, frontness: 0.15, rounding: "rounded", jaw: 0.7 }),
    examples: [
      { text: "law", phonetic: "/lɔː/", highlight: "aw" },
      { text: "thought", phonetic: "/θɔːt/", highlight: "ough" },
      { text: "walk", phonetic: "/wɔːk/", highlight: "al" },
    ],
    difficulty: 2,
  },
  {
    id: "ʊ",
    language: "en",
    category: "phoneme",
    group: "vowels",
    symbol: "ʊ",
    phoneticRepresentation: "/ʊ/",
    speechText: "book",
    tip: {
      english: "Short, lightly rounded, tongue high and back but relaxed. Not the same as /uː/ said quickly.",
      "traditional-chinese": "短、微微收圓，舌頭高而後但放鬆。不是把 /uː/ 唸快而已。",
    },
    features: vowel({ height: 0.75, frontness: 0.25, rounding: "slightly_rounded" }),
    examples: [
      { text: "book", phonetic: "/bʊk/", highlight: "oo" },
      { text: "put", phonetic: "/pʊt/", highlight: "u" },
      { text: "could", phonetic: "/kʊd/", highlight: "ou" },
    ],
    difficulty: 3,
  },
  {
    id: "uː",
    language: "en",
    category: "phoneme",
    group: "vowels",
    symbol: "uː",
    phoneticRepresentation: "/uː/",
    speechText: "food",
    tip: {
      english: "Lips pushed forward into a tight circle, tongue high and back. Long.",
      "traditional-chinese": "嘴唇往前噘成小圓，舌頭高而後。要拉長。",
    },
    features: vowel({ height: 0.95, frontness: 0.1, rounding: "strongly_rounded" }),
    examples: [
      { text: "food", phonetic: "/fuːd/", highlight: "oo" },
      { text: "blue", phonetic: "/bluː/", highlight: "ue" },
      { text: "through", phonetic: "/θruː/", highlight: "ough" },
    ],
    difficulty: 1,
  },
  {
    id: "ɜː",
    language: "en",
    category: "phoneme",
    group: "vowels",
    symbol: "ɜː",
    phoneticRepresentation: "/ɜː/",
    speechText: "bird",
    tip: {
      english: "Central and long, with the tongue bunched in the middle. In American English the tongue also curls back for the r.",
      "traditional-chinese": "居中而長，舌頭在中間隆起。美式英語的舌頭還會往後捲出 r 音。",
    },
    features: vowel({ height: 0.5, frontness: 0.45, jaw: 0.45 }),
    examples: [
      { text: "bird", phonetic: "/bɜːrd/", highlight: "ir" },
      { text: "work", phonetic: "/wɜːrk/", highlight: "or" },
      { text: "learn", phonetic: "/lɜːrn/", highlight: "ear" },
    ],
    difficulty: 3,
  },
  {
    id: "ə",
    language: "en",
    category: "phoneme",
    group: "vowels",
    symbol: "ə",
    phoneticRepresentation: "/ə/",
    displayLabel: { english: "Schwa", "traditional-chinese": "輕音 schwa" },
    speechText: "about",
    tip: {
      english: "The most common sound in English, and it belongs to unstressed syllables only. Say nothing in particular: no shape, no length, no effort. Pronouncing every vowel fully is what makes English sound robotic.",
      "traditional-chinese": "英語裡最常出現的音，只出現在非重音音節。什麼都不要做：沒有嘴型、沒有長度、不用力。把每個母音都唸清楚，正是英語聽起來像機器人的原因。",
    },
    guidance: [
      { label: { english: "Effort", "traditional-chinese": "力度" }, text: { english: "As little as possible", "traditional-chinese": "越少越好" } },
      { label: { english: "Where", "traditional-chinese": "位置" }, text: { english: "Unstressed syllables only", "traditional-chinese": "只在非重音音節" } },
    ],
    features: vowel({ height: 0.5, frontness: 0.5, jaw: 0.3 }),
    examples: [
      { text: "about", phonetic: "/əˈbaʊt/", highlight: "a" },
      { text: "banana", phonetic: "/bəˈnɑːnə/", highlight: "a" },
      { text: "problem", phonetic: "/ˈprɒbləm/", highlight: "e" },
    ],
    difficulty: 4,
    tags: ["schwa", "unstressed"],
  },
];

const diphthongUnits: PronunciationUnit[] = [
  {
    id: "eɪ",
    language: "en",
    category: "phoneme",
    group: "diphthongs",
    symbol: "eɪ",
    phoneticRepresentation: "/eɪ/",
    speechText: "day",
    tip: {
      english: "Start at /e/ and glide up toward /ɪ/. One movement, not two vowels.",
      "traditional-chinese": "從 /e/ 開始，往 /ɪ/ 滑上去。是一個動作，不是兩個母音。",
    },
    features: vowel({ height: 0.6, frontness: 0.85, jaw: 0.4 }),
    examples: [
      { text: "day", phonetic: "/deɪ/", highlight: "ay" },
      { text: "make", phonetic: "/meɪk/", highlight: "a" },
      { text: "eight", phonetic: "/eɪt/", highlight: "ei" },
    ],
    difficulty: 1,
  },
  {
    id: "aɪ",
    language: "en",
    category: "phoneme",
    group: "diphthongs",
    symbol: "aɪ",
    phoneticRepresentation: "/aɪ/",
    speechText: "my",
    tip: {
      english: "Open wide, then close toward /ɪ/. The jaw does most of the work.",
      "traditional-chinese": "先張大，再收向 /ɪ/。主要靠下巴移動。",
    },
    features: vowel({ height: 0.25, frontness: 0.6, jaw: 0.85 }),
    examples: [
      { text: "my", phonetic: "/maɪ/", highlight: "y" },
      { text: "time", phonetic: "/taɪm/", highlight: "i" },
      { text: "night", phonetic: "/naɪt/", highlight: "igh" },
    ],
    difficulty: 1,
  },
  {
    id: "ɔɪ",
    language: "en",
    category: "phoneme",
    group: "diphthongs",
    symbol: "ɔɪ",
    phoneticRepresentation: "/ɔɪ/",
    speechText: "boy",
    tip: {
      english: "Start rounded at /ɔː/ and unround as you glide to /ɪ/. The lips change shape mid-sound.",
      "traditional-chinese": "從收圓的 /ɔː/ 開始，滑向 /ɪ/ 時把圓解開。嘴唇在音的中途改變形狀。",
    },
    features: vowel({ height: 0.35, frontness: 0.3, rounding: "rounded", jaw: 0.65 }),
    examples: [
      { text: "boy", phonetic: "/bɔɪ/", highlight: "oy" },
      { text: "coin", phonetic: "/kɔɪn/", highlight: "oi" },
      { text: "choice", phonetic: "/tʃɔɪs/", highlight: "oi" },
    ],
    difficulty: 2,
  },
  {
    id: "aʊ",
    language: "en",
    category: "phoneme",
    group: "diphthongs",
    symbol: "aʊ",
    phoneticRepresentation: "/aʊ/",
    speechText: "now",
    tip: {
      english: "Open wide, then round the lips as the tongue pulls back toward /ʊ/.",
      "traditional-chinese": "先張大，舌頭往後收向 /ʊ/ 的同時把嘴唇收圓。",
    },
    features: vowel({ height: 0.25, frontness: 0.5, jaw: 0.85 }),
    examples: [
      { text: "now", phonetic: "/naʊ/", highlight: "ow" },
      { text: "house", phonetic: "/haʊs/", highlight: "ou" },
      { text: "down", phonetic: "/daʊn/", highlight: "ow" },
    ],
    difficulty: 2,
  },
  {
    id: "oʊ",
    language: "en",
    category: "phoneme",
    group: "diphthongs",
    symbol: "oʊ",
    phoneticRepresentation: "/oʊ/",
    speechText: "go",
    tip: {
      english: "Begin mid and rounded, then tighten the circle toward /ʊ/. British English starts further forward, at /əʊ/.",
      "traditional-chinese": "從中間、收圓開始，再往 /ʊ/ 收緊。英式英語起點更前面，是 /əʊ/。",
    },
    features: vowel({ height: 0.55, frontness: 0.2, rounding: "rounded", jaw: 0.5 }),
    examples: [
      { text: "go", phonetic: "/ɡoʊ/", highlight: "o" },
      { text: "home", phonetic: "/hoʊm/", highlight: "o" },
      { text: "know", phonetic: "/noʊ/", highlight: "ow" },
    ],
    difficulty: 2,
    dialect: "en-US",
  },
];

const thUnits: PronunciationUnit[] = [
  {
    id: "θ",
    language: "en",
    category: "phoneme",
    group: "th",
    symbol: "θ",
    phoneticRepresentation: "/θ/",
    displayLabel: { english: "Voiceless TH", "traditional-chinese": "無聲 TH" },
    speechText: "think",
    tip: {
      english: "Put the very tip of your tongue between your teeth — you should be able to see it — and blow. No voice, just air. Almost every learner substitutes /s/ or /t/, which is what makes \"think\" sound like \"sink\".",
      "traditional-chinese": "把舌尖放在上下齒之間——應該看得到舌尖——然後吹氣。不出聲，只有氣流。幾乎每個學習者都會代換成 /s/ 或 /t/，這就是 think 聽起來像 sink 的原因。",
    },
    guidance: [
      { label: { english: "Tongue", "traditional-chinese": "舌位" }, text: { english: "Tip between the teeth", "traditional-chinese": "舌尖伸到齒間" } },
      { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Silent — air only", "traditional-chinese": "不振動，只有氣流" } },
    ],
    articulation: {
      tongue: { english: "Tip visible between the front teeth", "traditional-chinese": "舌尖露在門齒之間" },
      airflow: { english: "Continuous, not a burst", "traditional-chinese": "持續氣流，不是爆破" },
      voicing: { english: "Vocal cords still", "traditional-chinese": "聲帶不振動" },
    },
    features: consonant({ manner: "fricative", place: "dental", voiced: false, contact: "upper_teeth" }),
    examples: [
      { text: "think", phonetic: "/θɪŋk/", highlight: "th" },
      { text: "three", phonetic: "/θriː/", highlight: "th" },
      { text: "mouth", phonetic: "/maʊθ/", highlight: "th" },
    ],
    commonMistake: {
      confusedWith: "s",
      explanation: {
        english: "For /s/ the tongue stays behind the teeth; for /θ/ it comes through them. If you cannot see your own tongue in a mirror, you are saying /s/.",
        "traditional-chinese": "/s/ 的舌頭留在齒後，/θ/ 的舌頭要穿過齒間。照鏡子看不到自己的舌尖，那唸的就是 /s/。",
      },
    },
    difficulty: 5,
  },
  {
    id: "ð",
    language: "en",
    category: "phoneme",
    group: "th",
    symbol: "ð",
    phoneticRepresentation: "/ð/",
    displayLabel: { english: "Voiced TH", "traditional-chinese": "有聲 TH" },
    speechText: "this",
    tip: {
      english: "The same tongue position as /θ/, with the voice switched on. Put a hand on your throat: /ð/ buzzes, /θ/ does not.",
      "traditional-chinese": "舌位跟 /θ/ 完全一樣，只是把聲音打開。手放在喉嚨上：/ð/ 會震，/θ/ 不會。",
    },
    guidance: [
      { label: { english: "Tongue", "traditional-chinese": "舌位" }, text: { english: "Tip between the teeth", "traditional-chinese": "舌尖伸到齒間" } },
      { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Buzzing", "traditional-chinese": "聲帶振動" } },
    ],
    features: consonant({ manner: "fricative", place: "dental", voiced: true, contact: "upper_teeth" }),
    examples: [
      { text: "this", phonetic: "/ðɪs/", highlight: "th" },
      { text: "mother", phonetic: "/ˈmʌðər/", highlight: "th" },
      { text: "breathe", phonetic: "/briːð/", highlight: "th" },
    ],
    commonMistake: {
      confusedWith: "d",
      explanation: {
        english: "/d/ stops the air completely; /ð/ never does. If the sound has a beginning and an end rather than a hum you can hold, it is /d/.",
        "traditional-chinese": "/d/ 會完全擋住氣流，/ð/ 不會。如果那個音有明確的開始與結束、而不是能一直持續的嗡鳴，那就是 /d/。",
      },
    },
    difficulty: 5,
  },
];

const rlUnits: PronunciationUnit[] = [
  {
    id: "r",
    language: "en",
    category: "phoneme",
    group: "r-l",
    symbol: "r",
    phoneticRepresentation: "/r/",
    speechText: "red",
    tip: {
      english: "The tongue tip aims at the ridge behind your teeth but never touches it, and the lips round slightly. English /r/ is not tapped or rolled — nothing vibrates.",
      "traditional-chinese": "舌尖朝上齒齦，但絕不碰到，嘴唇微微收圓。英語的 /r/ 不彈舌也不打舌，沒有任何東西在振動。",
    },
    guidance: [
      { label: { english: "Tongue", "traditional-chinese": "舌位" }, text: { english: "Close, but no contact", "traditional-chinese": "靠近但不接觸" } },
      { label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Slightly rounded", "traditional-chinese": "微微收圓" } },
    ],
    features: consonant({
      manner: "approximant",
      place: "alveolar",
      voiced: true,
      rounding: "slightly_rounded",
      contact: "none",
      tongue: "tip",
      height: 0.7,
      frontness: 0.6,
    }),
    examples: [
      { text: "red", phonetic: "/red/", highlight: "r" },
      { text: "arrive", phonetic: "/əˈraɪv/", highlight: "rr" },
      { text: "sorry", phonetic: "/ˈsɒri/", highlight: "rr" },
    ],
    difficulty: 4,
  },
  {
    id: "l",
    language: "en",
    category: "phoneme",
    group: "r-l",
    symbol: "l",
    phoneticRepresentation: "/l/",
    speechText: "light",
    tip: {
      english: "The tongue tip presses the ridge behind your teeth and stays there while the air escapes around both sides. Contact is the whole difference from /r/.",
      "traditional-chinese": "舌尖抵住上齒齦並停住，氣流從舌頭兩側流出。有沒有接觸，就是它跟 /r/ 的全部差別。",
    },
    guidance: [
      { label: { english: "Tongue", "traditional-chinese": "舌位" }, text: { english: "Tip presses and holds", "traditional-chinese": "舌尖抵住不放" } },
      { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Around the sides", "traditional-chinese": "從兩側流出" } },
    ],
    features: consonant({ manner: "lateral", place: "alveolar", voiced: true }),
    examples: [
      { text: "light", phonetic: "/laɪt/", highlight: "l" },
      { text: "yellow", phonetic: "/ˈjeloʊ/", highlight: "ll" },
      { text: "believe", phonetic: "/bɪˈliːv/", highlight: "l" },
    ],
    commonMistake: {
      confusedWith: "r",
      explanation: {
        english: "Both are voiced and both are made near the same place. The test is contact: for /l/ the tongue touches and stays; for /r/ it never arrives.",
        "traditional-chinese": "兩個音都有聲、位置也相近。判準是接觸：/l/ 的舌頭碰到並停住，/r/ 從頭到尾都沒碰到。",
      },
    },
    difficulty: 4,
  },
  {
    id: "l-dark",
    language: "en",
    category: "phoneme",
    group: "r-l",
    symbol: "ɫ",
    phoneticRepresentation: "/ɫ/",
    displayLabel: { english: "Dark L", "traditional-chinese": "暗音 L" },
    speechText: "full",
    tip: {
      english: "At the end of a syllable, the same /l/ gets a second gesture: the back of the tongue humps up, which is what makes \"full\" sound nothing like \"light\".",
      "traditional-chinese": "在音節尾端，同一個 /l/ 會多一個動作：舌根往上隆起。這就是 full 聽起來完全不像 light 的原因。",
    },
    features: consonant({
      manner: "lateral",
      place: "alveolar",
      voiced: true,
      tongue: "back",
      height: 0.7,
      frontness: 0.2,
    }),
    examples: [
      { text: "full", phonetic: "/fʊɫ/", highlight: "ll" },
      { text: "milk", phonetic: "/mɪɫk/", highlight: "l" },
      { text: "people", phonetic: "/ˈpiːpəɫ/", highlight: "le" },
    ],
    difficulty: 5,
  },
];

const consonantUnits: PronunciationUnit[] = [
  {
    id: "ʃ",
    language: "en",
    category: "phoneme",
    group: "consonants",
    symbol: "ʃ",
    phoneticRepresentation: "/ʃ/",
    speechText: "she",
    tip: {
      english: "Pull the tongue back a little from /s/ and round the lips. A wide, low hiss rather than a thin one.",
      "traditional-chinese": "從 /s/ 的位置把舌頭往後移一點，嘴唇收圓。是寬而低的噪音，不是細細的嘶聲。",
    },
    features: consonant({ manner: "fricative", place: "postalveolar", voiced: false, rounding: "slightly_rounded" }),
    examples: [
      { text: "she", phonetic: "/ʃiː/", highlight: "sh" },
      { text: "nation", phonetic: "/ˈneɪʃən/", highlight: "ti" },
      { text: "sure", phonetic: "/ʃʊr/", highlight: "s" },
    ],
    difficulty: 2,
  },
  {
    id: "ʒ",
    language: "en",
    category: "phoneme",
    group: "consonants",
    symbol: "ʒ",
    phoneticRepresentation: "/ʒ/",
    speechText: "vision",
    tip: {
      english: "/ʃ/ with the voice on. Rare in English and almost never at the start of a word.",
      "traditional-chinese": "把 /ʃ/ 加上聲音。英語裡很少見，而且幾乎不出現在字首。",
    },
    features: consonant({ manner: "fricative", place: "postalveolar", voiced: true, rounding: "slightly_rounded" }),
    examples: [
      { text: "vision", phonetic: "/ˈvɪʒən/", highlight: "si" },
      { text: "measure", phonetic: "/ˈmeʒər/", highlight: "su" },
      { text: "garage", phonetic: "/ɡəˈrɑːʒ/", highlight: "ge" },
    ],
    difficulty: 4,
  },
  {
    id: "tʃ",
    language: "en",
    category: "phoneme",
    group: "consonants",
    symbol: "tʃ",
    phoneticRepresentation: "/tʃ/",
    speechText: "chair",
    tip: {
      english: "Stop the air like /t/, then release it into /ʃ/. One sound made of two movements.",
      "traditional-chinese": "先像 /t/ 一樣擋住氣流，再釋放成 /ʃ/。一個音，兩個動作。",
    },
    features: consonant({ manner: "affricate", place: "postalveolar", voiced: false, rounding: "slightly_rounded" }),
    examples: [
      { text: "chair", phonetic: "/tʃer/", highlight: "ch" },
      { text: "watch", phonetic: "/wɒtʃ/", highlight: "tch" },
      { text: "future", phonetic: "/ˈfjuːtʃər/", highlight: "tu" },
    ],
    difficulty: 2,
  },
  {
    id: "dʒ",
    language: "en",
    category: "phoneme",
    group: "consonants",
    symbol: "dʒ",
    phoneticRepresentation: "/dʒ/",
    speechText: "job",
    tip: {
      english: "/tʃ/ with the voice on. The spelling can be j, g, or dge.",
      "traditional-chinese": "把 /tʃ/ 加上聲音。拼寫可能是 j、g 或 dge。",
    },
    features: consonant({ manner: "affricate", place: "postalveolar", voiced: true, rounding: "slightly_rounded" }),
    examples: [
      { text: "job", phonetic: "/dʒɒb/", highlight: "j" },
      { text: "giant", phonetic: "/ˈdʒaɪənt/", highlight: "g" },
      { text: "bridge", phonetic: "/brɪdʒ/", highlight: "dge" },
    ],
    difficulty: 2,
  },
  {
    id: "ŋ",
    language: "en",
    category: "phoneme",
    group: "consonants",
    symbol: "ŋ",
    phoneticRepresentation: "/ŋ/",
    speechText: "sing",
    tip: {
      english: "The back of the tongue seals against the soft palate and the sound comes out of the nose. Do not add a /ɡ/ at the end — \"sing\" ends there.",
      "traditional-chinese": "舌根抵住軟顎封住口腔，聲音從鼻子出來。結尾不要再加一個 /ɡ/——sing 到這裡就結束了。",
    },
    features: consonant({ manner: "nasal", place: "velar", voiced: true }),
    examples: [
      { text: "sing", phonetic: "/sɪŋ/", highlight: "ng" },
      { text: "long", phonetic: "/lɒŋ/", highlight: "ng" },
      { text: "thinking", phonetic: "/ˈθɪŋkɪŋ/", highlight: "nk" },
    ],
    difficulty: 3,
  },
  {
    id: "v",
    language: "en",
    category: "phoneme",
    group: "consonants",
    symbol: "v",
    phoneticRepresentation: "/v/",
    speechText: "very",
    tip: {
      english: "Upper teeth rest on the lower lip and the voice buzzes through. If the lips touch each other instead, you have said /b/ or /w/.",
      "traditional-chinese": "上齒輕觸下唇，聲音從縫隙振動出來。如果變成上下唇互碰，唸出來的就是 /b/ 或 /w/。",
    },
    features: consonant({ manner: "fricative", place: "labiodental", voiced: true }),
    examples: [
      { text: "very", phonetic: "/ˈveri/", highlight: "v" },
      { text: "love", phonetic: "/lʌv/", highlight: "v" },
      { text: "seven", phonetic: "/ˈsevən/", highlight: "v" },
    ],
    commonMistake: {
      confusedWith: "b",
      explanation: {
        english: "Spanish and Chinese speakers reach for /b/ or /w/ because neither language has /v/. The teeth are the whole trick — they must touch the lip.",
        "traditional-chinese": "西班牙語和中文都沒有 /v/，所以會反射性唸成 /b/ 或 /w/。關鍵全在牙齒——一定要碰到下唇。",
      },
    },
    difficulty: 4,
  },
  {
    id: "w",
    language: "en",
    category: "phoneme",
    group: "consonants",
    symbol: "w",
    phoneticRepresentation: "/w/",
    speechText: "water",
    tip: {
      english: "Lips round tightly and then open. Nothing touches anything — it is a movement, not a contact.",
      "traditional-chinese": "嘴唇收緊成圓再打開。沒有任何接觸——它是一個動作，不是一個接觸點。",
    },
    features: consonant({
      manner: "approximant",
      place: "velar",
      voiced: true,
      rounding: "strongly_rounded",
      contact: "none",
      height: 0.85,
      frontness: 0.1,
    }),
    examples: [
      { text: "water", phonetic: "/ˈwɔːtər/", highlight: "w" },
      { text: "away", phonetic: "/əˈweɪ/", highlight: "w" },
      { text: "quick", phonetic: "/kwɪk/", highlight: "u" },
    ],
    difficulty: 2,
  },
];

const minimalPairs: MinimalPairSet[] = [
  {
    id: "iː-ɪ",
    language: "en",
    targets: ["iː", "ɪ"],
    label: { english: "sheep / ship", "traditional-chinese": "sheep / ship" },
    hint: {
      english: "Long and spread against short and relaxed.",
      "traditional-chinese": "長而拉開，對上短而放鬆。",
    },
    examples: [
      [
        { unitId: "iː", text: "sheep", phonetic: "/ʃiːp/" },
        { unitId: "ɪ", text: "ship", phonetic: "/ʃɪp/" },
      ],
      [
        { unitId: "iː", text: "feel", phonetic: "/fiːl/" },
        { unitId: "ɪ", text: "fill", phonetic: "/fɪl/" },
      ],
      [
        { unitId: "iː", text: "leave", phonetic: "/liːv/" },
        { unitId: "ɪ", text: "live", phonetic: "/lɪv/" },
      ],
    ],
  },
  {
    id: "θ-s",
    language: "en",
    targets: ["θ"],
    label: { english: "think / sink", "traditional-chinese": "think / sink" },
    hint: {
      english: "Tongue through the teeth, or behind them.",
      "traditional-chinese": "舌頭穿過牙齒，還是留在齒後。",
    },
    examples: [
      [
        { unitId: "θ", text: "think", phonetic: "/θɪŋk/" },
        { unitId: "θ", text: "sink", phonetic: "/sɪŋk/" },
      ],
      [
        { unitId: "θ", text: "thick", phonetic: "/θɪk/" },
        { unitId: "θ", text: "sick", phonetic: "/sɪk/" },
      ],
      [
        { unitId: "θ", text: "mouth", phonetic: "/maʊθ/" },
        { unitId: "θ", text: "mouse", phonetic: "/maʊs/" },
      ],
    ],
  },
  {
    id: "r-l",
    language: "en",
    targets: ["r", "l"],
    label: { english: "rice / lice", "traditional-chinese": "rice / lice" },
    hint: {
      english: "Does the tongue touch, or only aim?",
      "traditional-chinese": "舌頭到底有沒有碰到？",
    },
    examples: [
      [
        { unitId: "r", text: "rice", phonetic: "/raɪs/" },
        { unitId: "l", text: "lice", phonetic: "/laɪs/" },
      ],
      [
        { unitId: "r", text: "right", phonetic: "/raɪt/" },
        { unitId: "l", text: "light", phonetic: "/laɪt/" },
      ],
      [
        { unitId: "r", text: "collect", phonetic: "/kəˈlekt/" },
        { unitId: "l", text: "correct", phonetic: "/kəˈrekt/" },
      ],
    ],
  },
  {
    id: "v-b",
    language: "en",
    targets: ["v"],
    label: { english: "very / berry", "traditional-chinese": "very / berry" },
    examples: [
      [
        { unitId: "v", text: "very", phonetic: "/ˈveri/" },
        { unitId: "v", text: "berry", phonetic: "/ˈberi/" },
      ],
      [
        { unitId: "v", text: "vote", phonetic: "/voʊt/" },
        { unitId: "v", text: "boat", phonetic: "/boʊt/" },
      ],
    ],
  },
  {
    id: "æ-e",
    language: "en",
    targets: ["æ", "e"],
    label: { english: "bad / bed", "traditional-chinese": "bad / bed" },
    examples: [
      [
        { unitId: "æ", text: "bad", phonetic: "/bæd/" },
        { unitId: "e", text: "bed", phonetic: "/bed/" },
      ],
      [
        { unitId: "æ", text: "man", phonetic: "/mæn/" },
        { unitId: "e", text: "men", phonetic: "/men/" },
      ],
    ],
  },
  {
    id: "ʊ-uː",
    language: "en",
    targets: ["ʊ", "uː"],
    label: { english: "full / fool", "traditional-chinese": "full / fool" },
    examples: [
      [
        { unitId: "ʊ", text: "full", phonetic: "/fʊl/" },
        { unitId: "uː", text: "fool", phonetic: "/fuːl/" },
      ],
      [
        { unitId: "ʊ", text: "pull", phonetic: "/pʊl/" },
        { unitId: "uː", text: "pool", phonetic: "/puːl/" },
      ],
    ],
  },
];

const lessons: PronunciationLesson[] = [
  {
    id: "word-stress",
    language: "en",
    kind: "stress",
    difficulty: 2,
    title: { english: "Word stress", "traditional-chinese": "單字重音", spanish: "Acento de palabra" },
    rule: {
      english: "Every English word of more than one syllable has exactly one strong syllable. Move it and the word stops being recognisable — even with every sound correct.",
      "traditional-chinese": "英語裡超過一個音節的字，都只有一個重音節。重音放錯位置，就算每個音都對，那個字也會變得認不出來。",
    },
    phrases: [
      {
        id: "photograph",
        text: "photograph",
        beats: [
          { text: "pho", stress: 1 },
          { text: "to", stress: 0 },
          { text: "graph", stress: 0.5 },
        ],
      },
      {
        id: "photographer",
        text: "photographer",
        beats: [
          { text: "pho", stress: 0 },
          { text: "tog", stress: 1 },
          { text: "ra", stress: 0 },
          { text: "pher", stress: 0 },
        ],
      },
      {
        id: "important",
        text: "important",
        beats: [
          { text: "im", stress: 0 },
          { text: "por", stress: 1 },
          { text: "tant", stress: 0 },
        ],
      },
      {
        id: "understand",
        text: "understand",
        beats: [
          { text: "un", stress: 0.5 },
          { text: "der", stress: 0 },
          { text: "stand", stress: 1 },
        ],
      },
    ],
  },
  {
    id: "sentence-rhythm",
    language: "en",
    kind: "rhythm",
    difficulty: 3,
    title: { english: "Sentence rhythm", "traditional-chinese": "句子節奏", spanish: "Ritmo de la frase" },
    rule: {
      english: "English keeps a steady beat on the content words and squeezes everything between them. The small words get shorter, not clearer.",
      "traditional-chinese": "英語會在實詞上打出穩定的拍子，把中間的字擠短。小字要變短，不是變清楚。",
    },
    phrases: [
      {
        id: "cat-mat",
        text: "The CAT sat on the MAT.",
        speechText: "The cat sat on the mat.",
        beats: [
          { text: "The", stress: 0 },
          { text: "CAT", stress: 1 },
          { text: "sat", stress: 0.5 },
          { text: "on", stress: 0 },
          { text: "the", stress: 0 },
          { text: "MAT", stress: 1 },
        ],
      },
      {
        id: "come-later",
        text: "I'll COME and SEE you LA-ter.",
        speechText: "I'll come and see you later.",
        beats: [
          { text: "I'll", stress: 0 },
          { text: "COME", stress: 1 },
          { text: "and", stress: 0 },
          { text: "SEE", stress: 1 },
          { text: "you", stress: 0 },
          { text: "LA", stress: 1 },
          { text: "ter", stress: 0 },
        ],
      },
    ],
  },
  {
    id: "connected-speech",
    language: "en",
    kind: "connected-speech",
    difficulty: 4,
    title: { english: "Linking", "traditional-chinese": "連音", spanish: "Enlace" },
    rule: {
      english: "A consonant at the end of one word joins the vowel that starts the next, and the boundary disappears. This is why fluent English sounds like fewer words than it is.",
      "traditional-chinese": "前一個字尾的子音會接到後一個字開頭的母音上，字的邊界就消失了。這就是流利的英語聽起來字數比實際少的原因。",
    },
    phrases: [
      {
        id: "an-apple",
        text: "an apple",
        beats: [
          { text: "a", stress: 0, linkToNext: "linking" },
          { text: "napple", stress: 1 },
        ],
      },
      {
        id: "pick-it-up",
        text: "pick it up",
        beats: [
          { text: "pi", stress: 1, linkToNext: "linking" },
          { text: "ki", stress: 0, linkToNext: "linking" },
          { text: "tup", stress: 0.5 },
        ],
      },
      {
        id: "turn-it-off",
        text: "turn it off",
        beats: [
          { text: "tur", stress: 1, linkToNext: "linking" },
          { text: "ni", stress: 0, linkToNext: "linking" },
          { text: "toff", stress: 0.5 },
        ],
      },
    ],
  },
  {
    id: "intonation",
    language: "en",
    kind: "intonation",
    difficulty: 3,
    title: { english: "Question intonation", "traditional-chinese": "問句語調", spanish: "Entonación de preguntas" },
    rule: {
      english: "Yes/no questions rise at the end. Questions starting with what, where or why fall — the same words with the wrong direction sound like disbelief.",
      "traditional-chinese": "是非問句句尾上揚。以 what、where、why 開頭的問句則下降——方向弄反，同樣的字聽起來會像不敢置信。",
    },
    phrases: [
      {
        id: "coming",
        text: "Are you coming?",
        beats: [
          { text: "Are", stress: 0 },
          { text: "you", stress: 0 },
          { text: "co", stress: 1 },
          { text: "ming", stress: 0.5 },
        ],
      },
      {
        id: "where-going",
        text: "Where are you going?",
        beats: [
          { text: "Where", stress: 1 },
          { text: "are", stress: 0 },
          { text: "you", stress: 0 },
          { text: "go", stress: 1 },
          { text: "ing", stress: 0 },
        ],
      },
    ],
  },
];

export const englishPronunciationPack: PronunciationLanguagePack = {
  language: "en",
  displayName: "English",
  writingSystem: {
    type: "alphabet",
    label: { english: "Latin alphabet", "traditional-chinese": "拉丁字母", spanish: "Alfabeto latino" },
  },
  categories,
  units: [
    ...letterUnits,
    ...vowelUnits,
    ...diphthongUnits,
    ...thUnits,
    ...rlUnits,
    ...consonantUnits,
  ],
  minimalPairs,
  lessons,
  scoreDimensions: ["sound", "stress", "rhythm", "fluency"],
  yumiCalibration: {
    instrument: "phoneme-waveform",
    label: {
      english: "Phoneme waveform",
      "traditional-chinese": "音素波形",
      spanish: "Forma de onda fonémica",
    },
  },
  defaultDialect: "en-US",
  dialects: ["en-US", "en-GB"],
};
