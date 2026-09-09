import type {
  MinimalPairSet,
  PronunciationCategoryGroup,
  PronunciationLanguagePack,
  PronunciationLesson,
  PronunciationUnit,
} from "@/lib/pronunciation/lab/types";

import { consonant, vowel } from "./features";

/* =========================================================
   Spanish

   Written around what actually goes wrong, not around the alphabet.

   Spanish spelling is close to regular, so the hard part is almost never
   "which sound does this letter make" — it is that five clean vowels never
   drift, that b and v are one sound, that d and g soften between vowels,
   that p/t/k carry no puff of air, and that r and rr are two different
   consonants rather than one said with more effort.

   Dialect: this pack teaches the Latin American consonant inventory as its
   default — seseo, so c/z and s are one sound — and says where Spain
   differs rather than pretending the difference is not there.
   ========================================================= */

const categories: PronunciationCategoryGroup[] = [
  {
    id: "vowels",
    label: { english: "Vowels", "traditional-chinese": "母音", spanish: "Vocales" },
    description: {
      english: "Five sounds, and they never change.",
      "traditional-chinese": "五個音，而且從不改變。",
      spanish: "Cinco sonidos que nunca cambian.",
    },
  },
  {
    id: "r-sounds",
    label: { english: "R and RR", "traditional-chinese": "R 與 RR", spanish: "R y RR" },
    description: {
      english: "One flick against a vibration. Two consonants, not one.",
      "traditional-chinese": "輕彈一下，對上持續振動。是兩個子音，不是一個。",
      spanish: "Un golpe frente a una vibración. Dos consonantes, no una.",
    },
  },
  {
    id: "soft-consonants",
    label: {
      english: "Softening consonants",
      "traditional-chinese": "會軟化的子音",
      spanish: "Consonantes que se suavizan",
    },
    description: {
      english: "B, V, D and G stop being stops between vowels.",
      "traditional-chinese": "B、V、D、G 夾在母音之間時就不再是塞音。",
      spanish: "B, V, D y G dejan de ser oclusivas entre vocales.",
    },
  },
  {
    id: "spanish-only",
    label: {
      english: "Sounds only Spanish has",
      "traditional-chinese": "西班牙文特有的音",
      spanish: "Sonidos propios del español",
    },
    description: {
      english: "J, Ñ, LL and CH.",
      "traditional-chinese": "J、Ñ、LL、CH。",
      spanish: "J, Ñ, LL y CH.",
    },
  },
  {
    id: "consonants",
    label: { english: "Other consonants", "traditional-chinese": "其他子音", spanish: "Otras consonantes" },
  },
  {
    id: "syllables",
    label: { english: "Syllables", "traditional-chinese": "音節", spanish: "Sílabas" },
    module: "rhythm",
  },
  {
    id: "stress",
    label: { english: "Stress", "traditional-chinese": "重音", spanish: "Acentuación" },
    module: "rhythm",
  },
];

