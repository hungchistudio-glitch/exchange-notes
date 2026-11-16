import type {
  MinimalPairSet,
  PronunciationCategoryGroup,
  PronunciationLanguagePack,
  PronunciationLesson,
  PronunciationUnit,
} from "@/lib/pronunciation/lab/types";

import { consonant, vowel } from "./features";

/* =========================================================
   Japanese (2026-11-16)

   Three things carry most of a Japanese accent, and the pack is built
   around them:

   - the beat. Japanese is counted in morae, not syllables: 学校 is four
     beats (が・っ・こ・う), and a long vowel, the small っ and ん each take
     a whole beat of their own. Shortening one changes the word —
     おばさん (aunt) and おばあさん (grandmother).
   - five steady vowels, one of them (う) with lips that are not rounded.
   - pitch, not stress: 箸 (chopsticks) and 橋 (bridge) are both はし, one
     falling and one rising.

   Examples carry IPA, as every pack's do: it is what Yumi's mouth reads
   (lib/pronunciation/phones.ts), and romaji would animate し as s-h and ふ
   with the teeth. The word cards' own reading line is kana and romaji.
   Teaching text is written in
   English, Traditional Chinese and Korean — the readers most likely to be
   learning Japanese — and falls back to English elsewhere, as every pack
   does.

   Reference variety: standard Tokyo Japanese.
   ========================================================= */

const categories: PronunciationCategoryGroup[] = [
  {
    id: "vowels",
    label: { english: "Vowels", "traditional-chinese": "母音", korean: "모음" },
    description: {
      english: "Five vowels, short and steady. None of them glides.",
      "traditional-chinese": "五個母音，短而穩定，沒有一個會滑動。",
      korean: "다섯 개의 모음. 짧고 안정적이며, 미끄러지는 소리가 없어요.",
    },
  },
  {
    id: "beats",
    label: { english: "Beats (morae)", "traditional-chinese": "拍（音拍）", korean: "박(모라)" },
    description: {
      english: "Long vowels, the small っ and ん each take a full beat. Count them, or the word changes.",
      "traditional-chinese": "長音、小っ和ん都各佔一整拍。拍數算錯，字就變了。",
      korean: "장음, 작은 っ, ん은 각각 한 박을 온전히 차지해요. 박을 세지 않으면 단어가 바뀌어요.",
    },
  },
  {
    id: "consonants",
    label: { english: "Consonants to watch", "traditional-chinese": "要注意的子音", korean: "주의할 자음" },
    description: {
      english: "The sounds that do not match their romaji letters.",
      "traditional-chinese": "跟羅馬字字母對不上的那些音。",
      korean: "로마자 글자와 소리가 다른 자음들.",
    },
  },
  {
    id: "pitch",
    label: { english: "Pitch accent", "traditional-chinese": "高低重音", korean: "고저 악센트" },
    module: "rhythm",
  },
  {
    id: "timing",
    label: { english: "Beat timing", "traditional-chinese": "拍的節奏", korean: "박자 리듬" },
    module: "rhythm",
  },
];

