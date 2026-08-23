import type {
  MinimalPairSet,
  PronunciationCategoryGroup,
  PronunciationLanguagePack,
  PronunciationLesson,
  PronunciationUnit,
} from "@/lib/pronunciation/lab/types";

import { consonant, vowel } from "./features";

/* =========================================================
   French

   Three things carry most of the accent, and they are all in here: the
   rounded front vowels that no other language in this app has, the four
   nasal vowels, and the fact that French is spoken in groups of words
   rather than in words — which is what liaison and enchaînement are for.

   Reference variety: standard metropolitan French. Where Quebec differs
   substantially the pack says so rather than teaching one as the other.
   ========================================================= */

const categories: PronunciationCategoryGroup[] = [
  {
    id: "oral-vowels",
    label: { english: "Oral vowels", "traditional-chinese": "口母音", spanish: "Vocales orales" },
    description: {
      english: "Including the three that need rounded lips in a front-of-the-mouth position.",
      "traditional-chinese": "包含三個必須「嘴唇收圓、舌頭在前」的母音。",
    },
  },
  {
    id: "nasal-vowels",
    label: { english: "Nasal vowels", "traditional-chinese": "鼻母音", spanish: "Vocales nasales" },
    description: {
      english: "Air through the nose and the mouth at once — and no n at the end.",
      "traditional-chinese": "氣流同時通過鼻腔與口腔——而且結尾沒有 n 的音。",
    },
  },
  {
    id: "consonants",
    label: { english: "Consonants", "traditional-chinese": "子音", spanish: "Consonantes" },
  },
  {
    id: "silent",
    label: { english: "Silent letters", "traditional-chinese": "不發音字母", spanish: "Letras mudas" },
  },
  {
    id: "linking",
    label: { english: "Liaison", "traditional-chinese": "連音", spanish: "Enlace" },
    module: "rhythm",
  },
  {
    id: "rhythm",
    label: { english: "Rhythm groups", "traditional-chinese": "節奏組", spanish: "Grupos rítmicos" },
    module: "rhythm",
  },
];