const vowels: PronunciationUnit[] = [
  {
    id: "a",
    language: "es",
    category: "phoneme",
    group: "vowels",
    symbol: "a",
    phoneticRepresentation: "/a/",
    speechText: "casa",
    tip: {
      english: "Open, central, and always exactly the same. Unlike English, an unstressed Spanish a never softens into a schwa — \"casa\" ends as clearly as it begins.",
      "traditional-chinese": "開口、居中，而且永遠一模一樣。跟英語不同，非重音的西班牙文 a 絕不會弱化成 schwa——casa 的字尾和字首一樣清楚。",
      spanish: "Abierta, central y siempre igual. A diferencia del inglés, una a átona nunca se relaja.",
    },
    guidance: [
      { label: { english: "Jaw", "traditional-chinese": "下巴", spanish: "Mandíbula" }, text: { english: "Open, relaxed", "traditional-chinese": "打開、放鬆", spanish: "Abierta y relajada" } },
      { label: { english: "Always", "traditional-chinese": "永遠", spanish: "Siempre" }, text: { english: "Same sound stressed or not", "traditional-chinese": "有無重音都同一個音", spanish: "Igual con o sin acento" } },
    ],
    articulation: {
      jaw: { english: "Comfortably open", "traditional-chinese": "自然張開", spanish: "Cómodamente abierta" },
      tongue: { english: "Flat and central", "traditional-chinese": "平放、居中", spanish: "Plana y central" },
    },
    features: vowel({ height: 0.15, frontness: 0.5, jaw: 0.85 }),
    examples: [
      { text: "casa", meaning: { english: "house", "traditional-chinese": "房子", spanish: "casa" }, phonetic: "/ˈka.sa/", highlight: "a" },
      { text: "mañana", meaning: { english: "tomorrow", "traditional-chinese": "明天", spanish: "mañana" }, phonetic: "/ma.ˈɲa.na/", highlight: "a" },
      { text: "trabajar", meaning: { english: "to work", "traditional-chinese": "工作", spanish: "trabajar" }, phonetic: "/tɾa.βa.ˈxaɾ/", highlight: "a" },
    ],
    difficulty: 1,
  },
  {
    id: "e",
    language: "es",
    category: "phoneme",
    group: "vowels",
    symbol: "e",
    phoneticRepresentation: "/e/",
    speechText: "mesa",
    tip: {
      english: "A pure mid-front vowel that holds still. English speakers tend to glide it toward /ɪ/, turning \"me\" into \"may\" — Spanish e has no glide at all.",
      "traditional-chinese": "一個純粹、不移動的中前母音。英語母語者常會往 /ɪ/ 滑，把 me 唸成 may——西班牙文的 e 完全不滑動。",
      spanish: "Vocal media anterior pura, sin diptongación.",
    },
    guidance: [
      { label: { english: "Movement", "traditional-chinese": "移動", spanish: "Movimiento" }, text: { english: "None — hold the shape", "traditional-chinese": "沒有，維持同一個嘴型", spanish: "Ninguno: mantén la forma" } },
    ],
    features: vowel({ height: 0.55, frontness: 0.8 }),
    examples: [
      { text: "mesa", meaning: { english: "table", "traditional-chinese": "桌子", spanish: "mesa" }, phonetic: "/ˈme.sa/", highlight: "e" },
      { text: "verde", meaning: { english: "green", "traditional-chinese": "綠色", spanish: "verde" }, phonetic: "/ˈbeɾ.ðe/", highlight: "e" },
      { text: "entender", meaning: { english: "to understand", "traditional-chinese": "理解", spanish: "entender" }, phonetic: "/en.ten.ˈdeɾ/", highlight: "e" },
    ],
    difficulty: 2,
  },
  {
    id: "i",
    language: "es",
    category: "phoneme",
    group: "vowels",
    symbol: "i",
    phoneticRepresentation: "/i/",
    speechText: "libro",
    tip: {
      english: "High, front and tense — closer to English \"ee\" than to \"ih\", but shorter than either.",
      "traditional-chinese": "高、前、緊——比較接近英語的 ee 而不是 ih，但比兩者都短。",
      spanish: "Alta, anterior y tensa, pero breve.",
    },
    features: vowel({ height: 0.95, frontness: 0.95 }),
    examples: [
      { text: "libro", meaning: { english: "book", "traditional-chinese": "書", spanish: "libro" }, phonetic: "/ˈli.βɾo/", highlight: "i" },
      { text: "vivir", meaning: { english: "to live", "traditional-chinese": "生活", spanish: "vivir" }, phonetic: "/bi.ˈβiɾ/", highlight: "i" },
      { text: "sí", meaning: { english: "yes", "traditional-chinese": "是", spanish: "sí" }, phonetic: "/si/", highlight: "í" },
    ],
    difficulty: 1,
  },
  {
    id: "o",
    language: "es",
    category: "phoneme",
    group: "vowels",
    symbol: "o",
    phoneticRepresentation: "/o/",
    speechText: "todo",
    tip: {
      english: "Rounded and steady. English \"go\" ends in a /ʊ/ glide; Spanish o stops where it started.",
      "traditional-chinese": "收圓且穩定。英語的 go 結尾會滑向 /ʊ/，西班牙文的 o 停在原地。",
      spanish: "Redondeada y estable, sin deslizamiento final.",
    },
    features: vowel({ height: 0.55, frontness: 0.2, rounding: "rounded" }),
    examples: [
      { text: "todo", meaning: { english: "all", "traditional-chinese": "全部", spanish: "todo" }, phonetic: "/ˈto.ðo/", highlight: "o" },
      { text: "color", meaning: { english: "colour", "traditional-chinese": "顏色", spanish: "color" }, phonetic: "/ko.ˈloɾ/", highlight: "o" },
      { text: "ocho", meaning: { english: "eight", "traditional-chinese": "八", spanish: "ocho" }, phonetic: "/ˈo.tʃo/", highlight: "o" },
    ],
    difficulty: 2,
  },
  {
    id: "u",
    language: "es",
    category: "phoneme",
    group: "vowels",
    symbol: "u",
    phoneticRepresentation: "/u/",
    speechText: "luna",
    tip: {
      english: "Lips pushed forward into a tight circle. Silent in que, qui, gue and gui unless it carries a diaeresis: pingüino.",
      "traditional-chinese": "嘴唇往前噘成小圓。在 que、qui、gue、gui 裡不發音，除非上面有分音符：pingüino。",
      spanish: "Labios muy redondeados. Muda en que, qui, gue, gui salvo con diéresis.",
    },
    features: vowel({ height: 0.95, frontness: 0.1, rounding: "strongly_rounded" }),
    examples: [
      { text: "luna", meaning: { english: "moon", "traditional-chinese": "月亮", spanish: "luna" }, phonetic: "/ˈlu.na/", highlight: "u" },
      { text: "mucho", meaning: { english: "a lot", "traditional-chinese": "很多", spanish: "mucho" }, phonetic: "/ˈmu.tʃo/", highlight: "u" },
      { text: "pingüino", meaning: { english: "penguin", "traditional-chinese": "企鵝", spanish: "pingüino" }, phonetic: "/pin.ˈɡwi.no/", highlight: "ü" },
    ],
    difficulty: 2,
  },
];

