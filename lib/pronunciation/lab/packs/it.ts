import type {
  MinimalPairSet,
  PronunciationCategoryGroup,
  PronunciationLanguagePack,
  PronunciationLesson,
  PronunciationUnit,
} from "@/lib/pronunciation/lab/types";

import { consonant, vowel } from "./features";

/* =========================================================
   Italian

   The organising fact of this pack is length. Italian is one of the few
   languages where holding a consonant longer changes the word — "pala" is
   a shovel and "palla" is a ball — and almost every learner under-holds
   them, because no other language in this app asks for it.

   Everything else follows from that: the vowels stay pure so the length of
   what surrounds them is audible, and the spelling rules (ch, gh, gli, gn)
   exist mostly to keep the sounds regular.
   ========================================================= */

const categories: PronunciationCategoryGroup[] = [
  {
    id: "vowels",
    label: { english: "Vowels", "traditional-chinese": "母音", spanish: "Vocali" },
    description: {
      english: "Seven sounds written with five letters, and none of them glide.",
      "traditional-chinese": "五個字母寫出七個音，而且沒有一個會滑動。",
    },
  },
  {
    id: "length",
    label: {
      english: "Single and double",
      "traditional-chinese": "單子音與雙子音",
      spanish: "Consonantes simples y dobles",
    },
    description: {
      english: "How long you hold a consonant is which word you said.",
      "traditional-chinese": "子音維持多久，決定你說的是哪個字。",
    },
  },
  {
    id: "spelling",
    label: { english: "Spelling rules", "traditional-chinese": "拼寫規則", spanish: "Reglas de escritura" },
    description: {
      english: "C, G, GLI and GN — where the letters stop being obvious.",
      "traditional-chinese": "C、G、GLI、GN——字母不再一目瞭然的地方。",
    },
  },
  {
    id: "stress",
    label: { english: "Stress", "traditional-chinese": "重音", spanish: "Accento" },
    module: "rhythm",
  },
  {
    id: "melody",
    label: { english: "Melody", "traditional-chinese": "旋律", spanish: "Melodia" },
    module: "rhythm",
  },
];