const vowels: PronunciationUnit[] = [
  {
    id: "a-ja",
    language: "ja",
    category: "phoneme",
    group: "vowels",
    symbol: "あ",
    nativeRepresentation: "あ ア",
    phoneticRepresentation: "/a/",
    speechText: "あさ",
    tip: {
      english: "Open and central, and the same length every time. It never reduces to the neutral English \"uh\".",
      "traditional-chinese": "開口、居中，每次長度都一樣，不會弱化成英語那種含糊的「呃」。",
      korean: "입을 벌리고 가운데에서 내요. 언제나 같은 길이이고, 흐릿한 소리로 약해지지 않아요.",
    },
    features: vowel({ height: 0.15, frontness: 0.5, jaw: 0.75 }),
    examples: [
      { text: "あさ", meaning: { english: "morning", "traditional-chinese": "早上", korean: "아침" }, phonetic: "/a.sa/", highlight: "あ" },
      { text: "かさ", meaning: { english: "umbrella", "traditional-chinese": "雨傘", korean: "우산" }, phonetic: "/ka.sa/", highlight: "a" },
      { text: "やま", meaning: { english: "mountain", "traditional-chinese": "山", korean: "산" }, phonetic: "/ja.ma/", highlight: "a" },
    ],
    difficulty: 1,
  },
  {
    id: "i-ja",
    language: "ja",
    category: "phoneme",
    group: "vowels",
    symbol: "い",
    nativeRepresentation: "い イ",
    phoneticRepresentation: "/i/",
    speechText: "いぬ",
    tip: {
      english: "High and front, lips relaxed. Short — the English \"ee\" is too long unless the word has a long vowel.",
      "traditional-chinese": "高、前，嘴唇放鬆。要短——除非是長音，否則英語 ee 那樣就太長了。",
      korean: "혀를 높고 앞쪽에 두고, 입술은 편하게. 짧게 내요. 장음이 아니면 길게 끌지 않아요.",
    },
    features: vowel({ height: 0.95, frontness: 0.95 }),
    examples: [
      { text: "いぬ", meaning: { english: "dog", "traditional-chinese": "狗", korean: "개" }, phonetic: "/i.nɯ/", highlight: "い" },
      { text: "きた", meaning: { english: "north", "traditional-chinese": "北", korean: "북쪽" }, phonetic: "/ki.ta/", highlight: "i" },
      { text: "みみ", meaning: { english: "ear", "traditional-chinese": "耳朵", korean: "귀" }, phonetic: "/mi.mi/", highlight: "i" },
    ],
    difficulty: 1,
  },
  {
    id: "u-ja",
    language: "ja",
    category: "phoneme",
    group: "vowels",
    symbol: "う",
    nativeRepresentation: "う ウ",
    phoneticRepresentation: "/ɯ/",
    speechText: "うみ",
    tip: {
      english: "The one to watch: the back of the tongue is high, but the lips stay flat and only slightly pressed together — not pushed out and rounded as for English \"oo\".",
      "traditional-chinese": "最需要注意的一個：舌根抬高，但嘴唇保持扁平、只輕輕靠攏，不像英語 oo 或中文「烏」那樣嘟起來。",
      korean: "가장 주의할 소리예요. 혀 뒤쪽은 높지만 입술은 평평하게, 살짝만 다물어요. 한국어 ㅜ처럼 입술을 내밀지 않아요. ㅡ와 ㅜ의 중간쯤이에요.",
    },
    features: vowel({ height: 0.9, frontness: 0.3, rounding: "slightly_rounded" }),
    examples: [
      { text: "うみ", meaning: { english: "sea", "traditional-chinese": "海", korean: "바다" }, phonetic: "/ɯ.mi/", highlight: "う" },
      { text: "くつ", meaning: { english: "shoes", "traditional-chinese": "鞋子", korean: "신발" }, phonetic: "/kɯ.tsɯ/", highlight: "ɯ" },
      { text: "ふゆ", meaning: { english: "winter", "traditional-chinese": "冬天", korean: "겨울" }, phonetic: "/ɸɯ.jɯ/", highlight: "ɯ" },
    ],
    commonMistake: {
      confusedWith: "oo (rounded)",
      explanation: {
        english: "Rounding the lips makes it sound foreign at once. Keep them flat, as if smiling a little.",
        "traditional-chinese": "嘴唇一嘟起來，聽起來馬上就像外國腔。保持扁平，像微微在笑。",
        korean: "입술을 둥글게 내밀면 바로 외국인 발음처럼 들려요. 살짝 웃듯이 평평하게 두세요.",
      },
    },
    difficulty: 3,
  },
  {
    id: "e-ja",
    language: "ja",
    category: "phoneme",
    group: "vowels",
    symbol: "え",
    nativeRepresentation: "え エ",
    phoneticRepresentation: "/e/",
    speechText: "えき",
    tip: {
      english: "Mid and front, and it does not glide into \"ay\". えい is often said as a long え.",
      "traditional-chinese": "中高、靠前，不會滑成英語的 ay。えい 常常唸成長的 え。",
      korean: "중간 높이, 앞쪽. '에이'로 미끄러지지 않아요. えい는 흔히 긴 え로 발음해요.",
    },
    features: vowel({ height: 0.55, frontness: 0.85 }),
    examples: [
      { text: "えき", meaning: { english: "station", "traditional-chinese": "車站", korean: "역" }, phonetic: "/e.ki/", highlight: "え" },
      { text: "せんせい", meaning: { english: "teacher", "traditional-chinese": "老師", korean: "선생님" }, phonetic: "/seɴ.seː/", highlight: "e" },
      { text: "て", meaning: { english: "hand", "traditional-chinese": "手", korean: "손" }, phonetic: "/te/", highlight: "e" },
    ],
    difficulty: 1,
  },
  {
    id: "o-ja",
    language: "ja",
    category: "phoneme",
    group: "vowels",
    symbol: "お",
    nativeRepresentation: "お オ",
    phoneticRepresentation: "/o/",
    speechText: "おと",
    tip: {
      english: "Mid and back, lips gently rounded, and steady to the end — no glide toward \"oh-oo\".",
      "traditional-chinese": "中高、靠後，嘴唇輕輕收圓，一直保持到最後，不會滑向「歐烏」。",
      korean: "중간 높이, 뒤쪽, 입술을 가볍게 둥글게. 끝까지 그대로 유지해요.",
    },
    features: vowel({ height: 0.55, frontness: 0.2, rounding: "rounded" }),
    examples: [
      { text: "おと", meaning: { english: "sound", "traditional-chinese": "聲音", korean: "소리" }, phonetic: "/o.to/", highlight: "お" },
      { text: "こころ", meaning: { english: "heart", "traditional-chinese": "心", korean: "마음" }, phonetic: "/ko.ko.ɾo/", highlight: "o" },
      { text: "そら", meaning: { english: "sky", "traditional-chinese": "天空", korean: "하늘" }, phonetic: "/so.ɾa/", highlight: "o" },
    ],
    difficulty: 1,
  },
];