const rSounds: PronunciationUnit[] = [
  {
    id: "r",
    language: "es",
    category: "phoneme",
    group: "r-sounds",
    symbol: "r",
    phoneticRepresentation: "/ɾ/",
    displayLabel: { english: "Single R (tap)", "traditional-chinese": "單 R（彈舌）", spanish: "R simple (vibrante simple)" },
    speechText: "pero",
    tip: {
      english: "One flick of the tongue tip against the ridge behind your teeth — the same movement as the middle of American English \"butter\" or \"water\". It happens once and it is over. Trying harder turns it into rr.",
      "traditional-chinese": "舌尖往上齒齦輕彈一下——跟美式英語 butter、water 中間那個音的動作一樣。彈一次就結束。用力過頭就會變成 rr。",
      spanish: "Un solo golpe de la punta de la lengua contra los alvéolos. Ocurre una vez y termina.",
    },
    guidance: [
      { label: { english: "Tongue", "traditional-chinese": "舌位", spanish: "Lengua" }, text: { english: "One quick flick", "traditional-chinese": "快速彈一下", spanish: "Un golpe rápido" } },
      { label: { english: "Effort", "traditional-chinese": "力度", spanish: "Esfuerzo" }, text: { english: "Light — no vibration", "traditional-chinese": "輕，不振動", spanish: "Ligero, sin vibración" } },
    ],
    articulation: {
      tongue: { english: "Tip flicks the ridge once", "traditional-chinese": "舌尖往齒齦彈一次", spanish: "La punta golpea los alvéolos una vez" },
      airflow: { english: "Not interrupted for long", "traditional-chinese": "氣流只被短暫打斷", spanish: "Apenas se interrumpe" },
      voicing: { english: "Voiced throughout", "traditional-chinese": "全程有聲", spanish: "Sonora" },
    },
    features: consonant({ manner: "tap", place: "alveolar", voiced: true }),
    examples: [
      { text: "pero", meaning: { english: "but", "traditional-chinese": "但是", spanish: "pero" }, phonetic: "/ˈpe.ɾo/", highlight: "r" },
      { text: "caro", meaning: { english: "expensive", "traditional-chinese": "貴", spanish: "caro" }, phonetic: "/ˈka.ɾo/", highlight: "r" },
      { text: "hablar", meaning: { english: "to speak", "traditional-chinese": "說話", spanish: "hablar" }, phonetic: "/a.ˈβlaɾ/", highlight: "r" },
    ],
    commonMistake: {
      confusedWith: "rr",
      explanation: {
        english: "A single r between vowels is a tap, never a trill. \"Pero\" said with a trill becomes \"perro\" — a different word.",
        "traditional-chinese": "母音之間的單一個 r 是彈舌，不是顫音。把 pero 唸成顫音就變成 perro——完全不同的字。",
        spanish: "Una r simple entre vocales nunca vibra. \"Pero\" con vibración se convierte en \"perro\".",
      },
    },
    difficulty: 3,
  },
  {
    id: "rr",
    language: "es",
    category: "phoneme",
    group: "r-sounds",
    symbol: "rr",
    phoneticRepresentation: "/r/",
    displayLabel: { english: "Double R (trill)", "traditional-chinese": "雙 R（顫音）", spanish: "RR (vibrante múltiple)" },
    speechText: "perro",
    tip: {
      english: "Rest the tongue tip loosely near the ridge and blow steadily. The vibration is made by the air, not by the tongue — the more you try to move the tongue yourself, the less it works. Written rr between vowels, but a single r at the start of a word (rojo) or after n, l, s is also a trill.",
      "traditional-chinese": "舌尖放鬆靠在齒齦附近，然後穩定地吹氣。振動是氣流造成的，不是舌頭主動做的——越想用舌頭去動，越發不出來。母音之間寫作 rr，但字首的單一個 r（rojo）或在 n、l、s 之後，也都是顫音。",
      spanish: "Punta de la lengua relajada cerca de los alvéolos y aire constante. Vibra el aire, no la lengua.",
    },
    guidance: [
      { label: { english: "Tongue", "traditional-chinese": "舌位", spanish: "Lengua" }, text: { english: "Loose, not pressed", "traditional-chinese": "放鬆，不用力抵住", spanish: "Relajada, sin presionar" } },
      { label: { english: "Airflow", "traditional-chinese": "氣流", spanish: "Aire" }, text: { english: "Steady and strong", "traditional-chinese": "穩定而強", spanish: "Constante y fuerte" } },
    ],
    articulation: {
      tongue: { english: "Held loosely so the air can move it", "traditional-chinese": "放鬆到讓氣流可以吹動它", spanish: "Suelta para que el aire la mueva" },
      airflow: { english: "Continuous pressure from the chest", "traditional-chinese": "來自胸腔的持續氣壓", spanish: "Presión continua desde el pecho" },
      voicing: { english: "Voiced", "traditional-chinese": "有聲", spanish: "Sonora" },
    },
    features: consonant({ manner: "trill", place: "alveolar", voiced: true, jaw: 0.2 }),
    examples: [
      { text: "perro", meaning: { english: "dog", "traditional-chinese": "狗", spanish: "perro" }, phonetic: "/ˈpe.ro/", highlight: "rr" },
      { text: "carro", meaning: { english: "car", "traditional-chinese": "車", spanish: "carro" }, phonetic: "/ˈka.ro/", highlight: "rr" },
      { text: "rojo", meaning: { english: "red", "traditional-chinese": "紅色", spanish: "rojo" }, phonetic: "/ˈro.xo/", highlight: "r" },
    ],
    difficulty: 5,
  },
];

