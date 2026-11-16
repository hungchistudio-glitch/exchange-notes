import type {
  MinimalPairSet,
  PronunciationCategoryGroup,
  PronunciationLanguagePack,
  PronunciationLesson,
  PronunciationUnit,
} from "@/lib/pronunciation/lab/types";

import { consonant, vowel } from "./features";

/* =========================================================
   Korean (2026-11-16)

   What makes Korean hard to say is not the alphabet, which is learned in an
   afternoon, but three things it hides:

   - the three-way consonants: 불 (fire), 풀 (grass) and 뿔 (horn) differ
     only in the air and tension of the first sound — plain, aspirated and
     tense. No other language in this app has the tense row.
   - vowels close together: ㅓ and ㅗ, ㅡ and ㅜ.
   - the sound changes between syllables: 한국어 is said [한구거], 감사합니다
     [감사함니다]. Spelling stays put; speech flows.

   Examples carry IPA, because the contrasts here are exactly what Revised
   Romanization flattens (불 and 뿔 are both "bul" there). Teaching text is
   written in English, Traditional Chinese and Japanese and falls back to
   English elsewhere, as every pack does.

   Reference variety: standard Seoul Korean.
   ========================================================= */

const categories: PronunciationCategoryGroup[] = [
  {
    id: "vowels",
    label: { english: "Vowels", "traditional-chinese": "母音", japanese: "母音" },
    description: {
      english: "Seven vowels, two pairs of them close enough to confuse.",
      "traditional-chinese": "七個母音，其中兩組非常接近、容易混淆。",
      japanese: "7つの母音。そのうち2組はとても近く、まぎらわしい音です。",
    },
  },
  {
    id: "three-way",
    label: { english: "Plain, aspirated, tense", "traditional-chinese": "平音、激音、緊音", japanese: "平音・激音・濃音" },
    description: {
      english: "Three versions of the same consonant, told apart by air and tension, not by voicing.",
      "traditional-chinese": "同一個子音的三種版本，靠送氣和緊張度區分，而不是靠清濁。",
      japanese: "同じ子音の3つの形。声の有無ではなく、息と緊張で区別します。",
    },
  },
  {
    id: "finals",
    label: { english: "Final consonants", "traditional-chinese": "收音（終聲）", japanese: "パッチム（終声）" },
    description: {
      english: "Under a syllable, many letters but only seven sounds — and the stops are not released.",
      "traditional-chinese": "寫在音節下面的子音很多，但只有七種音，而且塞音不爆開。",
      japanese: "音節の下にくる文字は多いのに、音は7つだけ。破裂音ははじけさせません。",
    },
  },
  {
    id: "liaison",
    label: { english: "Sound changes", "traditional-chinese": "音變", japanese: "音の変化" },
    module: "rhythm",
  },
  {
    id: "melody",
    label: { english: "Intonation", "traditional-chinese": "語調", japanese: "イントネーション" },
    module: "rhythm",
  },
];