const vowels: PronunciationUnit[] = [
  {
    id: "a",
    language: "it",
    category: "phoneme",
    group: "vowels",
    symbol: "a",
    phoneticRepresentation: "/a/",
    speechText: "casa",
    tip: {
      english: "Open and central, and identical every time it appears. Italian vowels do not reduce — the last a of \"casa\" is as full as the first.",
      "traditional-chinese": "開口、居中，每次出現都一模一樣。義大利文的母音不會弱化——casa 最後的 a 跟第一個一樣飽滿。",
    },
    features: vowel({ height: 0.15, frontness: 0.5, jaw: 0.85 }),
    examples: [
      { text: "casa", meaning: { english: "house", "traditional-chinese": "房子" }, phonetic: "/ˈka.za/", highlight: "a" },
      { text: "grazie", meaning: { english: "thank you", "traditional-chinese": "謝謝" }, phonetic: "/ˈɡrat.tsje/", highlight: "a" },
      { text: "andare", meaning: { english: "to go", "traditional-chinese": "去" }, phonetic: "/an.ˈda.re/", highlight: "a" },
    ],
    difficulty: 1,
  },
  {
    id: "e",
    language: "it",
    category: "phoneme",
    group: "vowels",
    symbol: "e",
    phoneticRepresentation: "/e/ · /ɛ/",
    speechText: "bene",
    tip: {
      english: "Two vowels behind one letter: closed /e/ in \"sera\", open /ɛ/ in \"bello\". Spelling does not distinguish them, and outside a few minimal pairs nobody will misunderstand you — but the closed one must not glide the way English \"bay\" does.",
      "traditional-chinese": "一個字母底下有兩個母音：sera 是閉的 /e/，bello 是開的 /ɛ/。拼寫不會區分，除了少數最小對立詞之外也不會造成誤解——但閉的那個絕不能像英語 bay 那樣往上滑。",
    },
    features: vowel({ height: 0.6, frontness: 0.85 }),
    examples: [
      { text: "bene", meaning: { english: "well", "traditional-chinese": "好" }, phonetic: "/ˈbɛ.ne/", highlight: "e" },
      { text: "sera", meaning: { english: "evening", "traditional-chinese": "傍晚" }, phonetic: "/ˈse.ra/", highlight: "e" },
      { text: "tempo", meaning: { english: "time", "traditional-chinese": "時間" }, phonetic: "/ˈtɛm.po/", highlight: "e" },
    ],
    difficulty: 2,
  },
  {
    id: "i",
    language: "it",
    category: "phoneme",
    group: "vowels",
    symbol: "i",
    phoneticRepresentation: "/i/",
    speechText: "vino",
    tip: {
      english: "High and tense. It also does double duty as a silent spelling marker in ci, gi, sci — where it is written but not pronounced.",
      "traditional-chinese": "高而緊。它同時兼任「拼寫記號」：在 ci、gi、sci 裡只寫不唸。",
    },
    features: vowel({ height: 0.95, frontness: 0.95 }),
    examples: [
      { text: "vino", meaning: { english: "wine", "traditional-chinese": "葡萄酒" }, phonetic: "/ˈvi.no/", highlight: "i" },
      { text: "città", meaning: { english: "city", "traditional-chinese": "城市" }, phonetic: "/tʃit.ˈta/", highlight: "i" },
      { text: "amici", meaning: { english: "friends", "traditional-chinese": "朋友們" }, phonetic: "/a.ˈmi.tʃi/", highlight: "i" },
    ],
    difficulty: 1,
  },
  {
    id: "o",
    language: "it",
    category: "phoneme",
    group: "vowels",
    symbol: "o",
    phoneticRepresentation: "/o/ · /ɔ/",
    speechText: "sono",
    tip: {
      english: "Like e, two vowels behind one letter — closed /o/ and open /ɔ/. Both are rounded from the start and stay there; no glide toward /ʊ/.",
      "traditional-chinese": "跟 e 一樣，一個字母兩個母音——閉的 /o/ 與開的 /ɔ/。兩者從一開始就收圓並保持不動，不會往 /ʊ/ 滑。",
    },
    features: vowel({ height: 0.55, frontness: 0.2, rounding: "rounded" }),
    examples: [
      { text: "sono", meaning: { english: "I am", "traditional-chinese": "我是" }, phonetic: "/ˈso.no/", highlight: "o" },
      { text: "porta", meaning: { english: "door", "traditional-chinese": "門" }, phonetic: "/ˈpɔr.ta/", highlight: "o" },
      { text: "amore", meaning: { english: "love", "traditional-chinese": "愛" }, phonetic: "/a.ˈmo.re/", highlight: "o" },
    ],
    difficulty: 2,
  },
  {
    id: "u",
    language: "it",
    category: "phoneme",
    group: "vowels",
    symbol: "u",
    phoneticRepresentation: "/u/",
    speechText: "luna",
    tip: {
      english: "Tightly rounded and far back. Never the English \"yoo\" — \"università\" begins oo-, not yoo-.",
      "traditional-chinese": "緊緊收圓、位置很後。絕不是英語的 yoo——università 的開頭是 oo，不是 yoo。",
    },
    features: vowel({ height: 0.95, frontness: 0.1, rounding: "strongly_rounded" }),
    examples: [
      { text: "luna", meaning: { english: "moon", "traditional-chinese": "月亮" }, phonetic: "/ˈlu.na/", highlight: "u" },
      { text: "uno", meaning: { english: "one", "traditional-chinese": "一" }, phonetic: "/ˈu.no/", highlight: "u" },
      { text: "musica", meaning: { english: "music", "traditional-chinese": "音樂" }, phonetic: "/ˈmu.zi.ka/", highlight: "u" },
    ],
    difficulty: 1,
  },
];