const beatUnits: PronunciationUnit[] = [
  {
    id: "long-vowel",
    language: "ja",
    category: "syllable",
    group: "beats",
    symbol: "ー",
    displayLabel: { english: "Long vowel", "traditional-chinese": "長音", korean: "장음" },
    phoneticRepresentation: "/aː/ · /oː/",
    speechText: "おばあさん",
    tip: {
      english: "A long vowel is two beats of the same vowel, held without a break. In kana it is written with a second vowel (おかあさん) or, in katakana, with ー (コーヒー).",
      "traditional-chinese": "長音就是同一個母音維持兩拍、中間不斷開。平假名多寫一個母音（おかあさん），片假名用「ー」（コーヒー）。",
      korean: "장음은 같은 모음을 끊지 않고 두 박 동안 유지하는 거예요. 히라가나는 모음을 하나 더 쓰고(おかあさん), 가타카나는 ー로 써요(コーヒー).",
    },
    features: vowel({ height: 0.15, frontness: 0.5, jaw: 0.75 }),
    examples: [
      { text: "おばあさん", meaning: { english: "grandmother", "traditional-chinese": "奶奶", korean: "할머니" }, phonetic: "/o.baː.saɴ/", highlight: "ばあ" },
      { text: "コーヒー", meaning: { english: "coffee", "traditional-chinese": "咖啡", korean: "커피" }, phonetic: "/koː.çiː/", highlight: "ー" },
      { text: "とうきょう", meaning: { english: "Tokyo", "traditional-chinese": "東京", korean: "도쿄" }, phonetic: "/toː.kʲoː/", highlight: "とう" },
    ],
    difficulty: 3,
  },
  {
    id: "sokuon",
    language: "ja",
    category: "syllable",
    group: "beats",
    symbol: "っ",
    displayLabel: { english: "Small tsu (pause)", "traditional-chinese": "促音", korean: "촉음" },
    phoneticRepresentation: "/Q/",
    speechText: "きって",
    tip: {
      english: "The small っ is a silent beat: close for the next consonant and hold it for one beat before releasing. きて is two beats, きって is three.",
      "traditional-chinese": "小っ是一拍「無聲的停頓」：先擺好下一個子音的口型、憋住一拍再放開。きて是兩拍，きって是三拍。",
      korean: "작은 っ는 소리 없는 한 박이에요. 다음 자음의 입 모양을 만들고 한 박 동안 멈췄다가 터뜨려요. きて는 두 박, きって는 세 박이에요.",
    },
    features: consonant({ manner: "stop", place: "alveolar", voiced: false }),
    examples: [
      { text: "きって", meaning: { english: "stamp", "traditional-chinese": "郵票", korean: "우표" }, phonetic: "/kit.te/", highlight: "っ" },
      { text: "がっこう", meaning: { english: "school", "traditional-chinese": "學校", korean: "학교" }, phonetic: "/ɡak.koː/", highlight: "っ" },
      { text: "ざっし", meaning: { english: "magazine", "traditional-chinese": "雜誌", korean: "잡지" }, phonetic: "/dzaɕ.ɕi/", highlight: "っ" },
    ],
    difficulty: 3,
  },
  {
    id: "hatsuon",
    language: "ja",
    category: "syllable",
    group: "beats",
    symbol: "ん",
    displayLabel: { english: "The n beat", "traditional-chinese": "撥音", korean: "발음(ん)" },
    phoneticRepresentation: "/N/",
    speechText: "ほん",
    tip: {
      english: "ん is a beat of its own, and it takes the shape of what follows: m before p or b (さんぽ), n before t or d, ng before k or g, and a nasal hum at the end of a word.",
      "traditional-chinese": "ん自己就是一拍，而且會隨後面的音變形：在 p、b 前像 m（さんぽ），在 t、d 前像 n，在 k、g 前像 ng，字尾則是鼻腔的哼聲。",
      korean: "ん은 그 자체로 한 박이에요. 뒤에 오는 소리에 따라 모양이 바뀌어요. p·b 앞에서는 m(さんぽ), t·d 앞에서는 n, k·g 앞에서는 ng, 단어 끝에서는 콧소리예요.",
    },
    features: consonant({ manner: "nasal", place: "velar", voiced: true }),
    examples: [
      { text: "ほん", meaning: { english: "book", "traditional-chinese": "書", korean: "책" }, phonetic: "/hoɴ/", highlight: "ん" },
      { text: "さんぽ", meaning: { english: "walk", "traditional-chinese": "散步", korean: "산책" }, phonetic: "/sam.po/", highlight: "ん" },
      { text: "げんき", meaning: { english: "well, energetic", "traditional-chinese": "有精神", korean: "건강함" }, phonetic: "/ɡeŋ.ki/", highlight: "ん" },
    ],
    difficulty: 2,
  },
  {
    id: "devoicing",
    language: "ja",
    category: "connected-speech",
    group: "beats",
    symbol: "す",
    displayLabel: { english: "Whispered vowels", "traditional-chinese": "母音無聲化", korean: "모음 무성화" },
    phoneticRepresentation: "/ɯ̥/ · /i̥/",
    speechText: "です",
    tip: {
      english: "Between two voiceless consonants, or at the end of です and ます, い and う are often whispered: です sounds close to \"des\", した close to \"shta\". The beat is still there.",
      "traditional-chinese": "夾在兩個清子音之間，或在です、ます結尾時，い和う常常只用氣音：です聽起來接近 des，した接近 shta。但拍子還在。",
      korean: "무성 자음 두 개 사이나 です·ます 끝에서 い와 う는 흔히 속삭이듯 소리 나요. です는 'des'에, した는 'shta'에 가깝게 들려요. 박은 그대로예요.",
    },
    features: { ...vowel({ height: 0.9, frontness: 0.3, rounding: "slightly_rounded" }), voiced: false },
    examples: [
      { text: "です", meaning: { english: "is (polite)", "traditional-chinese": "是（禮貌）", korean: "입니다" }, phonetic: "/de.sɯ̥/", highlight: "す" },
      { text: "した", meaning: { english: "below", "traditional-chinese": "下面", korean: "아래" }, phonetic: "/ɕi̥.ta/", highlight: "し" },
      { text: "すき", meaning: { english: "like", "traditional-chinese": "喜歡", korean: "좋아함" }, phonetic: "/sɯ̥.ki/", highlight: "す" },
    ],
    difficulty: 3,
  },
];