const vowels: PronunciationUnit[] = [
  {
    id: "a-ko",
    language: "ko",
    category: "phoneme",
    group: "vowels",
    symbol: "ㅏ",
    phoneticRepresentation: "/a/",
    speechText: "아",
    tip: {
      english: "Open and central, steady from start to end.",
      "traditional-chinese": "開口、居中，從頭到尾保持不變。",
      japanese: "口を開けて、まんなかで。最初から最後まで変わりません。日本語の「あ」とほぼ同じです。",
    },
    features: vowel({ height: 0.15, frontness: 0.5, jaw: 0.8 }),
    examples: [
      { text: "아기", meaning: { english: "baby", "traditional-chinese": "嬰兒", japanese: "赤ちゃん" }, phonetic: "/a.ɡi/", highlight: "아" },
      { text: "사랑", meaning: { english: "love", "traditional-chinese": "愛", japanese: "愛" }, phonetic: "/sa.ɾaŋ/", highlight: "a" },
      { text: "바다", meaning: { english: "sea", "traditional-chinese": "海", japanese: "海" }, phonetic: "/pa.da/", highlight: "a" },
    ],
    difficulty: 1,
  },
  {
    id: "eo-ko",
    language: "ko",
    category: "phoneme",
    group: "vowels",
    symbol: "ㅓ",
    phoneticRepresentation: "/ʌ/",
    speechText: "어",
    tip: {
      english: "The one learners miss: the jaw drops as for ㅏ, but the tongue pulls back and the lips stay unrounded — close to the vowel in English \"but\", a little rounder.",
      "traditional-chinese": "學習者最常唸錯的一個：下巴像ㅏ一樣放下，但舌頭往後縮、嘴唇不收圓——接近英語 but 的母音，稍微圓一點。",
      japanese: "いちばん間違えやすい音。あごは「あ」のように下げ、舌を後ろに引き、くちびるは丸めません。日本語の「お」より口を大きく開けます。",
    },
    features: vowel({ height: 0.4, frontness: 0.3, jaw: 0.6 }),
    examples: [
      { text: "어머니", meaning: { english: "mother", "traditional-chinese": "母親", japanese: "お母さん" }, phonetic: "/ʌ.mʌ.ni/", highlight: "어" },
      { text: "서울", meaning: { english: "Seoul", "traditional-chinese": "首爾", japanese: "ソウル" }, phonetic: "/sʌ.ul/", highlight: "서" },
      { text: "거기", meaning: { english: "there", "traditional-chinese": "那裡", japanese: "そこ" }, phonetic: "/kʌ.ɡi/", highlight: "거" },
    ],
    commonMistake: {
      confusedWith: "ㅗ /o/",
      explanation: {
        english: "Rounding the lips turns ㅓ into ㅗ: 걸 (a girl) becomes 골 (a goal). Keep the lips loose and the mouth open.",
        "traditional-chinese": "嘴唇一收圓，ㅓ就變成ㅗ：걸（女孩）變成골（球門）。嘴唇放鬆、嘴巴張開。",
        japanese: "くちびるを丸めると ㅓ が ㅗ になり、걸（女の子）が 골（ゴール）になってしまいます。くちびるはゆるめ、口を開けたまま。",
      },
    },
    difficulty: 3,
  },
  {
    id: "o-ko",
    language: "ko",
    category: "phoneme",
    group: "vowels",
    symbol: "ㅗ",
    phoneticRepresentation: "/o/",
    speechText: "오",
    tip: {
      english: "Lips clearly rounded and pushed forward, jaw higher than for ㅓ.",
      "traditional-chinese": "嘴唇明顯收圓、往前推，下巴比ㅓ高。",
      japanese: "くちびるをはっきり丸めて前に出し、あごは ㅓ より閉じます。",
    },
    features: vowel({ height: 0.6, frontness: 0.2, rounding: "rounded" }),
    examples: [
      { text: "오늘", meaning: { english: "today", "traditional-chinese": "今天", japanese: "今日" }, phonetic: "/o.nɯl/", highlight: "오" },
      { text: "고기", meaning: { english: "meat", "traditional-chinese": "肉", japanese: "肉" }, phonetic: "/ko.ɡi/", highlight: "고" },
      { text: "도시", meaning: { english: "city", "traditional-chinese": "城市", japanese: "都市" }, phonetic: "/to.ɕi/", highlight: "도" },
    ],
    difficulty: 2,
  },
  {
    id: "u-ko",
    language: "ko",
    category: "phoneme",
    group: "vowels",
    symbol: "ㅜ",
    phoneticRepresentation: "/u/",
    speechText: "우",
    tip: {
      english: "High, back and fully rounded — lips pushed out, as for English \"oo\".",
      "traditional-chinese": "高、後、完全收圓——嘴唇往前嘟，像英語 oo。",
      japanese: "高く、後ろで、しっかり丸めます。日本語の「う」と違い、くちびるを前に突き出します。",
    },
    features: vowel({ height: 0.92, frontness: 0.15, rounding: "strongly_rounded" }),
    examples: [
      { text: "우유", meaning: { english: "milk", "traditional-chinese": "牛奶", japanese: "牛乳" }, phonetic: "/u.ju/", highlight: "우" },
      { text: "구름", meaning: { english: "cloud", "traditional-chinese": "雲", japanese: "雲" }, phonetic: "/ku.ɾɯm/", highlight: "구" },
      { text: "부산", meaning: { english: "Busan", "traditional-chinese": "釜山", japanese: "釜山" }, phonetic: "/pu.san/", highlight: "부" },
    ],
    difficulty: 1,
  },
  {
    id: "eu-ko",
    language: "ko",
    category: "phoneme",
    group: "vowels",
    symbol: "ㅡ",
    phoneticRepresentation: "/ɯ/",
    speechText: "으",
    tip: {
      english: "The tongue is high as for ㅜ, but the lips are spread flat, as in a small smile. It is also the quiet vowel added to consonants borrowed from other languages.",
      "traditional-chinese": "舌頭像ㅜ一樣高，但嘴唇往兩邊拉平，像淺淺地微笑。外來語子音後面補上的也是它。",
      japanese: "舌は ㅜ のように高く、くちびるは横に引いて平らに。日本語の「う」をさらに平らにした感じです。",
    },
    features: vowel({ height: 0.9, frontness: 0.35 }),
    examples: [
      { text: "그림", meaning: { english: "picture", "traditional-chinese": "圖畫", japanese: "絵" }, phonetic: "/kɯ.ɾim/", highlight: "그" },
      { text: "음악", meaning: { english: "music", "traditional-chinese": "音樂", japanese: "音楽" }, phonetic: "/ɯ.mak/", highlight: "음" },
      { text: "크다", meaning: { english: "big", "traditional-chinese": "大", japanese: "大きい" }, phonetic: "/kʰɯ.da/", highlight: "크" },
    ],
    difficulty: 3,
  },
  {
    id: "i-ko",
    language: "ko",
    category: "phoneme",
    group: "vowels",
    symbol: "ㅣ",
    phoneticRepresentation: "/i/",
    speechText: "이",
    tip: {
      english: "High and front, lips relaxed.",
      "traditional-chinese": "高、前，嘴唇放鬆。",
      japanese: "高く前で、くちびるはゆるめます。日本語の「い」とほぼ同じです。",
    },
    features: vowel({ height: 0.95, frontness: 0.95 }),
    examples: [
      { text: "이름", meaning: { english: "name", "traditional-chinese": "名字", japanese: "名前" }, phonetic: "/i.ɾɯm/", highlight: "이" },
      { text: "시간", meaning: { english: "time", "traditional-chinese": "時間", japanese: "時間" }, phonetic: "/ɕi.ɡan/", highlight: "시" },
      { text: "미소", meaning: { english: "smile", "traditional-chinese": "微笑", japanese: "ほほえみ" }, phonetic: "/mi.so/", highlight: "미" },
    ],
    difficulty: 1,
  },
  {
    id: "e-ko",
    language: "ko",
    category: "phoneme",
    group: "vowels",
    symbol: "ㅐ ㅔ",
    phoneticRepresentation: "/e/",
    speechText: "에",
    tip: {
      english: "Two letters, one sound for most speakers in Seoul today: a mid front vowel like the e in \"bed\". Spelling still keeps them apart, so learn which one a word uses.",
      "traditional-chinese": "兩個字母，在今天的首爾多半是同一個音：像英語 bed 的 e。拼寫仍然區分，所以要記住每個字用哪一個。",
      japanese: "文字は2つでも、今のソウルではほとんど同じ音で、日本語の「え」に近い音です。つづりは区別するので、単語ごとに覚えましょう。",
    },
    features: vowel({ height: 0.55, frontness: 0.85 }),
    examples: [
      { text: "개", meaning: { english: "dog", "traditional-chinese": "狗", japanese: "犬" }, phonetic: "/ke/", highlight: "개" },
      { text: "게", meaning: { english: "crab", "traditional-chinese": "螃蟹", japanese: "カニ" }, phonetic: "/ke/", highlight: "게" },
      { text: "새", meaning: { english: "bird", "traditional-chinese": "鳥", japanese: "鳥" }, phonetic: "/se/", highlight: "새" },
    ],
    difficulty: 2,
  },
];