const lengthUnits: PronunciationUnit[] = [
  {
    id: "single-consonant",
    language: "it",
    category: "phoneme",
    group: "length",
    symbol: "l",
    phoneticRepresentation: "/l/",
    displayLabel: { english: "Single consonant", "traditional-chinese": "單子音", spanish: "Consonante simple" },
    speechText: "pala",
    tip: {
      english: "Short, and passed through quickly. The vowel before it stays long — in \"pala\" the first a is noticeably longer than the l.",
      "traditional-chinese": "短，而且快速帶過。它前面的母音維持較長——pala 裡第一個 a 明顯比 l 長。",
    },
    features: consonant({ manner: "lateral", place: "alveolar", voiced: true }),
    examples: [
      { text: "pala", meaning: { english: "shovel", "traditional-chinese": "鏟子" }, phonetic: "/ˈpa.la/", highlight: "l" },
      { text: "casa", meaning: { english: "house", "traditional-chinese": "房子" }, phonetic: "/ˈka.za/", highlight: "s" },
      { text: "sete", meaning: { english: "thirst", "traditional-chinese": "口渴" }, phonetic: "/ˈse.te/", highlight: "t" },
    ],
    difficulty: 1,
  },
  {
    id: "double-consonant",
    language: "it",
    category: "phoneme",
    group: "length",
    symbol: "ll",
    phoneticRepresentation: "/lː/",
    displayLabel: { english: "Double consonant", "traditional-chinese": "雙子音", spanish: "Consonante doble" },
    speechText: "palla",
    tip: {
      english: "Held roughly twice as long, and the vowel before it shortens to make room. For a stop like tt or pp the hold is silence — you stop the air and wait before releasing. Under-holding is the single most common thing that marks a foreign accent in Italian.",
      "traditional-chinese": "維持大約兩倍長，前面的母音則縮短讓出時間。像 tt、pp 這類塞音，維持的其實是「靜音」——氣流擋住後要等一下再放開。時間不夠長，是義大利文外國腔最明顯的來源。",
    },
    guidance: [
      { label: { english: "Length", "traditional-chinese": "長度" }, text: { english: "Roughly twice as long", "traditional-chinese": "大約兩倍長" } },
      { label: { english: "The vowel before", "traditional-chinese": "前面的母音" }, text: { english: "Gets shorter", "traditional-chinese": "要變短" } },
    ],
    articulation: {
      airflow: { english: "Blocked and held before release", "traditional-chinese": "擋住並維持一段時間才放開" },
      jaw: { english: "Still during the hold", "traditional-chinese": "維持期間保持不動" },
    },
    features: consonant({ manner: "lateral", place: "alveolar", voiced: true, jaw: 0.1 }),
    examples: [
      { text: "palla", meaning: { english: "ball", "traditional-chinese": "球" }, phonetic: "/ˈpal.la/", highlight: "ll" },
      { text: "cassa", meaning: { english: "crate, till", "traditional-chinese": "箱子、收銀台" }, phonetic: "/ˈkas.sa/", highlight: "ss" },
      { text: "sette", meaning: { english: "seven", "traditional-chinese": "七" }, phonetic: "/ˈset.te/", highlight: "tt" },
    ],
    commonMistake: {
      confusedWith: "l",
      explanation: {
        english: "Saying a double consonant at single length does not sound like an accent — it produces a different word. \"Sono\" is \"I am\"; \"sonno\" is \"sleep\".",
        "traditional-chinese": "把雙子音唸成單子音的長度，不只是口音問題——會變成另一個字。sono 是「我是」，sonno 是「睡眠」。",
      },
    },
    difficulty: 5,
  },
  {
    id: "r-it",
    language: "it",
    category: "phoneme",
    group: "length",
    symbol: "r",
    phoneticRepresentation: "/r/ · /rː/",
    displayLabel: { english: "R and RR", "traditional-chinese": "R 與 RR", spanish: "R e RR" },
    speechText: "caro",
    tip: {
      english: "A tongue-tip trill, made the same way as the Spanish one: relax the tip near the ridge and let steady airflow do the vibrating. Single r is one or two contacts, rr is a longer roll.",
      "traditional-chinese": "舌尖顫音，做法跟西班牙文一樣：舌尖放鬆靠近齒齦，讓穩定的氣流去帶動振動。單 r 是一到兩次接觸，rr 則是更長的滾動。",
    },
    features: consonant({ manner: "trill", place: "alveolar", voiced: true, jaw: 0.2 }),
    examples: [
      { text: "caro", meaning: { english: "dear", "traditional-chinese": "親愛的" }, phonetic: "/ˈka.ro/", highlight: "r" },
      { text: "carro", meaning: { english: "cart", "traditional-chinese": "推車" }, phonetic: "/ˈkar.ro/", highlight: "rr" },
      { text: "arrivederci", meaning: { english: "goodbye", "traditional-chinese": "再見" }, phonetic: "/ar.ri.ve.ˈder.tʃi/", highlight: "rr" },
    ],
    difficulty: 4,
  },
];