const softening: PronunciationUnit[] = [
  {
    id: "b-v",
    language: "es",
    category: "phoneme",
    group: "soft-consonants",
    symbol: "b · v",
    phoneticRepresentation: "/b/ · /β/",
    displayLabel: { english: "B and V", "traditional-chinese": "B 與 V", spanish: "B y V" },
    speechText: "vaca",
    tip: {
      english: "One sound with two spellings — there is no /v/ in Spanish, and native speakers cannot hear the difference because there is none. At the start of a phrase or after m/n the lips close fully; between vowels they only come close, so \"la vaca\" is softer than \"vaca\" alone.",
      "traditional-chinese": "同一個音、兩種拼法——西班牙文沒有 /v/，母語者聽不出差別，因為根本沒有差別。在片語開頭或 m/n 之後，雙唇完全閉合；在母音之間只是靠近，所以 la vaca 比單獨的 vaca 更輕。",
      spanish: "Un solo sonido con dos grafías. Entre vocales los labios no llegan a cerrarse del todo.",
    },
    guidance: [
      { label: { english: "Teeth", "traditional-chinese": "牙齒", spanish: "Dientes" }, text: { english: "Never touch the lip", "traditional-chinese": "絕不碰到嘴唇", spanish: "Nunca tocan el labio" } },
      { label: { english: "Between vowels", "traditional-chinese": "母音之間", spanish: "Entre vocales" }, text: { english: "Lips almost meet", "traditional-chinese": "雙唇幾乎接觸", spanish: "Los labios casi se juntan" } },
    ],
    features: consonant({ manner: "approximant", place: "bilabial", voiced: true, contact: "none", jaw: 0.12 }),
    examples: [
      { text: "vaca", meaning: { english: "cow", "traditional-chinese": "牛", spanish: "vaca" }, phonetic: "/ˈba.ka/", highlight: "v" },
      { text: "beber", meaning: { english: "to drink", "traditional-chinese": "喝", spanish: "beber" }, phonetic: "/be.ˈβeɾ/", highlight: "b" },
      { text: "trabajo", meaning: { english: "work", "traditional-chinese": "工作", spanish: "trabajo" }, phonetic: "/tɾa.ˈβa.xo/", highlight: "b" },
    ],
    commonMistake: {
      confusedWith: "v",
      explanation: {
        english: "English speakers put the top teeth on the lower lip for v. In Spanish that never happens — for either letter.",
        "traditional-chinese": "英語母語者唸 v 時會把上齒放到下唇。西班牙文完全不會這樣做——兩個字母都不會。",
        spanish: "El inglés apoya los dientes en el labio para la v. En español eso no ocurre nunca.",
      },
    },
    difficulty: 4,
  },
  {
    id: "d",
    language: "es",
    category: "phoneme",
    group: "soft-consonants",
    symbol: "d",
    phoneticRepresentation: "/d/ · /ð/",
    speechText: "dedo",
    tip: {
      english: "Harder than English d at the start of a word — the tongue touches the back of the teeth, not the ridge behind them. Between vowels it softens all the way to the sound of English \"the\": \"nada\" ends like \"other\", not like \"nada\" spelled out.",
      "traditional-chinese": "字首時比英語的 d 更前面——舌頭碰的是門齒背面，不是齒齦。在母音之間會軟化成英語 the 的那個音：nada 的字尾像 other，不是照字面唸的 d。",
      spanish: "Dental al inicio; entre vocales se relaja hasta sonar como la th inglesa.",
    },
    guidance: [
      { label: { english: "Tongue", "traditional-chinese": "舌位", spanish: "Lengua" }, text: { english: "On the back of the teeth", "traditional-chinese": "抵在門齒背面", spanish: "Detrás de los dientes" } },
      { label: { english: "Between vowels", "traditional-chinese": "母音之間", spanish: "Entre vocales" }, text: { english: "Softens to a th", "traditional-chinese": "軟化成 th", spanish: "Se suaviza a una th" } },
    ],
    features: consonant({ manner: "stop", place: "dental", voiced: true, contact: "upper_teeth" }),
    examples: [
      { text: "dedo", meaning: { english: "finger", "traditional-chinese": "手指", spanish: "dedo" }, phonetic: "/ˈde.ðo/", highlight: "d" },
      { text: "nada", meaning: { english: "nothing", "traditional-chinese": "沒什麼", spanish: "nada" }, phonetic: "/ˈna.ða/", highlight: "d" },
      { text: "ciudad", meaning: { english: "city", "traditional-chinese": "城市", spanish: "ciudad" }, phonetic: "/sju.ˈðað/", highlight: "d" },
    ],
    difficulty: 3,
  },
  {
    id: "g",
    language: "es",
    category: "phoneme",
    group: "soft-consonants",
    symbol: "g",
    phoneticRepresentation: "/ɡ/ · /ɣ/",
    speechText: "gato",
    tip: {
      english: "Hard before a, o, u and in gue/gui. Between vowels the tongue stops short of the soft palate and the sound turns into a soft hum — \"agua\" has no hard g in it at all. Before e or i, plain g is the /x/ sound instead: gente.",
      "traditional-chinese": "在 a、o、u 前以及 gue／gui 中是硬音。在母音之間，舌根不會真的碰到軟顎，變成輕柔的摩擦音——agua 裡根本沒有硬 g。在 e、i 之前，單獨的 g 則是 /x/ 音：gente。",
      spanish: "Oclusiva ante a, o, u; entre vocales se relaja. Ante e/i suena como /x/.",
    },
    features: consonant({ manner: "stop", place: "velar", voiced: true }),
    examples: [
      { text: "gato", meaning: { english: "cat", "traditional-chinese": "貓", spanish: "gato" }, phonetic: "/ˈɡa.to/", highlight: "g" },
      { text: "agua", meaning: { english: "water", "traditional-chinese": "水", spanish: "agua" }, phonetic: "/ˈa.ɣwa/", highlight: "g" },
      { text: "guitarra", meaning: { english: "guitar", "traditional-chinese": "吉他", spanish: "guitarra" }, phonetic: "/ɡi.ˈta.ra/", highlight: "gu" },
    ],
    difficulty: 3,
  },
];