const oralVowels: PronunciationUnit[] = [
  {
    id: "u-front",
    language: "fr",
    category: "phoneme",
    group: "oral-vowels",
    symbol: "u",
    phoneticRepresentation: "/y/",
    displayLabel: { english: "U (rounded front)", "traditional-chinese": "U（前圓唇）", spanish: "U (anterior redondeada)" },
    speechText: "tu",
    tip: {
      english: "Say the French i (as in \"lit\") and then, without moving your tongue at all, push your lips forward into a small circle. The tongue stays at the front — that is the whole sound. Moving the tongue back gives you \"ou\" instead.",
      "traditional-chinese": "先唸法文的 i（像 lit），舌頭完全不要動，只把嘴唇往前噘成小圓。舌頭要一直保持在前面——這就是整個音的關鍵。舌頭一往後就變成 ou 了。",
    },
    guidance: [
      { label: { english: "Tongue", "traditional-chinese": "舌位" }, text: { english: "Stays forward, as for i", "traditional-chinese": "保持在前，跟 i 一樣" } },
      { label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Pushed forward, tight circle", "traditional-chinese": "往前噘成小圓" } },
    ],
    articulation: {
      tongue: { english: "High and front, unmoved from i", "traditional-chinese": "高、前，跟唸 i 時一樣不動" },
      lips: { english: "Protruded into a small circle", "traditional-chinese": "往前噘成小圓" },
    },
    features: vowel({ height: 0.95, frontness: 0.9, rounding: "strongly_rounded" }),
    examples: [
      { text: "tu", meaning: { english: "you", "traditional-chinese": "你" }, phonetic: "/ty/", highlight: "u" },
      { text: "rue", meaning: { english: "street", "traditional-chinese": "街道" }, phonetic: "/ʁy/", highlight: "u" },
      { text: "musique", meaning: { english: "music", "traditional-chinese": "音樂" }, phonetic: "/my.zik/", highlight: "u" },
    ],
    commonMistake: {
      confusedWith: "ou",
      explanation: {
        english: "\"Tu\" and \"tout\" are different words. If the tongue slides back the sound becomes /u/, and \"tu es\" turns into \"tout est\".",
        "traditional-chinese": "tu 和 tout 是不同的字。舌頭往後滑就會變成 /u/，tu es 就變成 tout est。",
      },
    },
    difficulty: 5,
  },
  {
    id: "eu",
    language: "fr",
    category: "phoneme",
    group: "oral-vowels",
    symbol: "eu",
    phoneticRepresentation: "/ø/ · /œ/",
    speechText: "deux",
    tip: {
      english: "The same trick as u, one step lower: say é and round the lips without letting the tongue retreat. Closed /ø/ in \"deux\", more open /œ/ in \"heure\".",
      "traditional-chinese": "跟 u 同樣的訣竅，位置低一階：唸 é，然後在舌頭不後退的情況下把嘴唇收圓。deux 是閉的 /ø/，heure 是較開的 /œ/。",
    },
    features: vowel({ height: 0.7, frontness: 0.8, rounding: "rounded" }),
    examples: [
      { text: "deux", meaning: { english: "two", "traditional-chinese": "二" }, phonetic: "/dø/", highlight: "eu" },
      { text: "heure", meaning: { english: "hour", "traditional-chinese": "小時" }, phonetic: "/œʁ/", highlight: "eu" },
      { text: "peur", meaning: { english: "fear", "traditional-chinese": "害怕" }, phonetic: "/pœʁ/", highlight: "eu" },
    ],
    difficulty: 4,
  },
  {
    id: "e-acute",
    language: "fr",
    category: "phoneme",
    group: "oral-vowels",
    symbol: "é",
    phoneticRepresentation: "/e/",
    speechText: "été",
    tip: {
      english: "Tight, front, and completely still. English \"day\" glides upward at the end; French é does not move at all.",
      "traditional-chinese": "緊、前，而且完全靜止。英語的 day 結尾會往上滑，法文的 é 完全不動。",
    },
    features: vowel({ height: 0.75, frontness: 0.9 }),
    examples: [
      { text: "été", meaning: { english: "summer", "traditional-chinese": "夏天" }, phonetic: "/e.te/", highlight: "é" },
      { text: "parler", meaning: { english: "to speak", "traditional-chinese": "說話" }, phonetic: "/paʁ.le/", highlight: "er" },
      { text: "café", meaning: { english: "coffee", "traditional-chinese": "咖啡" }, phonetic: "/ka.fe/", highlight: "é" },
    ],
    difficulty: 2,
  },
  {
    id: "e-grave",
    language: "fr",
    category: "phoneme",
    group: "oral-vowels",
    symbol: "è",
    phoneticRepresentation: "/ɛ/",
    speechText: "mère",
    tip: {
      english: "Opener than é, with the jaw lower. The pair é/è is one of the few places French spelling tells you exactly which vowel to use.",
      "traditional-chinese": "比 é 更開，下巴更低。é／è 這一組是法文拼寫少數會直接告訴你該用哪個母音的地方。",
    },
    features: vowel({ height: 0.5, frontness: 0.85 }),
    examples: [
      { text: "mère", meaning: { english: "mother", "traditional-chinese": "母親" }, phonetic: "/mɛʁ/", highlight: "è" },
      { text: "très", meaning: { english: "very", "traditional-chinese": "非常" }, phonetic: "/tʁɛ/", highlight: "è" },
      { text: "faire", meaning: { english: "to do", "traditional-chinese": "做" }, phonetic: "/fɛʁ/", highlight: "ai" },
    ],
    difficulty: 2,
  },
  {
    id: "ou",
    language: "fr",
    category: "phoneme",
    group: "oral-vowels",
    symbol: "ou",
    phoneticRepresentation: "/u/",
    speechText: "vous",
    tip: {
      english: "Tongue high and pulled all the way back, lips tightly rounded. This is the sound English spells \"oo\" — the easy one of the pair with u.",
      "traditional-chinese": "舌頭抬高並完全往後拉，嘴唇緊緊收圓。就是英語拼作 oo 的那個音——跟 u 相比，這是簡單的那個。",
    },
    features: vowel({ height: 0.95, frontness: 0.05, rounding: "strongly_rounded" }),
    examples: [
      { text: "vous", meaning: { english: "you (formal)", "traditional-chinese": "您" }, phonetic: "/vu/", highlight: "ou" },
      { text: "amour", meaning: { english: "love", "traditional-chinese": "愛" }, phonetic: "/a.muʁ/", highlight: "ou" },
      { text: "beaucoup", meaning: { english: "a lot", "traditional-chinese": "很多" }, phonetic: "/bo.ku/", highlight: "ou" },
    ],
    difficulty: 1,
  },
  {
    id: "e-muet",
    language: "fr",
    category: "phoneme",
    group: "oral-vowels",
    symbol: "e",
    phoneticRepresentation: "/ə/",
    displayLabel: { english: "E muet", "traditional-chinese": "啞音 e", spanish: "E muda" },
    speechText: "petit",
    tip: {
      english: "Lightly rounded and often dropped altogether in speech: \"petit\" is usually said \"p'tit\". Knowing when it disappears is more of the accent than knowing how to say it.",
      "traditional-chinese": "微微收圓，而且在口語中常常整個消失：petit 通常唸成 p'tit。知道它什麼時候不見，比知道它怎麼唸更影響口音。",
    },
    features: vowel({ height: 0.55, frontness: 0.5, rounding: "slightly_rounded", jaw: 0.35 }),
    examples: [
      { text: "petit", meaning: { english: "small", "traditional-chinese": "小的" }, phonetic: "/p(ə).ti/", highlight: "e" },
      { text: "je", meaning: { english: "I", "traditional-chinese": "我" }, phonetic: "/ʒə/", highlight: "e" },
      { text: "samedi", meaning: { english: "Saturday", "traditional-chinese": "星期六" }, phonetic: "/sam.di/", highlight: "e" },
    ],
    difficulty: 3,
  },
];

const nasalVowels: PronunciationUnit[] = [
  {
    id: "an",
    language: "fr",
    category: "phoneme",
    group: "nasal-vowels",
    symbol: "an · en",
    phoneticRepresentation: "/ɑ̃/",
    speechText: "grand",
    tip: {
      english: "Open the mouth as for a, then let the soft palate drop so air goes through the nose at the same time. Crucially, the n is not pronounced — the nose does the work while the tongue stays where the vowel put it.",
      "traditional-chinese": "像唸 a 一樣張開嘴，然後把軟顎放下，讓氣流同時從鼻腔通過。關鍵是那個 n 不發音——鼻腔負責發聲，舌頭停在母音的位置不動。",
    },
    guidance: [
      { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Nose and mouth together", "traditional-chinese": "鼻腔與口腔同時" } },
      { label: { english: "The n", "traditional-chinese": "那個 n" }, text: { english: "Never pronounced", "traditional-chinese": "完全不發音" } },
    ],
    articulation: {
      resonance: { english: "Soft palate lowered so the nose resonates", "traditional-chinese": "軟顎下降，讓鼻腔產生共鳴" },
      tongue: { english: "Low and back, as for a", "traditional-chinese": "低而後，跟 a 一樣" },
    },
    features: vowel({ height: 0.2, frontness: 0.25, jaw: 0.8, nasal: true }),
    examples: [
      { text: "grand", meaning: { english: "big", "traditional-chinese": "大的" }, phonetic: "/ɡʁɑ̃/", highlight: "an" },
      { text: "temps", meaning: { english: "time, weather", "traditional-chinese": "時間、天氣" }, phonetic: "/tɑ̃/", highlight: "em" },
      { text: "enfant", meaning: { english: "child", "traditional-chinese": "小孩" }, phonetic: "/ɑ̃.fɑ̃/", highlight: "an" },
    ],
    difficulty: 4,
  },
  {
    id: "on",
    language: "fr",
    category: "phoneme",
    group: "nasal-vowels",
    symbol: "on",
    phoneticRepresentation: "/ɔ̃/",
    speechText: "bon",
    tip: {
      english: "The rounded nasal. Lips in an o shape, air through the nose, and again no n at the end.",
      "traditional-chinese": "圓唇的鼻母音。嘴唇維持 o 的形狀，氣流從鼻腔出去，結尾一樣沒有 n。",
    },
    features: vowel({ height: 0.5, frontness: 0.2, rounding: "rounded", nasal: true }),
    examples: [
      { text: "bon", meaning: { english: "good", "traditional-chinese": "好的" }, phonetic: "/bɔ̃/", highlight: "on" },
      { text: "maison", meaning: { english: "house", "traditional-chinese": "房子" }, phonetic: "/mɛ.zɔ̃/", highlight: "on" },
      { text: "nous allons", meaning: { english: "we go", "traditional-chinese": "我們去" }, phonetic: "/nu.za.lɔ̃/", highlight: "on" },
    ],
    difficulty: 4,
  },
  {
    id: "in",
    language: "fr",
    category: "phoneme",
    group: "nasal-vowels",
    symbol: "in · ain",
    phoneticRepresentation: "/ɛ̃/",
    speechText: "vin",
    tip: {
      english: "The front nasal — the mouth is roughly where è sits, unrounded, with the nose open. Spelled in, ain, ein, or un in most modern speech.",
      "traditional-chinese": "前鼻母音——嘴型大約在 è 的位置，不圓唇，鼻腔打開。拼作 in、ain、ein，現代口語中 un 也多半唸成這個音。",
    },
    features: vowel({ height: 0.45, frontness: 0.8, nasal: true }),
    examples: [
      { text: "vin", meaning: { english: "wine", "traditional-chinese": "葡萄酒" }, phonetic: "/vɛ̃/", highlight: "in" },
      { text: "pain", meaning: { english: "bread", "traditional-chinese": "麵包" }, phonetic: "/pɛ̃/", highlight: "ain" },
      { text: "important", meaning: { english: "important", "traditional-chinese": "重要的" }, phonetic: "/ɛ̃.pɔʁ.tɑ̃/", highlight: "im" },
    ],
    difficulty: 4,
  },
];

const consonants: PronunciationUnit[] = [
  {
    id: "r",
    language: "fr",
    category: "phoneme",
    group: "consonants",
    symbol: "r",
    phoneticRepresentation: "/ʁ/",
    displayLabel: { english: "French R", "traditional-chinese": "法文 R", spanish: "R francesa" },
    speechText: "Paris",
    tip: {
      english: "Made at the very back of the mouth, not with the tongue tip. Start from a gargle without water: the back of the tongue rises toward the uvula and the air rasps past it. The tip of the tongue should stay resting behind the lower teeth the entire time.",
      "traditional-chinese": "在口腔最後方發音，不是用舌尖。從「沒有水的漱口」開始：舌根往小舌抬起，氣流從縫隙摩擦而過。整個過程中，舌尖都要放鬆停在下齒背後。",
    },
    guidance: [
      { label: { english: "Place", "traditional-chinese": "位置" }, text: { english: "Back of the throat", "traditional-chinese": "喉嚨後方" } },
      { label: { english: "Tongue tip", "traditional-chinese": "舌尖" }, text: { english: "Stays down, does nothing", "traditional-chinese": "放下、完全不動" } },
    ],
    articulation: {
      tongue: { english: "Back raised toward the uvula", "traditional-chinese": "舌根往小舌抬起" },
      airflow: { english: "Rasping past a narrow gap", "traditional-chinese": "從窄縫摩擦而過" },
      voicing: { english: "Voiced between vowels, quieter at the end of a word", "traditional-chinese": "母音之間有聲，字尾較輕" },
    },
    features: consonant({
      manner: "fricative",
      place: "velar",
      voiced: true,
      tongue: "root",
      height: 0.7,
      frontness: 0.05,
      contact: "velum",
      jaw: 0.25,
    }),
    examples: [
      { text: "Paris", meaning: { english: "Paris", "traditional-chinese": "巴黎" }, phonetic: "/pa.ʁi/", highlight: "r" },
      { text: "rouge", meaning: { english: "red", "traditional-chinese": "紅色" }, phonetic: "/ʁuʒ/", highlight: "r" },
      { text: "merci", meaning: { english: "thank you", "traditional-chinese": "謝謝" }, phonetic: "/mɛʁ.si/", highlight: "r" },
    ],
    commonMistake: {
      confusedWith: "r",
      explanation: {
        english: "Learners reach for the English or Spanish r, both made at the front. French r never involves the tongue tip at all — if the tip moves, the sound is wrong regardless of how it came out.",
        "traditional-chinese": "學習者會反射性地用英語或西班牙語的 r，那兩個都在口腔前方。法文的 r 完全不涉及舌尖——只要舌尖動了，不管聽起來如何，那個音就是錯的。",
      },
    },
    difficulty: 5,
  },
  {
    id: "gn",
    language: "fr",
    category: "phoneme",
    group: "consonants",
    symbol: "gn",
    phoneticRepresentation: "/ɲ/",
    speechText: "montagne",
    tip: {
      english: "The front of the tongue flat against the palate with the sound through the nose — the same consonant Spanish writes ñ.",
      "traditional-chinese": "舌前平貼上顎，聲音從鼻腔出來——跟西班牙文寫作 ñ 的是同一個子音。",
    },
    features: consonant({ manner: "nasal", place: "palatal", voiced: true, tongue: "front", height: 0.85, frontness: 0.75 }),
    examples: [
      { text: "montagne", meaning: { english: "mountain", "traditional-chinese": "山" }, phonetic: "/mɔ̃.taɲ/", highlight: "gn" },
      { text: "gagner", meaning: { english: "to win", "traditional-chinese": "贏" }, phonetic: "/ɡa.ɲe/", highlight: "gn" },
    ],
    difficulty: 3,
  },
  {
    id: "j-fr",
    language: "fr",
    category: "phoneme",
    group: "consonants",
    symbol: "j · ge",
    phoneticRepresentation: "/ʒ/",
    speechText: "je",
    tip: {
      english: "The sound in English \"measure\", which French uses constantly and at the start of words — including \"je\".",
      "traditional-chinese": "英語 measure 裡的那個音。法文非常常用，而且會出現在字首——包括 je。",
    },
    features: consonant({ manner: "fricative", place: "postalveolar", voiced: true, rounding: "slightly_rounded" }),
    examples: [
      { text: "je", meaning: { english: "I", "traditional-chinese": "我" }, phonetic: "/ʒə/", highlight: "j" },
      { text: "manger", meaning: { english: "to eat", "traditional-chinese": "吃" }, phonetic: "/mɑ̃.ʒe/", highlight: "g" },
      { text: "bonjour", meaning: { english: "hello", "traditional-chinese": "你好" }, phonetic: "/bɔ̃.ʒuʁ/", highlight: "j" },
    ],
    difficulty: 2,
  },
  {
    id: "p-t-k-fr",
    language: "fr",
    category: "phoneme",
    group: "consonants",
    symbol: "p · t · k",
    phoneticRepresentation: "/p/ /t/ /k/",
    tip: {
      english: "Unaspirated, like Spanish and unlike English. \"Paris\" starts cleanly with no puff of air after the p.",
      "traditional-chinese": "不送氣，跟西班牙文一樣、跟英語不一樣。Paris 的 p 之後沒有那口氣。",
    },
    speechText: "table",
    features: consonant({ manner: "stop", place: "dental", voiced: false, contact: "upper_teeth" }),
    examples: [
      { text: "table", meaning: { english: "table", "traditional-chinese": "桌子" }, phonetic: "/tabl/", highlight: "t" },
      { text: "petit", meaning: { english: "small", "traditional-chinese": "小的" }, phonetic: "/p(ə).ti/", highlight: "p" },
      { text: "quatre", meaning: { english: "four", "traditional-chinese": "四" }, phonetic: "/katʁ/", highlight: "qu" },
    ],
    difficulty: 3,
  },
];

const silentLetters: PronunciationUnit[] = [
  {
    id: "final-consonants",
    language: "fr",
    category: "grapheme",
    group: "silent",
    symbol: "-s -t -d -x",
    phoneticRepresentation: "—",
    displayLabel: { english: "Silent endings", "traditional-chinese": "不發音的字尾", spanish: "Finales mudas" },
    speechText: "petit",
    tip: {
      english: "Most final consonants are written and not said. The reliable exceptions are c, r, f and l — the consonants of the word \"careful\", which is how the rule is usually remembered.",
      "traditional-chinese": "大多數字尾子音只寫不唸。可靠的例外是 c、r、f、l——正好是英文字 careful 的子音，通常就是這樣記的。",
    },
    examples: [
      { text: "petit", meaning: { english: "small — the t is silent", "traditional-chinese": "小的——t 不發音" }, phonetic: "/p(ə).ti/", highlight: "t" },
      { text: "vous", meaning: { english: "you — the s is silent", "traditional-chinese": "您——s 不發音" }, phonetic: "/vu/", highlight: "s" },
      { text: "bonjour", meaning: { english: "hello — the r is said", "traditional-chinese": "你好——r 要發音" }, phonetic: "/bɔ̃.ʒuʁ/", highlight: "r" },
    ],
    difficulty: 2,
  },
  {
    id: "h-muet",
    language: "fr",
    category: "grapheme",
    group: "silent",
    symbol: "h",
    phoneticRepresentation: "—",
    displayLabel: { english: "Silent H", "traditional-chinese": "不發音的 H", spanish: "H muda" },
    speechText: "hôtel",
    tip: {
      english: "Never pronounced. But there are two kinds: h muet lets a liaison through (\"les hôtels\" links), and h aspiré blocks it (\"les héros\" does not) — neither is a sound, only a rule about the word before.",
      "traditional-chinese": "永遠不發音。但有兩種：啞音 h 允許連音（les hôtels 會連），噓音 h 則阻擋連音（les héros 不連）——兩者都不是聲音，而是關於前一個字的規則。",
    },
    examples: [
      { text: "hôtel", meaning: { english: "hotel", "traditional-chinese": "旅館" }, phonetic: "/o.tɛl/", highlight: "h" },
      { text: "heure", meaning: { english: "hour", "traditional-chinese": "小時" }, phonetic: "/œʁ/", highlight: "h" },
    ],
    difficulty: 3,
  },
];

const minimalPairs: MinimalPairSet[] = [
  {
    id: "u-ou",
    language: "fr",
    targets: ["u-front", "ou"],
    label: { english: "tu / tout", "traditional-chinese": "tu / tout" },
    hint: {
      english: "Lips are rounded for both. Only the tongue moves.",
      "traditional-chinese": "兩個都是圓唇，差別只在舌頭的位置。",
    },
    examples: [
      [
        { unitId: "u-front", text: "tu", phonetic: "/ty/", meaning: { english: "you", "traditional-chinese": "你" } },
        { unitId: "ou", text: "tout", phonetic: "/tu/", meaning: { english: "all", "traditional-chinese": "全部" } },
      ],
      [
        { unitId: "u-front", text: "rue", phonetic: "/ʁy/", meaning: { english: "street", "traditional-chinese": "街道" } },
        { unitId: "ou", text: "roue", phonetic: "/ʁu/", meaning: { english: "wheel", "traditional-chinese": "輪子" } },
      ],
      [
        { unitId: "u-front", text: "vu", phonetic: "/vy/", meaning: { english: "seen", "traditional-chinese": "看過" } },
        { unitId: "ou", text: "vous", phonetic: "/vu/", meaning: { english: "you (formal)", "traditional-chinese": "您" } },
      ],
    ],
  },
  {
    id: "nasal-oral",
    language: "fr",
    targets: ["an", "on", "in"],
    label: { english: "an / on / in", "traditional-chinese": "an / on / in" },
    hint: {
      english: "Three nasals, three different mouth shapes underneath.",
      "traditional-chinese": "三個鼻母音，底下是三個不同的嘴型。",
    },
    examples: [
      [
        { unitId: "an", text: "banc", phonetic: "/bɑ̃/", meaning: { english: "bench", "traditional-chinese": "長椅" } },
        { unitId: "on", text: "bon", phonetic: "/bɔ̃/", meaning: { english: "good", "traditional-chinese": "好的" } },
        { unitId: "in", text: "bain", phonetic: "/bɛ̃/", meaning: { english: "bath", "traditional-chinese": "洗澡" } },
      ],
      [
        { unitId: "an", text: "sans", phonetic: "/sɑ̃/", meaning: { english: "without", "traditional-chinese": "沒有" } },
        { unitId: "on", text: "son", phonetic: "/sɔ̃/", meaning: { english: "his, her", "traditional-chinese": "他的" } },
        { unitId: "in", text: "saint", phonetic: "/sɛ̃/", meaning: { english: "saint", "traditional-chinese": "聖人" } },
      ],
    ],
  },
  {
    id: "e-pairs",
    language: "fr",
    targets: ["e-acute", "e-grave"],
    label: { english: "é / è", "traditional-chinese": "é / è" },
    examples: [
      [
        { unitId: "e-acute", text: "été", phonetic: "/e.te/", meaning: { english: "summer", "traditional-chinese": "夏天" } },
        { unitId: "e-grave", text: "êtes", phonetic: "/ɛt/", meaning: { english: "are", "traditional-chinese": "是" } },
      ],
    ],
  },
];

const lessons: PronunciationLesson[] = [
  {
    id: "liaison",
    language: "fr",
    kind: "connected-speech",
    difficulty: 4,
    title: { english: "Liaison", "traditional-chinese": "連音 (liaison)", spanish: "Liaison" },
    rule: {
      english: "A final consonant that is normally silent wakes up when the next word starts with a vowel, and joins it. The s of \"les\" is silent in \"les gens\" and pronounced /z/ in \"les amis\".",
      "traditional-chinese": "平常不發音的字尾子音，遇到下一個字以母音開頭時會「醒過來」並連上去。les 的 s 在 les gens 裡不發音，在 les amis 裡則唸成 /z/。",
    },
    phrases: [
      {
        id: "les-amis",
        text: "les amis",
        meaning: { english: "the friends", "traditional-chinese": "朋友們" },
        beats: [
          { text: "le", stress: 0, linkToNext: "liaison" },
          { text: "za", stress: 0 },
          { text: "mis", stress: 1 },
        ],
      },
      {
        id: "nous-avons",
        text: "nous avons",
        meaning: { english: "we have", "traditional-chinese": "我們有" },
        beats: [
          { text: "nou", stress: 0, linkToNext: "liaison" },
          { text: "za", stress: 0 },
          { text: "vons", stress: 1 },
        ],
      },
      {
        id: "un-petit-enfant",
        text: "un petit enfant",
        meaning: { english: "a small child", "traditional-chinese": "一個小孩" },
        beats: [
          { text: "un", stress: 0 },
          { text: "pe", stress: 0 },
          { text: "ti", stress: 0, linkToNext: "liaison" },
          { text: "tan", stress: 0 },
          { text: "fant", stress: 1 },
        ],
      },
    ],
  },
  {
    id: "enchainement",
    language: "fr",
    kind: "connected-speech",
    difficulty: 4,
    title: { english: "Enchaînement", "traditional-chinese": "接續 (enchaînement)", spanish: "Enchaînement" },
    rule: {
      english: "Different from liaison: here the consonant was already being pronounced, and it simply moves across to start the next syllable. \"Elle est\" becomes e-lay, with no pause where the space is.",
      "traditional-chinese": "跟 liaison 不同：這裡的子音本來就會發音，只是搬過去當下一個音節的開頭。elle est 唸成 e-lay，空格的地方沒有停頓。",
    },
    phrases: [
      {
        id: "elle-est",
        text: "elle est",
        meaning: { english: "she is", "traditional-chinese": "她是" },
        beats: [
          { text: "e", stress: 0, linkToNext: "enchainement" },
          { text: "lè", stress: 1 },
        ],
      },
      {
        id: "il-arrive",
        text: "il arrive",
        meaning: { english: "he arrives", "traditional-chinese": "他到了" },
        beats: [
          { text: "i", stress: 0, linkToNext: "enchainement" },
          { text: "la", stress: 0 },
          { text: "rrive", stress: 1 },
        ],
      },
    ],
  },
  {
    id: "rhythm-groups",
    language: "fr",
    kind: "rhythm",
    difficulty: 3,
    title: { english: "Rhythm groups", "traditional-chinese": "節奏組", spanish: "Grupos rítmicos" },
    rule: {
      english: "French does not stress words — it stresses the last syllable of a group of words, and everything before it is even. This is why French sounds like it has no accent pattern at all until you hear where the groups end.",
      "traditional-chinese": "法文不對單字加重音，而是對一組字的最後一個音節加重，之前的音節一律等長。這就是為什麼法文聽起來好像完全沒有重音——直到你聽出節奏組在哪裡結束。",
    },
    phrases: [
      {
        id: "je-voudrais-un-cafe",
        text: "je voudrais un café",
        meaning: { english: "I would like a coffee", "traditional-chinese": "我想要一杯咖啡" },
        beats: [
          { text: "je", stress: 0 },
          { text: "vou", stress: 0 },
          { text: "drais", stress: 0 },
          { text: "un", stress: 0 },
          { text: "ca", stress: 0 },
          { text: "fé", stress: 1 },
        ],
      },
      {
        id: "cest-tres-important",
        text: "c'est très important",
        meaning: { english: "it's very important", "traditional-chinese": "這很重要" },
        beats: [
          { text: "c'est", stress: 0 },
          { text: "très", stress: 0 },
          { text: "im", stress: 0 },
          { text: "por", stress: 0 },
          { text: "tant", stress: 1 },
        ],
      },
    ],
  },
  {
    id: "intonation",
    language: "fr",
    kind: "intonation",
    difficulty: 3,
    title: { english: "Intonation", "traditional-chinese": "語調", spanish: "Entonación" },
    rule: {
      english: "A statement said with a rising ending becomes a question, with no change in word order. It is the most common way French actually asks things.",
      "traditional-chinese": "陳述句只要句尾上揚就變成問句，語序完全不動。這是法文實際上最常用的提問方式。",
    },
    phrases: [
      {
        id: "tu-viens-statement",
        text: "Tu viens.",
        meaning: { english: "You're coming.", "traditional-chinese": "你要來。" },
        beats: [
          { text: "Tu", stress: 0 },
          { text: "viens", stress: 1 },
        ],
      },
      {
        id: "tu-viens-question",
        text: "Tu viens ?",
        meaning: { english: "Are you coming?", "traditional-chinese": "你要來嗎？" },
        beats: [
          { text: "Tu", stress: 0 },
          { text: "viens", stress: 1 },
        ],
      },
    ],
  },
];

export const frenchPronunciationPack: PronunciationLanguagePack = {
  language: "fr",
  displayName: "Français",
  writingSystem: {
    type: "alphabet",
    label: { english: "Latin alphabet", "traditional-chinese": "拉丁字母", spanish: "Alfabeto latino" },
  },
  categories,
  units: [...oralVowels, ...nasalVowels, ...consonants, ...silentLetters],
  minimalPairs,
  lessons,
  scoreDimensions: ["vowel", "nasal", "liaison", "rhythm"],
  yumiCalibration: {
    instrument: "nasal-resonance",
    label: {
      english: "Nasal resonance",
      "traditional-chinese": "鼻腔共鳴",
      spanish: "Resonancia nasal",
    },
  },
  defaultDialect: "fr-FR",
  dialects: ["fr-FR", "fr-CA"],
};