const consonantUnits: PronunciationUnit[] = [
  {
    id: "r-ja",
    language: "ja",
    category: "phoneme",
    group: "consonants",
    symbol: "ら",
    nativeRepresentation: "ら り る れ ろ",
    phoneticRepresentation: "/ɾ/",
    speechText: "さくら",
    tip: {
      english: "One quick tap of the tongue tip just behind the teeth — neither English r nor l, somewhere between the two.",
      "traditional-chinese": "舌尖在上齒後面快速彈一下——不是英語的 r，也不是 l，介於兩者之間。",
      korean: "혀끝으로 윗니 뒤를 한 번 가볍게 튕겨요. 한국어 '라디오'의 ㄹ과 거의 같아요.",
    },
    features: consonant({ manner: "tap", place: "alveolar", voiced: true }),
    examples: [
      { text: "さくら", meaning: { english: "cherry blossom", "traditional-chinese": "櫻花", korean: "벚꽃" }, phonetic: "/sa.kɯ.ɾa/", highlight: "ら" },
      { text: "りんご", meaning: { english: "apple", "traditional-chinese": "蘋果", korean: "사과" }, phonetic: "/ɾiŋ.ɡo/", highlight: "り" },
      { text: "くるま", meaning: { english: "car", "traditional-chinese": "汽車", korean: "자동차" }, phonetic: "/kɯ.ɾɯ.ma/", highlight: "る" },
    ],
    difficulty: 3,
  },
  {
    id: "fu-ja",
    language: "ja",
    category: "phoneme",
    group: "consonants",
    symbol: "ふ",
    phoneticRepresentation: "/ɸ/",
    speechText: "ふね",
    tip: {
      english: "Not an English f: the upper teeth stay away from the lip. Blow softly between both lips, as if cooling soup.",
      "traditional-chinese": "不是英語的 f：上齒不碰下唇。用兩片嘴唇之間輕輕吹氣，像在吹涼湯。",
      korean: "영어 f가 아니에요. 윗니가 입술에 닿지 않아요. 국을 식히듯 두 입술 사이로 살살 바람을 내요.",
    },
    features: consonant({ manner: "fricative", place: "bilabial", voiced: false }),
    examples: [
      { text: "ふね", meaning: { english: "boat", "traditional-chinese": "船", korean: "배" }, phonetic: "/ɸɯ.ne/", highlight: "ふ" },
      { text: "ふじさん", meaning: { english: "Mount Fuji", "traditional-chinese": "富士山", korean: "후지산" }, phonetic: "/ɸɯ.dʑi.saɴ/", highlight: "ふ" },
      { text: "ふゆ", meaning: { english: "winter", "traditional-chinese": "冬天", korean: "겨울" }, phonetic: "/ɸɯ.jɯ/", highlight: "ふ" },
    ],
    commonMistake: {
      confusedWith: "f / h",
      explanation: {
        english: "Touching the lip with the teeth gives an English f; opening the lips gives h. The sound is in between.",
        "traditional-chinese": "牙齒碰到嘴唇就成了英語 f；嘴唇張開又變成 h。正確的音在兩者之間。",
        korean: "이가 입술에 닿으면 영어 f, 입술을 벌리면 ㅎ이 돼요. 그 사이의 소리예요.",
      },
    },
    difficulty: 2,
  },
  {
    id: "tsu-ja",
    language: "ja",
    category: "phoneme",
    group: "consonants",
    symbol: "つ",
    phoneticRepresentation: "/ts/",
    speechText: "つき",
    tip: {
      english: "t and s fused into one sound, as at the end of English \"cats\" — then the flat う.",
      "traditional-chinese": "t 和 s 黏成一個音，像英語 cats 的結尾，接著是扁平的 う。",
      korean: "t와 s를 하나로 붙인 소리예요. 영어 cats의 끝소리처럼. '쓰'나 '츠'가 아니에요.",
    },
    features: consonant({ manner: "affricate", place: "alveolar", voiced: false }),
    examples: [
      { text: "つき", meaning: { english: "moon", "traditional-chinese": "月亮", korean: "달" }, phonetic: "/tsɯ.ki/", highlight: "つ" },
      { text: "なつ", meaning: { english: "summer", "traditional-chinese": "夏天", korean: "여름" }, phonetic: "/na.tsɯ/", highlight: "つ" },
      { text: "つくえ", meaning: { english: "desk", "traditional-chinese": "書桌", korean: "책상" }, phonetic: "/tsɯ.kɯ.e/", highlight: "つ" },
    ],
    difficulty: 3,
  },
  {
    id: "shi-ja",
    language: "ja",
    category: "phoneme",
    group: "consonants",
    symbol: "し",
    phoneticRepresentation: "/ɕ/",
    speechText: "しお",
    tip: {
      english: "Softer than English \"sh\": the middle of the tongue rises toward the palate and the lips stay flat. Never \"see\".",
      "traditional-chinese": "比英語 sh 柔：舌面往硬顎抬高，嘴唇保持扁平，接近中文「西」。絕不是 see。",
      korean: "영어 sh보다 부드러워요. 혓바닥을 입천장 쪽으로 올리고 입술은 평평하게. 한국어 '시'와 거의 같아요.",
    },
    features: consonant({ manner: "fricative", place: "postalveolar", voiced: false, tongue: "front", frontness: 0.8 }),
    examples: [
      { text: "しお", meaning: { english: "salt", "traditional-chinese": "鹽", korean: "소금" }, phonetic: "/ɕi.o/", highlight: "し" },
      { text: "すし", meaning: { english: "sushi", "traditional-chinese": "壽司", korean: "초밥" }, phonetic: "/sɯ.ɕi/", highlight: "し" },
      { text: "しごと", meaning: { english: "work", "traditional-chinese": "工作", korean: "일" }, phonetic: "/ɕi.ɡo.to/", highlight: "し" },
    ],
    difficulty: 2,
  },
  {
    id: "chi-ja",
    language: "ja",
    category: "phoneme",
    group: "consonants",
    symbol: "ち",
    phoneticRepresentation: "/tɕ/",
    speechText: "ちず",
    tip: {
      english: "The stop-and-hiss partner of し, close to the start of \"cheese\" but softer, with flat lips.",
      "traditional-chinese": "し的「先塞再擦」版，接近 cheese 的開頭但更柔，嘴唇扁平，像中文「七」。",
      korean: "し에 막힘이 더해진 소리예요. 영어 cheese의 첫소리보다 부드럽고, 한국어 '치'에 가까워요. 숨을 세게 내지 않아요.",
    },
    features: consonant({ manner: "affricate", place: "postalveolar", voiced: false, tongue: "front", frontness: 0.8 }),
    examples: [
      { text: "ちず", meaning: { english: "map", "traditional-chinese": "地圖", korean: "지도" }, phonetic: "/tɕi.zɯ/", highlight: "ち" },
      { text: "くち", meaning: { english: "mouth", "traditional-chinese": "嘴巴", korean: "입" }, phonetic: "/kɯ.tɕi/", highlight: "ち" },
      { text: "ちいさい", meaning: { english: "small", "traditional-chinese": "小的", korean: "작다" }, phonetic: "/tɕiː.sa.i/", highlight: "ち" },
    ],
    difficulty: 2,
  },
  {
    id: "hi-ja",
    language: "ja",
    category: "phoneme",
    group: "consonants",
    symbol: "ひ",
    phoneticRepresentation: "/ç/",
    speechText: "ひと",
    tip: {
      english: "Before い, h is made with the middle of the tongue close to the palate: a soft hiss, like the h in English \"huge\" said slowly.",
      "traditional-chinese": "在 い 前面，h 是用舌面靠近硬顎發出的輕柔擦音，像英語 huge 慢慢唸時的 h。",
      korean: "い 앞의 h는 혓바닥을 입천장 가까이 대고 내는 부드러운 마찰음이에요. 한국어 '히'와 비슷하지만 더 가볍게 내요.",
    },
    features: consonant({ manner: "fricative", place: "palatal", voiced: false }),
    examples: [
      { text: "ひと", meaning: { english: "person", "traditional-chinese": "人", korean: "사람" }, phonetic: "/çi.to/", highlight: "ひ" },
      { text: "ひかり", meaning: { english: "light", "traditional-chinese": "光", korean: "빛" }, phonetic: "/çi.ka.ɾi/", highlight: "ひ" },
      { text: "ひがし", meaning: { english: "east", "traditional-chinese": "東邊", korean: "동쪽" }, phonetic: "/çi.ɡa.ɕi/", highlight: "ひ" },
    ],
    difficulty: 2,
  },
];

