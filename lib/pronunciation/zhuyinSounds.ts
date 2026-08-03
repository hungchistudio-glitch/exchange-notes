export type ZhuyinCategory = "initial" | "medial" | "final";

export interface ZhuyinExample {
  word: string;
  zhuyin: string;
}

export interface ZhuyinCommonMistake {
  /** 常被誤發成的音，例如 "ㄏㄨ" */
  confusedWith: string;
  explanation: string;
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
  tip: string;
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
    tip: "雙唇緊閉，放開時輕輕吐氣，不送氣，聲帶不振動。",
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
    tip: "雙唇緊閉，放開時用力送氣，聲帶不振動。",
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
    tip: "雙唇閉合，氣流改從鼻腔流出，聲帶振動。",
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
    tip: "上排牙齒『輕輕咬住』下唇，讓氣流從牙齒與嘴唇的縫隙擠出摩擦，聲帶不振動。重點是牙齒一定要碰到下唇。",
    examples: [
      { word: "飛機", zhuyin: "ㄈㄟ ㄐㄧ" },
      { word: "頭髮", zhuyin: "ㄊㄡˊ ㄈㄚˇ" },
    ],
    commonMistake: {
      confusedWith: "ㄏㄨ",
      explanation:
        "ㄈ 是「唇齒音」，摩擦點在嘴唇前緣（上齒咬下唇）；很多人（尤其受台灣口音影響）會把它唸成「ㄏ + ㄨ」，也就是嘴唇噘圓、完全不咬下唇，摩擦點跑到喉嚨後方。練習時可以用手指輕輕放在下唇上，發 ㄈ 時要感覺到上排牙齒碰到手指；發 ㄏㄨ 則完全不會碰到。",
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
    tip: "舌尖抵住上牙齦，放開時輕輕吐氣，不送氣。",
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
    tip: "舌尖抵住上牙齦，放開時用力送氣。",
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
    tip: "舌尖抵住上牙齦，氣流改從鼻腔流出。",
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
    tip: "舌尖抵住上牙齦，氣流從舌頭兩側流出。",
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
    tip: "舌根抵住軟顎，放開時輕輕吐氣，不送氣。",
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
    tip: "舌根抵住軟顎，放開時用力送氣。",
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
    tip: "舌根接近軟顎，氣流從喉嚨附近摩擦而出，嘴唇不噘圓。",
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
    tip: "舌面抵住硬顎前部，放開時輕輕吐氣，不送氣。",
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
    tip: "舌面抵住硬顎前部，放開時用力送氣。",
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
    tip: "舌面接近硬顎前部，氣流摩擦而出，不送氣。",
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
    tip: "舌尖翹起抵住硬顎，放開時輕輕吐氣，不送氣。",
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
    tip: "舌尖翹起抵住硬顎，放開時用力送氣。",
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
    tip: "舌尖翹起接近硬顎，氣流摩擦而出，聲帶不振動。",
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
    tip: "舌尖翹起接近硬顎，氣流摩擦而出，聲帶振動。",
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
    tip: "舌尖抵住上齒背，放開時輕輕吐氣，不送氣。",
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
    tip: "舌尖抵住上齒背，放開時用力送氣。",
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
    tip: "舌尖接近上齒背，氣流摩擦而出，聲帶不振動。",
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
    tip: "嘴角向兩側拉開，舌位最高最前，類似英文的 ee。",
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
    tip: "雙唇縮小突出，舌位最高最後，類似英文的 oo。",
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
    tip: "雙唇突出程度同 ㄨ，但舌位同 ㄧ，是介於兩者之間的圓唇音。",
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
    tip: "嘴巴張到最大，舌位最低。",
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
    tip: "嘴唇收成圓形，舌位中後。",
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
    tip: "嘴巴半開不圓唇，舌位中後。",
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
    tip: "嘴角向兩側拉開，舌位中前，比 ㄜ 更扁，常跟 ㄧ／ㄩ 搭配出現。",
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
    tip: "從 ㄚ 的嘴形快速滑向 ㄧ。",
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
    tip: "從 ㄝ 的嘴形快速滑向 ㄧ。",
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
    tip: "從 ㄚ 的嘴形快速滑向 ㄨ。",
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
    tip: "從 ㄛ 的嘴形快速滑向 ㄨ。",
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
    tip: "從 ㄚ 收尾到舌尖抵住上牙齦的鼻音（像英文 n）。",
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
    tip: "從 ㄜ 收尾到舌尖抵住上牙齦的鼻音（像英文 n）。",
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
    tip: "從 ㄚ 收尾到舌根抵住軟顎的鼻音（像英文 ng）。",
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
    tip: "從 ㄜ 收尾到舌根抵住軟顎的鼻音（像英文 ng）。",
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
    tip: "舌尖捲起接近硬顎但不碰觸，單獨成一個音節。",
    examples: [
      { word: "兒子", zhuyin: "ㄦˊ ㄗ˙" },
      { word: "耳朵", zhuyin: "ㄦˇ ㄉㄨㄛ˙" },
    ],
  },
];