const spanishOnly: PronunciationUnit[] = [
  {
    id: "j",
    language: "es",
    category: "phoneme",
    group: "spanish-only",
    symbol: "j",
    phoneticRepresentation: "/x/",
    displayLabel: { english: "J (and soft G)", "traditional-chinese": "J（與軟音 G）", spanish: "J (y G suave)" },
    speechText: "trabajo",
    tip: {
      english: "Friction at the back of the mouth, where you would say a hard k but without closing. In Spain it scrapes further back and harder; in most of Latin America it is closer to an English h.",
      "traditional-chinese": "摩擦發生在口腔後方，位置在你要唸 k 的地方，但不要真的閉合。在西班牙摩擦更靠後、更用力；在多數拉丁美洲地區更接近英語的 h。",
      spanish: "Fricción en el velo del paladar. En España raspa más; en América suele ser más suave.",
    },
    guidance: [
      { label: { english: "Place", "traditional-chinese": "位置", spanish: "Lugar" }, text: { english: "Back of the mouth", "traditional-chinese": "口腔後方", spanish: "Parte posterior" } },
      { label: { english: "Voicing", "traditional-chinese": "聲帶", spanish: "Sonoridad" }, text: { english: "Silent — air only", "traditional-chinese": "不振動，只有氣流", spanish: "Sorda, solo aire" } },
    ],
    features: consonant({ manner: "fricative", place: "velar", voiced: false, jaw: 0.25 }),
    examples: [
      { text: "trabajo", meaning: { english: "work", "traditional-chinese": "工作", spanish: "trabajo" }, phonetic: "/tɾa.ˈβa.xo/", highlight: "j" },
      { text: "jugar", meaning: { english: "to play", "traditional-chinese": "玩", spanish: "jugar" }, phonetic: "/xu.ˈɣaɾ/", highlight: "j" },
      { text: "gente", meaning: { english: "people", "traditional-chinese": "人們", spanish: "gente" }, phonetic: "/ˈxen.te/", highlight: "g" },
    ],
    difficulty: 3,
  },
  {
    id: "n-tilde",
    language: "es",
    category: "phoneme",
    group: "spanish-only",
    symbol: "ñ",
    phoneticRepresentation: "/ɲ/",
    speechText: "mañana",
    tip: {
      english: "The whole front of the tongue presses flat against the roof of the mouth while the sound comes out of the nose. It is one sound, not \"n\" plus \"y\" — in \"mañana\" nothing separates them.",
      "traditional-chinese": "整片舌前平貼上顎，聲音從鼻腔出來。這是一個音，不是 n 加 y——mañana 裡它們之間沒有任何間隔。",
      spanish: "La lengua se aplana contra el paladar. Es un solo sonido, no n + y.",
    },
    features: consonant({ manner: "nasal", place: "palatal", voiced: true, tongue: "front", height: 0.85, frontness: 0.75 }),
    examples: [
      { text: "mañana", meaning: { english: "tomorrow", "traditional-chinese": "明天", spanish: "mañana" }, phonetic: "/ma.ˈɲa.na/", highlight: "ñ" },
      { text: "año", meaning: { english: "year", "traditional-chinese": "年", spanish: "año" }, phonetic: "/ˈa.ɲo/", highlight: "ñ" },
      { text: "señor", meaning: { english: "sir", "traditional-chinese": "先生", spanish: "señor" }, phonetic: "/se.ˈɲoɾ/", highlight: "ñ" },
    ],
    difficulty: 3,
  },
  {
    id: "ll-y",
    language: "es",
    category: "phoneme",
    group: "spanish-only",
    symbol: "ll · y",
    phoneticRepresentation: "/ʝ/",
    displayLabel: { english: "LL and Y", "traditional-chinese": "LL 與 Y", spanish: "LL e Y" },
    speechText: "llamar",
    tip: {
      english: "For most speakers these two spellings are one sound, somewhere between English \"y\" in yes and the \"j\" in jam. In Argentina and Uruguay it becomes a full \"sh\", which is the single most recognisable feature of that accent.",
      "traditional-chinese": "對多數說話者而言，這兩種拼法是同一個音，介於英語 yes 的 y 與 jam 的 j 之間。在阿根廷和烏拉圭會變成完整的 sh，那是那個口音最好認的特徵。",
      spanish: "Para la mayoría, una sola consonante palatal. En el Río de la Plata se pronuncia como \"sh\".",
    },
    features: consonant({ manner: "fricative", place: "palatal", voiced: true, tongue: "front", height: 0.85, frontness: 0.8 }),
    examples: [
      { text: "llamar", meaning: { english: "to call", "traditional-chinese": "呼叫", spanish: "llamar" }, phonetic: "/ʝa.ˈmaɾ/", highlight: "ll" },
      { text: "ayer", meaning: { english: "yesterday", "traditional-chinese": "昨天", spanish: "ayer" }, phonetic: "/a.ˈʝeɾ/", highlight: "y" },
      { text: "calle", meaning: { english: "street", "traditional-chinese": "街道", spanish: "calle" }, phonetic: "/ˈka.ʝe/", highlight: "ll" },
    ],
    difficulty: 3,
  },
  {
    id: "ch",
    language: "es",
    category: "phoneme",
    group: "spanish-only",
    symbol: "ch",
    phoneticRepresentation: "/tʃ/",
    speechText: "mucho",
    tip: {
      english: "The same sound as English \"church\", and one of the few Spanish consonants that needs no adjustment at all.",
      "traditional-chinese": "跟英語 church 的音一樣，是少數完全不需要調整的西班牙文子音。",
      spanish: "Igual que la ch inglesa de \"church\".",
    },
    features: consonant({ manner: "affricate", place: "postalveolar", voiced: false, rounding: "slightly_rounded" }),
    examples: [
      { text: "mucho", meaning: { english: "a lot", "traditional-chinese": "很多", spanish: "mucho" }, phonetic: "/ˈmu.tʃo/", highlight: "ch" },
      { text: "noche", meaning: { english: "night", "traditional-chinese": "夜晚", spanish: "noche" }, phonetic: "/ˈno.tʃe/", highlight: "ch" },
      { text: "chico", meaning: { english: "boy", "traditional-chinese": "男孩", spanish: "chico" }, phonetic: "/ˈtʃi.ko/", highlight: "ch" },
    ],
    difficulty: 1,
  },
];