const spellingUnits: PronunciationUnit[] = [
  {
    id: "c-ch",
    language: "it",
    category: "grapheme",
    group: "spelling",
    symbol: "c · ch",
    phoneticRepresentation: "/tʃ/ · /k/",
    displayLabel: { english: "C and CH", "traditional-chinese": "C 與 CH", spanish: "C e CH" },
    speechText: "ciao",
    tip: {
      english: "C before e or i is \"ch\" as in church: ciao, cena. The h is what keeps it hard — chi is \"kee\", not \"chee\". Exactly the opposite of English, where ch is the soft one.",
      "traditional-chinese": "c 在 e、i 前唸成英語 church 的 ch：ciao、cena。加上 h 才會維持硬音——chi 唸作 kee，不是 chee。跟英語剛好相反，英語的 ch 才是軟的那個。",
    },
    features: consonant({ manner: "affricate", place: "postalveolar", voiced: false, rounding: "slightly_rounded" }),
    examples: [
      { text: "ciao", meaning: { english: "hi, bye", "traditional-chinese": "你好、再見" }, phonetic: "/tʃao/", highlight: "ci" },
      { text: "chi", meaning: { english: "who", "traditional-chinese": "誰" }, phonetic: "/ki/", highlight: "ch" },
      { text: "cucina", meaning: { english: "kitchen", "traditional-chinese": "廚房" }, phonetic: "/ku.ˈtʃi.na/", highlight: "ci" },
    ],
    difficulty: 3,
  },
  {
    id: "g-gh",
    language: "it",
    category: "grapheme",
    group: "spelling",
    symbol: "g · gh",
    phoneticRepresentation: "/dʒ/ · /ɡ/",
    displayLabel: { english: "G and GH", "traditional-chinese": "G 與 GH", spanish: "G e GH" },
    speechText: "gelato",
    tip: {
      english: "The same rule as c, one voicing step over: g before e or i is the j of \"jam\", and gh keeps it hard. Spaghetti is spelled with an h for exactly this reason.",
      "traditional-chinese": "跟 c 同一條規則，只是有聲：g 在 e、i 前唸成 jam 的 j，加 h 則維持硬音。spaghetti 之所以有那個 h，原因正是如此。",
    },
    features: consonant({ manner: "affricate", place: "postalveolar", voiced: true, rounding: "slightly_rounded" }),
    examples: [
      { text: "gelato", meaning: { english: "ice cream", "traditional-chinese": "義式冰淇淋" }, phonetic: "/dʒe.ˈla.to/", highlight: "ge" },
      { text: "spaghetti", meaning: { english: "spaghetti", "traditional-chinese": "義大利麵" }, phonetic: "/spa.ˈɡet.ti/", highlight: "gh" },
      { text: "giorno", meaning: { english: "day", "traditional-chinese": "日子" }, phonetic: "/ˈdʒor.no/", highlight: "gi" },
    ],
    difficulty: 3,
  },
  {
    id: "gli",
    language: "it",
    category: "phoneme",
    group: "spelling",
    symbol: "gli",
    phoneticRepresentation: "/ʎ/",
    speechText: "famiglia",
    tip: {
      english: "One sound, not g-l-i. The whole front of the tongue presses flat against the palate and the air escapes around the sides — a palatal l. The i is a spelling marker and is not pronounced.",
      "traditional-chinese": "這是一個音，不是 g-l-i 三個音。整片舌前平貼上顎，氣流從兩側流出——一個顎化的 l。那個 i 是拼寫記號，不發音。",
    },
    features: consonant({ manner: "lateral", place: "palatal", voiced: true, tongue: "front", height: 0.85, frontness: 0.75 }),
    examples: [
      { text: "famiglia", meaning: { english: "family", "traditional-chinese": "家庭" }, phonetic: "/fa.ˈmiʎ.ʎa/", highlight: "gli" },
      { text: "figlio", meaning: { english: "son", "traditional-chinese": "兒子" }, phonetic: "/ˈfiʎ.ʎo/", highlight: "gli" },
      { text: "meglio", meaning: { english: "better", "traditional-chinese": "更好" }, phonetic: "/ˈmeʎ.ʎo/", highlight: "gli" },
    ],
    difficulty: 5,
  },
  {
    id: "gn",
    language: "it",
    category: "phoneme",
    group: "spelling",
    symbol: "gn",
    phoneticRepresentation: "/ɲ/",
    speechText: "bagno",
    tip: {
      english: "The nasal counterpart of gli, and the same sound as Spanish ñ. Always long in Italian, even when written with one n.",
      "traditional-chinese": "gli 的鼻音版本，跟西班牙文的 ñ 是同一個音。在義大利文中永遠是長音，即使只寫一個 n。",
    },
    features: consonant({ manner: "nasal", place: "palatal", voiced: true, tongue: "front", height: 0.85, frontness: 0.75 }),
    examples: [
      { text: "bagno", meaning: { english: "bathroom", "traditional-chinese": "浴室" }, phonetic: "/ˈbaɲ.ɲo/", highlight: "gn" },
      { text: "sogno", meaning: { english: "dream", "traditional-chinese": "夢" }, phonetic: "/ˈsoɲ.ɲo/", highlight: "gn" },
      { text: "signore", meaning: { english: "sir", "traditional-chinese": "先生" }, phonetic: "/siɲ.ˈɲo.re/", highlight: "gn" },
    ],
    difficulty: 4,
  },
  {
    id: "z",
    language: "it",
    category: "phoneme",
    group: "spelling",
    symbol: "z",
    phoneticRepresentation: "/ts/ · /dz/",
    speechText: "pizza",
    tip: {
      english: "Two consonants said together, t + s or d + z, never the English buzzing z. \"Pizza\" is pit-tsa, and the double z is held like any other geminate.",
      "traditional-chinese": "是兩個子音連著唸，t+s 或 d+z，絕不是英語那個嗡嗡的 z。pizza 唸成 pit-tsa，而且雙寫的 zz 跟其他雙子音一樣要拉長。",
    },
    features: consonant({ manner: "affricate", place: "dental", voiced: false, contact: "upper_teeth" }),
    examples: [
      { text: "pizza", meaning: { english: "pizza", "traditional-chinese": "披薩" }, phonetic: "/ˈpit.tsa/", highlight: "zz" },
      { text: "grazie", meaning: { english: "thank you", "traditional-chinese": "謝謝" }, phonetic: "/ˈɡrat.tsje/", highlight: "z" },
      { text: "zero", meaning: { english: "zero", "traditional-chinese": "零" }, phonetic: "/ˈdzɛ.ro/", highlight: "z" },
    ],
    difficulty: 4,
  },
  {
    id: "sc",
    language: "it",
    category: "grapheme",
    group: "spelling",
    symbol: "sc",
    phoneticRepresentation: "/ʃ/ · /sk/",
    speechText: "pesce",
    tip: {
      english: "Follows the same e/i rule as c and g: sce and sci are the sh of \"ship\", and everywhere else sc is a plain sk. The i in sci is a spelling marker, not a vowel.",
      "traditional-chinese": "跟 c、g 遵循同一條 e／i 規則：sce、sci 是英語 ship 的 sh，其餘位置的 sc 就是單純的 sk。sci 裡的 i 是拼寫記號，不是母音。",
    },
    features: consonant({ manner: "fricative", place: "postalveolar", voiced: false, rounding: "slightly_rounded" }),
    examples: [
      { text: "pesce", meaning: { english: "fish", "traditional-chinese": "魚" }, phonetic: "/ˈpeʃ.ʃe/", highlight: "sc" },
      { text: "sciare", meaning: { english: "to ski", "traditional-chinese": "滑雪" }, phonetic: "/ʃi.ˈa.re/", highlight: "sci" },
      { text: "scuola", meaning: { english: "school", "traditional-chinese": "學校" }, phonetic: "/ˈskwɔ.la/", highlight: "sc" },
    ],
    difficulty: 3,
  },
  {
    id: "s-voiced",
    language: "it",
    category: "phoneme",
    group: "spelling",
    symbol: "s",
    phoneticRepresentation: "/s/ · /z/",
    speechText: "casa",
    tip: {
      english: "One letter, two sounds decided by position: voiceless at the start of a word or when doubled, voiced between two vowels. \"Casa\" has a z sound in the middle, not an s.",
      "traditional-chinese": "一個字母、兩個音，由位置決定：字首或雙寫時不振動聲帶，夾在兩個母音之間則要振動。casa 中間唸的是 z，不是 s。",
    },
    features: consonant({ manner: "fricative", place: "alveolar", voiced: true }),
    examples: [
      { text: "casa", meaning: { english: "house", "traditional-chinese": "房子" }, phonetic: "/ˈka.za/", highlight: "s" },
      { text: "sole", meaning: { english: "sun", "traditional-chinese": "太陽" }, phonetic: "/ˈso.le/", highlight: "s" },
      { text: "rosa", meaning: { english: "rose, pink", "traditional-chinese": "玫瑰、粉紅" }, phonetic: "/ˈrɔ.za/", highlight: "s" },
    ],
    difficulty: 3,
  },
  {
    id: "p-t-k-it",
    language: "it",
    category: "phoneme",
    group: "length",
    symbol: "p · t · k",
    phoneticRepresentation: "/p/ /t/ /k/",
    displayLabel: { english: "P, T and K", "traditional-chinese": "P、T、K", spanish: "P, T e K" },
    speechText: "tempo",
    tip: {
      english: "Unaspirated, and the t is dental — tongue against the teeth, not the ridge behind them. English speakers add a puff of air that Italian never has, which is most audible at the start of a word.",
      "traditional-chinese": "不送氣，而且 t 是齒音——舌頭抵門齒，不是後面的齒齦。英語母語者會多送一口氣，那是義大利文完全沒有的，在字首最明顯。",
    },
    features: consonant({ manner: "stop", place: "dental", voiced: false, aspirated: false, contact: "upper_teeth" }),
    examples: [
      { text: "tempo", meaning: { english: "time", "traditional-chinese": "時間" }, phonetic: "/ˈtɛm.po/", highlight: "t" },
      { text: "poco", meaning: { english: "a little", "traditional-chinese": "一點" }, phonetic: "/ˈpɔ.ko/", highlight: "p" },
      { text: "capire", meaning: { english: "to understand", "traditional-chinese": "理解" }, phonetic: "/ka.ˈpi.re/", highlight: "c" },
    ],
    difficulty: 3,
  },
];

