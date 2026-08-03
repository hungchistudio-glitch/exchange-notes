import type { PhoneticFeatures } from "./yumiRig";
import type { LocalizedText } from "./localizedText";

export type ZhuyinCategory = "initial" | "medial" | "final";

export type GuidancePoint = { label: LocalizedText; text: LocalizedText };

export interface ZhuyinExample {
  word: string;
  zhuyin: string;
}

export interface ZhuyinCommonMistake {
  /** 常被誤發成的音，例如 "ㄏㄨ" */
  confusedWith: string;
  explanation: LocalizedText;
  pair: {
    correct: ZhuyinExample;
    confused: ZhuyinExample;
  };
}

export interface ZhuyinSound {
  id: string;
  symbol: string;
  title: string;
  category: ZhuyinCategory;
  /**
   * 這個符號單獨發音時的「呼讀音」（國小注音教學的標準唸法，
   * 例如 ㄅ 唸「玻」、ㄈ 唸「佛」）。用真實漢字讓語音合成能正確發音，
   * 且刻意跟 examples 的詞彙不同，避免符號音跟例字音混淆。
   */
  soundText: string;
  /** 完整版發音說明——展開「More guidance」時顯示。依 appLanguage 顯示英文或中文 */
  tip: LocalizedText;
  /** 卡片預設顯示的 2-3 個短提示，從 tip 拆出來的摘要 */
  guidance: GuidancePoint[];
  /** 驅動 Yumi 嘴型/舌位/氣流/聲帶 rig 的語音學特徵——見 lib/pronunciation/yumiRig.ts */
  phonetics: PhoneticFeatures;
  examples: ZhuyinExample[];
  /** 只有少數容易混淆的符號會有這個欄位，目前用在 ㄈ */
  commonMistake?: ZhuyinCommonMistake;
  /** 未來若有真人錄音，可填入音檔網址；目前留空會 fallback 到語音合成 */
  audio?: string;
}