const otherConsonants: PronunciationUnit[] = [
  {
    id: "p-t-k",
    language: "es",
    category: "phoneme",
    group: "consonants",
    symbol: "p · t · k",
    phoneticRepresentation: "/p/ /t/ /k/",
    displayLabel: { english: "P, T and K", "traditional-chinese": "P、T、K", spanish: "P, T y K" },
    speechText: "pato",
    tip: {
      english: "No puff of air. Hold a sheet of paper in front of your mouth: for English \"pot\" it moves, for Spanish \"pato\" it should not. The t is also further forward, against the teeth rather than the ridge.",
      "traditional-chinese": "不送氣。拿一張紙放在嘴前：唸英語 pot 時紙會動，唸西班牙文 pato 時不應該動。t 的位置也更前面，抵在門齒而不是齒齦。",
      spanish: "Sin aspiración. La t es dental, no alveolar.",
    },
    guidance: [
      { label: { english: "Airflow", "traditional-chinese": "氣流", spanish: "Aire" }, text: { english: "No puff at all", "traditional-chinese": "完全不送氣", spanish: "Sin soplo" } },
    ],
    features: consonant({ manner: "stop", place: "dental", voiced: false, aspirated: false, contact: "upper_teeth" }),
    examples: [
      { text: "pato", meaning: { english: "duck", "traditional-chinese": "鴨子", spanish: "pato" }, phonetic: "/ˈpa.to/", highlight: "p" },
      { text: "tiempo", meaning: { english: "time", "traditional-chinese": "時間", spanish: "tiempo" }, phonetic: "/ˈtjem.po/", highlight: "t" },
      { text: "casa", meaning: { english: "house", "traditional-chinese": "房子", spanish: "casa" }, phonetic: "/ˈka.sa/", highlight: "c" },
    ],
    difficulty: 3,
  },
  {
    id: "s-c-z",
    language: "es",
    category: "phoneme",
    group: "consonants",
    symbol: "s · c · z",
    phoneticRepresentation: "/s/ · /θ/",
    displayLabel: { english: "S, C and Z", "traditional-chinese": "S、C、Z", spanish: "S, C y Z" },
    speechText: "cinco",
    tip: {
      english: "In Latin America all three are /s/, so \"casa\" and \"caza\" sound identical. In most of Spain, c before e/i and z are said with the tongue between the teeth, like English \"think\". Both are correct; pick one and be consistent.",
      "traditional-chinese": "在拉丁美洲三者都是 /s/，所以 casa 和 caza 聽起來一樣。在西班牙多數地區，e／i 前的 c 以及 z 要把舌頭伸到齒間，像英語的 think。兩種都正確，選一種並保持一致。",
      spanish: "En América los tres son /s/. En gran parte de España, c ante e/i y z son interdentales.",
    },
    features: consonant({ manner: "fricative", place: "alveolar", voiced: false }),
    examples: [
      { text: "cinco", meaning: { english: "five", "traditional-chinese": "五", spanish: "cinco" }, phonetic: "/ˈsin.ko/", highlight: "c" },
      { text: "zapato", meaning: { english: "shoe", "traditional-chinese": "鞋子", spanish: "zapato" }, phonetic: "/sa.ˈpa.to/", highlight: "z" },
      { text: "casa", meaning: { english: "house", "traditional-chinese": "房子", spanish: "casa" }, phonetic: "/ˈka.sa/", highlight: "s" },
    ],
    difficulty: 3,
    dialect: "es-419",
  },
  {
    id: "h",
    language: "es",
    category: "grapheme",
    group: "consonants",
    symbol: "h",
    phoneticRepresentation: "—",
    displayLabel: { english: "Silent H", "traditional-chinese": "不發音的 H", spanish: "H muda" },
    speechText: "hola",
    tip: {
      english: "Written and never pronounced. \"Hola\" begins with the o. The only exception is the digraph ch.",
      "traditional-chinese": "寫出來但永遠不發音。hola 是從 o 開始唸的。唯一的例外是雙字母 ch。",
      spanish: "Se escribe pero no se pronuncia. La única excepción es el dígrafo ch.",
    },
    examples: [
      { text: "hola", meaning: { english: "hello", "traditional-chinese": "你好", spanish: "hola" }, phonetic: "/ˈo.la/", highlight: "h" },
      { text: "hombre", meaning: { english: "man", "traditional-chinese": "男人", spanish: "hombre" }, phonetic: "/ˈom.bɾe/", highlight: "h" },
      { text: "ahora", meaning: { english: "now", "traditional-chinese": "現在", spanish: "ahora" }, phonetic: "/a.ˈo.ɾa/", highlight: "h" },
    ],
    difficulty: 1,
  },
  {
    id: "l",
    language: "es",
    category: "phoneme",
    group: "consonants",
    symbol: "l",
    phoneticRepresentation: "/l/",
    speechText: "sol",
    tip: {
      english: "Always clear and forward, even at the end of a word. English darkens its final l — \"sol\" must not sound like the l in \"full\".",
      "traditional-chinese": "永遠清亮、靠前，即使在字尾也一樣。英語的字尾 l 會變暗——sol 不能唸得像 full 裡的 l。",
      spanish: "Siempre clara, incluso a final de palabra.",
    },
    features: consonant({ manner: "lateral", place: "dental", voiced: true, contact: "upper_teeth" }),
    examples: [
      { text: "sol", meaning: { english: "sun", "traditional-chinese": "太陽", spanish: "sol" }, phonetic: "/sol/", highlight: "l" },
      { text: "leche", meaning: { english: "milk", "traditional-chinese": "牛奶", spanish: "leche" }, phonetic: "/ˈle.tʃe/", highlight: "l" },
      { text: "papel", meaning: { english: "paper", "traditional-chinese": "紙", spanish: "papel" }, phonetic: "/pa.ˈpel/", highlight: "l" },
    ],
    difficulty: 2,
  },
];