const minimalPairs: MinimalPairSet[] = [
  {
    id: "single-double",
    language: "it",
    targets: ["single-consonant", "double-consonant"],
    label: { english: "pala / palla", "traditional-chinese": "pala / palla" },
    hint: {
      english: "Listen to how long the consonant is held, not to how loud it is.",
      "traditional-chinese": "聽的是子音維持多久，不是它有多大聲。",
    },
    examples: [
      [
        { unitId: "single-consonant", text: "pala", phonetic: "/ˈpa.la/", meaning: { english: "shovel", "traditional-chinese": "鏟子" } },
        { unitId: "double-consonant", text: "palla", phonetic: "/ˈpal.la/", meaning: { english: "ball", "traditional-chinese": "球" } },
      ],
      [
        { unitId: "single-consonant", text: "sono", phonetic: "/ˈso.no/", meaning: { english: "I am", "traditional-chinese": "我是" } },
        { unitId: "double-consonant", text: "sonno", phonetic: "/ˈson.no/", meaning: { english: "sleep", "traditional-chinese": "睡眠" } },
      ],
      [
        { unitId: "single-consonant", text: "casa", phonetic: "/ˈka.za/", meaning: { english: "house", "traditional-chinese": "房子" } },
        { unitId: "double-consonant", text: "cassa", phonetic: "/ˈkas.sa/", meaning: { english: "crate", "traditional-chinese": "箱子" } },
      ],
      [
        { unitId: "single-consonant", text: "nono", phonetic: "/ˈnɔ.no/", meaning: { english: "ninth", "traditional-chinese": "第九" } },
        { unitId: "double-consonant", text: "nonno", phonetic: "/ˈnon.no/", meaning: { english: "grandfather", "traditional-chinese": "祖父" } },
      ],
    ],
  },
  {
    id: "r-rr-it",
    language: "it",
    targets: ["r-it"],
    label: { english: "caro / carro", "traditional-chinese": "caro / carro" },
    examples: [
      [
        { unitId: "r-it", text: "caro", phonetic: "/ˈka.ro/", meaning: { english: "dear", "traditional-chinese": "親愛的" } },
        { unitId: "r-it", text: "carro", phonetic: "/ˈkar.ro/", meaning: { english: "cart", "traditional-chinese": "推車" } },
      ],
      [
        { unitId: "r-it", text: "sera", phonetic: "/ˈse.ra/", meaning: { english: "evening", "traditional-chinese": "傍晚" } },
        { unitId: "r-it", text: "serra", phonetic: "/ˈsɛr.ra/", meaning: { english: "greenhouse", "traditional-chinese": "溫室" } },
      ],
    ],
  },
  {
    id: "c-ch-pair",
    language: "it",
    targets: ["c-ch"],
    label: { english: "cena / chiave", "traditional-chinese": "cena / chiave" },
    hint: {
      english: "The h is not silent decoration — it changes the consonant.",
      "traditional-chinese": "那個 h 不是裝飾——它會改變子音。",
    },
    examples: [
      [
        { unitId: "c-ch", text: "cena", phonetic: "/ˈtʃe.na/", meaning: { english: "dinner", "traditional-chinese": "晚餐" } },
        { unitId: "c-ch", text: "chiave", phonetic: "/ˈkja.ve/", meaning: { english: "key", "traditional-chinese": "鑰匙" } },
      ],
    ],
  },
];