const threeWay: PronunciationUnit[] = [
  {
    id: "plain-stop",
    language: "ko",
    category: "phoneme",
    group: "three-way",
    symbol: "ㄱ ㄷ ㅂ ㅈ",
    displayLabel: { english: "Plain", "traditional-chinese": "平音", japanese: "平音" },
    phoneticRepresentation: "/k t p tɕ/",
    speechText: "불",
    tip: {
      english: "Relaxed, with a light breath after release. At the start of a word it sounds almost like k, t, p; between vowels it softens to g, d, b (바다 /pa.da/).",
      "traditional-chinese": "放鬆，放開後帶一點點氣。在字首聽起來接近 k、t、p；夾在母音之間會軟化成 g、d、b（바다 /pa.da/）。",
      japanese: "力を抜いて、軽く息をそえます。語頭では k・t・p に近く聞こえ、母音のあいだでは g・d・b のようにやわらかくなります（바다 /pa.da/）。",
    },
    features: consonant({ manner: "stop", place: "bilabial", voiced: false }),
    examples: [
      { text: "불", meaning: { english: "fire", "traditional-chinese": "火", japanese: "火" }, phonetic: "/pul/", highlight: "불" },
      { text: "달", meaning: { english: "moon", "traditional-chinese": "月亮", japanese: "月" }, phonetic: "/tal/", highlight: "달" },
      { text: "자다", meaning: { english: "to sleep", "traditional-chinese": "睡覺", japanese: "寝る" }, phonetic: "/tɕa.da/", highlight: "자" },
    ],
    difficulty: 3,
  },
  {
    id: "aspirated-stop",
    language: "ko",
    category: "phoneme",
    group: "three-way",
    symbol: "ㅋ ㅌ ㅍ ㅊ",
    displayLabel: { english: "Aspirated", "traditional-chinese": "激音", japanese: "激音" },
    phoneticRepresentation: "/kʰ tʰ pʰ tɕʰ/",
    speechText: "풀",
    tip: {
      english: "A strong puff of air after release — hold a hand in front of your mouth and feel it. The following vowel often starts a little higher in pitch.",
      "traditional-chinese": "放開後送出一大口氣——把手放在嘴前就感覺得到。後面的母音音高通常也會起得稍高。",
      japanese: "はじけたあとに強く息を出します。口の前に手を当てると感じられます。続く母音は少し高い音で始まることが多いです。",
    },
    features: consonant({ manner: "stop", place: "bilabial", voiced: false, aspirated: true }),
    examples: [
      { text: "풀", meaning: { english: "grass", "traditional-chinese": "草", japanese: "草" }, phonetic: "/pʰul/", highlight: "풀" },
      { text: "탈", meaning: { english: "mask", "traditional-chinese": "面具", japanese: "仮面" }, phonetic: "/tʰal/", highlight: "탈" },
      { text: "차다", meaning: { english: "to kick", "traditional-chinese": "踢", japanese: "蹴る" }, phonetic: "/tɕʰa.da/", highlight: "차" },
    ],
    difficulty: 3,
  },
  {
    id: "tense-stop",
    language: "ko",
    category: "phoneme",
    group: "three-way",
    symbol: "ㄲ ㄸ ㅃ ㅉ",
    displayLabel: { english: "Tense", "traditional-chinese": "緊音", japanese: "濃音" },
    phoneticRepresentation: "/k͈ t͈ p͈ t͈ɕ͈/",
    speechText: "뿔",
    tip: {
      english: "Tight throat, no puff of air at all: build pressure, then release it sharply. It sounds like the k in English \"skin\", only harder.",
      "traditional-chinese": "喉嚨繃緊、完全不送氣：先憋住壓力再猛地放開。聽起來像英語 skin 的 k，但更硬。",
      japanese: "のどを緊張させ、息はまったく出しません。圧をためて、鋭く放します。日本語の「っか」「った」の後半に近い音です。",
    },
    features: consonant({ manner: "stop", place: "bilabial", voiced: false }),
    examples: [
      { text: "뿔", meaning: { english: "horn", "traditional-chinese": "角", japanese: "角" }, phonetic: "/p͈ul/", highlight: "뿔" },
      { text: "딸", meaning: { english: "daughter", "traditional-chinese": "女兒", japanese: "娘" }, phonetic: "/t͈al/", highlight: "딸" },
      { text: "짜다", meaning: { english: "salty", "traditional-chinese": "鹹", japanese: "しょっぱい" }, phonetic: "/t͈ɕa.da/", highlight: "짜" },
    ],
    commonMistake: {
      confusedWith: "plain",
      explanation: {
        english: "Without the tension, 뿔 falls back to 불. It is not louder; it is tighter and has no breath.",
        "traditional-chinese": "少了緊張，뿔就退回成불。不是比較大聲，而是比較緊、而且沒有氣。",
        japanese: "緊張がないと 뿔 が 불 に戻ってしまいます。大きな声ではなく、より固く、息のない音です。",
      },
    },
    difficulty: 4,
  },
  {
    id: "s-plain",
    language: "ko",
    category: "phoneme",
    group: "three-way",
    symbol: "ㅅ",
    phoneticRepresentation: "/s/",
    speechText: "사다",
    tip: {
      english: "A soft, breathy s. Before ㅣ it becomes \"shi\" (시).",
      "traditional-chinese": "柔和、帶氣的 s。在ㅣ前面會變成「西」的音（시）。",
      japanese: "やわらかく、息まじりの s。ㅣ の前では「シ」になります（시）。",
    },
    features: consonant({ manner: "fricative", place: "alveolar", voiced: false, aspirated: true }),
    examples: [
      { text: "사다", meaning: { english: "to buy", "traditional-chinese": "買", japanese: "買う" }, phonetic: "/sa.da/", highlight: "사" },
      { text: "살", meaning: { english: "flesh", "traditional-chinese": "肉（身上的）", japanese: "肉（体の）" }, phonetic: "/sal/", highlight: "살" },
      { text: "시장", meaning: { english: "market", "traditional-chinese": "市場", japanese: "市場" }, phonetic: "/ɕi.dʑaŋ/", highlight: "시" },
    ],
    difficulty: 2,
  },
  {
    id: "s-tense",
    language: "ko",
    category: "phoneme",
    group: "three-way",
    symbol: "ㅆ",
    phoneticRepresentation: "/s͈/",
    speechText: "싸다",
    tip: {
      english: "A tight, hissing s with no breath before the vowel.",
      "traditional-chinese": "緊而尖的 s，進入母音前不帶氣。",
      japanese: "固く鋭い s。母音の前に息をはさみません。",
    },
    features: consonant({ manner: "fricative", place: "alveolar", voiced: false }),
    examples: [
      { text: "싸다", meaning: { english: "cheap", "traditional-chinese": "便宜", japanese: "安い" }, phonetic: "/s͈a.da/", highlight: "싸" },
      { text: "쌀", meaning: { english: "rice (uncooked)", "traditional-chinese": "米", japanese: "米" }, phonetic: "/s͈al/", highlight: "쌀" },
      { text: "씨앗", meaning: { english: "seed", "traditional-chinese": "種子", japanese: "種" }, phonetic: "/ɕ͈i.at/", highlight: "씨" },
    ],
    difficulty: 3,
  },
  {
    id: "rieul",
    language: "ko",
    category: "phoneme",
    group: "three-way",
    symbol: "ㄹ",
    phoneticRepresentation: "/ɾ/ · /l/",
    speechText: "나라",
    tip: {
      english: "Between vowels, one quick tap (나라 /na.ɾa/); at the end of a syllable or doubled, a clear l with the tongue held up (서울 /sʌ.ul/, 빨리 /p͈al.li/).",
      "traditional-chinese": "夾在母音之間是快速彈一下（나라 /na.ɾa/）；在音節結尾或重複時，是舌頭抵住不放的清楚 l（서울、빨리）。",
      japanese: "母音のあいだでは日本語の「ら」のように一度はじき（나라 /na.ɾa/）、音節の終わりや ㄹㄹ では舌を上につけたまま l にします（서울、빨리）。",
    },
    features: consonant({ manner: "tap", place: "alveolar", voiced: true }),
    examples: [
      { text: "나라", meaning: { english: "country", "traditional-chinese": "國家", japanese: "国" }, phonetic: "/na.ɾa/", highlight: "라" },
      { text: "서울", meaning: { english: "Seoul", "traditional-chinese": "首爾", japanese: "ソウル" }, phonetic: "/sʌ.ul/", highlight: "울" },
      { text: "빨리", meaning: { english: "quickly", "traditional-chinese": "快點", japanese: "早く" }, phonetic: "/p͈al.li/", highlight: "빨리" },
    ],
    difficulty: 2,
  },
];