const minimalPairs: MinimalPairSet[] = [
  {
    id: "r-rr",
    language: "es",
    targets: ["r", "rr"],
    label: { english: "pero / perro", "traditional-chinese": "pero / perro", spanish: "pero / perro" },
    hint: {
      english: "One flick, or a vibration you can hold.",
      "traditional-chinese": "彈一下，還是可以持續的振動。",
      spanish: "Un golpe o una vibración sostenida.",
    },
    examples: [
      [
        { unitId: "r", text: "pero", phonetic: "/ˈpe.ɾo/", meaning: { english: "but", "traditional-chinese": "但是", spanish: "but" } },
        { unitId: "rr", text: "perro", phonetic: "/ˈpe.ro/", meaning: { english: "dog", "traditional-chinese": "狗", spanish: "dog" } },
      ],
      [
        { unitId: "r", text: "caro", phonetic: "/ˈka.ɾo/", meaning: { english: "expensive", "traditional-chinese": "貴", spanish: "expensive" } },
        { unitId: "rr", text: "carro", phonetic: "/ˈka.ro/", meaning: { english: "car", "traditional-chinese": "車", spanish: "car" } },
      ],
      [
        { unitId: "r", text: "pera", phonetic: "/ˈpe.ɾa/", meaning: { english: "pear", "traditional-chinese": "梨子", spanish: "pear" } },
        { unitId: "rr", text: "perra", phonetic: "/ˈpe.ra/", meaning: { english: "female dog", "traditional-chinese": "母狗", spanish: "female dog" } },
      ],
      [
        { unitId: "r", text: "coro", phonetic: "/ˈko.ɾo/", meaning: { english: "choir", "traditional-chinese": "合唱團", spanish: "choir" } },
        { unitId: "rr", text: "corro", phonetic: "/ˈko.ro/", meaning: { english: "I run", "traditional-chinese": "我跑", spanish: "I run" } },
      ],
    ],
  },
  {
    id: "stress-pairs",
    language: "es",
    targets: ["a", "o"],
    label: { english: "hablo / habló", "traditional-chinese": "hablo / habló", spanish: "hablo / habló" },
    hint: {
      english: "Same sounds, different syllable. The stress is the word.",
      "traditional-chinese": "音一樣，重音節不同。重音就是那個字本身。",
      spanish: "Los mismos sonidos; cambia la sílaba tónica.",
    },
    examples: [
      [
        { unitId: "a", text: "hablo", phonetic: "/ˈa.βlo/", meaning: { english: "I speak", "traditional-chinese": "我說", spanish: "I speak" } },
        { unitId: "o", text: "habló", phonetic: "/a.ˈβlo/", meaning: { english: "he spoke", "traditional-chinese": "他說了", spanish: "he spoke" } },
      ],
      [
        { unitId: "a", text: "papa", phonetic: "/ˈpa.pa/", meaning: { english: "potato", "traditional-chinese": "馬鈴薯", spanish: "potato" } },
        { unitId: "a", text: "papá", phonetic: "/pa.ˈpa/", meaning: { english: "dad", "traditional-chinese": "爸爸", spanish: "dad" } },
      ],
    ],
  },
  {
    id: "b-p",
    language: "es",
    targets: ["b-v", "p-t-k"],
    label: { english: "vaca / baca", "traditional-chinese": "vaca / baca", spanish: "vaca / baca" },
    hint: {
      english: "A reminder that b and v are the same: these two are homophones.",
      "traditional-chinese": "提醒你 b 和 v 是同一個音：這兩個字是同音字。",
      spanish: "b y v suenan igual: estas dos palabras son homófonas.",
    },
    examples: [
      [
        { unitId: "b-v", text: "vaca", phonetic: "/ˈba.ka/", meaning: { english: "cow", "traditional-chinese": "牛", spanish: "cow" } },
        { unitId: "b-v", text: "baca", phonetic: "/ˈba.ka/", meaning: { english: "roof rack", "traditional-chinese": "車頂架", spanish: "roof rack" } },
      ],
    ],
  },
  {
    id: "n-tilde-n",
    language: "es",
    targets: ["n-tilde"],
    label: { english: "año / ano", "traditional-chinese": "año / ano", spanish: "año / ano" },
    hint: {
      english: "The tilde is not decoration.",
      "traditional-chinese": "那個波浪號不是裝飾。",
      spanish: "La tilde de la ñ no es decorativa.",
    },
    examples: [
      [
        { unitId: "n-tilde", text: "año", phonetic: "/ˈa.ɲo/", meaning: { english: "year", "traditional-chinese": "年", spanish: "year" } },
        { unitId: "n-tilde", text: "ano", phonetic: "/ˈa.no/", meaning: { english: "anus", "traditional-chinese": "肛門", spanish: "anus" } },
      ],
      [
        { unitId: "n-tilde", text: "campaña", phonetic: "/kam.ˈpa.ɲa/", meaning: { english: "campaign", "traditional-chinese": "活動", spanish: "campaign" } },
        { unitId: "n-tilde", text: "campana", phonetic: "/kam.ˈpa.na/", meaning: { english: "bell", "traditional-chinese": "鐘", spanish: "bell" } },
      ],
    ],
  },
];