export const zhuyinSounds: ZhuyinSound[] = [
  // ── 聲母 Initials（21 個）──────────────────────────────────
  {
    id: "b",
    symbol: "ㄅ",
    title: "ㄅ",
    category: "initial",
    soundText: "玻",
    audio: "/audio/zhuyin/b.mp3",
    tip: { english: "Press your lips together, then release with a light, unaspirated puff of air. Vocal cords don't vibrate.", "traditional-chinese": "雙唇緊閉，放開時輕輕吐氣，不送氣，聲帶不振動。" },
    guidance: [{ label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Press together", "traditional-chinese": "雙唇緊閉" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Release with a light puff, unaspirated", "traditional-chinese": "放開時輕輕吐氣，不送氣" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
    phonetics: { manner: "stop", place: "bilabial", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.06, tongueRegion: "neutral", tongueHeight: 0.5, tongueFrontness: 0.5, contactZone: "lower_lip" },
    examples: [
      { word: "爸爸", zhuyin: "ㄅㄚˋ ㄅㄚ˙" },
      { word: "包包", zhuyin: "ㄅㄠ ㄅㄠ" },
    ],
  },
  {
    id: "p",
    symbol: "ㄆ",
    title: "ㄆ",
    category: "initial",
    soundText: "坡",
    audio: "/audio/zhuyin/p.mp3",
    tip: { english: "Press your lips together, then release with a strong puff of air. Vocal cords don't vibrate.", "traditional-chinese": "雙唇緊閉，放開時用力送氣，聲帶不振動。" },
    guidance: [{ label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Press together", "traditional-chinese": "雙唇緊閉" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Release with a strong puff of air", "traditional-chinese": "放開時用力送氣" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
    phonetics: { manner: "stop", place: "bilabial", voiced: false, aspirated: true, nasal: false, lipRounding: "unrounded", jawOpening: 0.06, tongueRegion: "neutral", tongueHeight: 0.5, tongueFrontness: 0.5, contactZone: "lower_lip" },
    examples: [
      { word: "婆婆", zhuyin: "ㄆㄛˊ ㄆㄛ˙" },
      { word: "皮球", zhuyin: "ㄆㄧˊ ㄑㄧㄡˊ" },
    ],
  },
  {
    id: "m",
    symbol: "ㄇ",
    title: "ㄇ",
    category: "initial",
    soundText: "摸",
    audio: "/audio/zhuyin/m.mp3",
    tip: { english: "Close your lips, and let the air flow out through your nose. Vocal cords vibrate.", "traditional-chinese": "雙唇閉合，氣流改從鼻腔流出，聲帶振動。" },
    guidance: [{ label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Close together", "traditional-chinese": "雙唇閉合" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Air flows out through your nose instead", "traditional-chinese": "氣流改從鼻腔流出" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords vibrate", "traditional-chinese": "聲帶振動" } }],
    phonetics: { manner: "nasal", place: "bilabial", voiced: true, aspirated: false, nasal: true, lipRounding: "unrounded", jawOpening: 0.06, tongueRegion: "neutral", tongueHeight: 0.5, tongueFrontness: 0.5, contactZone: "lower_lip" },
    examples: [
      { word: "媽媽", zhuyin: "ㄇㄚ ㄇㄚ˙" },
      { word: "帽子", zhuyin: "ㄇㄠˋ ㄗ˙" },
    ],
  },
  {
    id: "f",
    symbol: "ㄈ",
    title: "ㄈ",
    category: "initial",
    soundText: "佛",
    audio: "/audio/zhuyin/f.mp3",
    tip: { english: "Rest your upper teeth lightly on your lower lip and push air out through the gap. Vocal cords don't vibrate — the key is that your teeth actually touch your lip.", "traditional-chinese": "上排牙齒『輕輕咬住』下唇，讓氣流從牙齒與嘴唇的縫隙擠出摩擦，聲帶不振動。重點是牙齒一定要碰到下唇。" },
    guidance: [{ label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Upper teeth rest lightly on your lower lip", "traditional-chinese": "上排牙齒『輕輕咬住』下唇" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Push air out through the gap between teeth and lip", "traditional-chinese": "讓氣流從牙齒與嘴唇的縫隙擠出摩擦" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate — your teeth must actually touch your lip", "traditional-chinese": "聲帶不振動。重點是牙齒一定要碰到下唇" } }],
    phonetics: { manner: "fricative", place: "labiodental", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "neutral", tongueHeight: 0.5, tongueFrontness: 0.6, contactZone: "lower_lip" },
    examples: [
      { word: "飛機", zhuyin: "ㄈㄟ ㄐㄧ" },
      { word: "頭髮", zhuyin: "ㄊㄡˊ ㄈㄚˇ" },
    ],
    commonMistake: {
      confusedWith: "ㄏㄨ",
      explanation: { english: "ㄈ is a labiodental sound — the friction happens at the front of your lip, where your upper teeth touch your lower lip. Many learners (especially with a Taiwan-accent influence) turn it into \"h + u\" (ㄏㄨ), rounding the lips without touching the lower lip at all, so the friction moves back to the throat. Try resting a finger lightly on your lower lip: for ㄈ you should feel your upper teeth touch it; for ㄏㄨ you won't feel any contact.", "traditional-chinese": "ㄈ 是「唇齒音」，摩擦點在嘴唇前緣（上齒咬下唇）；很多人（尤其受台灣口音影響）會把它唸成「ㄏ + ㄨ」，也就是嘴唇噘圓、完全不咬下唇，摩擦點跑到喉嚨後方。練習時可以用手指輕輕放在下唇上，發 ㄈ 時要感覺到上排牙齒碰到手指；發 ㄏㄨ 則完全不會碰到。" },
      pair: {
        correct: { word: "飛機", zhuyin: "ㄈㄟ ㄐㄧ" },
        confused: { word: "灰機", zhuyin: "ㄏㄨㄟ ㄐㄧ" },
      },
    },
  },
  {
    id: "d",
    symbol: "ㄉ",
    title: "ㄉ",
    category: "initial",
    soundText: "得",
    audio: "/audio/zhuyin/d.mp3",
    tip: { english: "Touch your tongue tip to the ridge behind your upper teeth, then release with a light, unaspirated puff of air.", "traditional-chinese": "舌尖抵住上牙齦，放開時輕輕吐氣，不送氣。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip touches the ridge behind your upper teeth", "traditional-chinese": "舌尖抵住上牙齦" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Release with a light, unaspirated puff", "traditional-chinese": "放開時輕輕吐氣，不送氣" } }],
    phonetics: { manner: "stop", place: "alveolar", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
    examples: [
      { word: "弟弟", zhuyin: "ㄉㄧˋ ㄉㄧ˙" },
      { word: "蛋糕", zhuyin: "ㄉㄢˋ ㄍㄠ" },
    ],
  },
  {
    id: "t",
    symbol: "ㄊ",
    title: "ㄊ",
    category: "initial",
    soundText: "特",
    audio: "/audio/zhuyin/t.mp3",
    tip: { english: "Touch your tongue tip to the ridge behind your upper teeth, then release with a strong puff of air.", "traditional-chinese": "舌尖抵住上牙齦，放開時用力送氣。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip touches the ridge behind your upper teeth", "traditional-chinese": "舌尖抵住上牙齦" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Release with a strong puff of air", "traditional-chinese": "放開時用力送氣" } }],
    phonetics: { manner: "stop", place: "alveolar", voiced: false, aspirated: true, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
    examples: [
      { word: "兔子", zhuyin: "ㄊㄨˋ ㄗ˙" },
      { word: "太陽", zhuyin: "ㄊㄞˋ ㄧㄤˊ" },
    ],
  },
  {
    id: "n",
    symbol: "ㄋ",
    title: "ㄋ",
    category: "initial",
    soundText: "呢",
    audio: "/audio/zhuyin/n.mp3",
    tip: { english: "Touch your tongue tip to the ridge behind your upper teeth, and let the air flow out through your nose.", "traditional-chinese": "舌尖抵住上牙齦，氣流改從鼻腔流出。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip touches the ridge behind your upper teeth", "traditional-chinese": "舌尖抵住上牙齦" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Air flows out through your nose instead", "traditional-chinese": "氣流改從鼻腔流出" } }],
    phonetics: { manner: "nasal", place: "alveolar", voiced: true, aspirated: false, nasal: true, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
    examples: [
      { word: "你好", zhuyin: "ㄋㄧˇ ㄏㄠˇ" },
      { word: "牛奶", zhuyin: "ㄋㄧㄡˊ ㄋㄞˇ" },
    ],
  },
  {
    id: "l",
    symbol: "ㄌ",
    title: "ㄌ",
    category: "initial",
    soundText: "勒",
    audio: "/audio/zhuyin/l.mp3",
    tip: { english: "Touch your tongue tip to the ridge behind your upper teeth, and let the air flow out around the sides of your tongue.", "traditional-chinese": "舌尖抵住上牙齦，氣流從舌頭兩側流出。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip touches the ridge behind your upper teeth", "traditional-chinese": "舌尖抵住上牙齦" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Air flows out around the sides of your tongue", "traditional-chinese": "氣流從舌頭兩側流出" } }],
    phonetics: { manner: "lateral", place: "alveolar", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
    examples: [
      { word: "老師", zhuyin: "ㄌㄠˇ ㄕ" },
      { word: "綠色", zhuyin: "ㄌㄩˋ ㄙㄜˋ" },
    ],
  },
  {
    id: "g",
    symbol: "ㄍ",
    title: "ㄍ",
    category: "initial",
    soundText: "哥",
    audio: "/audio/zhuyin/g.mp3",
    tip: { english: "Press the back of your tongue against your soft palate, then release with a light, unaspirated puff of air.", "traditional-chinese": "舌根抵住軟顎，放開時輕輕吐氣，不送氣。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Back of tongue touches the soft palate", "traditional-chinese": "舌根抵住軟顎" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Release with a light, unaspirated puff", "traditional-chinese": "放開時輕輕吐氣，不送氣" } }],
    phonetics: { manner: "stop", place: "velar", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "back", tongueHeight: 0.75, tongueFrontness: 0.15, contactZone: "velum" },
    examples: [
      { word: "哥哥", zhuyin: "ㄍㄜ ㄍㄜ˙" },
      { word: "蘋果", zhuyin: "ㄆㄧㄥˊ ㄍㄨㄛˇ" },
    ],
  },
  {
    id: "k",
    symbol: "ㄎ",
    title: "ㄎ",
    category: "initial",
    soundText: "科",
    audio: "/audio/zhuyin/k.mp3",
    tip: { english: "Press the back of your tongue against your soft palate, then release with a strong puff of air.", "traditional-chinese": "舌根抵住軟顎，放開時用力送氣。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Back of tongue touches the soft palate", "traditional-chinese": "舌根抵住軟顎" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Release with a strong puff of air", "traditional-chinese": "放開時用力送氣" } }],
    phonetics: { manner: "stop", place: "velar", voiced: false, aspirated: true, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "back", tongueHeight: 0.75, tongueFrontness: 0.15, contactZone: "velum" },
    examples: [
      { word: "可樂", zhuyin: "ㄎㄜˇ ㄌㄜˋ" },
      { word: "開心", zhuyin: "ㄎㄞ ㄒㄧㄣ" },
    ],
  },
  {
    id: "h",
    symbol: "ㄏ",
    title: "ㄏ",
    category: "initial",
    soundText: "喝",
    audio: "/audio/zhuyin/h.mp3",
    tip: { english: "Bring the back of your tongue close to your soft palate and let the air brush out with friction near your throat. Lips stay unrounded.", "traditional-chinese": "舌根接近軟顎，氣流從喉嚨附近摩擦而出，嘴唇不噘圓。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Back of tongue near the soft palate", "traditional-chinese": "舌根接近軟顎" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Friction near the throat", "traditional-chinese": "氣流從喉嚨附近摩擦而出" } }, { label: { english: "Lips", "traditional-chinese": "嘴唇" }, text: { english: "Not rounded", "traditional-chinese": "嘴唇不噘圓" } }],
    phonetics: { manner: "fricative", place: "velar", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "back", tongueHeight: 0.75, tongueFrontness: 0.15, contactZone: "velum" },
    examples: [
      { word: "好吃", zhuyin: "ㄏㄠˇ ㄔ" },
      { word: "河流", zhuyin: "ㄏㄜˊ ㄌㄧㄡˊ" },
    ],
  },
  {
    id: "j",
    symbol: "ㄐ",
    title: "ㄐ",
    category: "initial",
    soundText: "基",
    audio: "/audio/zhuyin/j.mp3",
    tip: { english: "Press the body of your tongue against the front of your hard palate, then release with a light, unaspirated puff.", "traditional-chinese": "舌面抵住硬顎前部，放開時輕輕吐氣，不送氣。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Body of tongue touches the front of the hard palate", "traditional-chinese": "舌面抵住硬顎前部" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Release with a light, unaspirated puff", "traditional-chinese": "放開時輕輕吐氣，不送氣" } }],
    phonetics: { manner: "affricate", place: "palatal", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.2, tongueRegion: "front", tongueHeight: 0.8, tongueFrontness: 0.85, contactZone: "hard_palate" },
    examples: [
      { word: "雞蛋", zhuyin: "ㄐㄧ ㄉㄢˋ" },
      { word: "家人", zhuyin: "ㄐㄧㄚ ㄖㄣˊ" },
    ],
  },
  {
    id: "q",
    symbol: "ㄑ",
    title: "ㄑ",
    category: "initial",
    soundText: "欺",
    audio: "/audio/zhuyin/q.mp3",
    tip: { english: "Press the body of your tongue against the front of your hard palate, then release with a strong puff of air.", "traditional-chinese": "舌面抵住硬顎前部，放開時用力送氣。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Body of tongue touches the front of the hard palate", "traditional-chinese": "舌面抵住硬顎前部" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Release with a strong puff of air", "traditional-chinese": "放開時用力送氣" } }],
    phonetics: { manner: "affricate", place: "palatal", voiced: false, aspirated: true, nasal: false, lipRounding: "unrounded", jawOpening: 0.2, tongueRegion: "front", tongueHeight: 0.8, tongueFrontness: 0.85, contactZone: "hard_palate" },
    examples: [
      { word: "汽車", zhuyin: "ㄑㄧˋ ㄔㄜ" },
      { word: "鉛筆", zhuyin: "ㄑㄧㄢ ㄅㄧˇ" },
    ],
  },
  {
    id: "x",
    symbol: "ㄒ",
    title: "ㄒ",
    category: "initial",
    soundText: "希",
    audio: "/audio/zhuyin/x.mp3",
    tip: { english: "Bring the body of your tongue close to the front of your hard palate and let the air brush out with friction.", "traditional-chinese": "舌面接近硬顎前部，氣流摩擦而出，不送氣。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Body of tongue close to the front of the hard palate", "traditional-chinese": "舌面接近硬顎前部" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Air brushes out with friction, unaspirated", "traditional-chinese": "氣流摩擦而出，不送氣" } }],
    phonetics: { manner: "fricative", place: "palatal", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.2, tongueRegion: "front", tongueHeight: 0.8, tongueFrontness: 0.85, contactZone: "hard_palate" },
    examples: [
      { word: "西瓜", zhuyin: "ㄒㄧ ㄍㄨㄚ" },
      { word: "謝謝", zhuyin: "ㄒㄧㄝˋ ㄒㄧㄝ˙" },
    ],
  },
  {
    id: "zh",
    symbol: "ㄓ",
    title: "ㄓ",
    category: "initial",
    soundText: "知",
    audio: "/audio/zhuyin/zh.mp3",
    tip: { english: "Curl your tongue tip up to touch your hard palate, then release with a light, unaspirated puff.", "traditional-chinese": "舌尖翹起抵住硬顎，放開時輕輕吐氣，不送氣。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip curls up and touches the hard palate", "traditional-chinese": "舌尖翹起抵住硬顎" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Release with a light, unaspirated puff", "traditional-chinese": "放開時輕輕吐氣，不送氣" } }],
    phonetics: { manner: "affricate", place: "retroflex", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.22, tongueRegion: "tip", tongueHeight: 0.6, tongueFrontness: 0.6, contactZone: "postalveolar_zone" },
    examples: [
      { word: "中文", zhuyin: "ㄓㄨㄥ ㄨㄣˊ" },
      { word: "桌子", zhuyin: "ㄓㄨㄛ ㄗ˙" },
    ],
  },
  {
    id: "ch",
    symbol: "ㄔ",
    title: "ㄔ",
    category: "initial",
    soundText: "蚩",
    audio: "/audio/zhuyin/ch.mp3",
    tip: { english: "Curl your tongue tip up to touch your hard palate, then release with a strong puff of air.", "traditional-chinese": "舌尖翹起抵住硬顎，放開時用力送氣。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip curls up and touches the hard palate", "traditional-chinese": "舌尖翹起抵住硬顎" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Release with a strong puff of air", "traditional-chinese": "放開時用力送氣" } }],
    phonetics: { manner: "affricate", place: "retroflex", voiced: false, aspirated: true, nasal: false, lipRounding: "unrounded", jawOpening: 0.22, tongueRegion: "tip", tongueHeight: 0.6, tongueFrontness: 0.6, contactZone: "postalveolar_zone" },
    examples: [
      { word: "吃飯", zhuyin: "ㄔ ㄈㄢˋ" },
      { word: "唱歌", zhuyin: "ㄔㄤˋ ㄍㄜ" },
    ],
  },
  {
    id: "sh",
    symbol: "ㄕ",
    title: "ㄕ",
    category: "initial",
    soundText: "詩",
    audio: "/audio/zhuyin/sh.mp3",
    tip: { english: "Curl your tongue tip up close to your hard palate without touching it, and let the air brush out with friction. Vocal cords don't vibrate.", "traditional-chinese": "舌尖翹起接近硬顎，氣流摩擦而出，聲帶不振動。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip curls up close to the hard palate", "traditional-chinese": "舌尖翹起接近硬顎" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Air brushes out with friction", "traditional-chinese": "氣流摩擦而出" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
    phonetics: { manner: "fricative", place: "retroflex", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.22, tongueRegion: "tip", tongueHeight: 0.6, tongueFrontness: 0.6, contactZone: "postalveolar_zone" },
    examples: [
      { word: "老師", zhuyin: "ㄌㄠˇ ㄕ" },
      { word: "水果", zhuyin: "ㄕㄨㄟˇ ㄍㄨㄛˇ" },
    ],
  },
  {
    id: "r",
    symbol: "ㄖ",
    title: "ㄖ",
    category: "initial",
    soundText: "日",
    audio: "/audio/zhuyin/r.mp3",
    tip: { english: "Curl your tongue tip up close to your hard palate without touching it. Vocal cords vibrate this time.", "traditional-chinese": "舌尖翹起接近硬顎，氣流摩擦而出，聲帶振動。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip curls up close to the hard palate", "traditional-chinese": "舌尖翹起接近硬顎" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Air brushes out with friction", "traditional-chinese": "氣流摩擦而出" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords vibrate", "traditional-chinese": "聲帶振動" } }],
    phonetics: { manner: "approximant", place: "retroflex", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.22, tongueRegion: "tip", tongueHeight: 0.6, tongueFrontness: 0.6, contactZone: "postalveolar_zone" },
    examples: [
      { word: "日曆", zhuyin: "ㄖˋ ㄌㄧˋ" },
      { word: "熱狗", zhuyin: "ㄖㄜˋ ㄍㄡˇ" },
    ],
  },
  {
    id: "z",
    symbol: "ㄗ",
    title: "ㄗ",
    category: "initial",
    soundText: "資",
    audio: "/audio/zhuyin/z.mp3",
    tip: { english: "Touch your tongue tip to the back of your upper teeth, then release with a light, unaspirated puff.", "traditional-chinese": "舌尖抵住上齒背，放開時輕輕吐氣，不送氣。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip touches the back of your upper teeth", "traditional-chinese": "舌尖抵住上齒背" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Release with a light, unaspirated puff", "traditional-chinese": "放開時輕輕吐氣，不送氣" } }],
    phonetics: { manner: "affricate", place: "alveolar", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
    examples: [
      { word: "兒子", zhuyin: "ㄦˊ ㄗ˙" },
      { word: "走路", zhuyin: "ㄗㄡˇ ㄌㄨˋ" },
    ],
  },
  {
    id: "c",
    symbol: "ㄘ",
    title: "ㄘ",
    category: "initial",
    soundText: "雌",
    audio: "/audio/zhuyin/c.mp3",
    tip: { english: "Touch your tongue tip to the back of your upper teeth, then release with a strong puff of air.", "traditional-chinese": "舌尖抵住上齒背，放開時用力送氣。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip touches the back of your upper teeth", "traditional-chinese": "舌尖抵住上齒背" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Release with a strong puff of air", "traditional-chinese": "放開時用力送氣" } }],
    phonetics: { manner: "affricate", place: "alveolar", voiced: false, aspirated: true, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
    examples: [
      { word: "草莓", zhuyin: "ㄘㄠˇ ㄇㄟˊ" },
      { word: "廁所", zhuyin: "ㄘㄜˋ ㄙㄨㄛˇ" },
    ],
  },
  {
    id: "s",
    symbol: "ㄙ",
    title: "ㄙ",
    category: "initial",
    soundText: "思",
    audio: "/audio/zhuyin/s.mp3",
    tip: { english: "Bring your tongue tip close to the back of your upper teeth and let the air hiss out. Vocal cords don't vibrate.", "traditional-chinese": "舌尖接近上齒背，氣流摩擦而出，聲帶不振動。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip close to the back of your upper teeth", "traditional-chinese": "舌尖接近上齒背" } }, { label: { english: "Airflow", "traditional-chinese": "氣流" }, text: { english: "Air hisses out with friction", "traditional-chinese": "氣流摩擦而出" } }, { label: { english: "Voicing", "traditional-chinese": "聲帶" }, text: { english: "Vocal cords don't vibrate", "traditional-chinese": "聲帶不振動" } }],
    phonetics: { manner: "fricative", place: "alveolar", voiced: false, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "tip", tongueHeight: 0.75, tongueFrontness: 0.85, contactZone: "alveolar_ridge" },
    examples: [
      { word: "三個", zhuyin: "ㄙㄢ ㄍㄜˋ" },
      { word: "送禮", zhuyin: "ㄙㄨㄥˋ ㄌㄧˇ" },
    ],
  },

  // ── 介音 Medials（3 個）────────────────────────────────────
  {
    id: "yi",
    symbol: "ㄧ",
    title: "ㄧ",
    category: "medial",
    soundText: "衣",
    audio: "/audio/zhuyin/yi.mp3",
    tip: { english: "Pull the corners of your mouth wide. Your tongue sits at its highest, most forward point — similar to English \"ee.\"", "traditional-chinese": "嘴角向兩側拉開，舌位最高最前，類似英文的 ee。" },
    guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Corners pulled wide", "traditional-chinese": "嘴角向兩側拉開" } }, { label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Highest and most forward", "traditional-chinese": "舌位最高最前" } }, { label: { english: "Note", "traditional-chinese": "重點提示" }, text: { english: "Similar to English \"ee\"", "traditional-chinese": "類似英文的 ee" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.15, tongueRegion: "middle", tongueHeight: 0.95, tongueFrontness: 0.95, contactZone: "none" },
    examples: [
      { word: "衣服", zhuyin: "ㄧ ㄈㄨˊ" },
      { word: "一起", zhuyin: "ㄧˋ ㄑㄧˇ" },
    ],
  },
  {
    id: "wu",
    symbol: "ㄨ",
    title: "ㄨ",
    category: "medial",
    soundText: "烏",
    audio: "/audio/zhuyin/wu.mp3",
    tip: { english: "Round your lips small and push them forward. Your tongue sits at its highest, furthest-back point — similar to English \"oo.\"", "traditional-chinese": "雙唇縮小突出，舌位最高最後，類似英文的 oo。" },
    guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Lips small and pushed forward", "traditional-chinese": "雙唇縮小突出" } }, { label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Highest and furthest back", "traditional-chinese": "舌位最高最後" } }, { label: { english: "Note", "traditional-chinese": "重點提示" }, text: { english: "Similar to English \"oo\"", "traditional-chinese": "類似英文的 oo" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "strongly_rounded", jawOpening: 0.2, tongueRegion: "middle", tongueHeight: 0.9, tongueFrontness: 0.05, contactZone: "none" },
    examples: [
      { word: "烏龜", zhuyin: "ㄨ ㄍㄨㄟ" },
      { word: "五個", zhuyin: "ㄨˇ ㄍㄜˋ" },
    ],
  },
  {
    id: "yu",
    symbol: "ㄩ",
    title: "ㄩ",
    category: "medial",
    soundText: "迂",
    audio: "/audio/zhuyin/yu.mp3",
    tip: { english: "Round your lips as much as for ㄨ, but keep your tongue in the same position as ㄧ — a rounded sound in between the two.", "traditional-chinese": "雙唇突出程度同 ㄨ，但舌位同 ㄧ，是介於兩者之間的圓唇音。" },
    guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Lips as rounded as ㄨ, a rounded sound in between the two", "traditional-chinese": "雙唇突出程度同 ㄨ，是介於兩者之間的圓唇音" } }, { label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tongue position same as ㄧ", "traditional-chinese": "但舌位同 ㄧ" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "rounded", jawOpening: 0.18, tongueRegion: "middle", tongueHeight: 0.9, tongueFrontness: 0.6, contactZone: "none" },
    examples: [
      { word: "魚", zhuyin: "ㄩˊ" },
      { word: "雨傘", zhuyin: "ㄩˇ ㄙㄢˇ" },
    ],
  },

  // ── 韻母 Finals（13 個）────────────────────────────────────
  {
    id: "a",
    symbol: "ㄚ",
    title: "ㄚ",
    category: "final",
    soundText: "啊",
    audio: "/audio/zhuyin/a.mp3",
    tip: { english: "Open your mouth as wide as it goes. Your tongue sits at its lowest point.", "traditional-chinese": "嘴巴張到最大，舌位最低。" },
    guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Open as wide as it goes", "traditional-chinese": "嘴巴張到最大" } }, { label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Lowest point", "traditional-chinese": "舌位最低" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.9, tongueRegion: "middle", tongueHeight: 0.1, tongueFrontness: 0.5, contactZone: "none" },
    examples: [
      { word: "媽媽", zhuyin: "ㄇㄚ ㄇㄚ˙" },
      { word: "花朵", zhuyin: "ㄏㄨㄚ ㄉㄨㄛˇ" },
    ],
  },
  {
    id: "o",
    symbol: "ㄛ",
    title: "ㄛ",
    category: "final",
    soundText: "喔",
    audio: "/audio/zhuyin/o.mp3",
    tip: { english: "Round your lips. Your tongue sits mid-back.", "traditional-chinese": "嘴唇收成圓形，舌位中後。" },
    guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Lips rounded", "traditional-chinese": "嘴唇收成圓形" } }, { label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Mid-back", "traditional-chinese": "舌位中後" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "rounded", jawOpening: 0.5, tongueRegion: "middle", tongueHeight: 0.55, tongueFrontness: 0.2, contactZone: "none" },
    examples: [
      { word: "婆婆", zhuyin: "ㄆㄛˊ ㄆㄛ˙" },
      { word: "菠菜", zhuyin: "ㄅㄛ ㄘㄞˋ" },
    ],
  },
  {
    id: "e",
    symbol: "ㄜ",
    title: "ㄜ",
    category: "final",
    soundText: "餓",
    audio: "/audio/zhuyin/e.mp3",
    tip: { english: "Open your mouth about halfway, lips not rounded. Your tongue sits mid-back.", "traditional-chinese": "嘴巴半開不圓唇，舌位中後。" },
    guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Half open, lips not rounded", "traditional-chinese": "嘴巴半開不圓唇" } }, { label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Mid-back", "traditional-chinese": "舌位中後" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.45, tongueRegion: "middle", tongueHeight: 0.5, tongueFrontness: 0.15, contactZone: "none" },
    examples: [
      { word: "鵝肉", zhuyin: "ㄜˊ ㄖㄡˋ" },
      { word: "惡夢", zhuyin: "ㄜˋ ㄇㄥˋ" },
    ],
  },
  {
    id: "eh-final",
    symbol: "ㄝ",
    title: "ㄝ",
    category: "final",
    soundText: "耶",
    audio: "/audio/zhuyin/eh-final.mp3",
    tip: { english: "Pull the corners of your mouth wide. Your tongue sits mid-front — flatter than ㄜ, and usually appears paired with ㄧ or ㄩ.", "traditional-chinese": "嘴角向兩側拉開，舌位中前，比 ㄜ 更扁，常跟 ㄧ／ㄩ 搭配出現。" },
    guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Corners pulled wide", "traditional-chinese": "嘴角向兩側拉開" } }, { label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Mid-front", "traditional-chinese": "舌位中前" } }, { label: { english: "Note", "traditional-chinese": "重點提示" }, text: { english: "Flatter than ㄜ, usually paired with ㄧ/ㄩ", "traditional-chinese": "比 ㄜ 更扁，常跟 ㄧ／ㄩ 搭配出現" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.4, tongueRegion: "middle", tongueHeight: 0.6, tongueFrontness: 0.75, contactZone: "none" },
    examples: [
      { word: "爺爺", zhuyin: "ㄧㄝˊ ㄧㄝ˙" },
      { word: "謝謝", zhuyin: "ㄒㄧㄝˋ ㄒㄧㄝ˙" },
    ],
  },
  {
    id: "ai",
    symbol: "ㄞ",
    title: "ㄞ",
    category: "final",
    soundText: "哀",
    audio: "/audio/zhuyin/ai.mp3",
    tip: { english: "Glide quickly from a ㄚ mouth shape to a ㄧ mouth shape.", "traditional-chinese": "從 ㄚ 的嘴形快速滑向 ㄧ。" },
    guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Glide quickly from ㄚ to ㄧ", "traditional-chinese": "從 ㄚ 的嘴形快速滑向 ㄧ" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.7, tongueRegion: "middle", tongueHeight: 0.5, tongueFrontness: 0.6, contactZone: "none" },
    examples: [
      { word: "奶奶", zhuyin: "ㄋㄞˇ ㄋㄞ˙" },
      { word: "太太", zhuyin: "ㄊㄞˋ ㄊㄞ˙" },
    ],
  },
  {
    id: "ei",
    symbol: "ㄟ",
    title: "ㄟ",
    category: "final",
    soundText: "欸",
    audio: "/audio/zhuyin/ei.mp3",
    tip: { english: "Glide quickly from a ㄝ mouth shape to a ㄧ mouth shape.", "traditional-chinese": "從 ㄝ 的嘴形快速滑向 ㄧ。" },
    guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Glide quickly from ㄝ to ㄧ", "traditional-chinese": "從 ㄝ 的嘴形快速滑向 ㄧ" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.4, tongueRegion: "middle", tongueHeight: 0.65, tongueFrontness: 0.75, contactZone: "none" },
    examples: [
      { word: "誰", zhuyin: "ㄕㄟˊ" },
      { word: "妹妹", zhuyin: "ㄇㄟˋ ㄇㄟ˙" },
    ],
  },
  {
    id: "ao",
    symbol: "ㄠ",
    title: "ㄠ",
    category: "final",
    soundText: "凹",
    audio: "/audio/zhuyin/ao.mp3",
    tip: { english: "Glide quickly from a ㄚ mouth shape to a ㄨ mouth shape.", "traditional-chinese": "從 ㄚ 的嘴形快速滑向 ㄨ。" },
    guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Glide quickly from ㄚ to ㄨ", "traditional-chinese": "從 ㄚ 的嘴形快速滑向 ㄨ" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "slightly_rounded", jawOpening: 0.6, tongueRegion: "middle", tongueHeight: 0.55, tongueFrontness: 0.35, contactZone: "none" },
    examples: [
      { word: "貓咪", zhuyin: "ㄇㄠ ㄇㄧ" },
      { word: "帽子", zhuyin: "ㄇㄠˋ ㄗ˙" },
    ],
  },
  {
    id: "ou",
    symbol: "ㄡ",
    title: "ㄡ",
    category: "final",
    soundText: "歐",
    audio: "/audio/zhuyin/ou.mp3",
    tip: { english: "Glide quickly from a ㄛ mouth shape to a ㄨ mouth shape.", "traditional-chinese": "從 ㄛ 的嘴形快速滑向 ㄨ。" },
    guidance: [{ label: { english: "Mouth shape", "traditional-chinese": "嘴型" }, text: { english: "Glide quickly from ㄛ to ㄨ", "traditional-chinese": "從 ㄛ 的嘴形快速滑向 ㄨ" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "rounded", jawOpening: 0.4, tongueRegion: "middle", tongueHeight: 0.65, tongueFrontness: 0.15, contactZone: "none" },
    examples: [
      { word: "豆漿", zhuyin: "ㄉㄡˋ ㄐㄧㄤ" },
      { word: "走路", zhuyin: "ㄗㄡˇ ㄌㄨˋ" },
    ],
  },
  {
    id: "an",
    symbol: "ㄢ",
    title: "ㄢ",
    category: "final",
    soundText: "安",
    audio: "/audio/zhuyin/an.mp3",
    tip: { english: "Start from a ㄚ mouth shape and finish with your tongue tip on the ridge behind your upper teeth — a nasal sound, like English \"n.\"", "traditional-chinese": "從 ㄚ 收尾到舌尖抵住上牙齦的鼻音（像英文 n）。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Finishes from ㄚ into a nasal with the tongue tip on the ridge behind your upper teeth (like English \"n\")", "traditional-chinese": "從 ㄚ 收尾到舌尖抵住上牙齦的鼻音（像英文 n）" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.7, tongueRegion: "middle", tongueHeight: 0.4, tongueFrontness: 0.5, contactZone: "none" },
    examples: [
      { word: "番茄", zhuyin: "ㄈㄢ ㄑㄧㄝˊ" },
      { word: "晚安", zhuyin: "ㄨㄢˇ ㄢ" },
    ],
  },
  {
    id: "en",
    symbol: "ㄣ",
    title: "ㄣ",
    category: "final",
    soundText: "恩",
    audio: "/audio/zhuyin/en.mp3",
    tip: { english: "Start from a ㄜ mouth shape and finish with your tongue tip on the ridge behind your upper teeth — a nasal sound, like English \"n.\"", "traditional-chinese": "從 ㄜ 收尾到舌尖抵住上牙齦的鼻音（像英文 n）。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Finishes from ㄜ into a nasal with the tongue tip on the ridge behind your upper teeth (like English \"n\")", "traditional-chinese": "從 ㄜ 收尾到舌尖抵住上牙齦的鼻音（像英文 n）" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.4, tongueRegion: "middle", tongueHeight: 0.5, tongueFrontness: 0.2, contactZone: "none" },
    examples: [
      { word: "很好", zhuyin: "ㄏㄣˇ ㄏㄠˇ" },
      { word: "分開", zhuyin: "ㄈㄣ ㄎㄞ" },
    ],
  },
  {
    id: "ang",
    symbol: "ㄤ",
    title: "ㄤ",
    category: "final",
    soundText: "昂",
    audio: "/audio/zhuyin/ang.mp3",
    tip: { english: "Start from a ㄚ mouth shape and finish with the back of your tongue on your soft palate — a nasal sound, like English \"ng.\"", "traditional-chinese": "從 ㄚ 收尾到舌根抵住軟顎的鼻音（像英文 ng）。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Finishes from ㄚ into a nasal with the back of the tongue on the soft palate (like English \"ng\")", "traditional-chinese": "從 ㄚ 收尾到舌根抵住軟顎的鼻音（像英文 ng）" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.7, tongueRegion: "middle", tongueHeight: 0.35, tongueFrontness: 0.35, contactZone: "none" },
    examples: [
      { word: "忙碌", zhuyin: "ㄇㄤˊ ㄌㄨˋ" },
      { word: "糖果", zhuyin: "ㄊㄤˊ ㄍㄨㄛˇ" },
    ],
  },
  {
    id: "eng",
    symbol: "ㄥ",
    title: "ㄥ",
    category: "final",
    soundText: "鞥",
    audio: "/audio/zhuyin/eng.mp3",
    tip: { english: "Start from a ㄜ mouth shape and finish with the back of your tongue on your soft palate — a nasal sound, like English \"ng.\"", "traditional-chinese": "從 ㄜ 收尾到舌根抵住軟顎的鼻音（像英文 ng）。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Finishes from ㄜ into a nasal with the back of the tongue on the soft palate (like English \"ng\")", "traditional-chinese": "從 ㄜ 收尾到舌根抵住軟顎的鼻音（像英文 ng）" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "unrounded", jawOpening: 0.4, tongueRegion: "middle", tongueHeight: 0.45, tongueFrontness: 0.15, contactZone: "none" },
    examples: [
      { word: "蜜蜂", zhuyin: "ㄇㄧˋ ㄈㄥ" },
      { word: "燈光", zhuyin: "ㄉㄥ ㄍㄨㄤ" },
    ],
  },
  {
    id: "er",
    symbol: "ㄦ",
    title: "ㄦ",
    category: "final",
    soundText: "兒",
    audio: "/audio/zhuyin/er.mp3",
    tip: { english: "Curl your tongue tip up close to your hard palate without touching it — this sound stands alone as its own syllable.", "traditional-chinese": "舌尖捲起接近硬顎但不碰觸，單獨成一個音節。" },
    guidance: [{ label: { english: "Tongue position", "traditional-chinese": "舌位" }, text: { english: "Tip curls up close to the hard palate without touching", "traditional-chinese": "舌尖捲起接近硬顎但不碰觸" } }, { label: { english: "Length", "traditional-chinese": "長度" }, text: { english: "Forms its own syllable on its own", "traditional-chinese": "單獨成一個音節" } }],
    phonetics: { manner: "vowel", place: "none", voiced: true, aspirated: false, nasal: false, lipRounding: "slightly_rounded", jawOpening: 0.45, tongueRegion: "middle", tongueHeight: 0.5, tongueFrontness: 0.45, contactZone: "none" },
    examples: [
      { word: "兒子", zhuyin: "ㄦˊ ㄗ˙" },
      { word: "耳朵", zhuyin: "ㄦˇ ㄉㄨㄛ˙" },
    ],
  },
];