const finals: PronunciationUnit[] = [
  {
    id: "final-stops",
    language: "ko",
    category: "syllable",
    group: "finals",
    symbol: "ㄱ ㄷ ㅂ",
    displayLabel: { english: "Unreleased stops", "traditional-chinese": "不爆開的塞音", japanese: "はじけない破裂音" },
    phoneticRepresentation: "/k̚ t̚ p̚/",
    speechText: "밥",
    tip: {
      english: "At the end of a syllable the mouth closes and stays closed — no puff, no extra vowel. 밥 is one beat, not \"bap-uh\". Many letters fall into these three sounds (ㅅ ㅈ ㅊ ㅌ ㅎ all end as ㄷ).",
      "traditional-chinese": "在音節結尾，嘴巴閉上就停在那裡——不送氣、不補母音。밥是一拍，不是「巴普」。很多字母都歸到這三個音（ㅅ ㅈ ㅊ ㅌ ㅎ結尾都唸ㄷ）。",
      japanese: "音節の終わりでは口を閉じたまま止めます。息も母音も足しません。밥 は1拍で、「パプ」ではありません。ㅅ ㅈ ㅊ ㅌ ㅎ などもここでは ㄷ の音になります。",
    },
    features: consonant({ manner: "stop", place: "bilabial", voiced: false }),
    examples: [
      { text: "밥", meaning: { english: "cooked rice", "traditional-chinese": "飯", japanese: "ご飯" }, phonetic: "/pap̚/", highlight: "밥" },
      { text: "옷", meaning: { english: "clothes", "traditional-chinese": "衣服", japanese: "服" }, phonetic: "/ot̚/", highlight: "옷" },
      { text: "책", meaning: { english: "book", "traditional-chinese": "書", japanese: "本" }, phonetic: "/tɕʰɛk̚/", highlight: "책" },
    ],
    difficulty: 3,
  },
  {
    id: "final-nasals",
    language: "ko",
    category: "syllable",
    group: "finals",
    symbol: "ㄴ ㅁ ㅇ",
    displayLabel: { english: "Final nasals", "traditional-chinese": "鼻音收尾", japanese: "鼻音のパッチム" },
    phoneticRepresentation: "/n m ŋ/",
    speechText: "강",
    tip: {
      english: "Three different endings, each held: n with the tongue up, m with the lips closed, ng with the back of the tongue up. 반, 밤 and 방 are three words.",
      "traditional-chinese": "三種不同的收尾，都要維持住：n 舌尖上抬、m 雙唇閉合、ng 舌根上抬。반、밤、방是三個不同的字。",
      japanese: "3つの違う終わり方で、どれも保ちます。n は舌先を上に、m はくちびるを閉じ、ng は舌の奥を上げます。반・밤・방 は別の単語です。",
    },
    features: consonant({ manner: "nasal", place: "velar", voiced: true }),
    examples: [
      { text: "반", meaning: { english: "half", "traditional-chinese": "一半", japanese: "半分" }, phonetic: "/pan/", highlight: "반" },
      { text: "밤", meaning: { english: "night", "traditional-chinese": "夜晚", japanese: "夜" }, phonetic: "/pam/", highlight: "밤" },
      { text: "방", meaning: { english: "room", "traditional-chinese": "房間", japanese: "部屋" }, phonetic: "/paŋ/", highlight: "방" },
    ],
    difficulty: 2,
  },
];