const lessons: PronunciationLesson[] = [
  {
    id: "consonant-length",
    language: "it",
    kind: "rhythm",
    difficulty: 4,
    title: {
      english: "Consonant length",
      "traditional-chinese": "子音長度",
      spanish: "Duración consonántica",
    },
    rule: {
      english: "A double consonant takes about two beats where a single one takes one, and the vowel in front of it gives up the time. The bars below show where the length actually goes.",
      "traditional-chinese": "雙子音大約佔兩拍，單子音佔一拍，而前面的母音要讓出這段時間。下面的長條顯示長度實際落在哪裡。",
    },
    phrases: [
      {
        id: "pala",
        text: "pala",
        meaning: { english: "shovel", "traditional-chinese": "鏟子" },
        beats: [
          { text: "pa", stress: 1, length: 2 },
          { text: "la", stress: 0, length: 1 },
        ],
      },
      {
        id: "palla",
        text: "palla",
        meaning: { english: "ball", "traditional-chinese": "球" },
        beats: [
          { text: "pal", stress: 1, length: 1 },
          { text: "lla", stress: 0, length: 2 },
        ],
      },
      {
        id: "sete",
        text: "sete",
        meaning: { english: "thirst", "traditional-chinese": "口渴" },
        beats: [
          { text: "se", stress: 1, length: 2 },
          { text: "te", stress: 0, length: 1 },
        ],
      },
      {
        id: "sette",
        text: "sette",
        meaning: { english: "seven", "traditional-chinese": "七" },
        beats: [
          { text: "set", stress: 1, length: 1 },
          { text: "te", stress: 0, length: 2 },
        ],
      },
    ],
  },
  {
    id: "word-stress",
    language: "it",
    kind: "stress",
    difficulty: 3,
    title: { english: "Word stress", "traditional-chinese": "單字重音", spanish: "Accento tonico" },
    rule: {
      english: "Most words are stressed on the second-to-last syllable, and a written accent marks the ones stressed on the last: città, perché. A handful stress the third-to-last with nothing written at all — those have to be learned with the word.",
      "traditional-chinese": "多數字的重音在倒數第二個音節；重音在最後一個音節的字會標上書寫重音：città、perché。少數字重音在倒數第三個音節，而且完全沒有標記——那些只能跟著單字一起記。",
    },
    phrases: [
      {
        id: "amico",
        text: "amico",
        meaning: { english: "friend", "traditional-chinese": "朋友" },
        beats: [
          { text: "a", stress: 0 },
          { text: "mi", stress: 1 },
          { text: "co", stress: 0 },
        ],
      },
      {
        id: "citta",
        text: "città",
        meaning: { english: "city", "traditional-chinese": "城市" },
        beats: [
          { text: "cit", stress: 0 },
          { text: "tà", stress: 1 },
        ],
      },
      {
        id: "telefono",
        text: "telefono",
        meaning: { english: "telephone", "traditional-chinese": "電話" },
        beats: [
          { text: "te", stress: 0 },
          { text: "lè", stress: 1 },
          { text: "fo", stress: 0 },
          { text: "no", stress: 0 },
        ],
      },
      {
        id: "abitano",
        text: "abitano",
        meaning: { english: "they live", "traditional-chinese": "他們住" },
        beats: [
          { text: "à", stress: 1 },
          { text: "bi", stress: 0 },
          { text: "ta", stress: 0 },
          { text: "no", stress: 0 },
        ],
      },
    ],
  },
  {
    id: "sentence-melody",
    language: "it",
    kind: "intonation",
    difficulty: 3,
    title: { english: "Sentence melody", "traditional-chinese": "句子旋律", spanish: "Melodia della frase" },
    rule: {
      english: "Italian carries a wide pitch range across the whole phrase rather than a single stressed peak. Flattening it is what makes otherwise-correct Italian sound uninterested.",
      "traditional-chinese": "義大利文的音高變化橫跨整個片語，而不是只在一個重音上達到高點。把它壓平，就算每個音都對，聽起來也會像興趣缺缺。",
    },
    phrases: [
      {
        id: "come-stai",
        text: "Come stai?",
        meaning: { english: "How are you?", "traditional-chinese": "你好嗎？" },
        beats: [
          { text: "Co", stress: 1 },
          { text: "me", stress: 0 },
          { text: "sta", stress: 1 },
          { text: "i", stress: 0.5 },
        ],
      },
      {
        id: "sto-bene",
        text: "Sto bene, grazie.",
        meaning: { english: "I'm well, thank you.", "traditional-chinese": "我很好，謝謝。" },
        beats: [
          { text: "Sto", stress: 0.5 },
          { text: "be", stress: 1 },
          { text: "ne", stress: 0 },
          { text: "gra", stress: 1 },
          { text: "zie", stress: 0 },
        ],
      },
    ],
  },
];

export const italianPronunciationPack: PronunciationLanguagePack = {
  language: "it",
  displayName: "Italiano",
  writingSystem: {
    type: "alphabet",
    label: { english: "Latin alphabet", "traditional-chinese": "拉丁字母", spanish: "Alfabeto latino" },
  },
  categories,
  units: [...vowels, ...lengthUnits, ...spellingUnits],
  minimalPairs,
  lessons,
  scoreDimensions: ["consonantLength", "stress", "rhythm", "melody"],
  yumiCalibration: {
    instrument: "consonant-length",
    label: {
      english: "Length gate",
      "traditional-chinese": "長度閘門",
      spanish: "Medidor de duración",
    },
  },
  defaultDialect: "it-IT",
  dialects: ["it-IT"],
};