const minimalPairs: MinimalPairSet[] = [
  {
    id: "long-short",
    language: "ja",
    targets: ["long-vowel"],
    label: { english: "obasan / obāsan", "traditional-chinese": "おばさん / おばあさん", korean: "おばさん / おばあさん" },
    hint: {
      english: "Count the beats: the long vowel takes one more.",
      "traditional-chinese": "數拍子：長音多一拍。",
      korean: "박을 세어 보세요. 장음이 한 박 더 길어요.",
    },
    examples: [
      [
        { unitId: "long-vowel", text: "おばさん", phonetic: "/o.ba.saɴ/", meaning: { english: "aunt", "traditional-chinese": "阿姨", korean: "아주머니" } },
        { unitId: "long-vowel", text: "おばあさん", phonetic: "/o.baː.saɴ/", meaning: { english: "grandmother", "traditional-chinese": "奶奶", korean: "할머니" } },
      ],
      [
        { unitId: "long-vowel", text: "おじさん", phonetic: "/o.dʑi.saɴ/", meaning: { english: "uncle", "traditional-chinese": "叔叔", korean: "아저씨" } },
        { unitId: "long-vowel", text: "おじいさん", phonetic: "/o.dʑiː.saɴ/", meaning: { english: "grandfather", "traditional-chinese": "爺爺", korean: "할아버지" } },
      ],
      [
        { unitId: "long-vowel", text: "ゆき", phonetic: "/jɯ.ki/", meaning: { english: "snow", "traditional-chinese": "雪", korean: "눈" } },
        { unitId: "long-vowel", text: "ゆうき", phonetic: "/jɯː.ki/", meaning: { english: "courage", "traditional-chinese": "勇氣", korean: "용기" } },
      ],
      [
        { unitId: "long-vowel", text: "ここ", phonetic: "/ko.ko/", meaning: { english: "here", "traditional-chinese": "這裡", korean: "여기" } },
        { unitId: "long-vowel", text: "こうこう", phonetic: "/koː.koː/", meaning: { english: "high school", "traditional-chinese": "高中", korean: "고등학교" } },
      ],
    ],
  },
  {
    id: "sokuon-pairs",
    language: "ja",
    targets: ["sokuon"],
    label: { english: "kite / kitte", "traditional-chinese": "きて / きって", korean: "きて / きって" },
    hint: {
      english: "Listen for the silent beat before the consonant.",
      "traditional-chinese": "注意子音前那一拍安靜的停頓。",
      korean: "자음 앞의 조용한 한 박을 들어 보세요.",
    },
    examples: [
      [
        { unitId: "sokuon", text: "きて", phonetic: "/ki.te/", meaning: { english: "come (please)", "traditional-chinese": "來", korean: "와 줘" } },
        { unitId: "sokuon", text: "きって", phonetic: "/kit.te/", meaning: { english: "stamp", "traditional-chinese": "郵票", korean: "우표" } },
      ],
      [
        { unitId: "sokuon", text: "おと", phonetic: "/o.to/", meaning: { english: "sound", "traditional-chinese": "聲音", korean: "소리" } },
        { unitId: "sokuon", text: "おっと", phonetic: "/ot.to/", meaning: { english: "husband", "traditional-chinese": "丈夫", korean: "남편" } },
      ],
      [
        { unitId: "sokuon", text: "さか", phonetic: "/sa.ka/", meaning: { english: "slope", "traditional-chinese": "坡", korean: "언덕" } },
        { unitId: "sokuon", text: "さっか", phonetic: "/sak.ka/", meaning: { english: "author", "traditional-chinese": "作家", korean: "작가" } },
      ],
    ],
  },
  {
    id: "tsu-su",
    language: "ja",
    targets: ["tsu-ja"],
    label: { english: "tsuki / suki", "traditional-chinese": "つき / すき", korean: "つき / すき" },
    examples: [
      [
        { unitId: "tsu-ja", text: "つき", phonetic: "/tsɯ.ki/", meaning: { english: "moon", "traditional-chinese": "月亮", korean: "달" } },
        { unitId: "tsu-ja", text: "すき", phonetic: "/sɯ̥.ki/", meaning: { english: "like", "traditional-chinese": "喜歡", korean: "좋아함" } },
      ],
      [
        { unitId: "tsu-ja", text: "つる", phonetic: "/tsɯ.ɾɯ/", meaning: { english: "crane (bird)", "traditional-chinese": "鶴", korean: "학" } },
        { unitId: "tsu-ja", text: "する", phonetic: "/sɯ.ɾɯ/", meaning: { english: "to do", "traditional-chinese": "做", korean: "하다" } },
      ],
    ],
  },
];