const minimalPairs: MinimalPairSet[] = [
  {
    id: "three-way-pairs",
    language: "ko",
    targets: ["plain-stop", "aspirated-stop", "tense-stop"],
    label: { english: "불 / 풀 / 뿔", "traditional-chinese": "불 / 풀 / 뿔", japanese: "불 / 풀 / 뿔" },
    hint: {
      english: "Listen to the air after the first sound: a little, a lot, or none at all.",
      "traditional-chinese": "聽第一個音後面的氣：一點點、很多，或完全沒有。",
      japanese: "最初の音のあとの息を聞きましょう。少し、たくさん、まったくなし。",
    },
    examples: [
      [
        { unitId: "plain-stop", text: "불", phonetic: "/pul/", meaning: { english: "fire", "traditional-chinese": "火", japanese: "火" } },
        { unitId: "aspirated-stop", text: "풀", phonetic: "/pʰul/", meaning: { english: "grass", "traditional-chinese": "草", japanese: "草" } },
        { unitId: "tense-stop", text: "뿔", phonetic: "/p͈ul/", meaning: { english: "horn", "traditional-chinese": "角", japanese: "角" } },
      ],
      [
        { unitId: "plain-stop", text: "달", phonetic: "/tal/", meaning: { english: "moon", "traditional-chinese": "月亮", japanese: "月" } },
        { unitId: "aspirated-stop", text: "탈", phonetic: "/tʰal/", meaning: { english: "mask", "traditional-chinese": "面具", japanese: "仮面" } },
        { unitId: "tense-stop", text: "딸", phonetic: "/t͈al/", meaning: { english: "daughter", "traditional-chinese": "女兒", japanese: "娘" } },
      ],
      [
        { unitId: "plain-stop", text: "자다", phonetic: "/tɕa.da/", meaning: { english: "to sleep", "traditional-chinese": "睡覺", japanese: "寝る" } },
        { unitId: "aspirated-stop", text: "차다", phonetic: "/tɕʰa.da/", meaning: { english: "to kick", "traditional-chinese": "踢", japanese: "蹴る" } },
        { unitId: "tense-stop", text: "짜다", phonetic: "/t͈ɕa.da/", meaning: { english: "salty", "traditional-chinese": "鹹", japanese: "しょっぱい" } },
      ],
    ],
  },
  {
    id: "s-pairs",
    language: "ko",
    targets: ["s-plain", "s-tense"],
    label: { english: "사다 / 싸다", "traditional-chinese": "사다 / 싸다", japanese: "사다 / 싸다" },
    examples: [
      [
        { unitId: "s-plain", text: "사다", phonetic: "/sa.da/", meaning: { english: "to buy", "traditional-chinese": "買", japanese: "買う" } },
        { unitId: "s-tense", text: "싸다", phonetic: "/s͈a.da/", meaning: { english: "cheap", "traditional-chinese": "便宜", japanese: "安い" } },
      ],
      [
        { unitId: "s-plain", text: "살", phonetic: "/sal/", meaning: { english: "flesh", "traditional-chinese": "肉", japanese: "肉" } },
        { unitId: "s-tense", text: "쌀", phonetic: "/s͈al/", meaning: { english: "rice", "traditional-chinese": "米", japanese: "米" } },
      ],
    ],
  },
  {
    id: "eo-o",
    language: "ko",
    targets: ["eo-ko", "o-ko"],
    label: { english: "ㅓ / ㅗ", "traditional-chinese": "ㅓ / ㅗ", japanese: "ㅓ / ㅗ" },
    hint: {
      english: "ㅗ rounds the lips; ㅓ leaves them open.",
      "traditional-chinese": "ㅗ嘴唇收圓；ㅓ嘴唇張開。",
      japanese: "ㅗ はくちびるを丸め、ㅓ は開けたまま。",
    },
    examples: [
      [
        { unitId: "eo-ko", text: "벌", phonetic: "/pʌl/", meaning: { english: "bee", "traditional-chinese": "蜜蜂", japanese: "ハチ" } },
        { unitId: "o-ko", text: "볼", phonetic: "/pol/", meaning: { english: "cheek", "traditional-chinese": "臉頰", japanese: "ほお" } },
      ],
      [
        { unitId: "eo-ko", text: "거리", phonetic: "/kʌ.ɾi/", meaning: { english: "street", "traditional-chinese": "街道", japanese: "通り" } },
        { unitId: "o-ko", text: "고리", phonetic: "/ko.ɾi/", meaning: { english: "ring, loop", "traditional-chinese": "環", japanese: "輪" } },
      ],
    ],
  },
  {
    id: "eu-u",
    language: "ko",
    targets: ["eu-ko", "u-ko"],
    label: { english: "ㅡ / ㅜ", "traditional-chinese": "ㅡ / ㅜ", japanese: "ㅡ / ㅜ" },
    examples: [
      [
        { unitId: "eu-ko", text: "글", phonetic: "/kɯl/", meaning: { english: "writing", "traditional-chinese": "文章", japanese: "文章" } },
        { unitId: "u-ko", text: "굴", phonetic: "/kul/", meaning: { english: "oyster", "traditional-chinese": "牡蠣", japanese: "カキ" } },
      ],
      [
        { unitId: "eu-ko", text: "그림", phonetic: "/kɯ.ɾim/", meaning: { english: "picture", "traditional-chinese": "圖畫", japanese: "絵" } },
        { unitId: "u-ko", text: "구름", phonetic: "/ku.ɾɯm/", meaning: { english: "cloud", "traditional-chinese": "雲", japanese: "雲" } },
      ],
    ],
  },
];