const lessons: PronunciationLesson[] = [
  {
    id: "syllable-timing",
    language: "es",
    kind: "rhythm",
    difficulty: 2,
    title: { english: "Syllable timing", "traditional-chinese": "音節等時", spanish: "Ritmo silábico" },
    rule: {
      english: "Every syllable takes about the same time. English squeezes the weak ones; Spanish does not, which is why it sounds faster than it is.",
      "traditional-chinese": "每個音節長度大致相同。英語會把弱音節擠短，西班牙文不會——這就是它聽起來比實際更快的原因。",
      spanish: "Todas las sílabas duran más o menos lo mismo. El español no comprime las átonas.",
    },
    phrases: [
      {
        id: "buenos-dias",
        text: "buenos días",
        meaning: { english: "good morning", "traditional-chinese": "早安", spanish: "buenos días" },
        beats: [
          { text: "bue", stress: 1 },
          { text: "nos", stress: 0.5 },
          { text: "dí", stress: 1 },
          { text: "as", stress: 0.5 },
        ],
      },
      {
        id: "como-estas",
        text: "¿cómo estás?",
        meaning: { english: "how are you?", "traditional-chinese": "你好嗎？", spanish: "¿cómo estás?" },
        beats: [
          { text: "có", stress: 1 },
          { text: "mo", stress: 0.5, linkToNext: "linking" },
          { text: "es", stress: 0.5 },
          { text: "tás", stress: 1 },
        ],
      },
      {
        id: "muchas-gracias",
        text: "muchas gracias",
        meaning: { english: "thank you very much", "traditional-chinese": "非常感謝", spanish: "muchas gracias" },
        beats: [
          { text: "mu", stress: 1 },
          { text: "chas", stress: 0.5 },
          { text: "gra", stress: 1 },
          { text: "cias", stress: 0.5 },
        ],
      },
    ],
  },
  {
    id: "word-stress",
    language: "es",
    kind: "stress",
    difficulty: 3,
    title: { english: "Word stress", "traditional-chinese": "單字重音", spanish: "Acento de palabra" },
    rule: {
      english: "Words ending in a vowel, n or s are stressed on the second-to-last syllable. Everything else takes the last one. A written accent marks every exception — which means the accent is never optional.",
      "traditional-chinese": "以母音、n 或 s 結尾的字，重音在倒數第二個音節；其他字在最後一個音節。所有例外都用書寫重音標出來——所以那個符號從來不是可有可無的。",
      spanish: "Palabras terminadas en vocal, n o s son llanas; el resto, agudas. La tilde marca cada excepción.",
    },
    phrases: [
      {
        id: "hablar",
        text: "hablar",
        meaning: { english: "to speak", "traditional-chinese": "說話", spanish: "hablar" },
        beats: [
          { text: "ha", stress: 0 },
          { text: "blar", stress: 1 },
        ],
      },
      {
        id: "comida",
        text: "comida",
        meaning: { english: "food", "traditional-chinese": "食物", spanish: "comida" },
        beats: [
          { text: "co", stress: 0 },
          { text: "mi", stress: 1 },
          { text: "da", stress: 0 },
        ],
      },
      {
        id: "telefono",
        text: "teléfono",
        meaning: { english: "telephone", "traditional-chinese": "電話", spanish: "teléfono" },
        beats: [
          { text: "te", stress: 0 },
          { text: "lé", stress: 1 },
          { text: "fo", stress: 0 },
          { text: "no", stress: 0 },
        ],
      },
      {
        id: "desarrollar",
        text: "desarrollar",
        meaning: { english: "to develop", "traditional-chinese": "發展", spanish: "desarrollar" },
        beats: [
          { text: "de", stress: 0 },
          { text: "sa", stress: 0 },
          { text: "rro", stress: 0.5 },
          { text: "llar", stress: 1 },
        ],
      },
    ],
  },
  {
    id: "written-accents",
    language: "es",
    kind: "stress",
    difficulty: 3,
    title: { english: "Written accents", "traditional-chinese": "書寫重音", spanish: "La tilde" },
    rule: {
      english: "The accent moves the stress, and moving the stress changes the word. These three are spelled with the same five letters.",
      "traditional-chinese": "重音符號會移動重音，而移動重音就會換成另一個字。以下三個字用的是同樣的五個字母。",
      spanish: "La tilde mueve el acento, y mover el acento cambia la palabra.",
    },
    phrases: [
      {
        id: "hablo-present",
        text: "hablo",
        meaning: { english: "I speak", "traditional-chinese": "我說", spanish: "yo hablo ahora" },
        beats: [
          { text: "ha", stress: 1 },
          { text: "blo", stress: 0 },
        ],
      },
      {
        id: "hablo-past",
        text: "habló",
        meaning: { english: "he spoke", "traditional-chinese": "他說了", spanish: "él habló ayer" },
        beats: [
          { text: "ha", stress: 0 },
          { text: "bló", stress: 1 },
        ],
      },
      {
        id: "termino",
        text: "término",
        meaning: { english: "term", "traditional-chinese": "術語", spanish: "un término" },
        beats: [
          { text: "tér", stress: 1 },
          { text: "mi", stress: 0 },
          { text: "no", stress: 0 },
        ],
      },
      {
        id: "termino-verb",
        text: "terminó",
        meaning: { english: "he finished", "traditional-chinese": "他結束了", spanish: "él terminó" },
        beats: [
          { text: "ter", stress: 0 },
          { text: "mi", stress: 0 },
          { text: "nó", stress: 1 },
        ],
      },
    ],
  },
  {
    id: "linking",
    language: "es",
    kind: "connected-speech",
    difficulty: 4,
    title: { english: "Linking", "traditional-chinese": "連音", spanish: "Sinalefa" },
    rule: {
      english: "Vowels across a word boundary merge into one syllable, and a final consonant joins the next word's vowel. Spanish is spoken in phrases, not in words.",
      "traditional-chinese": "跨越字界的母音會合併成一個音節，字尾子音則會接到下一個字的母音上。西班牙文是以片語為單位說出來的，不是以字為單位。",
      spanish: "Las vocales se funden entre palabras y las consonantes finales se enlazan con la vocal siguiente.",
    },
    phrases: [
      {
        id: "mi-amigo",
        text: "mi amigo",
        meaning: { english: "my friend", "traditional-chinese": "我的朋友", spanish: "mi amigo" },
        beats: [
          { text: "mia", stress: 0, linkToNext: "linking" },
          { text: "mi", stress: 1 },
          { text: "go", stress: 0 },
        ],
      },
      {
        id: "el-agua",
        text: "el agua",
        meaning: { english: "the water", "traditional-chinese": "水", spanish: "el agua" },
        beats: [
          { text: "e", stress: 0, linkToNext: "linking" },
          { text: "la", stress: 1 },
          { text: "gua", stress: 0 },
        ],
      },
      {
        id: "esta-aqui",
        text: "está aquí",
        meaning: { english: "it's here", "traditional-chinese": "在這裡", spanish: "está aquí" },
        beats: [
          { text: "es", stress: 0 },
          { text: "tá", stress: 1, linkToNext: "linking" },
          { text: "quí", stress: 1 },
        ],
      },
    ],
  },
  {
    id: "sentence-rhythm",
    language: "es",
    kind: "intonation",
    difficulty: 3,
    title: { english: "Sentence melody", "traditional-chinese": "句子語調", spanish: "Entonación" },
    rule: {
      english: "Statements fall at the end; yes/no questions rise. Spanish marks a question in writing before you start reading it, which is exactly what the pitch does out loud.",
      "traditional-chinese": "陳述句句尾下降，是非問句上揚。西班牙文在句子開頭就用倒問號標示問句——音高做的正是同一件事。",
      spanish: "Los enunciados bajan al final; las preguntas de sí/no suben.",
    },
    phrases: [
      {
        id: "hablas-espanol",
        text: "¿Hablas español?",
        meaning: { english: "Do you speak Spanish?", "traditional-chinese": "你會說西班牙文嗎？", spanish: "¿Hablas español?" },
        beats: [
          { text: "ha", stress: 1 },
          { text: "blas", stress: 0 },
          { text: "es", stress: 0 },
          { text: "pa", stress: 0 },
          { text: "ñol", stress: 1 },
        ],
      },
      {
        id: "hablo-espanol",
        text: "Hablo español.",
        meaning: { english: "I speak Spanish.", "traditional-chinese": "我會說西班牙文。", spanish: "Hablo español." },
        beats: [
          { text: "ha", stress: 1 },
          { text: "blo", stress: 0 },
          { text: "es", stress: 0 },
          { text: "pa", stress: 0 },
          { text: "ñol", stress: 1 },
        ],
      },
    ],
  },
];

export const spanishPronunciationPack: PronunciationLanguagePack = {
  language: "es",
  displayName: "Español",
  writingSystem: {
    type: "alphabet",
    label: { english: "Latin alphabet", "traditional-chinese": "拉丁字母", spanish: "Alfabeto latino" },
  },
  categories,
  units: [...vowels, ...rSounds, ...softening, ...spanishOnly, ...otherConsonants],
  minimalPairs,
  lessons,
  scoreDimensions: ["consonant", "vowel", "stress", "rhythm"],
  yumiCalibration: {
    instrument: "syllable-pulse",
    label: {
      english: "Syllable timing",
      "traditional-chinese": "音節等時",
      spanish: "Ritmo silábico",
    },
  },
  defaultDialect: "es-419",
  dialects: ["es-419", "es-ES", "es-MX", "es-AR"],
};