const lessons: PronunciationLesson[] = [
  {
    id: "pitch-accent",
    language: "ja",
    kind: "intonation",
    difficulty: 4,
    title: { english: "Pitch accent", "traditional-chinese": "高低重音", korean: "고저 악센트" },
    rule: {
      english: "Japanese marks a word with pitch, not with loudness: each beat is high or low. The bars below are the pitch. 箸 (chopsticks) starts high and drops; 橋 (bridge) starts low and rises.",
      "traditional-chinese": "日文用音高、而不是音量來區分字：每一拍不是高就是低。下面的長條就是音高。箸（筷子）先高後低；橋（橋樑）先低後高。",
      korean: "일본어는 소리의 크기가 아니라 높낮이로 단어를 구별해요. 박마다 높거나 낮아요. 아래 막대가 높이예요. 箸(젓가락)는 높았다가 내려가고, 橋(다리)는 낮았다가 올라가요.",
    },
    phrases: [
      {
        id: "hashi-chopsticks",
        text: "箸",
        speechText: "はし",
        meaning: { english: "chopsticks", "traditional-chinese": "筷子", korean: "젓가락" },
        beats: [
          { text: "は", stress: 1 },
          { text: "し", stress: 0 },
        ],
      },
      {
        id: "hashi-bridge",
        text: "橋",
        speechText: "はし",
        meaning: { english: "bridge", "traditional-chinese": "橋", korean: "다리" },
        beats: [
          { text: "は", stress: 0 },
          { text: "し", stress: 1 },
        ],
      },
      {
        id: "ame-rain",
        text: "雨",
        speechText: "あめ",
        meaning: { english: "rain", "traditional-chinese": "雨", korean: "비" },
        beats: [
          { text: "あ", stress: 1 },
          { text: "め", stress: 0 },
        ],
      },
      {
        id: "ame-candy",
        text: "飴",
        speechText: "あめ",
        meaning: { english: "candy", "traditional-chinese": "糖果", korean: "사탕" },
        beats: [
          { text: "あ", stress: 0 },
          { text: "め", stress: 1 },
        ],
      },
    ],
  },
  {
    id: "mora-timing",
    language: "ja",
    kind: "rhythm",
    difficulty: 3,
    title: { english: "Every beat the same length", "traditional-chinese": "每一拍一樣長", korean: "박마다 같은 길이" },
    rule: {
      english: "Each kana beat takes the same time, and っ, ん and long vowels each take one. Clap once per beat: がっこう is four claps, とうきょう is four.",
      "traditional-chinese": "每個假名拍都一樣長，っ、ん和長音也各佔一拍。每拍拍一下手：がっこう拍四下，とうきょう也是四下。",
      korean: "가나 한 박은 모두 같은 시간이고, っ, ん, 장음도 각각 한 박이에요. 박마다 손뼉을 쳐 보세요. がっこう는 네 번, とうきょう도 네 번이에요.",
    },
    phrases: [
      {
        id: "gakkou",
        text: "学校",
        speechText: "がっこう",
        meaning: { english: "school", "traditional-chinese": "學校", korean: "학교" },
        beats: [
          { text: "が", stress: 0.5, length: 1 },
          { text: "っ", stress: 0, length: 1, silent: true },
          { text: "こ", stress: 0.5, length: 1 },
          { text: "う", stress: 0.5, length: 1 },
        ],
      },
      {
        id: "tokyo",
        text: "東京",
        speechText: "とうきょう",
        meaning: { english: "Tokyo", "traditional-chinese": "東京", korean: "도쿄" },
        beats: [
          { text: "と", stress: 0.5, length: 1 },
          { text: "う", stress: 0.5, length: 1 },
          { text: "きょ", stress: 0.5, length: 1 },
          { text: "う", stress: 0.5, length: 1 },
        ],
      },
      {
        id: "konnichiwa",
        text: "こんにちは",
        meaning: { english: "hello", "traditional-chinese": "你好", korean: "안녕하세요" },
        beats: [
          { text: "こ", stress: 0.5, length: 1 },
          { text: "ん", stress: 0.5, length: 1 },
          { text: "に", stress: 0.5, length: 1 },
          { text: "ち", stress: 0.5, length: 1 },
          { text: "は", stress: 0.5, length: 1 },
        ],
      },
    ],
  },
  {
    id: "question-ja",
    language: "ja",
    kind: "intonation",
    difficulty: 2,
    title: { english: "Statement or question", "traditional-chinese": "陳述還是疑問", korean: "평서문인가 의문문인가" },
    rule: {
      english: "A polite question ends in か and rises on it; the same sentence without か, or with it falling, is a statement. 行きますか？ rises at the end; 行きます。 settles.",
      "traditional-chinese": "禮貌的疑問句以か結尾，而且在か上揚；沒有か或か往下，就是陳述。行きますか？句尾上揚；行きます。則平穩落下。",
      korean: "정중한 의문문은 か로 끝나고, か에서 올라가요. か가 없거나 내려가면 평서문이에요. 行きますか？는 끝이 올라가고, 行きます。는 차분하게 내려가요.",
    },
    phrases: [
      {
        id: "ikimasu",
        text: "行きます。",
        speechText: "いきます。",
        meaning: { english: "I'll go.", "traditional-chinese": "我會去。", korean: "갈게요." },
        beats: [
          { text: "い", stress: 0.3 },
          { text: "き", stress: 0.8 },
          { text: "ま", stress: 0.6 },
          { text: "す", stress: 0.2 },
        ],
      },
      {
        id: "ikimasuka",
        text: "行きますか？",
        speechText: "いきますか？",
        meaning: { english: "Will you go?", "traditional-chinese": "你會去嗎？", korean: "가세요?" },
        beats: [
          { text: "い", stress: 0.3 },
          { text: "き", stress: 0.8 },
          { text: "ま", stress: 0.6 },
          { text: "す", stress: 0.3 },
          { text: "か", stress: 1 },
        ],
      },
    ],
  },
];

export const japanesePronunciationPack: PronunciationLanguagePack = {
  language: "ja",
  displayName: "日本語",
  writingSystem: {
    type: "kana-kanji",
    label: { english: "Kana and kanji", "traditional-chinese": "假名與漢字", korean: "가나와 한자" },
  },
  categories,
  units: [...vowels, ...beatUnits, ...consonantUnits],
  minimalPairs,
  lessons,
  scoreDimensions: ["vowel", "consonantLength", "rhythm", "pitch"],
  yumiCalibration: {
    instrument: "pitch-accent",
    label: {
      english: "the length of every beat",
      "traditional-chinese": "每一拍的長度",
      korean: "박 하나하나의 길이",
      spanish: "la duración de cada pulso",
      french: "la durée de chaque temps",
      italian: "la durata di ogni battito",
    },
  },
  defaultDialect: "ja-JP",
  dialects: ["ja-JP"],
};