const lessons: PronunciationLesson[] = [
  {
    id: "liaison-ko",
    language: "ko",
    kind: "connected-speech",
    difficulty: 3,
    title: { english: "Carrying a final over", "traditional-chinese": "連音", japanese: "連音化" },
    rule: {
      english: "When a syllable ends in a consonant and the next begins with the silent ㅇ, the consonant moves across: 한국어 is said [한구거], 음악 [으막].",
      "traditional-chinese": "前一個音節以子音結尾、後一個以不發音的ㅇ開頭時，子音會移過去唸：한국어唸成[한구거]，음악唸成[으막]。",
      japanese: "前の音節が子音で終わり、次が音のない ㅇ で始まると、子音が次へ移ります。한국어 は [한구거]、음악 は [으막] と発音します。",
    },
    phrases: [
      {
        id: "hangugeo",
        text: "한국어",
        meaning: { english: "Korean (language)", "traditional-chinese": "韓語", japanese: "韓国語" },
        beats: [
          { text: "한", stress: 0.5 },
          { text: "구", stress: 0.5 },
          { text: "거", stress: 0.5 },
        ],
      },
      {
        id: "eumak",
        text: "음악",
        meaning: { english: "music", "traditional-chinese": "音樂", japanese: "音楽" },
        beats: [
          { text: "으", stress: 0.5, linkToNext: "linking" },
          { text: "막", stress: 0.5 },
        ],
      },
      {
        id: "meogeoyo",
        text: "먹어요",
        meaning: { english: "(I) eat", "traditional-chinese": "吃", japanese: "食べます" },
        beats: [
          { text: "머", stress: 0.5, linkToNext: "linking" },
          { text: "거", stress: 0.5 },
          { text: "요", stress: 0.5 },
        ],
      },
    ],
  },
  {
    id: "nasalization-ko",
    language: "ko",
    kind: "connected-speech",
    difficulty: 4,
    title: { english: "Stops turning nasal", "traditional-chinese": "鼻音化", japanese: "鼻音化" },
    rule: {
      english: "A final ㄱ, ㄷ or ㅂ before ㄴ or ㅁ becomes ㅇ, ㄴ or ㅁ: 감사합니다 is said [감사함니다], 한국말 [한궁말]. Spell it one way, say it the other.",
      "traditional-chinese": "收尾的ㄱ、ㄷ、ㅂ遇到ㄴ或ㅁ時，會變成ㅇ、ㄴ、ㅁ：감사합니다唸成[감사함니다]，한국말唸成[한궁말]。寫法不變，唸法要變。",
      japanese: "パッチムの ㄱ・ㄷ・ㅂ は ㄴ や ㅁ の前で ㅇ・ㄴ・ㅁ に変わります。감사합니다 は [감사함니다]、한국말 は [한궁말]。書き方はそのまま、発音だけ変わります。",
    },
    phrases: [
      {
        id: "gamsahamnida",
        text: "감사합니다",
        meaning: { english: "thank you", "traditional-chinese": "謝謝", japanese: "ありがとうございます" },
        beats: [
          { text: "감", stress: 0.5 },
          { text: "사", stress: 0.5 },
          { text: "함", stress: 0.5 },
          { text: "니", stress: 0.5 },
          { text: "다", stress: 0.3 },
        ],
      },
      {
        id: "hangungmal",
        text: "한국말",
        meaning: { english: "Korean (speech)", "traditional-chinese": "韓國話", japanese: "韓国語（話し言葉）" },
        beats: [
          { text: "한", stress: 0.5 },
          { text: "궁", stress: 0.5 },
          { text: "말", stress: 0.5 },
        ],
      },
    ],
  },
  {
    id: "question-ko",
    language: "ko",
    kind: "intonation",
    difficulty: 2,
    title: { english: "Statement or question", "traditional-chinese": "陳述還是疑問", japanese: "平叙文か疑問文か" },
    rule: {
      english: "The same words make a statement or a question: the last syllable falls for one and rises for the other. 가요. (I'm going.) / 가요? (Are you going?)",
      "traditional-chinese": "同樣的字可以是陳述也可以是疑問：最後一個音節，陳述往下、疑問往上。가요.（我要走了。）/ 가요?（你要走嗎？）",
      japanese: "同じ言葉でも、最後の音節が下がれば平叙文、上がれば疑問文です。가요.（行きます。）/ 가요?（行きますか？）",
    },
    phrases: [
      {
        id: "gayo-statement",
        text: "가요.",
        meaning: { english: "I'm going.", "traditional-chinese": "我要走了。", japanese: "行きます。" },
        beats: [
          { text: "가", stress: 1 },
          { text: "요", stress: 0 },
        ],
      },
      {
        id: "gayo-question",
        text: "가요?",
        meaning: { english: "Are you going?", "traditional-chinese": "你要走嗎？", japanese: "行きますか？" },
        beats: [
          { text: "가", stress: 0.3 },
          { text: "요", stress: 1 },
        ],
      },
    ],
  },
];

export const koreanPronunciationPack: PronunciationLanguagePack = {
  language: "ko",
  displayName: "한국어",
  writingSystem: {
    type: "hangul",
    label: { english: "Hangul", "traditional-chinese": "韓文字母", japanese: "ハングル" },
  },
  categories,
  units: [...vowels, ...threeWay, ...finals],
  minimalPairs,
  lessons,
  scoreDimensions: ["consonant", "vowel", "rhythm", "melody"],
  yumiCalibration: {
    instrument: "aspiration",
    label: {
      english: "plain, aspirated and tense consonants",
      "traditional-chinese": "平音、激音和緊音",
      japanese: "平音・激音・濃音",
      spanish: "las consonantes simples, aspiradas y tensas",
      french: "les consonnes simples, aspirées et tendues",
      italian: "le consonanti semplici, aspirate e tese",
    },
  },
  defaultDialect: "ko-KR",
  dialects: ["ko-KR"],
};
